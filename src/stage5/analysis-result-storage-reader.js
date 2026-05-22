(function palmmiAnalysisResultStorageReader(global) {
const analysisResultReadAdapter = (() => {
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    return require("./analysis-result-read-adapter.js");
  }
  return global.PalmmiAnalysisResultReadAdapter || null;
})();

const {
  readAnalysisResultForUI,
} = analysisResultReadAdapter || {};

const STABLE_ANALYSIS_RESULT_STORAGE_KEY = "palmmi:last-analysis";
const LEGACY_ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
const ANALYSIS_RESULT_STORAGE_KEY = STABLE_ANALYSIS_RESULT_STORAGE_KEY;

const ANALYSIS_RESULT_STORAGE_ERRORS = Object.freeze({
  STORAGE_UNAVAILABLE: "ANALYSIS_STORAGE_UNAVAILABLE",
  KEY_MISSING: "ANALYSIS_STORAGE_KEY_MISSING",
  VALUE_MISSING: "ANALYSIS_STORAGE_VALUE_MISSING",
  JSON_INVALID: "ANALYSIS_STORAGE_JSON_INVALID",
  UNKNOWN: "UNKNOWN_ERROR",
});

const ERROR_MESSAGES = Object.freeze({
  [ANALYSIS_RESULT_STORAGE_ERRORS.STORAGE_UNAVAILABLE]: "Analysis result storage is unavailable.",
  [ANALYSIS_RESULT_STORAGE_ERRORS.KEY_MISSING]: "Analysis result storage key is missing.",
  [ANALYSIS_RESULT_STORAGE_ERRORS.VALUE_MISSING]: "No analysis result found in storage.",
  [ANALYSIS_RESULT_STORAGE_ERRORS.JSON_INVALID]: "Analysis result storage value is not valid JSON.",
  [ANALYSIS_RESULT_STORAGE_ERRORS.UNKNOWN]: "Unknown analysis storage reader error.",
});

function errorResult(code) {
  return {
    ok: false,
    error: {
      code,
      message: ERROR_MESSAGES[code],
    },
  };
}

function getDefaultStorage() {
  try {
    return globalThis.sessionStorage || null;
  } catch (error) {
    return null;
  }
}

function isUsableStorage(storage) {
  return Boolean(storage && typeof storage.getItem === "function");
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringOrFallback(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberOrFallback(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function legacyStatus(value) {
  const status = stringOrFallback(value && value.status, "SUCCESS").toUpperCase();
  if (status === "LOW_CONFIDENCE") {
    return "degraded";
  }
  if (status === "RETRY_REQUIRED" || status === "REJECTED" || status === "ERROR") {
    return "failed";
  }
  return "ok";
}

function isLegacyRecognitionResult(value) {
  return isPlainObject(value)
    && !value.schemaVersion
    && (isPlainObject(value.primary_persona) || typeof value.status === "string");
}

function legacyRecognitionResultToAnalysisResult(value) {
  if (!isLegacyRecognitionResult(value)) {
    return null;
  }

  const persona = isPlainObject(value.primary_persona) ? value.primary_persona : {};
  const mother = isPlainObject(value.primary_mother) ? value.primary_mother : {};
  const recognition = isPlainObject(value.recognition) ? value.recognition : {};
  const explanation = isPlainObject(recognition.explanation) ? recognition.explanation : {};
  const personaExplanation = isPlainObject(explanation.persona) ? explanation.persona : {};
  const qualityGate = isPlainObject(value.quality_gate) ? value.quality_gate : {};
  const schema = isPlainObject(value.schema) ? value.schema : {};
  const id = stringOrFallback(persona.persona_id, stringOrFallback(persona.id, "LEGACY_PERSONA"));
  const name = stringOrFallback(persona.name, "Legacy Persona");
  const confidence = numberOrFallback(persona.score, numberOrFallback(persona.confidence, 1));
  const motherName = stringOrFallback(mother.name, stringOrFallback(persona.mother_type, ""));
  const keywords = [
    ...stringArray(persona.tags),
    ...[motherName, stringOrFallback(mother.id, stringOrFallback(persona.mother_type, ""))].filter(Boolean),
  ];
  const matchedFeatures = stringArray(persona.matched_features || personaExplanation.matched_features);
  const description = stringOrFallback(
    persona.description,
    stringOrFallback(persona.core_description, stringOrFallback(persona.hook, ""))
  );
  const status = legacyStatus(value);
  const warnings = [
    ...stringArray(value.error_codes),
    status === "degraded" ? "LOW_CONFIDENCE" : "",
    qualityGate.status && qualityGate.status !== "PASS" ? String(qualityGate.status) : "",
    schema.status && schema.status !== "PASS" ? String(schema.status) : "",
  ].filter(Boolean);

  return {
    schemaVersion: "analysis-result.v1",
    status,
    result: {
      persona: {
        id,
        name,
        confidence,
      },
      summary: {
        title: name,
        subtitle: motherName,
        shortText: stringOrFallback(persona.hook, description),
        keywords,
      },
      scores: {
        overallConfidence: confidence,
        qualityScore: numberOrFallback(qualityGate.confidence, null),
        matchScore: confidence,
      },
      sections: matchedFeatures.length
        ? matchedFeatures.map((feature) => ({
          key: feature,
          title: feature,
          content: description,
          source: "stage4-legacy",
        }))
        : [{
          key: "legacy-summary",
          title: "Legacy summary",
          content: description,
          source: "stage4-legacy",
        }],
      warnings,
    },
    uiConsumable: {
      personaId: id,
      personaName: name,
      confidence,
      status,
      qualityStatus: stringOrFallback(qualityGate.status, status === "degraded" ? "WARN" : "PASS"),
      primaryDisplayText: name,
      secondaryDisplayText: stringOrFallback(persona.hook, description),
      warningBadges: warnings,
    },
    diagnostics: {
      lowConfidenceFieldCount: status === "degraded" ? 1 : 0,
      missingFieldCount: 0,
      unknownFieldCount: 0,
      unknownFeatureCount: 0,
      usableFeatureCount: 0,
      scoreMargin: null,
      collapseRiskHint: false,
      classifierVersion: "legacy",
      adapterWarnings: [],
      providerWarnings: [],
      matcherWarnings: [],
      contractWarnings: ["LEGACY_STAGE4_RESULT_ADAPTED"],
    },
    trace: {
      stage: "5M",
      from: "stage4-legacy",
      contract: "analysis-result.v1",
      sourceImage: null,
      provider: null,
      model: null,
      generatedAt: stringOrFallback(value.created_at, new Date(0).toISOString()),
    },
  };
}

function normalizeKey(key) {
  return typeof key === "string" ? key.trim() : "";
}

function defaultKeys() {
  return [STABLE_ANALYSIS_RESULT_STORAGE_KEY, LEGACY_ANALYSIS_RESULT_STORAGE_KEY];
}

function readRawAnalysisValue(storage, keyOption) {
  const keys = keyOption === undefined
    ? defaultKeys()
    : [normalizeKey(keyOption)];
  const normalizedKeys = keys.filter(Boolean);
  if (normalizedKeys.length === 0) {
    return {
      ok: false,
      error: ANALYSIS_RESULT_STORAGE_ERRORS.KEY_MISSING,
    };
  }

  for (const key of normalizedKeys) {
    let raw;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      return {
        ok: false,
        error: ANALYSIS_RESULT_STORAGE_ERRORS.UNKNOWN,
      };
    }

    if (typeof raw === "string" && raw.length > 0) {
      return {
        ok: true,
        key,
        raw,
      };
    }
  }

  return {
    ok: false,
    error: ANALYSIS_RESULT_STORAGE_ERRORS.VALUE_MISSING,
  };
}

function unwrapStoredAnalysisResult(value) {
  if (isPlainObject(value) && isPlainObject(value.analysis_result)) {
    return value.analysis_result;
  }
  return value;
}

function readLastAnalysisResultFromStorage(options = {}) {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  if (!isUsableStorage(storage)) {
    return errorResult(ANALYSIS_RESULT_STORAGE_ERRORS.STORAGE_UNAVAILABLE);
  }

  const rawRead = readRawAnalysisValue(storage, options.key);
  if (!rawRead.ok) {
    return errorResult(rawRead.error);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawRead.raw);
  } catch (error) {
    return errorResult(ANALYSIS_RESULT_STORAGE_ERRORS.JSON_INVALID);
  }

  try {
    const analysisResult = unwrapStoredAnalysisResult(parsed);
    let readable = readAnalysisResultForUI(analysisResult);
    if (
      readable &&
      readable.ok === false &&
      readable.error &&
      readable.error.code === "ANALYSIS_RESULT_SCHEMA_UNSUPPORTED"
    ) {
      const legacyAnalysisResult = legacyRecognitionResultToAnalysisResult(analysisResult);
      if (legacyAnalysisResult) {
        readable = readAnalysisResultForUI(legacyAnalysisResult);
      }
    }
    if (readable && readable.ok === false) {
      return readable;
    }
    return {
      ok: true,
      data: readable,
    };
  } catch (error) {
    return errorResult(ANALYSIS_RESULT_STORAGE_ERRORS.UNKNOWN);
  }
}

const api = {
  ANALYSIS_RESULT_STORAGE_ERRORS,
  ANALYSIS_RESULT_STORAGE_KEY,
  LEGACY_ANALYSIS_RESULT_STORAGE_KEY,
  STABLE_ANALYSIS_RESULT_STORAGE_KEY,
  readLastAnalysisResultFromStorage,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

global.PalmmiAnalysisResultStorageReader = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
