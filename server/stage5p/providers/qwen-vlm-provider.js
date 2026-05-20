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

function buildVlmFeatures(parsed) {
  const majorLines = parsed.majorLines || {};
  const palmShape = parsed.palmShape || {};
  const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence : 0;
  return {
    schema_version: "palm_features.v1",
    hand: {
      visible_side: "palm",
      handedness: "unknown",
      orientation: "upright",
    },
    image_quality: {
      sharpness: "unknown",
      lighting: "unknown",
      occlusion: "unknown",
      confidence,
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

class QwenVlmProvider {
  constructor(options = {}) {
    const config = resolveQwenConfig(options.env || process.env, options);
    this.name = "qwen";
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = options.fetchImpl || options.fetch || globalThis.fetch;
    this.prompt = options.prompt || [
      "Extract observable palm image features only.",
      "Return one JSON object only.",
      "Do not infer personality, health, wealth, lifespan, marriage, fate, or fortune.",
    ].join("\n");
  }

  fail(code, requestId, start, diagnostics = {}) {
    return {
      ...createProviderError(code, requestId, this.name, this.model, {
        diagnostics: endpointDiagnostics(this.endpoint, this.model, diagnostics),
      }),
      latencyMs: elapsedMs(start),
    };
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

    const body = buildProviderRequest({
      model: this.model,
      prompt: this.prompt,
      image,
      imageBuffer,
    });

    let responseText = "";
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
      });
      if (timeout) {
        clearTimeout(timeout);
      }
      responseText = await response.text();
      if (!response.ok) {
        return this.fail(
          ERROR_CODES.VLM_API_REQUEST_FAILED,
          requestId,
          start,
          upstreamDiagnostics(response, responseText)
        );
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return this.fail(ERROR_CODES.VLM_API_TIMEOUT, requestId, start, {
          isTimeout: true,
          errorType: "timeout",
        });
      }
      return this.fail(ERROR_CODES.VLM_API_REQUEST_FAILED, requestId, start, {
        isFetchFailed: true,
        errorType: error && error.name ? error.name : "fetch_failed",
      });
    }

    try {
      const responseJson = JSON.parse(responseText);
      const messageContent = extractQwenMessageContent(responseJson);
      const parsed = normalizeParsedPalmFeatures(parseJsonObject(messageContent));
      if (!parsed.isValidPalmImage) {
        return this.fail(ERROR_CODES.VLM_API_INVALID_RESPONSE, requestId, start);
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
          palm_detected: true,
          single_hand: true,
          image_usable: true,
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
    } catch (error) {
      return this.fail(ERROR_CODES.VLM_API_INVALID_RESPONSE, requestId, start, {
        errorType: "response_parse_failed",
      });
    }
  }
}

module.exports = {
  QwenVlmProvider,
  buildVlmFeatures,
};
