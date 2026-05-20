const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  FIELD_NAMES,
} = require(path.join(root, "lib", "recognition", "recognitionTypes.ts"));
const {
  clampConfidence,
} = require("./palm-feature-set.js");

const RULE_INPUT_SCHEMA_VERSION = "rule-input.v1";
const UNKNOWN = "unknown";
const LOW_CONFIDENCE_THRESHOLD = 0.5;

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function objectAt(value, key) {
  return isPlainObject(value && value[key]) ? value[key] : {};
}

function text(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
}

function enumScore(value, mapping) {
  const token = text(value);
  if (!token || token === UNKNOWN || token === "unclear") {
    return 0;
  }
  return Number.isFinite(mapping[token]) ? mapping[token] : 0;
}

function lineMagnitudeScore(value) {
  return enumScore(value, {
    short: -1,
    shallow: -1,
    weak: -1,
    low: -1,
    medium: 0,
    normal: 0,
    partial: 0,
    long: 1,
    deep: 1,
    strong: 1,
    high: 1,
  });
}

function markScore(value) {
  return enumScore(value, {
    none: 0,
    few: 0.5,
    minor: 0.5,
    partial: 0.5,
    many: 1,
    major: 1,
    continuous: 1,
  });
}

function continuityScore(value) {
  return enumScore(value, {
    broken: -1,
    partial: 0,
    continuous: 1,
  });
}

function slopeScore(value) {
  return enumScore(value, {
    upward: -1,
    flat: 0,
    downward: 1,
  });
}

function endingScore(value) {
  return enumScore(value, {
    under_index: -1,
    between_index_middle: 0,
    under_middle: 1,
  });
}

function countMaxScore(...values) {
  return Math.max(...values.map(markScore), 0);
}

function toZeroToThree(value) {
  return enumScore(value, {
    short: 1,
    shallow: 1,
    weak: 1,
    low: 1,
    upward: 1,
    none: 0,
    few: 1,
    minor: 1,
    partial: 2,
    medium: 2,
    normal: 2,
    flat: 2,
    long: 3,
    deep: 3,
    strong: 3,
    high: 3,
    many: 3,
    major: 3,
    continuous: 3,
    downward: 3,
  });
}

function toBinary(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return enumScore(value, {
    true: 1,
    present: 1,
    visible: 1,
    yes: 1,
    none: 0,
    false: 0,
    absent: 0,
    no: 0,
  });
}

function toMountScore(value) {
  return enumScore(value, {
    narrow: 0,
    short: 0,
    low: 0,
    none: 0,
    medium: 1,
    normal: 1,
    wide: 2,
    long: 2,
    high: 2,
  });
}

function handSide(value) {
  const side = text(value);
  return side === "left" || side === "right" ? side : UNKNOWN;
}

