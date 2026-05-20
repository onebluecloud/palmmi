(function palmmiAnalysisResultReadAdapter(global) {
const ANALYSIS_RESULT_SCHEMA_VERSION = "analysis-result.v1";

const ANALYSIS_RESULT_READ_ERRORS = Object.freeze({
  MISSING: "ANALYSIS_RESULT_MISSING",
  SCHEMA_UNSUPPORTED: "ANALYSIS_RESULT_SCHEMA_UNSUPPORTED",
  STATUS_INVALID: "ANALYSIS_RESULT_STATUS_INVALID",
  MALFORMED: "ANALYSIS_RESULT_MALFORMED",
  UI_FIELD_MISSING: "ANALYSIS_RESULT_UI_FIELD_MISSING",
});

const ERROR_MESSAGES = Object.freeze({
  [ANALYSIS_RESULT_READ_ERRORS.MISSING]: "Analysis result is missing.",
  [ANALYSIS_RESULT_READ_ERRORS.SCHEMA_UNSUPPORTED]: "Unsupported analysis result schema.",
  [ANALYSIS_RESULT_READ_ERRORS.STATUS_INVALID]: "Analysis result status is invalid.",
  [ANALYSIS_RESULT_READ_ERRORS.MALFORMED]: "Analysis result is malformed.",
  [ANALYSIS_RESULT_READ_ERRORS.UI_FIELD_MISSING]: "Analysis result UI field is missing.",
});

const ALLOWED_STATUSES = new Set(["ok", "degraded", "failed"]);

function errorResult(code) {
  return {
    ok: false,
    error: {
      code,
      message: ERROR_MESSAGES[code],
    },
  };
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isString(value) {
  return typeof value === "string";
}

function isNumberOrNull(value) {
  return Number.isFinite(value) || value === null;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isString);
}

function isSectionArray(value) {
  return Array.isArray(value) && value.every((section) => (
    isPlainObject(section)
      && isString(section.key)
      && isString(section.title)
      && isString(section.content)
      && isString(section.source)
  ));
}

function hasPersonaShape(value) {
  return isPlainObject(value)
    && isString(value.id)
    && isString(value.name)
    && Number.isFinite(value.confidence);
}

function hasSummaryShape(value) {
  return isPlainObject(value)
    && isString(value.title)
    && isString(value.subtitle)
    && isString(value.shortText)
    && isStringArray(value.keywords);
}

function hasScoresShape(value) {
  return isPlainObject(value)
    && Number.isFinite(value.overallConfidence)
    && isNumberOrNull(value.qualityScore)
    && isNumberOrNull(value.matchScore);
}

function hasResultShape(value) {
  return isPlainObject(value)
    && hasPersonaShape(value.persona)
    && hasSummaryShape(value.summary)
    && hasScoresShape(value.scores)
    && isSectionArray(value.sections)
    && isStringArray(value.warnings);
}

function hasUiConsumableShape(value) {
  return isPlainObject(value)
    && isString(value.personaId)
    && isString(value.personaName)
    && Number.isFinite(value.confidence)
    && isString(value.status)
    && isString(value.qualityStatus)
    && isString(value.primaryDisplayText)
    && isString(value.secondaryDisplayText)
    && isStringArray(value.warningBadges);
}

function hasDiagnosticsShape(value) {
  return isPlainObject(value)
    && Number.isFinite(value.lowConfidenceFieldCount)
    && Number.isFinite(value.missingFieldCount)
    && Number.isFinite(value.unknownFieldCount)
    && isStringArray(value.adapterWarnings)
    && isStringArray(value.providerWarnings)
    && isStringArray(value.matcherWarnings)
    && isStringArray(value.contractWarnings);
}

function isStringOrNull(value) {
  return isString(value) || value === null;
}

function hasTraceShape(value) {
  return isPlainObject(value)
    && isString(value.stage)
    && isString(value.from)
    && isString(value.contract)
    && isStringOrNull(value.sourceImage)
    && isStringOrNull(value.provider)
    && isStringOrNull(value.model)
    && isString(value.generatedAt);
}

function cloneStringArray(value) {
  return value.slice();
}

function cloneSections(sections) {
  return sections.map((section) => ({
    key: section.key,
    title: section.title,
    content: section.content,
    source: section.source,
  }));
}

function readAnalysisResultForUI(analysisResult) {
  if (!isPlainObject(analysisResult)) {
    return errorResult(ANALYSIS_RESULT_READ_ERRORS.MISSING);
  }

  if (analysisResult.schemaVersion !== ANALYSIS_RESULT_SCHEMA_VERSION) {
    return errorResult(ANALYSIS_RESULT_READ_ERRORS.SCHEMA_UNSUPPORTED);
  }

  if (!ALLOWED_STATUSES.has(analysisResult.status)) {
    return errorResult(ANALYSIS_RESULT_READ_ERRORS.STATUS_INVALID);
  }

  if (!isPlainObject(analysisResult.result) || !hasResultShape(analysisResult.result)) {
    return errorResult(ANALYSIS_RESULT_READ_ERRORS.MALFORMED);
  }

  if (!hasUiConsumableShape(analysisResult.uiConsumable)) {
    return errorResult(ANALYSIS_RESULT_READ_ERRORS.UI_FIELD_MISSING);
  }

  if (!hasDiagnosticsShape(analysisResult.diagnostics) || !hasTraceShape(analysisResult.trace)) {
    return errorResult(ANALYSIS_RESULT_READ_ERRORS.MALFORMED);
  }

  return {
    schemaVersion: ANALYSIS_RESULT_SCHEMA_VERSION,
    status: analysisResult.status,
    result: {
      persona: {
        id: analysisResult.result.persona.id,
        name: analysisResult.result.persona.name,
        confidence: analysisResult.result.persona.confidence,
      },
      summary: {
        title: analysisResult.result.summary.title,
        subtitle: analysisResult.result.summary.subtitle,
        shortText: analysisResult.result.summary.shortText,
        keywords: cloneStringArray(analysisResult.result.summary.keywords),
      },
      scores: {
        overallConfidence: analysisResult.result.scores.overallConfidence,
        qualityScore: analysisResult.result.scores.qualityScore,
        matchScore: analysisResult.result.scores.matchScore,
      },
      sections: cloneSections(analysisResult.result.sections),
      warnings: cloneStringArray(analysisResult.result.warnings),
    },
    uiConsumable: {
      personaId: analysisResult.uiConsumable.personaId,
      personaName: analysisResult.uiConsumable.personaName,
      confidence: analysisResult.uiConsumable.confidence,
      status: analysisResult.uiConsumable.status,
      qualityStatus: analysisResult.uiConsumable.qualityStatus,
      primaryDisplayText: analysisResult.uiConsumable.primaryDisplayText,
      secondaryDisplayText: analysisResult.uiConsumable.secondaryDisplayText,
      warningBadges: cloneStringArray(analysisResult.uiConsumable.warningBadges),
    },
    diagnostics: {
      lowConfidenceFieldCount: analysisResult.diagnostics.lowConfidenceFieldCount,
      missingFieldCount: analysisResult.diagnostics.missingFieldCount,
      unknownFieldCount: analysisResult.diagnostics.unknownFieldCount,
      adapterWarnings: cloneStringArray(analysisResult.diagnostics.adapterWarnings),
      providerWarnings: cloneStringArray(analysisResult.diagnostics.providerWarnings),
      matcherWarnings: cloneStringArray(analysisResult.diagnostics.matcherWarnings),
      contractWarnings: cloneStringArray(analysisResult.diagnostics.contractWarnings),
    },
    trace: {
      stage: analysisResult.trace.stage,
      from: analysisResult.trace.from,
      contract: analysisResult.trace.contract,
      sourceImage: analysisResult.trace.sourceImage,
      provider: analysisResult.trace.provider,
      model: analysisResult.trace.model,
      generatedAt: analysisResult.trace.generatedAt,
    },
  };
}

const api = {
  ANALYSIS_RESULT_READ_ERRORS,
  ANALYSIS_RESULT_SCHEMA_VERSION,
  readAnalysisResultForUI,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

global.PalmmiAnalysisResultReadAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
