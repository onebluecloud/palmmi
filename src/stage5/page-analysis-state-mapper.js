(function palmmiPageAnalysisStateMapper(global) {
const ANALYSIS_PAGE_STATUSES = Object.freeze({
  PAGE_STORAGE_READ_FAILED: "PAGE_ANALYSIS_STORAGE_READ_FAILED",
  PAGE_RESULT_MISSING: "PAGE_ANALYSIS_RESULT_MISSING",
  PAGE_RESULT_INVALID: "PAGE_ANALYSIS_RESULT_INVALID",
  PAGE_RESULT_NOT_READY: "PAGE_ANALYSIS_RESULT_NOT_READY",
  ANALYSIS_SUCCESS: "ANALYSIS_SUCCESS",
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  ANALYSIS_PARTIAL: "ANALYSIS_PARTIAL",
  ANALYSIS_LOW_CONFIDENCE: "ANALYSIS_LOW_CONFIDENCE",
  ANALYSIS_EXPIRED: "ANALYSIS_EXPIRED",
  UNKNOWN: "UNKNOWN",
});

const STAGE4_PAGE_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  MISSING_RESULT: "missing-result",
  INVALID_RESULT: "invalid-result",
  PARTIAL_RESULT: "partial-result",
  ERROR: "error",
  FALLBACK: "fallback",
});

const KNOWN_STATUSES = new Set(Object.values(ANALYSIS_PAGE_STATUSES));

const UI_STATUS_TO_ANALYSIS_STATUS = Object.freeze({
  ok: ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS,
  failed: ANALYSIS_PAGE_STATUSES.ANALYSIS_FAILED,
});

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value) {
  const text = normalizeText(value);
  return KNOWN_STATUSES.has(text) ? text : ANALYSIS_PAGE_STATUSES.UNKNOWN;
}

function hasText(value) {
  return Boolean(normalizeText(value));
}

function readNestedObject(input, key) {
  return isPlainObject(input) && isPlainObject(input[key]) ? input[key] : null;
}

function readData(input) {
  return readNestedObject(input, "data");
}

function hasPersona(input) {
  if (isPlainObject(input) && typeof input.hasPersona === "boolean") {
    return input.hasPersona;
  }

  const data = readData(input) || input;
  if (!isPlainObject(data)) {
    return false;
  }

  const persona = readNestedObject(data, "persona");
  if (persona && hasText(persona.id) && hasText(persona.name)) {
    return true;
  }

  const uiConsumable = readNestedObject(data, "uiConsumable");
  return Boolean(uiConsumable && hasText(uiConsumable.personaId) && hasText(uiConsumable.personaName));
}

function hasCompletePosterPayload(input) {
  if (isPlainObject(input) && typeof input.hasCompletePosterPayload === "boolean") {
    return input.hasCompletePosterPayload;
  }

  const data = readData(input) || input;
  if (!isPlainObject(data)) {
    return false;
  }

  const summary = readNestedObject(data, "summary");
  const uiConsumable = readNestedObject(data, "uiConsumable");
  return Boolean(
    uiConsumable &&
    (hasText(data.summary) || (summary && (hasText(summary.title) || hasText(summary.shortText)))) &&
    hasText(uiConsumable.personaId) &&
    hasText(uiConsumable.personaName) &&
    hasText(data.personality_id) &&
    hasText(data.personality_name) &&
    hasText(data.main_line_type) &&
    hasText(data.description) &&
    (hasText(data.poster_title) || hasText(data.title)) &&
    (hasText(data.poster_quote) || hasText(data.summary))
  );
}

function userMessageFromInput(input) {
  const data = readData(input) || input;
  return isPlainObject(data) ? normalizeText(data.user_message) : "";
}

function statusFromPageResponse(input) {
  if (!isPlainObject(input)) {
    return null;
  }

  if (input.ok === false) {
    const error = readNestedObject(input, "error");
    return error ? normalizeText(error.code) : "";
  }

  const data = readData(input);
  if (data && hasText(data.status)) {
    const uiStatus = normalizeText(data.status);
    if (uiStatus === "degraded") {
      const diagnostics = readNestedObject(data, "diagnostics");
      const warnings = Array.isArray(data.warnings) ? data.warnings : [];
      if (
        (diagnostics && (diagnostics.missingFieldCount > 0 || diagnostics.unknownFieldCount > 0)) ||
        warnings.includes("PARTIAL_RESULT")
      ) {
        return ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL;
      }
      return ANALYSIS_PAGE_STATUSES.ANALYSIS_LOW_CONFIDENCE;
    }
    return UI_STATUS_TO_ANALYSIS_STATUS[uiStatus] || uiStatus;
  }

  return null;
}

