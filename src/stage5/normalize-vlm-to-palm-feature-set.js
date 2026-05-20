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

  featureSet.hand.side = pickEnum(firstString(hand.side, source.side, rawResult.side, options.side), [
    "left",
    "right",
    "unknown",
  ]);
  featureSet.hand.orientation = pickEnum(
    firstString(
      hand.orientation,
      source.orientation,
      typeof source.isValidPalmImage === "boolean" && source.isValidPalmImage ? "palm" : ""
    ),
    ["palm", "back", "unknown"]
  );
  featureSet.hand.confidence = clampConfidence(hand.confidence);

  if (typeof imageQuality.usable === "boolean") {
    featureSet.imageQuality.usable = imageQuality.usable;
  } else if (typeof source.isValidPalmImage === "boolean") {
    featureSet.imageQuality.usable = source.isValidPalmImage;
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
  featureSet.imageQuality.confidence = clampConfidence(imageQuality.confidence ?? source.confidence);

  const lifeLine = readLine(source, "lifeLine", "life_line");
  applyLineDefaults(featureSet.majorLines.lifeLine, lifeLine);
  featureSet.majorLines.lifeLine.curvature = curveFromLine(lifeLine);

  const headLine = readLine(source, "headLine", "head_line");
  applyLineDefaults(featureSet.majorLines.headLine, headLine);
  featureSet.majorLines.headLine.slope = slopeFromLine(headLine);

  const heartLine = readLine(source, "heartLine", "heart_line");
  applyLineDefaults(featureSet.majorLines.heartLine, heartLine);
  featureSet.majorLines.heartLine.curvature = curveFromLine(heartLine);
  featureSet.majorLines.heartLine.ending = pickEnum(heartLine.ending, [
    "under_index",
    "between_index_middle",
    "under_middle",
    "unknown",
  ]);

  const fateLine = readLine(source, "fateLine", "fate_line");
  featureSet.majorLines.fateLine.visible = visibleFromLine(fateLine);
  featureSet.majorLines.fateLine.strength = strengthFromFateLine(fateLine);
  featureSet.majorLines.fateLine.continuity = continuityFromFateLine(fateLine);
  featureSet.majorLines.fateLine.confidence = clampConfidence(fateLine.confidence);

  featureSet.palmShape.palmWidth = pickEnum(palmShape.palmWidth ?? palmShape.palm_width, [
    "narrow",
    "medium",
    "wide",
    "unknown",
  ]);
  featureSet.palmShape.palmLength = pickEnum(palmShape.palmLength ?? palmShape.palm_length, [
    "short",
    "medium",
    "long",
    "unknown",
  ]);
  featureSet.palmShape.fingerLength = pickEnum(
    palmShape.fingerLength ?? palmShape.finger_length ?? palmShape.fingerProportion,
    ["short", "medium", "long", "unknown"]
  );
  featureSet.palmShape.confidence = clampConfidence(palmShape.confidence);

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
  featureSet.specialMarks.confidence = clampConfidence(specialMarks.confidence);
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
