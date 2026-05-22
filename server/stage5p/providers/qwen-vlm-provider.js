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

const MIN_PROVIDER_CONFIDENCE = 0.3;
const LOW_PROVIDER_CONFIDENCE = 0.55;
const MIN_CLASSIFIER_USABLE_FEATURES = 3;
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
  "If the image is actually not a clear single palm after closer inspection, return invalid validity and do not output palm features.",
  "For a valid palm, extract only observable palm structure features. The application will run a local frozen Stage 3 classifier to decide the final personality.",
  "Always output palm_features for valid palms. If a field cannot be judged, output the field with value unknown instead of omitting it.",
  "Use these exact palm_features enum values: main_line_type M1/M2/M3/M4/M5/unknown; line_depth deep/medium/faint/unknown; line_complexity simple/medium/complex/unknown; line_continuity continuous/broken/mixed/unknown; branch_density low/medium/high/unknown; palm_shape_hint long/square/wide/unknown; confidence 0.0-1.0.",
  "Do not decide the final personality. Do not output result.personality_id as an authoritative answer.",
  "Do not choose P25, M1, or any personality because of uncertainty or missing fields. Final personality selection is local and feature-driven.",
  "Every feature_reasons item must cite concrete palm_features differences, such as line_depth, line_complexity, line_continuity, branch_density, palm_shape_hint, or visible major line evidence.",
  "If you include non-authoritative candidate_hints, they must be explicitly marked as hints and cite palm_features. They will not be used as the final ranking.",
  "Use this schema exactly:",
  "{\"validity\":{\"is_palm_photo\":true,\"is_single_hand\":true,\"is_palm_side_visible\":true,\"palm_lines_visible\":true,\"image_quality\":\"clear|acceptable|low_confidence|not_palm\",\"reject_reason\":\"\"},\"palm_features\":{\"main_line_type\":\"M1|M2|M3|M4|M5|unknown\",\"line_depth\":\"deep|medium|faint|unknown\",\"line_complexity\":\"simple|medium|complex|unknown\",\"line_continuity\":\"continuous|broken|mixed|unknown\",\"branch_density\":\"low|medium|high|unknown\",\"palm_shape_hint\":\"long|square|wide|unknown\",\"visible_features\":[\"OVERALL_CLARITY\"],\"confidence\":0.0,\"feature_reasons\":[\"observable feature reason\"]},\"majorLines\":{\"lifeLine\":{\"visibility\":\"clear\",\"length\":\"medium\",\"depth\":\"medium\",\"curvature\":\"medium\",\"breaks\":\"none\",\"branches\":\"few\",\"confidence\":0.0},\"headLine\":{\"visibility\":\"clear\",\"length\":\"medium\",\"depth\":\"medium\",\"slope\":\"flat\",\"breaks\":\"none\",\"branches\":\"few\",\"confidence\":0.0},\"heartLine\":{\"visibility\":\"clear\",\"length\":\"medium\",\"depth\":\"medium\",\"curvature\":\"medium\",\"ending\":\"unknown\",\"breaks\":\"none\",\"branches\":\"few\",\"confidence\":0.0}},\"minorLines\":{\"fateLine\":{\"visibility\":\"unknown\",\"strength\":\"unknown\",\"continuity\":\"unknown\",\"confidence\":0.0}},\"palmShape\":{\"palmWidth\":\"medium\",\"palmLength\":\"medium\",\"fingerLength\":\"medium\",\"shapeHint\":\"unknown\",\"confidence\":0.0},\"result\":null,\"candidate_hints\":[]}",
  "Never infer health, wealth, lifespan, marriage, fate, fortune, or any sensitive trait.",
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

function normalizedToken(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
}

function summaryDepth(summary = {}) {
  const depth = normalizedToken(summary.line_depth);
  if (depth === "faint") {
    return "shallow";
  }
  return ["shallow", "medium", "deep"].includes(depth) ? depth : "unknown";
}

function summaryBreaks(summary = {}) {
  const complexity = normalizedToken(summary.line_complexity);
  const continuity = normalizedToken(summary.line_continuity);
  if (complexity === "complex" || continuity === "broken") {
    return "major";
  }
  if (complexity === "medium" || continuity === "mixed") {
    return "minor";
  }
  if (complexity === "simple" || continuity === "continuous") {
    return "none";
  }
  return "unknown";
}

function summaryBranches(summary = {}) {
  const density = normalizedToken(summary.branch_density);
  if (density === "high") {
    return "many";
  }
  if (density === "medium") {
    return "few";
  }
  if (density === "low") {
    return "none";
  }
  return "unknown";
}

