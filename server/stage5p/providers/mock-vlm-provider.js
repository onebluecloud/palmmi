const {
  normalizeParsedPalmFeatures,
} = require("./qwen-response-parser.js");

function imageBufferFrom(input = {}) {
  const image = input.image || {};
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
  return Buffer.from("palmmi-stage5p-mock-image");
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function elapsedMs(start) {
  return Math.max(0, Math.round(nowMs() - start));
}

function buildVlmFeatures(parsed) {
  const majorLines = parsed.majorLines || {};
  const palmShape = parsed.palmShape || {};
  const summary = parsed.palmFeatureSummary || {};
  const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence : 0;
  return {
    schema_version: "palm_features.v1",
    palm_features: {
      main_line_type: parsed.mainLineType || "M2",
      line_depth: summary.line_depth || "medium",
      line_complexity: summary.line_complexity || "medium",
      line_continuity: summary.line_continuity || "continuous",
      branch_density: summary.branch_density || "medium",
      palm_shape_hint: summary.palm_shape_hint || "square",
      visible_features: Array.isArray(parsed.visibleFeatures) ? parsed.visibleFeatures : [],
      confidence,
      feature_reasons: ["Mock palm features use the current Stage 6F feature contract."],
    },
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
      life_line: majorLines.lifeLine || {},
      head_line: majorLines.headLine || {},
      heart_line: majorLines.heartLine || {},
      fate_line: (parsed.minorLines || {}).fateLine || {},
    },
    special_marks: [],
    provider_notes: [],
  };
}

class MockVlmProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.model = options.model || "stage5p-mock-vlm";
  }

  async analyze(input = {}) {
    const start = nowMs();
    const imageBuffer = imageBufferFrom(input);
    const parsed = normalizeParsedPalmFeatures({
      validity: {
        is_palm_photo: true,
        is_single_hand: true,
        is_palm_side_visible: true,
        palm_lines_visible: true,
        image_quality: "clear",
        reject_reason: "",
      },
      palm_features: {
        main_line_type: "M2",
        line_depth: "medium",
        line_complexity: "medium",
        line_continuity: "continuous",
        branch_density: "medium",
        palm_shape_hint: "square",
        visible_features: ["life line", "head line", "heart line"],
        confidence: 0.86,
        feature_reasons: ["Major palm lines are visible and continuous."],
      },
      majorLines: {
        lifeLine: {
          visibility: "clear",
          length: "long",
          depth: "medium",
          trend: "curved",
          breaks: "none",
          branches: "few",
          confidence: 0.86,
        },
        headLine: {
          visibility: "clear",
          length: "long",
          depth: "medium",
          trend: "slightly downward",
          breaks: "none",
          branches: "few",
          confidence: 0.84,
        },
        heartLine: {
          visibility: "clear",
          length: "medium",
          depth: "medium",
          trend: "curved",
          breaks: "none",
          branches: "few",
          confidence: 0.82,
        },
      },
      minorLines: {
        fateLine: {
          visibility: "faint",
          depth: "shallow",
          breaks: "minor",
          confidence: 0.62,
        },
      },
      palmShape: {
        shapeHint: "rectangular",
        palmWidth: "medium",
        fingerProportion: "medium",
        confidence: 0.8,
      },
      visibleFeatures: ["life line", "head line", "heart line"],
      uncertainty: [],
      confidence: 0.86,
    });
    const latencyMs = elapsedMs(start);
    return {
      ok: true,
      request_id: input.request_id || null,
      provider: this.name,
      model: this.model,
      status: "OK",
      parsed,
      features: buildVlmFeatures(parsed),
      quality: {
        palm_detected: true,
        single_hand: true,
        image_usable: imageBuffer.length > 0,
        confidence: parsed.confidence,
        reasons: [],
      },
      confidence: parsed.confidence,
      warnings: [],
      latencyMs,
      performance: {
        latency_ms: latencyMs,
        estimated_cost_usd: 0,
      },
      error_codes: [],
      response_ref: "mock:redacted",
    };
  }
}

module.exports = {
  MockVlmProvider,
};
