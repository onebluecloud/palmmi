const ERROR_CODES = Object.freeze({
  VLM_PROVIDER_NOT_CONFIGURED: "VLM_PROVIDER_NOT_CONFIGURED",
  VLM_API_KEY_MISSING: "VLM_API_KEY_MISSING",
  VLM_API_TIMEOUT: "VLM_API_TIMEOUT",
  VLM_API_REQUEST_FAILED: "VLM_API_REQUEST_FAILED",
  VLM_API_INVALID_RESPONSE: "VLM_API_INVALID_RESPONSE",
  VLM_PROVIDER_UNAVAILABLE: "VLM_PROVIDER_UNAVAILABLE",
  VLM_RESPONSE_NORMALIZE_FAILED: "VLM_RESPONSE_NORMALIZE_FAILED",
  NOT_PALM: "NOT_PALM",
  IMAGE_NOT_CLEAR: "IMAGE_NOT_CLEAR",
  ANALYSIS_UNRELIABLE: "ANALYSIS_UNRELIABLE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_TYPE_UNSUPPORTED: "FILE_TYPE_UNSUPPORTED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
});

const USER_MESSAGES = Object.freeze({
  [ERROR_CODES.VLM_PROVIDER_NOT_CONFIGURED]: "当前分析服务暂不可用，请稍后再试。",
  [ERROR_CODES.VLM_API_KEY_MISSING]: "当前分析服务暂不可用，请稍后再试。",
  [ERROR_CODES.VLM_API_TIMEOUT]: "当前分析服务响应超时，请稍后再试。",
  [ERROR_CODES.VLM_API_REQUEST_FAILED]: "当前分析服务暂不可用，请稍后再试。",
  [ERROR_CODES.VLM_API_INVALID_RESPONSE]: "当前分析结果暂时无法读取，请重新上传后再试。",
  [ERROR_CODES.VLM_PROVIDER_UNAVAILABLE]: "当前分析服务暂不可用，请稍后再试。",
  [ERROR_CODES.VLM_RESPONSE_NORMALIZE_FAILED]: "当前分析结果暂时无法整理，请重新上传后再试。",
  [ERROR_CODES.NOT_PALM]: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
  [ERROR_CODES.IMAGE_NOT_CLEAR]: "照片掌纹不够清晰，请在光线均匀的位置重新拍摄，确保掌心完整、掌纹可见。",
  [ERROR_CODES.ANALYSIS_UNRELIABLE]: "本次识别结果不稳定，请换一张更清晰的掌心照片后重试。",
  [ERROR_CODES.FILE_TOO_LARGE]: "图片过大，请压缩后重新上传。",
  [ERROR_CODES.FILE_TYPE_UNSUPPORTED]: "图片格式不支持，请上传 JPG / PNG / WebP。",
  [ERROR_CODES.UNKNOWN_ERROR]: "分析流程暂时没有完成，请重新上传后再试。",
});

function publicMessageFor(code) {
  return USER_MESSAGES[code] || USER_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

function sanitizeDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) {
    return null;
  }
  const allowed = new Set([
    "providerStage",
    "endpointHost",
    "endpointPath",
    "model",
    "requestMethod",
    "contentType",
    "hasAuthHeader",
    "bodyFormat",
    "upstreamStatus",
    "upstreamErrorCode",
    "upstreamRequestId",
    "isTimeout",
    "isFetchFailed",
    "errorType",
  ]);
  const output = {};
  for (const [key, value] of Object.entries(diagnostics)) {
    if (!allowed.has(key)) {
      continue;
    }
    if (typeof value === "string") {
      output[key] = value.slice(0, 160);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      output[key] = value;
    }
  }
  return Object.keys(output).length > 0 ? output : null;
}

function createErrorResponse(code, requestId, overrides = {}) {
  const stableCode = USER_MESSAGES[code] ? code : ERROR_CODES.UNKNOWN_ERROR;
  const response = {
    ok: false,
    request_id: requestId || null,
    status: overrides.status || "RETRY_REQUIRED",
    error: {
      code: stableCode,
      message: overrides.message || publicMessageFor(stableCode),
      message_key: overrides.message_key || "retry_upload",
      retryable: overrides.retryable !== false,
    },
  };
  const diagnostics = sanitizeDiagnostics(overrides.diagnostics);
  if (diagnostics) {
    response.diagnostics = diagnostics;
  }
  return response;
}

function createProviderError(code, requestId, provider, model, overrides = {}) {
  const response = createErrorResponse(code, requestId, overrides);
  return {
    ...response,
    provider,
    model,
    errorCode: response.error.code,
  };
}

function mapProviderErrorCode(code) {
  if (USER_MESSAGES[code]) {
    return code;
  }
  if (code === "API_KEY_MISSING") {
    return ERROR_CODES.VLM_API_KEY_MISSING;
  }
  if (code === "TIMEOUT") {
    return ERROR_CODES.VLM_API_TIMEOUT;
  }
  if (code === "NOT_PALM") {
    return ERROR_CODES.NOT_PALM;
  }
  if (code === "IMAGE_NOT_CLEAR") {
    return ERROR_CODES.IMAGE_NOT_CLEAR;
  }
  if (code === "ANALYSIS_UNRELIABLE") {
    return ERROR_CODES.ANALYSIS_UNRELIABLE;
  }
  if (code === "INVALID_IMAGE" || code === "PARSE_FAILED") {
    return ERROR_CODES.VLM_API_INVALID_RESPONSE;
  }
  if (code === "REQUEST_FAILED") {
    return ERROR_CODES.VLM_API_REQUEST_FAILED;
  }
  if (code === "NOT_IMPLEMENTED") {
    return ERROR_CODES.VLM_PROVIDER_NOT_CONFIGURED;
  }
  return ERROR_CODES.UNKNOWN_ERROR;
}

module.exports = {
  ERROR_CODES,
  USER_MESSAGES,
  createErrorResponse,
  createProviderError,
  mapProviderErrorCode,
  publicMessageFor,
};
