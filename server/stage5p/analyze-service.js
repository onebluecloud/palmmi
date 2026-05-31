const stage5 = require("../../scripts/palmmi-stage5.js");
const {
  runPalmmiRecognitionPipeline,
} = require("../../src/stage5/palmmi-recognition-pipeline.js");
const {
  runPalmmiAnalysisBridge,
} = require("../../src/stage5/palmmi-analysis-bridge.js");
const {
  buildAnalysisResultContract,
} = require("../../src/stage5/analysis-result-contract.js");
const {
  ERROR_CODES,
  createErrorResponse,
  mapProviderErrorCode,
} = require("./errors.js");
const {
  resolveProviderConfig,
} = require("./env.js");
const {
  createVlmProvider,
} = require("./provider-selection.js");

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COST_GUARD_TTL_MS = 30 * 1000;
const COST_GUARD_MAX_ENTRIES = 200;
const recentCostGuardKeys = new Map();
const inFlightCostGuardKeys = new Map();

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeImage(inputImage = {}) {
  const image = isPlainObject(inputImage) ? inputImage : {};
  const size = Number.isFinite(image.size_bytes)
    ? image.size_bytes
    : Number.isFinite(image.fileSize)
      ? image.fileSize
      : Number.isFinite(image.size)
        ? image.size
        : 0;

  return {
    file_name: image.file_name || image.fileName || image.name || "palm.jpg",
    content_type: image.content_type || image.fileType || image.type || image.mime_type || "",
    size_bytes: size,
    upload_ref: image.upload_ref || image.uploadRef || null,
    uploaded_at: image.uploaded_at || image.uploadedAt || null,
    side: image.side || image.handSide || "unknown",
    base64: image.base64 || image.data_url || image.dataUrl || "",
    buffer: image.buffer,
    imageBuffer: image.imageBuffer,
  };
}

function estimateBase64DecodedBytes(value) {
  if (typeof value !== "string" || !value.trim()) {
    return 0;
  }
  const raw = value.includes(",") ? value.split(",").pop() : value;
  const compact = raw.replace(/\s+/g, "");
  if (!compact) {
    return 0;
  }
  const padding = compact.endsWith("==") ? 2 : compact.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((compact.length * 3) / 4) - padding);
}

function validateImage(image, config, requestId) {
  if (!ACCEPTED_IMAGE_TYPES.has(image.content_type)) {
    return createErrorResponse(ERROR_CODES.FILE_TYPE_UNSUPPORTED, requestId);
  }
  if (!Number.isFinite(image.size_bytes) || image.size_bytes <= 0 || image.size_bytes > config.maxImageBytes) {
    return createErrorResponse(ERROR_CODES.FILE_TOO_LARGE, requestId);
  }
  if (Buffer.isBuffer(image.buffer) && image.buffer.length > config.maxImageBytes) {
    return createErrorResponse(ERROR_CODES.FILE_TOO_LARGE, requestId);
  }
  if (Buffer.isBuffer(image.imageBuffer) && image.imageBuffer.length > config.maxImageBytes) {
    return createErrorResponse(ERROR_CODES.FILE_TOO_LARGE, requestId);
  }
  if (estimateBase64DecodedBytes(image.base64) > config.maxImageBytes) {
    return createErrorResponse(ERROR_CODES.FILE_TOO_LARGE, requestId);
  }
  return null;
}

function nowMs(options = {}) {
  return typeof options.nowMs === "function" ? options.nowMs() : Date.now();
}

