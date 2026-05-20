const PALM_FEATURE_SET_SCHEMA_VERSION = "palm-feature-set.v1";
const UNKNOWN = "unknown";

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.min(1, Math.max(0, number));
}

function createMajorLineDefaults() {
  return {
    visible: false,
    length: UNKNOWN,
    depth: UNKNOWN,
    breaks: UNKNOWN,
    confidence: 0,
  };
}

function createDefaultPalmFeatureSet(rawProvider = {}) {
  return {
    schemaVersion: PALM_FEATURE_SET_SCHEMA_VERSION,

    hand: {
      side: UNKNOWN,
      orientation: UNKNOWN,
      confidence: 0,
    },

    imageQuality: {
      usable: false,
      reasons: [],
      brightness: UNKNOWN,
      blur: UNKNOWN,
      occlusion: UNKNOWN,
      confidence: 0,
    },

    majorLines: {
      lifeLine: {
        ...createMajorLineDefaults(),
        curvature: UNKNOWN,
      },
      headLine: {
        ...createMajorLineDefaults(),
        slope: UNKNOWN,
      },
      heartLine: {
        ...createMajorLineDefaults(),
        curvature: UNKNOWN,
        ending: UNKNOWN,
      },
      fateLine: {
        visible: false,
        strength: UNKNOWN,
        continuity: UNKNOWN,
        confidence: 0,
      },
    },

    palmShape: {
      palmWidth: UNKNOWN,
      palmLength: UNKNOWN,
      fingerLength: UNKNOWN,
      confidence: 0,
    },

    specialMarks: {
      crosses: UNKNOWN,
      islands: UNKNOWN,
      branches: UNKNOWN,
      confidence: 0,
    },

    rawProvider: {
      provider: typeof rawProvider.provider === "string" && rawProvider.provider
        ? rawProvider.provider
        : UNKNOWN,
      model: typeof rawProvider.model === "string" && rawProvider.model
        ? rawProvider.model
        : UNKNOWN,
      requestId: typeof rawProvider.requestId === "string" && rawProvider.requestId
        ? rawProvider.requestId
        : null,
    },
  };
}

module.exports = {
  PALM_FEATURE_SET_SCHEMA_VERSION,
  UNKNOWN,
  clampConfidence,
  createDefaultPalmFeatureSet,
};