function readAnalysisStatus(input) {
  if (typeof input === "string") {
    return normalizeStatus(input);
  }

  if (!isPlainObject(input)) {
    return ANALYSIS_PAGE_STATUSES.UNKNOWN;
  }

  const pageResponseStatus = statusFromPageResponse(input);
  if (pageResponseStatus) {
    return normalizeStatus(pageResponseStatus);
  }

  if (hasText(input.status)) {
    return normalizeStatus(input.status);
  }

  const error = readNestedObject(input, "error");
  if (error && hasText(error.code)) {
    return normalizeStatus(error.code);
  }

  return ANALYSIS_PAGE_STATUSES.UNKNOWN;
}

function mapping(page, analysisStatus, overrides) {
  return {
    page,
    analysisStatus,
    pageState: STAGE4_PAGE_STATES.ERROR,
    canRenderResult: false,
    canRenderPoster: false,
    shouldRedirectToUpload: false,
    shouldShowRetry: true,
    allowsPartialResult: false,
    requiresWarning: false,
    isPosterBlocked: page === "poster",
    usesFallback: false,
    severity: "error",
    message: "当前分析状态暂时无法展示，请重新测试。",
    ...overrides,
  };
}

function mapAnalysisStatusToResultPageState(input = {}) {
  const analysisStatus = readAnalysisStatus(input);
  const personaAvailable = hasPersona(input);
  const posterPayloadComplete = hasCompletePosterPayload(input);
  const userMessage = userMessageFromInput(input);

  switch (analysisStatus) {
    case ANALYSIS_PAGE_STATUSES.PAGE_RESULT_MISSING:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.MISSING_RESULT,
        shouldRedirectToUpload: true,
        message: "未找到分析结果，请重新测试或重新上传手掌图片。",
      });

    case ANALYSIS_PAGE_STATUSES.PAGE_RESULT_INVALID:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.INVALID_RESULT,
        shouldRedirectToUpload: true,
        message: "分析结果无法读取，请重新测试或重新上传手掌图片。",
      });

    case ANALYSIS_PAGE_STATUSES.PAGE_RESULT_NOT_READY:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.PARTIAL_RESULT,
        canRenderResult: personaAvailable,
        allowsPartialResult: personaAvailable,
        severity: "warning",
        message: personaAvailable
          ? "分析结果尚未完整生成，可以先展示简化结果。"
          : "分析结果尚未准备好，请稍后重试。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.READY,
        canRenderResult: true,
        canRenderPoster: true,
        shouldShowRetry: false,
        isPosterBlocked: false,
        severity: "info",
        message: "分析结果已准备好。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_FAILED:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        shouldRedirectToUpload: true,
        message: userMessage || "分析失败，请重新上传手掌图片。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.PARTIAL_RESULT,
        canRenderResult: personaAvailable,
        canRenderPoster: personaAvailable && posterPayloadComplete,
        allowsPartialResult: personaAvailable,
        isPosterBlocked: !(personaAvailable && posterPayloadComplete),
        severity: "warning",
        message: personaAvailable
          ? "分析结果部分字段缺失，可以展示简化结果。"
          : "分析结果部分字段缺失，请重新测试。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_LOW_CONFIDENCE:
      return mapping("result", analysisStatus, {
        pageState: personaAvailable ? STAGE4_PAGE_STATES.READY : STAGE4_PAGE_STATES.PARTIAL_RESULT,
        canRenderResult: personaAvailable,
        canRenderPoster: personaAvailable && posterPayloadComplete,
        allowsPartialResult: personaAvailable,
        requiresWarning: true,
        isPosterBlocked: !(personaAvailable && posterPayloadComplete),
        severity: "warning",
        message: "本次分析置信度较低，展示时必须带提示。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_EXPIRED:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.MISSING_RESULT,
        shouldRedirectToUpload: true,
        message: "分析结果已过期，请重新上传手掌图片。",
      });

    case ANALYSIS_PAGE_STATUSES.PAGE_STORAGE_READ_FAILED:
      return mapping("result", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        message: "分析结果读取失败，请重新测试。",
      });

    default:
      return mapping("result", ANALYSIS_PAGE_STATUSES.UNKNOWN, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        usesFallback: true,
        message: "未知分析状态，已进入安全兜底状态。",
      });
  }
}