function summaryContinuity(summary = {}) {
  const continuity = normalizedToken(summary.line_continuity);
  if (continuity === "continuous") {
    return "continuous";
  }
  if (continuity === "broken") {
    return "broken";
  }
  if (continuity === "mixed") {
    return "partial";
  }
  return "unknown";
}

function summaryShape(summary = {}, key) {
  const shape = normalizedToken(summary.palm_shape_hint);
  if (key === "width") {
    if (shape === "wide" || shape === "square") {
      return "wide";
    }
    if (shape === "long") {
      return "medium";
    }
  }
  if (key === "length") {
    if (shape === "long") {
      return "long";
    }
    if (shape === "wide" || shape === "square") {
      return "medium";
    }
  }
  return "unknown";
}

function lineFeature(line = {}, summary = {}, visibleFallback = false) {
  const summaryConfidence = Number.isFinite(summary.confidence) ? summary.confidence : 0;
  return {
    visibility: line.visibility || (visibleFallback ? "clear" : "unknown"),
    length: line.length || "unknown",
    depth: line.depth || summaryDepth(summary),
    curvature: line.curvature || line.trend || "unknown",
    branches: line.branches || "unknown",
    breaks: line.breaks || summaryBreaks(summary),
    confidence: Number.isFinite(line.confidence) ? line.confidence : summaryConfidence,
  };
}

