const ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION = "analysis-result.v1";
const STAGE5H_TRACE_STAGE = "5H";

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function sourceRecognitionResult(stage5bResult) {
  return isPlainObject(stage5bResult.recognition_result)
    ? stage5bResult.recognition_result
    : stage5bResult;
}

function sourceSchemaVersion(stage5bResult, recognitionResult) {
  const schema = isPlainObject(recognitionResult.schema) ? recognitionResult.schema : {};
  return stringOrNull(schema.version)
    || stringOrNull(recognitionResult.schemaVersion)
    || stringOrNull(stage5bResult.sourceSchemaVersion)
    || stringOrNull(stage5bResult.schemaVersion)
    || "unknown";
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
    adapterWarnings: safeArray(diagnostics.adapterWarnings),
    providerWarnings: safeArray(diagnostics.providerWarnings),
    matcherWarnings: safeArray(diagnostics.matcherWarnings),
    contractWarnings: safeArray(diagnostics.contractWarnings),
  };
}

function diagnosticsFrom(stage5bResult, recognitionResult) {
  if (isPlainObject(stage5bResult.diagnostics)) {
    return normalizeDiagnostics(stage5bResult.diagnostics);
  }
  if (isPlainObject(stage5bResult.analysis_input) && isPlainObject(stage5bResult.analysis_input.diagnostics)) {
    return normalizeDiagnostics(stage5bResult.analysis_input.diagnostics);
  }
  if (isPlainObject(recognitionResult.debug) && isPlainObject(recognitionResult.debug.stage5g_diagnostics)) {
    return normalizeDiagnostics(recognitionResult.debug.stage5g_diagnostics);
  }
  return normalizeDiagnostics(null);
}

function topMatchScore(recognitionResult, primaryPersona) {
  if (Number.isFinite(primaryPersona.score)) {
    return primaryPersona.score;
  }
  if (Number.isFinite(primaryPersona.confidence)) {
    return primaryPersona.confidence;
  }
  const top3 = safeArray(recognitionResult.top3);
  const first = top3[0];
  if (isPlainObject(first) && (first.id === primaryPersona.id || first.persona_id === primaryPersona.id)) {
    const score = numberOrNull(first.score);
    return score === null ? numberOrNull(first.confidence) : score;
  }
  return null;
}

function readPersona(stage5bResult, recognitionResult) {
  const hasAnalysisInput = isPlainObject(stage5bResult.analysis_input);
  const finalPersona = hasAnalysisInput && isPlainObject(stage5bResult.analysis_input.finalPersona)
    ? stage5bResult.analysis_input.finalPersona
    : null;

  if (hasAnalysisInput) {
    const id = stringOrNull(finalPersona && finalPersona.id);
    const name = stringOrNull(finalPersona && finalPersona.name);
    const confidence = numberOrNull(finalPersona && finalPersona.confidence);
    if (!id || !name || confidence === null) {
      throw new Error("AnalysisResultContract requires persona id, name, and numeric confidence.");
    }
    return {
      id,
      name,
      confidence,
    };
  }

  const primaryPersona = isPlainObject(recognitionResult.primary_persona)
    ? recognitionResult.primary_persona
    : {};
  const id = stringOrNull(primaryPersona.id)
    || stringOrNull(primaryPersona.persona_id);
  const name = stringOrNull(primaryPersona.name);
  const confidence = topMatchScore(recognitionResult, primaryPersona);

  if (!id || !name || confidence === null) {
    throw new Error("AnalysisResultContract requires persona id, name, and numeric confidence.");
  }

  return {
    id,
    name,
    confidence,
  };
}

function readPrimaryPersona(recognitionResult) {
  return isPlainObject(recognitionResult.primary_persona) ? recognitionResult.primary_persona : {};
}

function readQualityGate(recognitionResult) {
  return isPlainObject(recognitionResult.quality_gate) ? recognitionResult.quality_gate : {};
}

function readQualityScore(qualityGate) {
  return numberOrNull(qualityGate.confidence);
}

function readQualityStatus(qualityGate) {
  return stringOrNull(qualityGate.status) || (qualityGate.passed === false ? "FAILED" : "UNKNOWN");
}

function buildSummary(persona, primaryPersona) {
  const shortText = stringOrNull(primaryPersona.description)
    || stringOrNull(primaryPersona.hook)
    || "";
  return {
    title: persona.name,
    subtitle: stringOrNull(primaryPersona.mother_type) || "",
    shortText,
    keywords: safeArray(primaryPersona.tags),
  };
}

function buildSections(primaryPersona) {
  const sections = [];
  const description = stringOrNull(primaryPersona.description);
  const hook = stringOrNull(primaryPersona.hook);

  if (description) {
    sections.push({
      key: "persona",
      title: "Persona",
      content: description,
      source: "stage5b",
    });
  }
  if (hook && hook !== description) {
    sections.push({
      key: "hook",
      title: "Hook",
      content: hook,
      source: "stage5b",
    });
  }
  return sections;
}

