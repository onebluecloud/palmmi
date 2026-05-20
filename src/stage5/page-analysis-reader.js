(function palmmiPageAnalysisReader(global) {
const analysisStorageReader = (() => {
  if (typeof module !== "undefined" && module.exports && typeof require === "function") {
    return require("./analysis-result-storage-reader.js");
  }
  return global.PalmmiAnalysisResultStorageReader || null;
})();

const PAGE_ANALYSIS_ERRORS = Object.freeze({
  STORAGE_READ_FAILED: "PAGE_ANALYSIS_STORAGE_READ_FAILED",
  RESULT_MISSING: "PAGE_ANALYSIS_RESULT_MISSING",
  RESULT_INVALID: "PAGE_ANALYSIS_RESULT_INVALID",
  RESULT_NOT_READY: "PAGE_ANALYSIS_RESULT_NOT_READY",
  UNSUPPORTED_PAGE: "PAGE_ANALYSIS_UNSUPPORTED_PAGE",
  UNKNOWN: "UNKNOWN_ERROR",
});

const ERROR_MESSAGES = Object.freeze({
  [PAGE_ANALYSIS_ERRORS.STORAGE_READ_FAILED]: "Analysis result storage could not be read for this page.",
  [PAGE_ANALYSIS_ERRORS.RESULT_MISSING]: "No analysis result is available for this page.",
  [PAGE_ANALYSIS_ERRORS.RESULT_INVALID]: "Analysis result is not valid for this page.",
  [PAGE_ANALYSIS_ERRORS.RESULT_NOT_READY]: "Analysis result is not ready for this page.",
  [PAGE_ANALYSIS_ERRORS.UNSUPPORTED_PAGE]: "Unsupported analysis page.",
  [PAGE_ANALYSIS_ERRORS.UNKNOWN]: "Unknown page analysis reader error.",
});

const READER_ERROR_MAP = Object.freeze({
  ANALYSIS_STORAGE_UNAVAILABLE: PAGE_ANALYSIS_ERRORS.STORAGE_READ_FAILED,
  ANALYSIS_STORAGE_KEY_MISSING: PAGE_ANALYSIS_ERRORS.STORAGE_READ_FAILED,
  ANALYSIS_STORAGE_VALUE_MISSING: PAGE_ANALYSIS_ERRORS.RESULT_MISSING,
  ANALYSIS_STORAGE_JSON_INVALID: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
  ANALYSIS_RESULT_MISSING: PAGE_ANALYSIS_ERRORS.RESULT_MISSING,
  ANALYSIS_RESULT_SCHEMA_UNSUPPORTED: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
  ANALYSIS_RESULT_STATUS_INVALID: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
  ANALYSIS_RESULT_MALFORMED: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
  ANALYSIS_RESULT_UI_FIELD_MISSING: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
  UNKNOWN_ERROR: PAGE_ANALYSIS_ERRORS.STORAGE_READ_FAILED,
});

const SUPPORTED_PAGES = new Set(["result", "poster"]);

function normalizePage(page) {
  return typeof page === "string" ? page.trim() : "";
}

function errorResult(page, code) {
  return {
    ok: false,
    page,
    error: {
      code,
      message: ERROR_MESSAGES[code],
    },
  };
}

function pageErrorFromReader(page, readerError) {
  const sourceCode = readerError && readerError.code;
  const pageCode = READER_ERROR_MAP[sourceCode] || PAGE_ANALYSIS_ERRORS.UNKNOWN;
  return errorResult(page, pageCode);
}

function cloneStringArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function clonePersona(value) {
  return {
    id: value.id,
    name: value.name,
    confidence: value.confidence,
  };
}

function cloneSummary(value) {
  return {
    title: value.title,
    subtitle: value.subtitle,
    shortText: value.shortText,
    keywords: cloneStringArray(value.keywords),
  };
}

function cloneScores(value) {
  return {
    overallConfidence: value.overallConfidence,
    qualityScore: value.qualityScore,
    matchScore: value.matchScore,
  };
}

function cloneSections(value) {
  return Array.isArray(value)
    ? value.map((section) => ({
      key: section.key,
      title: section.title,
      content: section.content,
      source: section.source,
    }))
    : [];
}

function cloneUiConsumable(value) {
  return {
    personaId: value.personaId,
    personaName: value.personaName,
    confidence: value.confidence,
    status: value.status,
    qualityStatus: value.qualityStatus,
    primaryDisplayText: value.primaryDisplayText,
    secondaryDisplayText: value.secondaryDisplayText,
    warningBadges: cloneStringArray(value.warningBadges),
  };
}

function cloneDiagnostics(value) {
  return {
    lowConfidenceFieldCount: value.lowConfidenceFieldCount,
    missingFieldCount: value.missingFieldCount,
    unknownFieldCount: value.unknownFieldCount,
    adapterWarnings: cloneStringArray(value.adapterWarnings),
    providerWarnings: cloneStringArray(value.providerWarnings),
    matcherWarnings: cloneStringArray(value.matcherWarnings),
    contractWarnings: cloneStringArray(value.contractWarnings),
  };
}

function cloneTrace(value) {
  return {
    stage: value.stage,
    from: value.from,
    contract: value.contract,
    sourceImage: value.sourceImage,
    provider: value.provider,
    model: value.model,
    generatedAt: value.generatedAt,
  };
}

function isReadyForPage(data) {
  return data.status === "ok" || data.status === "degraded" || data.status === "failed";
}

function resultPageData(data) {
  return {
    schemaVersion: data.schemaVersion,
    status: data.status,
    persona: clonePersona(data.result.persona),
    summary: cloneSummary(data.result.summary),
    scores: cloneScores(data.result.scores),
    sections: cloneSections(data.result.sections),
    warnings: cloneStringArray(data.result.warnings),
    uiConsumable: cloneUiConsumable(data.uiConsumable),
    diagnostics: cloneDiagnostics(data.diagnostics),
    trace: cloneTrace(data.trace),
  };
}

function posterPageData(data) {
  return {
    schemaVersion: data.schemaVersion,
    status: data.status,
    summary: cloneSummary(data.result.summary),
    poster: {},
    warnings: cloneStringArray(data.result.warnings),
    uiConsumable: cloneUiConsumable(data.uiConsumable),
    diagnostics: cloneDiagnostics(data.diagnostics),
    trace: cloneTrace(data.trace),
  };
}

function dataForPage(page, data) {
  if (page === "result") {
    return resultPageData(data);
  }
  return posterPageData(data);
}

function readPageAnalysisData(pageName, options = {}) {
  const page = normalizePage(pageName);
  if (!SUPPORTED_PAGES.has(page)) {
    return errorResult(page || "unknown", PAGE_ANALYSIS_ERRORS.UNSUPPORTED_PAGE);
  }

  try {
    const response = analysisStorageReader.readLastAnalysisResultFromStorage(options);
    if (!response || response.ok !== true) {
      return pageErrorFromReader(page, response && response.error);
    }

    if (!isReadyForPage(response.data)) {
      return errorResult(page, PAGE_ANALYSIS_ERRORS.RESULT_NOT_READY);
    }

    return {
      ok: true,
      page,
      data: dataForPage(page, response.data),
    };
  } catch (error) {
    return errorResult(page, PAGE_ANALYSIS_ERRORS.UNKNOWN);
  }
}

function readResultPageAnalysisData(options = {}) {
  return readPageAnalysisData("result", options);
}

function readPosterPageAnalysisData(options = {}) {
  return readPageAnalysisData("poster", options);
}

const api = {
  PAGE_ANALYSIS_ERRORS,
  readPageAnalysisData,
  readPosterPageAnalysisData,
  readResultPageAnalysisData,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

global.PalmmiPageAnalysisReader = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