function palmFeatureSummaryOutput(parsed, summary, confidence) {
  return {
    main_line_type: parsed.mainLineType || "unknown",
    line_depth: summary.line_depth || "unknown",
    line_complexity: summary.line_complexity || "unknown",
    line_continuity: summary.line_continuity || "unknown",
    branch_density: summary.branch_density || "unknown",
    palm_shape_hint: summary.palm_shape_hint || "unknown",
    visible_features: Array.isArray(parsed.visibleFeatures) ? parsed.visibleFeatures : [],
    confidence,
    feature_reasons: Array.isArray(parsed.uncertainty) ? parsed.uncertainty : [],
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
  const summary = parsed.palmFeatureSummary || {};
  const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence : 0;
  const visiblePalm = parsed.isValidPalmImage === true;
  return {
    schema_version: "palm_features.v1",
    palm_features: palmFeatureSummaryOutput(parsed, summary, confidence),
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
      shape_hint: palmShape.shapeHint || summary.palm_shape_hint || "unknown",
      palm_width: palmShape.palmWidth || summaryShape(summary, "width"),
      palm_length: palmShape.palmLength || summaryShape(summary, "length"),
      finger_length: palmShape.fingerProportion || summaryShape(summary, "length"),
      confidence: Number.isFinite(palmShape.confidence) ? palmShape.confidence : 0,
    },
    major_lines: {
      life_line: lineFeature(majorLines.lifeLine, summary, visiblePalm),
      head_line: {
        ...lineFeature(majorLines.headLine, summary, visiblePalm),
        slope: majorLines.headLine && majorLines.headLine.slope
          ? majorLines.headLine.slope
          : (normalizedToken(summary.line_complexity) === "complex" ? "downward" : "flat"),
      },
      heart_line: {
        ...lineFeature(majorLines.heartLine, summary, visiblePalm),
        ending: majorLines.heartLine && majorLines.heartLine.ending
          ? majorLines.heartLine.ending
          : "unknown",
      },
      fate_line: {
        visibility: (parsed.minorLines || {}).fateLine && (parsed.minorLines || {}).fateLine.visibility
          ? (parsed.minorLines || {}).fateLine.visibility
          : (visiblePalm && summaryBranches(summary) !== "none" ? "clear" : "unknown"),
        strength: (parsed.minorLines || {}).fateLine && (parsed.minorLines || {}).fateLine.strength
          ? (parsed.minorLines || {}).fateLine.strength
          : (summaryBranches(summary) === "many" ? "strong" : "medium"),
        continuity: (parsed.minorLines || {}).fateLine && (parsed.minorLines || {}).fateLine.continuity
          ? (parsed.minorLines || {}).fateLine.continuity
          : summaryContinuity(summary),
        confidence,
      },
    },
    special_marks: {
      branches: summaryBranches(summary),
      crosses: "unknown",
      islands: "unknown",
      confidence,
    },
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

function concretePalmFeatureSignalCount(parsed) {
  const summary = parsed && parsed.palmFeatureSummary ? parsed.palmFeatureSummary : {};
  return [
    summary.line_depth,
    summary.line_complexity,
    summary.line_continuity,
    summary.branch_density,
    summary.palm_shape_hint,
  ].map(normalizedToken).filter((value) => value && value !== "unknown" && value !== "unclear").length;
}

function hasMainLineTypeSignal(parsed) {
  const mainLineType = normalizedToken(parsed && parsed.mainLineType).toUpperCase();
  return /^M[1-8]$/.test(mainLineType);
}

function hasLineComplexitySignal(parsed) {
  const summary = parsed && parsed.palmFeatureSummary ? parsed.palmFeatureSummary : {};
  const value = normalizedToken(summary.line_complexity);
  return value && value !== "unknown" && value !== "unclear";
}

function usableClassifierFeatureCount(parsed) {
  return (hasMainLineTypeSignal(parsed) ? 1 : 0) + concretePalmFeatureSignalCount(parsed);
}

function unknownClassifierFeatureCount(parsed) {
  return 6 - usableClassifierFeatureCount(parsed);
}

function validationDiagnostics(reason, parsed) {
  const summary = parsed && parsed.palmFeatureSummary ? parsed.palmFeatureSummary : {};
  const palmFeatures = {
    main_line_type: parsed && parsed.mainLineType ? parsed.mainLineType : "unknown",
    line_depth: summary.line_depth || "unknown",
    line_complexity: summary.line_complexity || "unknown",
    line_continuity: summary.line_continuity || "unknown",
    branch_density: summary.branch_density || "unknown",
    palm_shape_hint: summary.palm_shape_hint || "unknown",
    confidence: Number.isFinite(parsed && parsed.confidence) ? parsed.confidence : 0,
  };
  const missingFeatures = Object.entries(palmFeatures)
    .filter(([key, value]) => key !== "confidence" && (!value || value === "unknown" || value === "unclear"))
    .map(([key]) => key);
  return {
    errorType: reason,
    validityImageQuality: typeof parsed.imageQuality === "string" ? parsed.imageQuality.slice(0, 40) : "unknown",
    providerConfidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0,
    usableFeatureCount: usableClassifierFeatureCount(parsed || {}),
    unknownFeatureCount: unknownClassifierFeatureCount(parsed || {}),
    classifierVersion: "stage6f-hard-fix.v1",
    palmFeatures,
    normalizedFeatures: {
      mainLineType: palmFeatures.main_line_type,
      lineDepth: palmFeatures.line_depth,
      lineComplexity: palmFeatures.line_complexity,
      lineContinuity: palmFeatures.line_continuity,
      branchDensity: palmFeatures.branch_density,
      palmShapeHint: palmFeatures.palm_shape_hint,
      confidence: palmFeatures.confidence,
    },
    ruleInput: null,
    missingFeatures,
    lowInformationReason: reason === "LOW_INFORMATION_FEATURE_SET"
      ? (usableClassifierFeatureCount(parsed || {}) === 0 ? "all_classifier_features_unknown" : "insufficient_classifier_features")
      : null,
    scoreMargin: null,
    topCandidates: [],
    diagnosticCode: reason,
    mainLineTypeMissing: !hasMainLineTypeSignal(parsed || {}),
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

  if (parsed.hasPalmFeatures !== true) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("VALIDITY_PASS_FEATURES_MISSING", parsed),
    };
  }

  if (parsed.confidence < MIN_PROVIDER_CONFIDENCE) {
    return {
      ok: false,
      code: ERROR_CODES.ANALYSIS_UNRELIABLE,
      diagnostics: validationDiagnostics("provider_confidence_low", parsed),
    };
  }

  const usableFeatureCount = usableClassifierFeatureCount(parsed);
  if (
    usableFeatureCount === 0 ||
    usableFeatureCount < 2 ||
    (usableFeatureCount < MIN_CLASSIFIER_USABLE_FEATURES && !hasMainLineTypeSignal(parsed) && !hasLineComplexitySignal(parsed))
  ) {
    return {
      ok: false,
      code: ERROR_CODES.LOW_INFORMATION_FEATURE_SET,
      diagnostics: validationDiagnostics("LOW_INFORMATION_FEATURE_SET", parsed),
    };
  }

  if (usableFeatureCount < 2 && !hasMajorLineSignal(parsed)) {
    return {
      ok: false,
      code: ERROR_CODES.LOW_INFORMATION_FEATURE_SET,
      diagnostics: validationDiagnostics("LOW_INFORMATION_FEATURE_SET", parsed),
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
    const status = parsed.confidence < LOW_PROVIDER_CONFIDENCE ? "LOW_CONFIDENCE" : "OK";
    return {
      ok: true,
      request_id: requestId,
      provider: this.name,
      model: this.model,
      status,
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
      diagnostics: {
        ...(parsed.diagnostics || {}),
        model: this.model,
        qwen_personality_ignored: Boolean(
          parsed.result
            && (
              parsed.result.personalityId
              || (Array.isArray(parsed.result.candidateResults) && parsed.result.candidateResults.length > 0)
            )
        ),
        local_classifier_required: true,
      },
    };
  }
}

module.exports = {
  QwenVlmProvider,
  buildVlmFeatures,
  validateParsedPalmValidity,
  validateParsedForAnalysis,
};
