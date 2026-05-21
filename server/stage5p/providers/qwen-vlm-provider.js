const {
  normalizeParsedPalmFeatures,
  parseJsonObject,
} = require("./qwen-response-parser.js");
const {
  ERROR_CODES,
  createProviderError,
} = require("../errors.js");
const {
  resolveQwenConfig,
} = require("../env.js");

let frozenDisplayContent = [];
try {
  frozenDisplayContent = require("../../../PalmTag_rule_engine_v0/data/display_content.json");
} catch (error) {
  frozenDisplayContent = [];
}

const VALID_PERSONA_IDS = new Set(
  Array.isArray(frozenDisplayContent)
    ? frozenDisplayContent
      .map((item) => item && typeof item.persona_id === "string" ? item.persona_id.trim() : "")
      .filter(Boolean)
    : []
);
const MIN_PROVIDER_CONFIDENCE = 0.45;
const DEFAULT_VALIDATION_PROMPT = [
  "Return strict JSON only.",
  "Task: decide whether the image is a clear, front-facing, complete, single human palm photo.",
  "Do not analyze personality. Do not extract detailed palm lines.",
  "Reject drinks, cups, objects, pets, landscapes, faces, hand backs, multiple hands, screenshots, AI images, severely blurry images, severely cropped palms, or images where palm lines are not visible.",
  "Return exactly this shape: {\"validity\":{\"is_palm_photo\":false,\"is_single_hand\":false,\"is_palm_side_visible\":false,\"palm_lines_visible\":false,\"image_quality\":\"not_palm\",\"reject_reason\":\"\"},\"palm_features\":null,\"result\":null}.",
  "If and only if the image is a clear single palm, set all four validity booleans true, image_quality to clear, reject_reason to an empty string, and keep palm_features and result null.",
].join("\n");
const DEFAULT_ANALYSIS_PROMPT = [
  "The image has passed the initial palm validity check.",
  "Return one strict JSON object only. Do not include markdown or natural language outside JSON.",
  "If the image is actually not a clear single palm after closer inspection, return invalid validity and do not output a personality result.",
  "For a valid palm, extract observable palm features and choose the best Palmmi entertainment-only personality id from the frozen P01-P36 set.",
  "Use this schema exactly:",
  "{\"validity\":{\"is_palm_photo\":true,\"is_single_hand\":true,\"is_palm_side_visible\":true,\"palm_lines_visible\":true,\"image_quality\":\"clear\",\"reject_reason\":\"\"},\"palm_features\":{\"main_line_type\":\"\",\"visible_features\":[\"OVERALL_CLARITY\"],\"confidence\":0.0},\"majorLines\":{\"lifeLine\":{\"visibility\":\"clear\",\"length\":\"medium\",\"depth\":\"medium\",\"curvature\":\"medium\",\"breaks\":\"none\",\"confidence\":0.0},\"headLine\":{\"visibility\":\"clear\",\"length\":\"medium\",\"depth\":\"medium\",\"slope\":\"flat\",\"breaks\":\"none\",\"confidence\":0.0},\"heartLine\":{\"visibility\":\"clear\",\"length\":\"medium\",\"depth\":\"medium\",\"curvature\":\"medium\",\"ending\":\"unknown\",\"breaks\":\"none\",\"confidence\":0.0}},\"minorLines\":{\"fateLine\":{\"visibility\":\"unknown\",\"strength\":\"unknown\",\"continuity\":\"unknown\",\"confidence\":0.0}},\"palmShape\":{\"palmWidth\":\"medium\",\"palmLength\":\"medium\",\"fingerLength\":\"medium\",\"confidence\":0.0},\"result\":{\"personality_id\":\"\",\"main_line_type\":\"\",\"candidate_results\":[{\"personality_id\":\"\",\"main_line_type\":\"\",\"confidence\":0.0,\"reason\":\"observable palm features only\"}]}}",
  "Never choose P25, M1, or any personality as a fallback. If unsure, return low confidence or null result instead of guessing.",
  "Do not infer health, wealth, lifespan, marriage, fate, fortune, or any sensitive trait.",
].join("\n");

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function elapsedMs(start) {
  return Math.max(0, Math.round(nowMs() - start));
}

function toImageBuffer(image = {}) {
  if (Buffer.isBuffer(image.imageBuffer)) {
    return image.imageBuffer;
  }
  if (Buffer.isBuffer(image.buffer)) {
    return image.buffer;
  }
  if (typeof image.base64 === "string" && image.base64.trim()) {
    const raw = image.base64.includes(",") ? image.base64.split(",").pop() : image.base64;
    return Buffer.from(raw, "base64");
  }
  return null;
}

