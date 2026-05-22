const {
  clampConfidence,
  createDefaultPalmFeatureSet,
} = require("./palm-feature-set.js");

const FORBIDDEN_KEYS = new Set(["personality", "typeId", "archetype"]);
const FORBIDDEN_TEXT = [
  "finalAnalysis",
  "analysisText",
  "人生排位赛选手",
  "目标感整理者",
  "节奏规划者",
  ...Array.from({ length: 36 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`),
];

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function compactString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function firstString(...values) {
  for (const value of values) {
    const text = compactString(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function firstObject(...values) {
  return values.find(isPlainObject) || {};
}

function normalizeToken(value) {
  return compactString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function pickEnum(value, allowed, fallback = "unknown") {
  const token = normalizeToken(value);
  if (!token || token === "unclear" || token === "not_clear") {
    return fallback;
  }
  return allowed.includes(token) ? token : fallback;
}

function firstValueByKeys(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return "";
}

function normalizeClassifierEnum(value, kind) {
  const raw = compactString(value);
  const token = normalizeToken(raw);
  const chinese = raw.replace(/\s+/g, "");
  const mappings = {
    lineDepth: {
      deep: ["deep", "clear", "strong", "obvious", "明显", "清晰", "深", "强"],
      medium: ["medium", "normal", "moderate", "中等", "适中", "一般"],
      faint: ["faint", "shallow", "weak", "blur", "blurry", "unclear", "浅", "淡", "模糊", "不明显"],
    },
    lineComplexity: {
      simple: ["simple", "low", "few", "sparse", "简单", "少", "稀疏"],
      medium: ["medium", "moderate", "normal", "中等", "适中", "一般"],
      complex: ["complex", "high", "many", "dense", "复杂", "多", "密集"],
    },
    lineContinuity: {
      continuous: ["continuous", "connected", "smooth", "连续", "连贯"],
      broken: ["broken", "interrupted", "discontinuous", "断裂", "断续"],
      mixed: ["mixed", "partial", "crossed", "混合", "交错"],
    },
    branchDensity: {
      low: ["low", "few", "sparse", "simple", "少", "稀疏", "简单"],
      medium: ["medium", "moderate", "normal", "中等", "适中", "一般"],
      high: ["high", "many", "dense", "complex", "多", "密集", "复杂"],
    },
    palmShapeHint: {
      long: ["long", "narrow", "长", "长形"],
      square: ["square", "boxy", "方", "方形"],
      wide: ["wide", "broad", "宽", "宽掌"],
    },
  };
  const mapping = mappings[kind] || {};
  for (const [canonical, aliases] of Object.entries(mapping)) {
    if (aliases.includes(token) || aliases.includes(chinese)) {
      return canonical;
    }
  }
  return "unknown";
}

function hasForbiddenText(value) {
  const text = compactString(value);
  return FORBIDDEN_TEXT.some((forbidden) => text.includes(forbidden));
}

function safeTextList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item && !hasForbiddenText(item));
}

function stripJsonFences(text) {
  const trimmed = compactString(text);
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) {
    return fence[1].trim();
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

function parseJsonObject(text) {
  try {
    const parsed = JSON.parse(stripJsonFences(text));
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractQwenMessageContent(rawResult) {
  const choices = Array.isArray(rawResult.choices) ? rawResult.choices : [];
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
      if (isPlainObject(part) && typeof part.text === "string") {
        return part.text;
      }
      return "";
    }).join("");
  }
  return "";
}

function extractFeatureSource(rawResult) {
  if (!isPlainObject(rawResult)) {
    return {};
  }

  if (isPlainObject(rawResult.features)) {
    return rawResult.features;
  }

  if (isPlainObject(rawResult.parsed)) {
    return rawResult.parsed;
  }

  const qwenContent = extractQwenMessageContent(rawResult);
  if (qwenContent) {
    return parseJsonObject(qwenContent);
  }

  if (typeof rawResult.rawText === "string") {
    return parseJsonObject(rawResult.rawText);
  }

  if (
    isPlainObject(rawResult.hand) ||
    isPlainObject(rawResult.imageQuality) ||
    isPlainObject(rawResult.majorLines) ||
    isPlainObject(rawResult.major_lines)
  ) {
    return rawResult;
  }

  return {};
}

function readLine(source, camelName, snakeName) {
  const majorLines = firstObject(source.majorLines, source.major_lines, source.lines);
  const minorLines = firstObject(source.minorLines, source.minor_lines);
  return firstObject(
    majorLines[camelName],
    snakeName ? majorLines[snakeName] : null,
    minorLines[camelName],
    snakeName ? minorLines[snakeName] : null
  );
}

function visibleFromLine(line) {
  if (typeof line.visible === "boolean") {
    return line.visible;
  }
  const visibility = normalizeToken(line.visibility);
  if (!visibility || visibility === "not_visible" || visibility === "unclear") {
    return false;
  }
  return ["clear", "faint", "broken", "visible"].includes(visibility);
}

function curveFromLine(line) {
  const direct = pickEnum(line.curvature, ["low", "medium", "high"], "");
  if (direct) {
    return direct;
  }
  const trend = normalizeToken(line.trend);
  if (!trend) {
    return "unknown";
  }
  if (trend.includes("straight") || trend.includes("flat")) {
    return "low";
  }
  if (trend.includes("slight")) {
    return "medium";
  }
  if (trend.includes("curve") || trend.includes("curved") || trend.includes("arc")) {
    return "high";
  }
  return "unknown";
}

function slopeFromLine(line) {
  const direct = pickEnum(line.slope, ["upward", "flat", "downward"], "");
  if (direct) {
    return direct;
  }
  const trend = normalizeToken(line.trend);
  if (trend.includes("upward") || trend.includes("up")) {
    return "upward";
  }
  if (trend.includes("downward") || trend.includes("down")) {
    return "downward";
  }
  if (trend.includes("flat") || trend.includes("horizontal") || trend.includes("straight")) {
    return "flat";
  }
  return "unknown";
}

function normalizeBreaks(value) {
  const token = normalizeToken(value);
  if (token === "no" || token === "false") {
    return "none";
  }
  return pickEnum(token, ["none", "minor", "major"]);
}

function normalizeCount(value) {
  const token = normalizeToken(value);
  if (token === "no" || token === "false") {
    return "none";
  }
  return pickEnum(token, ["none", "few", "many"]);
}

function aggregateCount(...values) {
  const normalized = values.map(normalizeCount).filter((value) => value !== "unknown");
  if (normalized.includes("many")) {
    return "many";
  }
  if (normalized.includes("few")) {
    return "few";
  }
  if (normalized.length > 0 && normalized.every((value) => value === "none")) {
    return "none";
  }
  return "unknown";
}

function highLevelSummary(source) {
  const legacySummary = firstObject(source.palmFeatureSummary);
  const palmFeatures = firstObject(source.palm_features, source.palmFeatures, source.features);
  const summary = {
    ...legacySummary,
    ...palmFeatures,
  };
  const mainLineType = firstString(
    summary.main_line_type,
    summary.mainLineType,
    summary.line_type,
    summary.lineType,
    summary.primary_line_type,
    summary.primaryLineType,
    summary.dominant_line_type,
    summary.dominantLineType,
    source.mainLineType,
    source.main_line_type,
    source.line_type,
    source.lineType,
    source.primary_line_type,
    source.dominant_line_type
  );
  if (mainLineType) {
    summary.main_line_type = mainLineType;
  }
  summary.line_depth = firstValueByKeys(summary, ["line_depth", "lineDepth", "depth", "line_strength", "lineStrength"]);
  summary.line_complexity = firstValueByKeys(summary, ["line_complexity", "lineComplexity", "complexity", "texture_complexity", "textureComplexity"]);
  summary.line_continuity = firstValueByKeys(summary, ["line_continuity", "lineContinuity", "continuity", "line_pattern", "linePattern"]);
  summary.branch_density = firstValueByKeys(summary, ["branch_density", "branchDensity", "branches", "branch_level", "branchLevel", "branch_count", "branchCount"]);
  summary.palm_shape_hint = firstValueByKeys(summary, ["palm_shape_hint", "palmShapeHint", "palm_shape", "palmShape", "shape", "hand_shape", "handShape"]);
  summary.confidence = firstValueByKeys(summary, ["confidence", "score", "feature_confidence", "featureConfidence"])
    || firstValueByKeys(source, ["confidence", "score", "feature_confidence", "featureConfidence"]);
  return summary;
}

function visiblePalmFromSource(source) {
  const validity = firstObject(source.validity);
  return source.isValidPalmImage === true || (
    validity.is_palm_photo === true &&
    validity.is_single_hand === true &&
    validity.is_palm_side_visible === true &&
    validity.palm_lines_visible === true
  );
}

function fallbackDepth(summary) {
  const token = normalizeToken(summary.line_depth);
  if (token === "faint") {
    return "shallow";
  }
  return pickEnum(token, ["shallow", "medium", "deep"]);
}

function fallbackBreaks(summary) {
  const complexity = normalizeToken(summary.line_complexity);
  const continuity = normalizeToken(summary.line_continuity);
  if (continuity === "broken" || complexity === "complex") {
    return "major";
  }
  if (continuity === "mixed" || complexity === "medium") {
    return "minor";
  }
  if (continuity === "continuous" || complexity === "simple") {
    return "none";
  }
  return "unknown";
}

function fallbackBranches(summary) {
  const density = normalizeToken(summary.branch_density);
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

function fallbackContinuity(summary) {
  const token = normalizeToken(summary.line_continuity);
  if (token === "continuous") {
    return "continuous";
  }
  if (token === "broken") {
    return "broken";
  }
  if (token === "mixed") {
    return "partial";
  }
  return "unknown";
}

function fallbackShape(summary, key) {
  const token = normalizeToken(summary.palm_shape_hint);
  if (key === "width") {
    if (token === "wide" || token === "square") {
      return "wide";
    }
    if (token === "long") {
      return "medium";
    }
  }
  if (key === "length") {
    if (token === "long") {
      return "long";
    }
    if (token === "square" || token === "wide") {
      return "medium";
    }
  }
  return "unknown";
}

function normalizeMainLineType(value) {
  const token = normalizeToken(value).toUpperCase();
  return /^M[1-8]$/.test(token) ? token : "unknown";
}

function applyHighLevelLineFallback(line, summary, options = {}) {
  const confidence = clampConfidence(summary.confidence ?? options.confidence);
  if (options.visible && line.visible !== true) {
    line.visible = true;
  }
  if (line.length === "unknown" && options.length) {
    line.length = options.length;
  }
  const depth = fallbackDepth(summary);
  if (line.depth === "unknown" && depth !== "unknown") {
    line.depth = depth;
  }
  const breaks = fallbackBreaks(summary);
  if (line.breaks === "unknown" && breaks !== "unknown") {
    line.breaks = breaks;
  }
  if (line.confidence === 0 && confidence > 0) {
    line.confidence = confidence;
  }
}

function strengthFromFateLine(line) {
  const direct = pickEnum(line.strength, ["weak", "medium", "strong"], "");
  if (direct) {
    return direct;
  }
  const depth = normalizeToken(line.depth);
  const visibility = normalizeToken(line.visibility);
  if (["shallow", "faint", "weak"].includes(depth) || visibility === "faint") {
    return "weak";
  }
  if (depth === "medium") {
    return "medium";
  }
  if (["deep", "strong", "clear"].includes(depth) || visibility === "clear") {
    return "strong";
  }
  return "unknown";
}

function continuityFromFateLine(line) {
  const direct = pickEnum(line.continuity, ["broken", "partial", "continuous"], "");
  if (direct) {
    return direct;
  }
  const breaks = normalizeBreaks(line.breaks);
  if (breaks === "none") {
    return "continuous";
  }
  if (breaks === "minor") {
    return "partial";
  }
  if (breaks === "major") {
    return "broken";
  }
  return "unknown";
}

function applyLineDefaults(target, source) {
  target.visible = visibleFromLine(source);
  target.length = pickEnum(source.length, ["short", "medium", "long"]);
  target.depth = pickEnum(source.depth, ["shallow", "medium", "deep"]);
  target.breaks = normalizeBreaks(source.breaks);
  target.confidence = clampConfidence(source.confidence);
}

function applyFeatureSource(featureSet, source, rawResult, options) {
  const hand = firstObject(source.hand);
  const imageQuality = firstObject(source.imageQuality, source.image_quality, source.quality);
  const palmShape = firstObject(source.palmShape, source.palm_shape);
  const specialMarks = firstObject(source.specialMarks, source.special_marks);
  const summary = highLevelSummary(source);
  const hasVisiblePalm = visiblePalmFromSource(source);
  const summaryConfidence = clampConfidence(summary.confidence ?? source.confidence);
  featureSet.classificationSignals = {
    mainLineType: normalizeMainLineType(summary.main_line_type),
    lineDepth: pickEnum(summary.line_depth, ["deep", "medium", "faint", "unknown"], normalizeClassifierEnum(summary.line_depth, "lineDepth")),
    lineComplexity: pickEnum(summary.line_complexity, ["simple", "medium", "complex", "unknown"], normalizeClassifierEnum(summary.line_complexity, "lineComplexity")),
    lineContinuity: pickEnum(summary.line_continuity, ["continuous", "broken", "mixed", "unknown"], normalizeClassifierEnum(summary.line_continuity, "lineContinuity")),
    branchDensity: pickEnum(summary.branch_density, ["low", "medium", "high", "unknown"], normalizeClassifierEnum(summary.branch_density, "branchDensity")),
    palmShapeHint: pickEnum(summary.palm_shape_hint, ["long", "square", "wide", "unknown"], normalizeClassifierEnum(summary.palm_shape_hint, "palmShapeHint")),
    confidence: summaryConfidence,
  };

  featureSet.hand.side = pickEnum(firstString(hand.side, source.side, rawResult.side, options.side), [
    "left",
    "right",
    "unknown",
  ]);
  featureSet.hand.orientation = pickEnum(
    firstString(
      hand.orientation,
      source.orientation,
      hasVisiblePalm ? "palm" : ""
    ),
    ["palm", "back", "unknown"]
  );
  featureSet.hand.confidence = clampConfidence(hand.confidence || summaryConfidence);

  if (typeof imageQuality.usable === "boolean") {
    featureSet.imageQuality.usable = imageQuality.usable;
  } else if (typeof source.isValidPalmImage === "boolean" || hasVisiblePalm) {
    featureSet.imageQuality.usable = hasVisiblePalm;
  }
  featureSet.imageQuality.reasons = safeTextList(imageQuality.reasons).length
    ? safeTextList(imageQuality.reasons)
    : safeTextList(source.uncertainty);
  featureSet.imageQuality.brightness = pickEnum(imageQuality.brightness, [
    "low",
    "normal",
    "high",
    "unknown",
  ]);
  featureSet.imageQuality.blur = pickEnum(imageQuality.blur, [
    "low",
    "medium",
    "high",
    "unknown",
  ]);
  featureSet.imageQuality.occlusion = pickEnum(imageQuality.occlusion, [
    "none",
    "partial",
    "severe",
    "unknown",
  ]);
  featureSet.imageQuality.confidence = clampConfidence(imageQuality.confidence ?? source.confidence ?? summaryConfidence);

  const lifeLine = readLine(source, "lifeLine", "life_line");
  applyLineDefaults(featureSet.majorLines.lifeLine, lifeLine);
  featureSet.majorLines.lifeLine.curvature = curveFromLine(lifeLine);
  applyHighLevelLineFallback(featureSet.majorLines.lifeLine, summary, {
    visible: hasVisiblePalm,
    length: normalizeToken(summary.palm_shape_hint) === "long" ? "long" : "medium",
    confidence: summaryConfidence,
  });

  const headLine = readLine(source, "headLine", "head_line");
  applyLineDefaults(featureSet.majorLines.headLine, headLine);
  featureSet.majorLines.headLine.slope = slopeFromLine(headLine);
  applyHighLevelLineFallback(featureSet.majorLines.headLine, summary, {
    visible: hasVisiblePalm,
    length: "long",
    confidence: summaryConfidence,
  });
  if (featureSet.majorLines.headLine.slope === "unknown") {
    featureSet.majorLines.headLine.slope = normalizeToken(summary.line_complexity) === "complex" ? "downward" : "flat";
  }

  const heartLine = readLine(source, "heartLine", "heart_line");
  applyLineDefaults(featureSet.majorLines.heartLine, heartLine);
  featureSet.majorLines.heartLine.curvature = curveFromLine(heartLine);
  featureSet.majorLines.heartLine.ending = pickEnum(heartLine.ending, [
    "under_index",
    "between_index_middle",
    "under_middle",
    "unknown",
  ]);
  applyHighLevelLineFallback(featureSet.majorLines.heartLine, summary, {
    visible: hasVisiblePalm,
    length: "medium",
    confidence: summaryConfidence,
  });
  if (featureSet.majorLines.heartLine.curvature === "unknown") {
    featureSet.majorLines.heartLine.curvature = normalizeToken(summary.line_complexity) === "complex" ? "high" : "medium";
  }

  const fateLine = readLine(source, "fateLine", "fate_line");
  featureSet.majorLines.fateLine.visible = visibleFromLine(fateLine);
  featureSet.majorLines.fateLine.strength = strengthFromFateLine(fateLine);
  featureSet.majorLines.fateLine.continuity = continuityFromFateLine(fateLine);
  featureSet.majorLines.fateLine.confidence = clampConfidence(fateLine.confidence);
  if (featureSet.majorLines.fateLine.visible !== true && fallbackBranches(summary) !== "unknown") {
    featureSet.majorLines.fateLine.visible = hasVisiblePalm && fallbackBranches(summary) !== "none";
  }
  if (featureSet.majorLines.fateLine.strength === "unknown") {
    featureSet.majorLines.fateLine.strength = fallbackBranches(summary) === "many" ? "strong" : "medium";
  }
  if (featureSet.majorLines.fateLine.continuity === "unknown") {
    featureSet.majorLines.fateLine.continuity = fallbackContinuity(summary);
  }
  if (featureSet.majorLines.fateLine.confidence === 0 && summaryConfidence > 0) {
    featureSet.majorLines.fateLine.confidence = summaryConfidence;
  }

  featureSet.palmShape.palmWidth = pickEnum(palmShape.palmWidth ?? palmShape.palm_width, [
    "narrow",
    "medium",
    "wide",
    "unknown",
  ]);
  if (featureSet.palmShape.palmWidth === "unknown") {
    featureSet.palmShape.palmWidth = fallbackShape(summary, "width");
  }
  featureSet.palmShape.palmLength = pickEnum(palmShape.palmLength ?? palmShape.palm_length, [
    "short",
    "medium",
    "long",
    "unknown",
  ]);
  if (featureSet.palmShape.palmLength === "unknown") {
    featureSet.palmShape.palmLength = fallbackShape(summary, "length");
  }
  featureSet.palmShape.fingerLength = pickEnum(
    palmShape.fingerLength ?? palmShape.finger_length ?? palmShape.fingerProportion,
    ["short", "medium", "long", "unknown"]
  );
  if (featureSet.palmShape.fingerLength === "unknown") {
    featureSet.palmShape.fingerLength = fallbackShape(summary, "length");
  }
  featureSet.palmShape.confidence = clampConfidence(palmShape.confidence || summaryConfidence);

  featureSet.specialMarks.crosses = normalizeCount(specialMarks.crosses);
  featureSet.specialMarks.islands = aggregateCount(
    specialMarks.islands,
    lifeLine.islands,
    headLine.islands,
    heartLine.islands
  );
  featureSet.specialMarks.branches = aggregateCount(
    specialMarks.branches,
    lifeLine.branches,
    headLine.branches,
    heartLine.branches
  );
  if (featureSet.specialMarks.branches === "unknown") {
    featureSet.specialMarks.branches = fallbackBranches(summary);
  }
  featureSet.specialMarks.confidence = clampConfidence(specialMarks.confidence || summaryConfidence);
}

function normalizeVlmToPalmFeatureSet(rawResult = {}, options = {}) {
  const safeRawResult = isPlainObject(rawResult) ? rawResult : {};
  const safeOptions = isPlainObject(options) ? options : {};
  const source = { ...extractFeatureSource(safeRawResult) };

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) {
      delete source[key];
    }
  }

  const featureSet = createDefaultPalmFeatureSet({
    provider: firstString(safeOptions.provider, safeRawResult.provider),
    model: firstString(safeOptions.model, safeRawResult.model),
    requestId: firstString(
      safeRawResult.requestId,
      safeRawResult.request_id,
      safeRawResult.id,
      source.requestId,
      source.request_id
    ),
  });

  applyFeatureSource(featureSet, source, safeRawResult, safeOptions);
  return featureSet;
}

module.exports = {
  normalizeVlmToPalmFeatureSet,
};
