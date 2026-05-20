import apiAnalyze from "../../api/analyze.js";

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

function stableError(code, requestId = null) {
  return {
    ok: false,
    request_id: requestId,
    status: "RETRY_REQUIRED",
    error: {
      code,
      message: "分析服务暂时不可用，请重新上传后再试。",
      message_key: "retry_upload",
      retryable: true,
    },
  };
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }
  return request.json();
}

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    if (!body || typeof body !== "object") {
      return jsonResponse(stableError("INVALID_REQUEST_BODY"), 400);
    }

    const result = await apiAnalyze.handleAnalyzeRequest(body, {
      env: context.env || {},
    });
    return jsonResponse(result, result && result.ok === true ? 200 : 400);
  } catch (error) {
    return jsonResponse(stableError("UNKNOWN_ERROR"), 500);
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") {
    return onRequestPost(context);
  }
  return jsonResponse(stableError("METHOD_NOT_ALLOWED"), 405);
}