function extractQwenMessageContent(responseJson) {
  const choices = Array.isArray(responseJson && responseJson.choices) ? responseJson.choices : [];
  const message = choices[0] && choices[0].message;
  const content = message && message.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") {
        return part;
      }
      if (part && typeof part === "object" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    }).join("");
  }
  throw new Error("provider message content missing");
}

function lineFeature(line = {}) {
  return {
    visibility: line.visibility || "unknown",
    length: line.length || "unknown",
    depth: line.depth || "unknown",
    curvature: line.curvature || line.trend || "unknown",
    branches: line.branches || "unknown",
    breaks: line.breaks || "unknown",
    confidence: Number.isFinite(line.confidence) ? line.confidence : 0,
  };
}

function imageQualityValue(parsed, key, fallback = "unknown") {
  const quality = String(parsed.imageQuality || "").toLowerCase();
  if (key === "sharpness") {
    if (quality === "blurry" || quality === "not_palm") {
      return "high";
    }
    if (quality === "clear") {
      return "low";
    }
  }
  if (key === "lighting") {
    if (quality === "dark") {
      return "low";
    }
    if (quality === "clear") {
      return "normal";
    }
  }
  if (key === "occlusion") {
    if (quality === "cropped") {
      return "partial";
    }
    if (quality === "clear") {
      return "none";
    }
  }
  return fallback;
}

function buildVlmFeatures(parsed) {
  const majorLines = parsed.majorLines || {};
  const palmShape = parsed.palmShape || {};
  const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence : 0;
  return {
    schema_version: "palm_features.v1",
    hand: {
      visible_side: parsed.isPalmSideVisible ? "palm" : "unknown",
      handedness: "unknown",
      orientation: parsed.isPalmSideVisible ? "palm" : "unknown",
      confidence,
    },
    image_quality: {
      usable: parsed.isValidPalmImage,
      sharpness: imageQualityValue(parsed, "sharpness"),
      blur: imageQualityValue(parsed, "sharpness"),
      lighting: imageQualityValue(parsed, "lighting"),
      brightness: imageQualityValue(parsed, "lighting"),
      occlusion: imageQualityValue(parsed, "occlusion"),
      confidence,
      reasons: parsed.rejectReason ? [parsed.rejectReason] : parsed.uncertainty,
    },
    palm_shape: {
      shape_hint: palmShape.shapeHint || "unknown",
      palm_width: palmShape.palmWidth || "unknown",
      finger_length: palmShape.fingerProportion || "unknown",
      confidence: Number.isFinite(palmShape.confidence) ? palmShape.confidence : 0,
    },
    major_lines: {
      life_line: lineFeature(majorLines.lifeLine),
      head_line: lineFeature(majorLines.headLine),
      heart_line: lineFeature(majorLines.heartLine),
      fate_line: lineFeature((parsed.minorLines || {}).fateLine),
    },
    special_marks: [],
    provider_notes: [],
  };
}

function hasVisibleLine(line) {
  if (!line || typeof line !== "object") {
    return false;
  }
  if (line.visible === true) {
    return true;
  }
  if (typeof line.visibility === "string") {
    const value = line.visibility.trim().toLowerCase();
    return ["clear", "visible", "faint", "broken"].includes(value);
  }
  return false;
}

function hasMajorLineSignal(parsed) {
  const majorLines = parsed.majorLines || {};
  const minorLines = parsed.minorLines || {};
  return hasVisibleLine(majorLines.lifeLine)
    || hasVisibleLine(majorLines.headLine)
    || hasVisibleLine(majorLines.heartLine)
    || hasVisibleLine(minorLines.fateLine);
}

function isKnownPersonaId(personalityId) {
  return typeof personalityId === "string"
    && personalityId.trim()
    && VALID_PERSONA_IDS.has(personalityId.trim());
}

function validationDiagnostics(reason, parsed) {
  return {
    errorType: reason,
    validityImageQuality: typeof parsed.imageQuality === "string" ? parsed.imageQuality.slice(0, 40) : "unknown",
    providerConfidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0,
  };
}