function hashBuffer(buffer) {
  let hash = 2166136261;
  for (const byte of buffer) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function imageContentHash(image) {
  if (Buffer.isBuffer(image.buffer)) {
    return hashBuffer(image.buffer);
  }
  if (Buffer.isBuffer(image.imageBuffer)) {
    return hashBuffer(image.imageBuffer);
  }
  if (typeof image.base64 === "string" && image.base64.trim()) {
    return hashString(image.base64);
  }
  return hashString(`${image.file_name}|${image.content_type}|${image.size_bytes}`);
}

function pruneCostGuardMap(map, currentMs) {
  for (const [key, expiresAt] of map.entries()) {
    if (expiresAt <= currentMs) {
      map.delete(key);
    }
  }
  while (map.size > COST_GUARD_MAX_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (!oldestKey) {
      break;
    }
    map.delete(oldestKey);
  }
}

function costGuardKey({ anonymousDeviceId, image }) {
  return [
    anonymousDeviceId || "anonymous",
    image.file_name || "palm.jpg",
    image.content_type || "unknown",
    image.size_bytes || 0,
    imageContentHash(image),
  ].join("|");
}

function beginCostGuard({ anonymousDeviceId, image, config, options }) {
  if (options && options.enableCostGuard === false) {
    return { ok: true, key: null };
  }
  if (!config || config.provider === "mock") {
    return { ok: true, key: null };
  }

  const currentMs = nowMs(options);
  const duplicateWindowMs = Number.isFinite(options.costGuardTtlMs) && options.costGuardTtlMs > 0
    ? options.costGuardTtlMs
    : COST_GUARD_TTL_MS;
  const key = costGuardKey({ anonymousDeviceId, image });
  pruneCostGuardMap(recentCostGuardKeys, currentMs);
  pruneCostGuardMap(inFlightCostGuardKeys, currentMs);

  if ((recentCostGuardKeys.get(key) || 0) > currentMs || (inFlightCostGuardKeys.get(key) || 0) > currentMs) {
    return {
      ok: false,
      response: createErrorResponse(ERROR_CODES.DUPLICATE_SUBMISSION, null, {
        status: "RETRY_REQUIRED",
        diagnostics: {
          errorType: "duplicate_submission",
          duplicateWindowMs,
        },
      }),
    };
  }

  const inFlightTtl = Math.max(duplicateWindowMs, (config.timeoutMs || 0) + 5000);
  inFlightCostGuardKeys.set(key, currentMs + inFlightTtl);
  return {
    ok: true,
    key,
    duplicateWindowMs,
  };
}

function shouldRememberProviderResult(providerResult) {
  return Boolean(providerResult && providerResult.ok !== false);
}

function completeCostGuard(guard, options = {}) {
  if (!guard || !guard.key) {
    return;
  }
  const currentMs = nowMs(options);
  inFlightCostGuardKeys.delete(guard.key);
  if (options.remember === true) {
    recentCostGuardKeys.set(guard.key, currentMs + (guard.duplicateWindowMs || COST_GUARD_TTL_MS));
    pruneCostGuardMap(recentCostGuardKeys, currentMs);
  }
}

function resetStage6GCostGuardForTests() {
  recentCostGuardKeys.clear();
  inFlightCostGuardKeys.clear();
}

function uploadFromRequest(image) {
  return {
    schemaVersion: "stage5p_api_upload_v1",
    fileName: image.file_name,
    fileType: image.content_type,
    fileSize: image.size_bytes,
    fileSizeLabel: `${image.size_bytes} B`,
    previewDataUrl: "",
    uploadedAt: image.uploaded_at,
    handSide: image.side === "unknown" ? null : image.side,
  };
}

function removeKeys(value, forbidden) {
  if (Array.isArray(value)) {
    return value.map((item) => removeKeys(item, forbidden));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) {
      continue;
    }
    output[key] = removeKeys(child, forbidden);
  }
  return output;
}

function sanitizeRecognitionResult(recognitionResult) {
  return removeKeys(recognitionResult, new Set([
    "debug",
    "analysis_input",
    "internal",
    "provider_output",
    "raw_provider",
    "raw_response",
    "rawText",
  ]));
}

function sanitizeAnalysisResult(analysisResult) {
  return removeKeys(analysisResult, new Set([
    "internal",
    "stage5bResult",
    "provider_output",
    "raw_provider",
    "raw_response",
    "rawText",
  ]));
}

async function runProviderWithOptionalFallback(providerInput, config, options = {}) {
  const provider = createVlmProvider({
    env: options.env,
    config,
    fetchImpl: options.fetchImpl,
    model: options.model,
  });
  const providerResult = await provider.analyze(providerInput);

  if (providerResult && providerResult.ok !== false) {
    return providerResult;
  }

  if (config.provider !== "mock" && config.mode === "real-with-mock-fallback") {
    const fallbackProvider = createVlmProvider({
      env: options.env,
      config: {
        ...config,
        provider: "mock",
        mode: "mock-only",
      },
    });
    const fallbackResult = await fallbackProvider.analyze(providerInput);
    if (fallbackResult && fallbackResult.ok !== false) {
      return {
        ...fallbackResult,
        warnings: [
          ...(Array.isArray(fallbackResult.warnings) ? fallbackResult.warnings : []),
          "REAL_PROVIDER_MOCK_FALLBACK",
        ],
      };
    }
  }

  return providerResult;
}

