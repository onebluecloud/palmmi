const RULE_VERSION = "v4.2";
const SCHEMA_VERSION = "stage3";

const FIELD_NAMES = [
  "PALM_LENGTH_RATIO",
  "INDEX_RING_RATIO",
  "THUMB_LENGTH_RATIO",
  "INDEX_LENGTH_RATIO",
  "PINKY_LENGTH_RATIO",
  "FINGER_SPREAD",
  "HAND_ASPECT_RATIO",
  "OVERALL_PROPORTION_FLAG",
  "FINGERTIP_SHAPE",
  "LIFE_LINE_DEPTH",
  "LIFE_LINE_LENGTH",
  "LIFE_LINE_CURVE",
  "HEAD_LINE_LENGTH",
  "HEAD_LINE_DEPTH",
  "HEAD_LINE_SLOPE",
  "HEAD_LIFE_GAP",
  "HEAD_LINE_END_FORK",
  "HEART_LINE_DEPTH",
  "HEART_LINE_LENGTH",
  "HEART_LINE_CURVE",
  "HEART_LINE_END_FORK",
  "SIMIAN_LINE",
  "CHUAN_PALM",
  "LINE_COMPLEXITY",
  "OVERALL_CLARITY",
  "FATE_LINE_CLARITY",
  "SUN_LINE_PRESENCE",
  "MOUNT_VENUS",
  "MOUNT_JUPITER",
  "MOUNT_SATURN",
  "MOUNT_APOLLO",
  "MOUNT_MERCURY",
  "MOUNT_LUNA",
];

const MOTHER_NAMES = {
  M1: "钢线型",
  M2: "暖纹型",
  M3: "密纹型",
  M4: "川字型",
  M5: "贯纹型",
  M6: "轨道型",
  M7: "月相型",
  M8: "复纹型",
};

function normalizeFeatureInput(input) {
  return input && input.normalized_33_fields ? input.normalized_33_fields : input;
}

function readField(features, field) {
  const value = features[field];
  return typeof value === "number" ? value : null;
}

function roundScore(value) {
  return Number(value.toFixed(4));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findMissingFields(features) {
  return FIELD_NAMES.filter((field) => !(field in features) || features[field] === null || features[field] === undefined);
}

module.exports = {
  FIELD_NAMES,
  MOTHER_NAMES,
  RULE_VERSION,
  SCHEMA_VERSION,
  findMissingFields,
  normalizeFeatureInput,
  readField,
  roundScore,
  unique,
};