function validateParsedPalmValidity(parsed) {
  if (!parsed || parsed.hasValidity !== true) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("validity_missing", parsed || {}),
    };
  }

  if (parsed.validity.is_palm_photo !== true || parsed.validity.is_palm_side_visible !== true) {
    return {
      ok: false,
      code: ERROR_CODES.NOT_PALM,
      diagnostics: validationDiagnostics("not_palm", parsed),
    };
  }

  if (parsed.validity.is_single_hand !== true) {
    return {
      ok: false,
      code: ERROR_CODES.NOT_PALM,
      diagnostics: validationDiagnostics("not_single_hand", parsed),
    };
  }

  if (parsed.validity.palm_lines_visible !== true) {
    return {
      ok: false,
      code: ERROR_CODES.IMAGE_NOT_CLEAR,
      diagnostics: validationDiagnostics("palm_lines_not_clear", parsed),
    };
  }

  if (String(parsed.imageQuality || "").toLowerCase() === "not_palm") {
    return {
      ok: false,
      code: ERROR_CODES.NOT_PALM,
      diagnostics: validationDiagnostics("not_palm_quality", parsed),
    };
  }

  if (["blurry", "dark", "cropped"].includes(String(parsed.imageQuality || "").toLowerCase())) {
    return {
      ok: false,
      code: ERROR_CODES.IMAGE_NOT_CLEAR,
      diagnostics: validationDiagnostics("image_quality_not_clear", parsed),
    };
  }

  return { ok: true };
}

function validateParsedForAnalysis(parsed) {
  const validity = validateParsedPalmValidity(parsed);
  if (!validity.ok) {
    return validity;
  }

  if (parsed.hasPalmFeatures !== true || parsed.hasResult !== true) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("analysis_payload_missing", parsed),
    };
  }

  if (parsed.confidence < MIN_PROVIDER_CONFIDENCE) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("provider_confidence_low", parsed),
    };
  }

  if (!Array.isArray(parsed.visibleFeatures) || parsed.visibleFeatures.length === 0 || !hasMajorLineSignal(parsed)) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("provider_feature_signal_missing", parsed),
    };
  }

  if (!isKnownPersonaId(parsed.result && parsed.result.personalityId)) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("provider_persona_missing_or_unknown", parsed),
    };
  }

  return { ok: true };
}

function buildProviderRequest({ model, prompt, image, imageBuffer }) {
  const dataUrl = `data:${image.content_type};base64,${imageBuffer.toString("base64")}`;
  return {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
    temperature: 0,
  };
}

function endpointDiagnostics(endpoint, model, overrides = {}) {
  let endpointHost = "invalid-endpoint";
  let endpointPath = "invalid-endpoint";
  try {
    const url = new URL(endpoint);
    endpointHost = url.host;
    endpointPath = url.pathname;
  } catch (error) {
    // Keep the default redacted endpoint diagnostics.
  }
  return {
    providerStage: "qwen_fetch",
    endpointHost,
    endpointPath,
    model,
    requestMethod: "POST",
    contentType: "application/json",
    hasAuthHeader: true,
    bodyFormat: "openai-compatible-chat-completions-image_url-data-url",
    ...overrides,
  };
}

function firstSafeString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 160);
    }
  }
  return null;
}

function upstreamDiagnostics(response, responseText) {
  let parsed = null;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    parsed = null;
  }
  const errorObject = parsed && typeof parsed === "object" && parsed.error && typeof parsed.error === "object"
    ? parsed.error
    : {};
  return {
    upstreamStatus: response.status,
    upstreamErrorCode: firstSafeString(
      errorObject.code,
      errorObject.type,
      parsed && parsed.code,
      parsed && parsed.error_code
    ),
    upstreamRequestId: firstSafeString(
      response.headers && response.headers.get("x-request-id"),
      response.headers && response.headers.get("x-acs-request-id"),
      response.headers && response.headers.get("x-dashscope-request-id"),
      parsed && parsed.request_id,
      parsed && parsed.RequestId
    ),
    errorType: "upstream_non_2xx",
  };
}

function callFetch(fetchImpl, endpoint, init) {
  if (fetchImpl === globalThis.fetch && typeof globalThis.fetch === "function") {
    return globalThis.fetch(endpoint, init);
  }
  return fetchImpl(endpoint, init);
}

class QwenVlmProvider {
  constructor(options = {}) {
    const config = resolveQwenConfig(options.env || process.env, options);
    this.name = "qwen";
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = options.fetchImpl || options.fetch || globalThis.fetch;
    this.validationPrompt = options.validationPrompt || DEFAULT_VALIDATION_PROMPT;
    this.prompt = options.prompt || DEFAULT_ANALYSIS_PROMPT;
  }

