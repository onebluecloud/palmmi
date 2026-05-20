import apiAnalyze from "../../api/analyze.js";

const { handleAnalyzeRequest } = apiAnalyze;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
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
      message: "分析服务暂时不可用，请重新上传后再试。",
      message_key: "retry_upload",
      retryable: true,
    },
  }, status);
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
  if (code === "VLM_API_KEY_MISSING" || code === "VLM_PROVIDER_NOT_CONFIGURED") {
    return 503;
  }
  if (code === "VLM_API_TIMEOUT") {
    return 504;
  }
  if (result && result.ok === false) {
    return 502;
  }
  return 200;
}

export async function onRequestPost(context) {
  try {
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