function mapAnalysisStatusToPosterPageState(input = {}) {
  const analysisStatus = readAnalysisStatus(input);
  const personaAvailable = hasPersona(input);
  const posterPayloadComplete = hasCompletePosterPayload(input);
  const canRenderPoster = personaAvailable && posterPayloadComplete;
  const userMessage = userMessageFromInput(input);

  switch (analysisStatus) {
    case ANALYSIS_PAGE_STATUSES.PAGE_RESULT_MISSING:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.MISSING_RESULT,
        shouldRedirectToUpload: true,
        message: "未找到分析结果，请重新上传手掌图片后再生成海报。",
      });

    case ANALYSIS_PAGE_STATUSES.PAGE_RESULT_INVALID:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.INVALID_RESULT,
        shouldRedirectToUpload: true,
        message: "分析结果无法读取，请重新测试后再生成海报。",
      });

    case ANALYSIS_PAGE_STATUSES.PAGE_RESULT_NOT_READY:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        severity: "warning",
        message: "分析结果尚未准备好，禁止生成最终海报。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.READY,
        canRenderResult: true,
        canRenderPoster: true,
        shouldShowRetry: false,
        isPosterBlocked: false,
        severity: "info",
        message: "分析结果已准备好，可以生成海报。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_FAILED:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        shouldRedirectToUpload: true,
        message: userMessage || "分析失败，不能生成海报。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.PARTIAL_RESULT,
        canRenderResult: personaAvailable,
        canRenderPoster,
        allowsPartialResult: personaAvailable,
        isPosterBlocked: !canRenderPoster,
        severity: "warning",
        message: canRenderPoster
          ? "分析结果部分字段缺失，只能生成基础海报。"
          : "分析结果部分字段缺失，默认禁止生成最终海报。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_LOW_CONFIDENCE:
      return mapping("poster", analysisStatus, {
        pageState: canRenderPoster ? STAGE4_PAGE_STATES.READY : STAGE4_PAGE_STATES.PARTIAL_RESULT,
        canRenderResult: personaAvailable,
        canRenderPoster,
        allowsPartialResult: personaAvailable,
        requiresWarning: true,
        isPosterBlocked: !canRenderPoster,
        severity: "warning",
        message: canRenderPoster
          ? "低置信度结果可以生成海报，但必须带提示。"
          : "低置信度结果缺少完整海报字段，禁止生成最终海报。",
      });

    case ANALYSIS_PAGE_STATUSES.ANALYSIS_EXPIRED:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        shouldRedirectToUpload: true,
        message: "分析结果已过期，不能生成海报。",
      });

    case ANALYSIS_PAGE_STATUSES.PAGE_STORAGE_READ_FAILED:
      return mapping("poster", analysisStatus, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        message: "分析结果读取失败，不能生成海报。",
      });

    default:
      return mapping("poster", ANALYSIS_PAGE_STATUSES.UNKNOWN, {
        pageState: STAGE4_PAGE_STATES.ERROR,
        usesFallback: true,
        message: "未知分析状态，海报页已进入安全兜底状态。",
      });
  }
}

function mapAnalysisStatusToPageState(page, input = {}) {
  const normalizedPage = normalizeText(page);
  if (normalizedPage === "poster") {
    return mapAnalysisStatusToPosterPageState(input);
  }
  if (normalizedPage === "result") {
    return mapAnalysisStatusToResultPageState(input);
  }
  return mapping(normalizedPage || "unknown", ANALYSIS_PAGE_STATUSES.UNKNOWN, {
    pageState: STAGE4_PAGE_STATES.ERROR,
    usesFallback: true,
    message: "未知页面，已进入安全兜底状态。",
  });
}

const api = {
  ANALYSIS_PAGE_STATUSES,
  STAGE4_PAGE_STATES,
  mapAnalysisStatusToPageState,
  mapAnalysisStatusToPosterPageState,
  mapAnalysisStatusToResultPageState,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

global.PalmmiPageAnalysisStateMapper = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
