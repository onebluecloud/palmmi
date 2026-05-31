import apiAnalyze from "../../api/analyze.js";

const { handleAnalyzeRequest } = apiAnalyze;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const MAX_JSON_BODY_BYTES = 10 * 1024 * 1024;
const ERROR_MESSAGES = {
  INVALID_REQUEST_BODY: "请求内容无法读取，请重新上传照片后再试。",
  FILE_TOO_LARGE: "图片过大，请压缩后重新上传。",
  FILE_TYPE_UNSUPPORTED: "图片格式不支持，请上传 JPG / PNG / WebP。",
  REQUEST_TIMEOUT: "当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片。",
  DUPLICATE_SUBMISSION: "这张照片正在分析或刚刚分析过，请稍等片刻后再试。",
  METHOD_NOT_ALLOWED: "请求方式不支持。",
  UNKNOWN_ERROR: "分析流程暂时没有完成，请重新上传后再试。",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function errorResponse(code, requestId = null, status = 400) {
  return jsonResponse({
    ok: false,
    request_id: requestId,
    status: "RETRY_REQUIRED",
    error: {
      code,
      message: ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR,
      message_key: "retry_upload",
      retryable: true,
    },
  }, status);
}

function declaredContentLength(request) {
  const raw = request.headers.get("content-length");
  const value = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }
  return request.json();
}

function statusForResult(result) {
  const code = result && result.error ? result.error.code : "";
  if (code === "FILE_TOO_LARGE" || code === "FILE_TYPE_UNSUPPORTED" || code === "INVALID_REQUEST_BODY") {
    return 400;
  }
  if (code === "DUPLICATE_SUBMISSION") {
    return 429;
  }
  if (code === "VLM_API_KEY_MISSING" || code === "VLM_PROVIDER_NOT_CONFIGURED") {
    return 503;
  }
  if (code === "VLM_API_TIMEOUT" || code === "REQUEST_TIMEOUT") {
    return 504;
  }
  if (result && result.ok === false) {
    return 502;
  }
  return 200;
}

export async function onRequestPost(context) {
  try {
    if (declaredContentLength(context.request) > MAX_JSON_BODY_BYTES) {
      return errorResponse("FILE_TOO_LARGE", null, 413);
    }

    const body = await readJson(context.request);
    if (!body || typeof body !== "object") {
      return errorResponse("INVALID_REQUEST_BODY", null, 400);
    }

    const result = await handleAnalyzeRequest(body, {
      env: context.env || {},
      fetchImpl: fetch,
    });
    return jsonResponse(result, statusForResult(result));
  } catch (error) {
    return errorResponse("UNKNOWN_ERROR", null, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") {
    return onRequestPost(context);
  }
  return errorResponse("METHOD_NOT_ALLOWED", null, 405);
}
