const ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION = "analysis-result.v1";
const STAGE5H_TRACE_STAGE = "5H";
const IMAGE_NOT_CLEAR_MESSAGE = "这张照片掌纹不够清晰，请重新拍摄后再试。";

let frozenDisplayContent = [];
try {
  frozenDisplayContent = require("../../PalmTag_rule_engine_v0/data/display_content.json");
} catch (error) {
  frozenDisplayContent = [];
}

const FROZEN_DISPLAY_BY_PERSONA_ID = safeArray(frozenDisplayContent).reduce((mapping, item) => {
  if (item && typeof item.persona_id === "string" && item.persona_id.trim()) {
    mapping[item.persona_id.trim()] = item;
  }
  return mapping;
}, {});

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

function splitKeywordText(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  return value
    .split(/[、/，,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readDisplayContent(personaId) {
  const id = stringOrNull(personaId);
  return id && isPlainObject(FROZEN_DISPLAY_BY_PERSONA_ID[id])
    ? FROZEN_DISPLAY_BY_PERSONA_ID[id]
    : null;
}

function nestedObject(source, path) {
  let current = source;
  for (const key of path) {
    if (!isPlainObject(current)) {
      return {};
    }
    current = current[key];
  }
  return isPlainObject(current) ? current : {};
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

function buildSummary(persona, primaryPersona, displayPayload) {
  const shortText = stringOrNull(displayPayload.summary)
    || stringOrNull(primaryPersona.description)
    || stringOrNull(primaryPersona.hook)
    || "";
  return {
    title: stringOrNull(displayPayload.title) || persona.name,
    subtitle: stringOrNull(displayPayload.main_line_type) || stringOrNull(primaryPersona.mother_type) || "",
    shortText,
    keywords: displayPayload.traits.length ? displayPayload.traits : safeArray(primaryPersona.tags),
  };
}

function buildSections(primaryPersona, displayPayload) {
  const sections = [];
  const description = stringOrNull(displayPayload.description) || stringOrNull(primaryPersona.description);
  const hook = stringOrNull(displayPayload.summary) || stringOrNull(primaryPersona.hook);

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
  if (displayPayload.evidence) {
    sections.push({
      key: "evidence",
      title: "Evidence",
      content: displayPayload.evidence,
      source: "stage3-display-content",
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

function readPrimaryMother(recognitionResult) {
  return isPlainObject(recognitionResult.primary_mother) ? recognitionResult.primary_mother : {};
}

function readPersonaExplanation(recognitionResult) {
  return nestedObject(recognitionResult, ["recognition", "explanation", "persona"]);
}

function readCandidateResults(recognitionResult, primaryPersona, displayContent) {
  const top3 = safeArray(recognitionResult.top3);
  const candidates = top3.length ? top3 : [primaryPersona];
  return candidates
    .filter(isPlainObject)
    .slice(0, 3)
    .map((candidate) => {
      const id = stringOrNull(candidate.id) || stringOrNull(candidate.persona_id);
      const frozen = readDisplayContent(id);
      return {
        personality_id: id || "",
        personality_name: stringOrNull(candidate.name)
          || stringOrNull(frozen && frozen.persona_name)
          || "",
        main_line_type: stringOrNull(candidate.mother_type)
          || stringOrNull(displayContent && displayContent.main_line_type)
          || "",
        score: numberOrNull(candidate.score),
      };
    })
    .filter((candidate) => candidate.personality_id && candidate.personality_name);
}

function displayFeatureKeys(primaryPersona, recognitionResult) {
  const primaryMother = readPrimaryMother(recognitionResult);
  const explanation = readPersonaExplanation(recognitionResult);
  return uniqueStrings([
    ...safeArray(primaryPersona.matched_features),
    ...safeArray(explanation.matched_features),
    ...safeArray(primaryMother.core_fields_matched),
  ]);
}

function buildDisplayPayload({ persona, primaryPersona, recognitionResult, diagnostics, status, qualityGate }) {
  const displayContent = readDisplayContent(persona.id);
  const primaryMother = readPrimaryMother(recognitionResult);
  const features = displayFeatureKeys(primaryPersona, recognitionResult);
  const mainLineType = stringOrNull(primaryPersona.mother_type)
    || stringOrNull(primaryMother.id)
    || stringOrNull(displayContent && displayContent.mother_type)
    || "";
  const title = stringOrNull(displayContent && displayContent.poster_title)
    || stringOrNull(displayContent && displayContent.persona_name)
    || persona.name;
  const summary = stringOrNull(displayContent && displayContent.quote)
    || stringOrNull(displayContent && displayContent.hook)
    || stringOrNull(primaryPersona.hook)
    || stringOrNull(primaryPersona.description)
    || "";
  const description = stringOrNull(displayContent && displayContent.final_judgement)
    || stringOrNull(primaryPersona.description)
    || "";
  const traits = uniqueStrings([
    ...splitKeywordText(displayContent && displayContent.three_keywords),
    ...safeArray(primaryPersona.tags),
    mainLineType,
  ]);
  const evidence = features.length
    ? `本次结果主要参考：${features.slice(0, 4).join("、")}。`
    : "";
  const matchReason = stringOrNull(displayContent && displayContent.hook)
    || stringOrNull(readPersonaExplanation(recognitionResult).reason)
    || summary;
  const isDisplayable = Boolean(
    stringOrNull(persona.id)
      && stringOrNull(persona.name)
      && stringOrNull(mainLineType)
      && stringOrNull(title)
      && stringOrNull(summary)
      && stringOrNull(description)
      && stringOrNull(evidence)
  );
  const qualityFailed = qualityGate.passed === false || status === "failed";
  let qualityStatus = "OK";

  if (!isDisplayable || qualityFailed) {
    qualityStatus = "IMAGE_NOT_CLEAR";
  } else if (status === "degraded" && diagnostics.lowConfidenceFieldCount > 0) {
    qualityStatus = "LOW_CONFIDENCE";
  } else if (status === "degraded") {
    qualityStatus = "PARTIAL";
  }

  return {
    personality_id: persona.id,
    personality_name: persona.name,
    main_line_type: mainLineType,
    title,
    summary,
    description,
    evidence,
    features,
    traits,
    match_reason: matchReason,
    candidate_results: readCandidateResults(recognitionResult, primaryPersona, { main_line_type: mainLineType }),
    quality_status: qualityStatus,
    user_message: qualityStatus === "IMAGE_NOT_CLEAR"
      ? IMAGE_NOT_CLEAR_MESSAGE
      : qualityStatus === "LOW_CONFIDENCE"
        ? "这次图片可读性一般，结果更适合作为娱乐参考。"
        : "分析已完成。",
  };
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
  const displayPayload = buildDisplayPayload({
    persona,
    primaryPersona,
    recognitionResult,
    diagnostics,
    status,
    qualityGate,
  });
  const effectiveStatus = displayPayload.quality_status === "IMAGE_NOT_CLEAR" ? "failed" : status;
  const summary = buildSummary(persona, primaryPersona, displayPayload);
  const qualityScore = readQualityScore(qualityGate);
  const matchScore = topMatchScore(recognitionResult, primaryPersona);
  const warnings = buildWarnings(
    diagnosticsBase,
    qualityGate,
    displayPayload.quality_status === "IMAGE_NOT_CLEAR"
      ? uniqueStrings([...contractWarnings, "IMAGE_NOT_CLEAR"])
      : contractWarnings
  );

  return {
    schemaVersion: ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION,
    sourceSchemaVersion: sourceVersion,
    status: effectiveStatus,
    result: {
      persona,
      summary,
      scores: {
        overallConfidence: persona.confidence,
        qualityScore,
        matchScore,
      },
      sections: buildSections(primaryPersona, displayPayload),
      warnings,
    },
    uiConsumable: {
      personaId: persona.id,
      personaName: persona.name,
      confidence: persona.confidence,
      status: effectiveStatus,
      qualityStatus: displayPayload.quality_status || readQualityStatus(qualityGate),
      primaryDisplayText: displayPayload.title || summary.title,
      secondaryDisplayText: displayPayload.summary || summary.shortText,
      warningBadges: warnings,
    },
    diagnostics,
    trace: buildTrace(stage5bResult, recognitionResult, sourceVersion, options),
    ...displayPayload,
    internal: {
      stage5bResult,
    },
  };
}

module.exports = {
  ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION,
  buildAnalysisResultContract,
};
