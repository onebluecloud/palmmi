const ANALYSIS_INPUT_SCHEMA_VERSION = "analysis-input.v1";
const RECOGNITION_RESULT_SCHEMA_VERSION = "recognition-result.v1";

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function normalizeDiagnostics(value) {
  const diagnostics = isPlainObject(value) ? value : {};
  return {
    lowConfidenceFieldCount: Number.isFinite(diagnostics.lowConfidenceFieldCount)
      ? diagnostics.lowConfidenceFieldCount
      : 0,
    missingFieldCount: Number.isFinite(diagnostics.missingFieldCount)
      ? diagnostics.missingFieldCount
      : 0,
    unknownFieldCount: Number.isFinite(diagnostics.unknownFieldCount)
      ? diagnostics.unknownFieldCount
      : 0,
    adapterWarnings: Array.isArray(diagnostics.adapterWarnings) ? diagnostics.adapterWarnings : [],
    providerWarnings: Array.isArray(diagnostics.providerWarnings) ? diagnostics.providerWarnings : [],
    matcherWarnings: Array.isArray(diagnostics.matcherWarnings) ? diagnostics.matcherWarnings : [],
  };
}

function readFinalPersona(recognitionResult) {
  const finalPersona = isPlainObject(recognitionResult.finalPersona)
    ? recognitionResult.finalPersona
    : null;
  if (!finalPersona) {
    throw new Error("Stage 5G analysis input requires RecognitionResult.finalPersona.");
  }

  const id = stringOrNull(finalPersona.id);
  const name = stringOrNull(finalPersona.name);
  const confidence = numberOrNull(finalPersona.confidence);
  if (!id || !name || confidence === null) {
    throw new Error("Stage 5G RecognitionResult.finalPersona must include id, name, and numeric confidence.");
  }

  return {
    id,
    name,
    confidence,
  };
}

function recognitionResultToAnalysisInput(recognitionResult = {}) {
  if (!isPlainObject(recognitionResult)) {
    throw new Error("Stage 5G recognition result must be an object.");
  }
  if (recognitionResult.schemaVersion !== RECOGNITION_RESULT_SCHEMA_VERSION) {
    throw new Error(`Stage 5G expected ${RECOGNITION_RESULT_SCHEMA_VERSION}.`);
  }
  if (!isPlainObject(recognitionResult.personaMatch)) {
    throw new Error("Stage 5G analysis input requires RecognitionResult.personaMatch.");
  }

  return {
    schemaVersion: ANALYSIS_INPUT_SCHEMA_VERSION,
    sourceRecognitionResultSchemaVersion: recognitionResult.schemaVersion,
    sourceImage: recognitionResult.sourceImage || null,
    sampleId: recognitionResult.sampleId || null,
    provider: stringOrNull(recognitionResult.provider) || "unknown",
    model: stringOrNull(recognitionResult.model) || "unknown",
    status: stringOrNull(recognitionResult.status) || "UNKNOWN",
    finalPersona: readFinalPersona(recognitionResult),
    personaMatch: cloneObject(recognitionResult.personaMatch),
    qualityGate: isPlainObject(recognitionResult.qualityGate)
      ? cloneObject(recognitionResult.qualityGate)
      : null,
    diagnostics: normalizeDiagnostics(recognitionResult.diagnostics),
    trace: {
      from: RECOGNITION_RESULT_SCHEMA_VERSION,
      adapter: "recognition-result-to-analysis-input",
      stage: "5G",
    },
  };
}

module.exports = {
  ANALYSIS_INPUT_SCHEMA_VERSION,
  recognitionResultToAnalysisInput,
};