async function buildSafeAnalysisResponse({ requestId, anonymousDeviceId, image, providerResult, options }) {
  const recognitionResult = await runPalmmiRecognitionPipeline({
    sourceImage: image.upload_ref || image.file_name,
    sampleId: requestId,
    providerResult,
    providerWarnings: Array.isArray(providerResult.warnings) ? providerResult.warnings : [],
    side: image.side,
  });

  if (
    recognitionResult.status === ERROR_CODES.LOW_INFORMATION_FEATURE_SET ||
    (recognitionResult.diagnostics && recognitionResult.diagnostics.matcherWarnings
      && recognitionResult.diagnostics.matcherWarnings.includes(ERROR_CODES.LOW_INFORMATION_FEATURE_SET))
  ) {
    return createErrorResponse(ERROR_CODES.LOW_INFORMATION_FEATURE_SET, requestId, {
      diagnostics: recognitionResult.diagnostics,
    });
  }

  const sessionStorage = createMemoryStorage();
  const localStorage = createMemoryStorage({
    [stage5.DEVICE_ID_STORAGE_KEY]: anonymousDeviceId,
  });
  const stage5bResult = await runPalmmiAnalysisBridge({
    recognitionResult,
    upload: uploadFromRequest(image),
    sessionStorage,
    localStorage,
    requestId: () => requestId,
    now: options.now,
    nowIso: options.nowIso,
    timeoutMs: options.timeoutMs,
  });
  const analysisResult = buildAnalysisResultContract(stage5bResult, {
    now: options.nowIso || (() => new Date().toISOString()),
  });
  const safeRecognitionResult = sanitizeRecognitionResult(stage5bResult.recognition_result);
  const safeAnalysisResult = sanitizeAnalysisResult(analysisResult);

  return {
    ok: true,
    request_id: requestId,
    status: stage5bResult.status,
    provider: providerResult.provider,
    model: providerResult.model,
    recognition_result: safeRecognitionResult,
    analysis_result: safeAnalysisResult,
    warnings: safeAnalysisResult.result && Array.isArray(safeAnalysisResult.result.warnings)
      ? safeAnalysisResult.result.warnings
      : [],
  };
}

async function runAnalyzeApi(payload = {}, options = {}) {
  const input = isPlainObject(payload) ? payload : {};
  const requestId = input.request_id || (typeof options.requestId === "function" ? options.requestId() : `req_${Date.now()}`);
  const env = options.env || process.env;
  const config = resolveProviderConfig(env, options);
  const image = normalizeImage(input.image || input.upload || input.file);
  const imageError = validateImage(image, config, requestId);
  if (imageError) {
    return imageError;
  }

  const anonymousDeviceId = typeof input.anonymous_device_id === "string" && input.anonymous_device_id.trim()
    ? input.anonymous_device_id.trim()
    : "pm_stage5p_anonymous";
  const costGuard = beginCostGuard({
    anonymousDeviceId,
    image,
    config,
    options,
  });
  if (!costGuard.ok) {
    return {
      ...costGuard.response,
      request_id: requestId,
    };
  }
  const providerInput = {
    request_id: requestId,
    anonymous_device_id: anonymousDeviceId,
    image,
    locale: input.locale || "zh-CN",
    timeout_ms: config.timeoutMs,
    provider_options: {
      provider: config.provider,
      mode: config.mode,
    },
  };

  let providerResult;
  try {
    providerResult = await runProviderWithOptionalFallback(providerInput, config, {
      env,
      fetchImpl: options.fetchImpl,
      model: options.model,
      timeoutMs: config.timeoutMs,
    });
  } catch (error) {
    completeCostGuard(costGuard, { ...options, remember: false });
    return createErrorResponse(ERROR_CODES.VLM_API_REQUEST_FAILED, requestId);
  }

  if (!providerResult || providerResult.ok === false) {
    completeCostGuard(costGuard, {
      ...options,
      remember: shouldRememberProviderResult(providerResult),
    });
    const code = mapProviderErrorCode(providerResult && providerResult.error
      ? providerResult.error.code
      : providerResult && providerResult.errorCode);
    return createErrorResponse(code, requestId, {
      diagnostics: providerResult && providerResult.diagnostics,
    });
  }

  try {
    const response = await buildSafeAnalysisResponse({
      requestId,
      anonymousDeviceId,
      image,
      providerResult,
      options: {
        ...options,
        timeoutMs: config.timeoutMs,
      },
    });
    completeCostGuard(costGuard, { ...options, remember: response && response.ok === true });
    return response;
  } catch (error) {
    completeCostGuard(costGuard, { ...options, remember: false });
    return createErrorResponse(ERROR_CODES.VLM_RESPONSE_NORMALIZE_FAILED, requestId);
  }
}

module.exports = {
  ACCEPTED_IMAGE_TYPES,
  createMemoryStorage,
  runAnalyzeApi,
  resetStage6GCostGuardForTests,
  sanitizeAnalysisResult,
  sanitizeRecognitionResult,
};