  fail(code, requestId, start, diagnostics = {}) {
    return {
      ...createProviderError(code, requestId, this.name, this.model, {
        diagnostics: endpointDiagnostics(this.endpoint, this.model, diagnostics),
      }),
      latencyMs: elapsedMs(start),
    };
  }

  async fetchAndParse({ prompt, image, imageBuffer, requestId, start, stage }) {
    const body = buildProviderRequest({
      model: this.model,
      prompt,
      image,
      imageBuffer,
    });

    let responseText = "";
    let timeout = null;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      timeout = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;
      const response = await callFetch(this.fetchImpl, this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
      });
      responseText = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          response: this.fail(
            ERROR_CODES.VLM_API_REQUEST_FAILED,
            requestId,
            start,
            upstreamDiagnostics(response, responseText)
          ),
        };
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return {
          ok: false,
          response: this.fail(ERROR_CODES.REQUEST_TIMEOUT, requestId, start, {
            isTimeout: true,
            errorType: "timeout",
            providerStage: stage,
          }),
        };
      }
      return {
        ok: false,
        response: this.fail(ERROR_CODES.VLM_API_REQUEST_FAILED, requestId, start, {
          isFetchFailed: true,
          errorType: error && error.name ? error.name : "fetch_failed",
          providerStage: stage,
        }),
      };
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }

    try {
      const responseJson = JSON.parse(responseText);
      const messageContent = extractQwenMessageContent(responseJson);
      return {
        ok: true,
        parsed: normalizeParsedPalmFeatures(parseJsonObject(messageContent)),
      };
    } catch (error) {
      return {
        ok: false,
        response: this.fail(ERROR_CODES.VLM_API_INVALID_RESPONSE, requestId, start, {
          errorType: "response_parse_failed",
          providerStage: stage,
        }),
      };
    }
  }

  async analyze(input = {}) {
    const start = nowMs();
    const requestId = input.request_id || null;
    if (!this.apiKey) {
      return this.fail(ERROR_CODES.VLM_API_KEY_MISSING, requestId, start);
    }
    if (typeof this.fetchImpl !== "function") {
      return this.fail(ERROR_CODES.VLM_PROVIDER_UNAVAILABLE, requestId, start);
    }

    const image = input.image || {};
    const imageBuffer = toImageBuffer(image);
    if (!imageBuffer || imageBuffer.length === 0 || typeof image.content_type !== "string" || !image.content_type.startsWith("image/")) {
      return this.fail(ERROR_CODES.VLM_API_INVALID_RESPONSE, requestId, start);
    }

    const validityResponse = await this.fetchAndParse({
      prompt: this.validationPrompt,
      image,
      imageBuffer,
      requestId,
      start,
      stage: "qwen_validity_fetch",
    });
    if (!validityResponse.ok) {
      return validityResponse.response;
    }
    const validity = validateParsedPalmValidity(validityResponse.parsed);
    if (!validity.ok) {
      return this.fail(validity.code, requestId, start, validity.diagnostics);
    }

    const analysisResponse = await this.fetchAndParse({
      prompt: this.prompt,
      image,
      imageBuffer,
      requestId,
      start,
      stage: "qwen_analysis_fetch",
    });
    if (!analysisResponse.ok) {
      return analysisResponse.response;
    }

    const parsed = analysisResponse.parsed;
    const validation = validateParsedForAnalysis(parsed);
    if (!validation.ok) {
      return this.fail(validation.code, requestId, start, validation.diagnostics);
    }
    const latencyMs = elapsedMs(start);
    return {
      ok: true,
      request_id: requestId,
      provider: this.name,
      model: this.model,
      status: "OK",
      parsed,
      features: buildVlmFeatures(parsed),
      quality: {
        palm_detected: parsed.validity.is_palm_photo === true,
        single_hand: parsed.validity.is_single_hand === true,
        image_usable: parsed.isValidPalmImage === true,
        confidence: parsed.confidence,
        reasons: parsed.uncertainty,
      },
      confidence: parsed.confidence,
      warnings: parsed.uncertainty.length > 0 ? ["UNCERTAINTY_REPORTED"] : [],
      latencyMs,
      performance: {
        latency_ms: latencyMs,
        estimated_cost_usd: null,
      },
      error_codes: [],
      response_ref: "qwen:redacted",
    };
  }
}

module.exports = {
  QwenVlmProvider,
  buildVlmFeatures,
  validateParsedPalmValidity,
  validateParsedForAnalysis,
};
