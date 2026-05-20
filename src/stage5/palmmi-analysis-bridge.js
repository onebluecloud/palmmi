const path = require("node:path");

const stage5 = require("../../scripts/palmmi-stage5.js");
const {
  recognitionResultToAnalysisInput,
} = require("./recognition-result-to-analysis-input.js");

const ANALYSIS_RESULT_SCHEMA_VERSION = "analysis-result.v1";

function createMemoryStorage() {
  const values = new Map();
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

function basenameFromSource(sourceImage) {
  if (typeof sourceImage !== "string" || !sourceImage.trim()) {
    return "palm.jpg";
  }
  return path.basename(sourceImage.replace(/\\/g, "/")) || "palm.jpg";
}

function defaultUpload(analysisInput) {
  return {
    schemaVersion: "stage5g_analysis_bridge_upload_v1",
    fileName: basenameFromSource(analysisInput.sourceImage),
    fileType: "image/jpeg",
    fileSize: 1,
    fileSizeLabel: "1 B",
    previewDataUrl: "",
    uploadedAt: null,
    handSide: null,
  };
}

function qualityConfidence(qualityGate) {
  if (isPlainObject(qualityGate) && Number.isFinite(qualityGate.confidence)) {
    return qualityGate.confidence;
  }
  return 0;
}

function qualityReasons(qualityGate) {
  if (isPlainObject(qualityGate) && Array.isArray(qualityGate.reasons)) {
    return qualityGate.reasons;
  }
  return [];
}

function createAnalysisInputProvider(analysisInput) {
  return {
    name: "stage5g-analysis-input",
    model: "stage5g-analysis-bridge",
    async analyze(input = {}) {
      const confidence = qualityConfidence(analysisInput.qualityGate);
      return {
        request_id: input.request_id || null,
        provider: "stage5g-analysis-input",
        model: "stage5g-analysis-bridge",
        status: "OK",
        features: {
          schema_version: analysisInput.schemaVersion,
        },
        quality: {
          palm_detected: true,
          single_hand: true,
          image_usable: !analysisInput.qualityGate || analysisInput.qualityGate.usable !== false,
          confidence,
          reasons: qualityReasons(analysisInput.qualityGate),
        },
        confidence,
        performance: {
          latency_ms: 0,
          estimated_cost_usd: 0,
        },
        error_codes: [],
        raw_response_ref: "stage5g:analysis-input:v1",
        raw_provider: {
          provider: analysisInput.provider,
          model: analysisInput.model,
          response_ref: "stage5g:analysis-input:v1",
        },
        warnings: [
          ...analysisInput.diagnostics.providerWarnings,
          ...analysisInput.diagnostics.adapterWarnings,
          ...analysisInput.diagnostics.matcherWarnings,
        ],
        notes: [
          "Stage 5G uses an existing RecognitionResult; VLM persona output is not used.",
        ],
        stage5g_analysis_input: analysisInput,
      };
    },
  };
}

function createTrace(analysisInput) {
  return {
    from: analysisInput.trace.from,
    adapter: analysisInput.trace.adapter,
    bridge: "palmmi-analysis-bridge",
    stage: "5G",
  };
}

async function runPalmmiAnalysisBridge(options = {}) {
  if (!isPlainObject(options)) {
    throw new Error("Stage 5G bridge options must be an object.");
  }

  const adapter = typeof options.adapter === "function"
    ? options.adapter
    : recognitionResultToAnalysisInput;
  const analysisInput = adapter(options.recognitionResult);
  const stage5Api = options.stage5Api || stage5;
  if (!stage5Api || typeof stage5Api.runAnalyzeSkeleton !== "function") {
    throw new Error("Stage 5G requires a Stage 5B analysis skeleton with runAnalyzeSkeleton().");
  }

  const response = await stage5Api.runAnalyzeSkeleton({
    upload: options.upload || defaultUpload(analysisInput),
    sessionStorage: options.sessionStorage || createMemoryStorage(),
    localStorage: options.localStorage || createMemoryStorage(),
    provider: createAnalysisInputProvider(analysisInput),
    now: options.now,
    nowIso: options.nowIso,
    randomString: options.randomString,
    requestId: options.requestId,
    timeoutMs: options.timeoutMs,
  });

  if (!response || response.ok !== true) {
    const code = response && response.error ? response.error.code : "UNKNOWN_ERROR";
    const message = response && response.error ? response.error.message : "Stage 5B analysis skeleton failed.";
    throw new Error(`Stage 5G bridge failed in Stage 5B analysis skeleton (${code}): ${message}`);
  }

  return {
    ...response,
    schemaVersion: ANALYSIS_RESULT_SCHEMA_VERSION,
    provider: analysisInput.provider,
    analysis_input: analysisInput,
    diagnostics: analysisInput.diagnostics,
    trace: createTrace(analysisInput),
  };
}

module.exports = {
  ANALYSIS_RESULT_SCHEMA_VERSION,
  runPalmmiAnalysisBridge,
};