function safeReasons(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function createEmptyFields() {
  return Object.fromEntries(FIELD_NAMES.map((field) => [field, 0]));
}

function setFinite(target, key, value) {
  target[key] = Number.isFinite(value) ? value : 0;
}

function collectFieldStates(palmFeatureSet) {
  const hand = objectAt(palmFeatureSet, "hand");
  const imageQuality = objectAt(palmFeatureSet, "imageQuality");
  const majorLines = objectAt(palmFeatureSet, "majorLines");
  const lifeLine = objectAt(majorLines, "lifeLine");
  const headLine = objectAt(majorLines, "headLine");
  const heartLine = objectAt(majorLines, "heartLine");
  const fateLine = objectAt(majorLines, "fateLine");
  const palmShape = objectAt(palmFeatureSet, "palmShape");
  const specialMarks = objectAt(palmFeatureSet, "specialMarks");

  return {
    hand,
    imageQuality,
    lifeLine,
    headLine,
    heartLine,
    fateLine,
    palmShape,
    specialMarks,
  };
}

function isUnknownValue(value) {
  return value === undefined || value === null || text(value) === UNKNOWN || text(value) === "";
}

function unknownFieldCount(states) {
  const values = [
    states.hand.side,
    states.hand.orientation,
    states.imageQuality.brightness,
    states.imageQuality.blur,
    states.imageQuality.occlusion,
    states.lifeLine.length,
    states.lifeLine.depth,
    states.lifeLine.curvature,
    states.lifeLine.breaks,
    states.headLine.length,
    states.headLine.depth,
    states.headLine.slope,
    states.headLine.breaks,
    states.heartLine.length,
    states.heartLine.depth,
    states.heartLine.curvature,
    states.heartLine.ending,
    states.fateLine.strength,
    states.fateLine.continuity,
    states.palmShape.palmWidth,
    states.palmShape.palmLength,
    states.palmShape.fingerLength,
    states.specialMarks.crosses,
    states.specialMarks.islands,
    states.specialMarks.branches,
  ];
  return values.filter(isUnknownValue).length;
}

function lowConfidenceFieldCount(states) {
  return [
    states.hand.confidence,
    states.imageQuality.confidence,
    states.lifeLine.confidence,
    states.headLine.confidence,
    states.heartLine.confidence,
    states.fateLine.confidence,
    states.palmShape.confidence,
    states.specialMarks.confidence,
  ].map(clampConfidence).filter((value) => value < LOW_CONFIDENCE_THRESHOLD).length;
}

function buildReadableFeatures(states) {
  return {
    handSide: handSide(states.hand.side),

    lifeLine: {
      visible: states.lifeLine.visible === true,
      lengthScore: lineMagnitudeScore(states.lifeLine.length),
      depthScore: lineMagnitudeScore(states.lifeLine.depth),
      curvatureScore: lineMagnitudeScore(states.lifeLine.curvature),
      breakScore: markScore(states.lifeLine.breaks),
      confidence: clampConfidence(states.lifeLine.confidence),
    },

    headLine: {
      visible: states.headLine.visible === true,
      lengthScore: lineMagnitudeScore(states.headLine.length),
      depthScore: lineMagnitudeScore(states.headLine.depth),
      slopeScore: slopeScore(states.headLine.slope),
      breakScore: markScore(states.headLine.breaks),
      confidence: clampConfidence(states.headLine.confidence),
    },

    heartLine: {
      visible: states.heartLine.visible === true,
      lengthScore: lineMagnitudeScore(states.heartLine.length),
      depthScore: lineMagnitudeScore(states.heartLine.depth),
      curvatureScore: lineMagnitudeScore(states.heartLine.curvature),
      endingScore: endingScore(states.heartLine.ending),
      confidence: clampConfidence(states.heartLine.confidence),
    },

    fateLine: {
      visible: states.fateLine.visible === true,
      strengthScore: lineMagnitudeScore(states.fateLine.strength),
      continuityScore: continuityScore(states.fateLine.continuity),
      confidence: clampConfidence(states.fateLine.confidence),
    },

    palmShape: {
      widthScore: lineMagnitudeScore(states.palmShape.palmWidth),
      lengthScore: lineMagnitudeScore(states.palmShape.palmLength),
      fingerLengthScore: lineMagnitudeScore(states.palmShape.fingerLength),
      confidence: clampConfidence(states.palmShape.confidence),
    },

    specialMarks: {
      crossesScore: markScore(states.specialMarks.crosses),
      islandsScore: markScore(states.specialMarks.islands),
      branchesScore: markScore(states.specialMarks.branches),
      confidence: clampConfidence(states.specialMarks.confidence),
    },
  };
}

function buildNormalized33Fields(states) {
  const fields = createEmptyFields();

  setFinite(fields, "PALM_LENGTH_RATIO", toZeroToThree(states.palmShape.palmLength));
  setFinite(fields, "THUMB_LENGTH_RATIO", toZeroToThree(states.palmShape.fingerLength));
  setFinite(fields, "INDEX_LENGTH_RATIO", toZeroToThree(states.palmShape.fingerLength));
  setFinite(fields, "PINKY_LENGTH_RATIO", toZeroToThree(states.palmShape.fingerLength));
  setFinite(fields, "HAND_ASPECT_RATIO", toMountScore(states.palmShape.palmWidth));
  setFinite(fields, "OVERALL_PROPORTION_FLAG", states.imageQuality.usable === true ? 1 : 0);

  setFinite(fields, "LIFE_LINE_DEPTH", toZeroToThree(states.lifeLine.depth));
  setFinite(fields, "LIFE_LINE_LENGTH", toZeroToThree(states.lifeLine.length));
  setFinite(fields, "LIFE_LINE_CURVE", toZeroToThree(states.lifeLine.curvature));
  setFinite(fields, "HEAD_LINE_LENGTH", toZeroToThree(states.headLine.length));
  setFinite(fields, "HEAD_LINE_DEPTH", toZeroToThree(states.headLine.depth));
  setFinite(fields, "HEAD_LINE_SLOPE", toZeroToThree(states.headLine.slope));
  setFinite(fields, "HEART_LINE_DEPTH", toZeroToThree(states.heartLine.depth));
  setFinite(fields, "HEART_LINE_LENGTH", toZeroToThree(states.heartLine.length));
  setFinite(fields, "HEART_LINE_CURVE", toZeroToThree(states.heartLine.curvature));

  setFinite(fields, "FATE_LINE_CLARITY", states.fateLine.visible === true ? toZeroToThree(states.fateLine.strength) : 0);
  setFinite(fields, "LINE_COMPLEXITY", Math.round(countMaxScore(
    states.specialMarks.crosses,
    states.specialMarks.islands,
    states.specialMarks.branches,
    states.lifeLine.breaks,
    states.headLine.breaks
  ) * 3));
  setFinite(fields, "OVERALL_CLARITY", states.imageQuality.usable === true
    ? 3 - Math.max(0, toZeroToThree(states.imageQuality.blur) - 1)
    : 0);

  setFinite(fields, "HEAD_LINE_END_FORK", toBinary(states.headLine.endFork));
  setFinite(fields, "HEART_LINE_END_FORK", toBinary(states.heartLine.endFork));
  setFinite(fields, "SIMIAN_LINE", toBinary(states.simianLine));
  setFinite(fields, "CHUAN_PALM", toBinary(states.chuanPalm));
  setFinite(fields, "SUN_LINE_PRESENCE", toBinary(states.sunLinePresence));

  return fields;
}

function buildWarnings(states, unknownCount, lowConfidenceCount) {
  const warnings = [];
  if (states.imageQuality.usable === false) {
    warnings.push("IMAGE_QUALITY_UNUSABLE");
  }
  if (unknownCount > 0) {
    warnings.push("UNKNOWN_FIELDS_DEFAULTED_TO_NEUTRAL");
  }
  if (lowConfidenceCount > 0) {
    warnings.push("LOW_CONFIDENCE_FIELDS_PRESENT");
  }
  return warnings;
}

function palmFeatureSetToRuleInput(palmFeatureSet = {}, options = {}) {
  const safeInput = isPlainObject(palmFeatureSet) ? palmFeatureSet : {};
  const safeOptions = isPlainObject(options) ? options : {};
  const states = collectFieldStates(safeInput);
  const rawProvider = objectAt(safeInput, "rawProvider");
  const unknownCount = unknownFieldCount(states);
  const lowConfidenceCount = lowConfidenceFieldCount(states);

  return {
    schemaVersion: RULE_INPUT_SCHEMA_VERSION,
    source: "palm-feature-set",

    features: buildReadableFeatures(states),
    normalized_33_fields: buildNormalized33Fields(states),

    qualityGate: {
      usable: states.imageQuality.usable === true,
      reasons: safeReasons(states.imageQuality.reasons),
      confidence: clampConfidence(states.imageQuality.confidence),
    },

    diagnostics: {
      unknownFieldCount: unknownCount,
      lowConfidenceFieldCount: lowConfidenceCount,
      warnings: buildWarnings(states, unknownCount, lowConfidenceCount),
      provider: typeof safeOptions.provider === "string" && safeOptions.provider
        ? safeOptions.provider
        : typeof rawProvider.provider === "string" && rawProvider.provider
          ? rawProvider.provider
          : UNKNOWN,
      model: typeof safeOptions.model === "string" && safeOptions.model
        ? safeOptions.model
        : typeof rawProvider.model === "string" && rawProvider.model
          ? rawProvider.model
          : UNKNOWN,
    },
  };
}

module.exports = {
  LOW_CONFIDENCE_THRESHOLD,
  RULE_INPUT_SCHEMA_VERSION,
  palmFeatureSetToRuleInput,
};