function hasDiagnosticsSignal(diagnostics) {
  return diagnostics.lowConfidenceFieldCount > 0
    || diagnostics.missingFieldCount > 0
    || diagnostics.unknownFieldCount > 0
    || diagnostics.adapterWarnings.length > 0
    || diagnostics.providerWarnings.length > 0
    || diagnostics.matcherWarnings.length > 0;
}

function isLowConfidence(stage5bResult, recognitionResult) {
  return stage5bResult.status === "LOW_CONFIDENCE"
    || recognitionResult.status === "LOW_CONFIDENCE"
    || (isPlainObject(recognitionResult.recognition)
      && isPlainObject(recognitionResult.recognition.explanation)
      && recognitionResult.recognition.explanation.low_confidence === true);
}

function contractStatus(stage5bResult, recognitionResult, diagnostics, qualityGate) {
  if (stage5bResult.ok === false || recognitionResult.status === "FAILED" || recognitionResult.status === "RETRY_REQUIRED") {
    return "failed";
  }
  if (qualityGate.passed === false || isLowConfidence(stage5bResult, recognitionResult) || hasDiagnosticsSignal(diagnostics)) {
    return "degraded";
  }
  return "ok";
}

function buildWarnings(diagnostics, qualityGate, contractWarnings) {
  return uniqueStrings([
    ...diagnostics.adapterWarnings,
    ...diagnostics.providerWarnings,
    ...diagnostics.matcherWarnings,
    ...safeArray(qualityGate.reasons),
    ...contractWarnings,
  ]);
}

function buildTrace(stage5bResult, recognitionResult, sourceVersion, options) {
  const analysisInput = isPlainObject(stage5bResult.analysis_input) ? stage5bResult.analysis_input : {};
  const imageInput = isPlainObject(recognitionResult.image_input) ? recognitionResult.image_input : {};
  const providerMeta = isPlainObject(recognitionResult.provider_meta) ? recognitionResult.provider_meta : {};
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  return {
    stage: STAGE5H_TRACE_STAGE,
    from: sourceVersion,
    contract: ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION,
    sourceImage: stringOrNull(analysisInput.sourceImage)
      || stringOrNull(stage5bResult.sourceImage)
      || stringOrNull(imageInput.upload_ref)
      || stringOrNull(imageInput.file_name),
    provider: stringOrNull(stage5bResult.provider)
      || stringOrNull(providerMeta.provider)
      || stringOrNull(analysisInput.provider),
    model: stringOrNull(providerMeta.model)
      || stringOrNull(analysisInput.model)
      || stringOrNull(stage5bResult.model),
    generatedAt: now(),
  };
}

function buildAnalysisResultContract(stage5bResult, options = {}) {
  if (!isPlainObject(stage5bResult)) {
    throw new Error("AnalysisResultContract source must be an object.");
  }

  const recognitionResult = sourceRecognitionResult(stage5bResult);
  const sourceVersion = sourceSchemaVersion(stage5bResult, recognitionResult);
  const primaryPersona = readPrimaryPersona(recognitionResult);
  const persona = readPersona(stage5bResult, recognitionResult);
  const qualityGate = readQualityGate(recognitionResult);
  const diagnosticsBase = diagnosticsFrom(stage5bResult, recognitionResult);
  const status = contractStatus(stage5bResult, recognitionResult, diagnosticsBase, qualityGate);
  const contractWarnings = uniqueStrings([
    ...diagnosticsBase.contractWarnings,
    status === "degraded" ? "CONTRACT_DEGRADED" : "",
    status === "failed" ? "CONTRACT_FAILED" : "",
    sourceVersion === "unknown" ? "SOURCE_SCHEMA_UNKNOWN" : "",
  ]);
  const diagnostics = {
    ...diagnosticsBase,
    contractWarnings,
  };
  const summary = buildSummary(persona, primaryPersona);
  const qualityScore = readQualityScore(qualityGate);
  const matchScore = topMatchScore(recognitionResult, primaryPersona);
  const warnings = buildWarnings(diagnosticsBase, qualityGate, contractWarnings);

  return {
    schemaVersion: ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION,
    sourceSchemaVersion: sourceVersion,
    status,
    result: {
      persona,
      summary,
      scores: {
        overallConfidence: persona.confidence,
        qualityScore,
        matchScore,
      },
      sections: buildSections(primaryPersona),
      warnings,
    },
    uiConsumable: {
      personaId: persona.id,
      personaName: persona.name,
      confidence: persona.confidence,
      status,
      qualityStatus: readQualityStatus(qualityGate),
      primaryDisplayText: summary.title,
      secondaryDisplayText: summary.shortText,
      warningBadges: warnings,
    },
    diagnostics,
    trace: buildTrace(stage5bResult, recognitionResult, sourceVersion, options),
    internal: {
      stage5bResult,
    },
  };
}

module.exports = {
  ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION,
  buildAnalysisResultContract,
};
