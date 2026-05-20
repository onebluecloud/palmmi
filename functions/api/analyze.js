const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MAX_IMAGE_BYTES = 8388608;

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

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readEnvValue(env, names, fallback = "") {
  for (const name of names) {
    const value = env && env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function maxImageBytes(env) {
  const raw = readEnvValue(env, ["PALMMI_VLM_MAX_IMAGE_BYTES", "VLM_MAX_IMAGE_BYTES"], "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_IMAGE_BYTES;
}

function normalizeImage(inputImage = {}) {
  const image = isPlainObject(inputImage) ? inputImage : {};
  const size = Number.isFinite(image.size_bytes)
    ? image.size_bytes
    : Number.isFinite(image.fileSize)
      ? image.fileSize
      : Number.isFinite(image.size)
        ? image.size
        : 0;

  return {
    file_name: image.file_name || image.fileName || image.name || "palm.jpg",
    content_type: image.content_type || image.fileType || image.type || image.mime_type || "",
    size_bytes: size,
    side: image.side || image.handSide || "unknown",
  };
}

function createMockRecognitionResult({ requestId, image }) {
  const now = new Date().toISOString();
  return {
    status: "SUCCESS",
    schema: {
      name: "palmmi.recognition_result",
      version: "stage6c.preview.mock",
      status: "PASS",
    },
    request_id: requestId,
    anonymous_device_id: "pm_stage6c_preview",
    primary_mother: {
      id: "M1",
      name: "目标推进型",
      core_fields_matched: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
    },
    secondary_mother: null,
    is_dual_mother: false,
    primary_persona: {
      id: "P01",
      persona_id: "P01",
      name: "人生排位赛选手",
      mother_type: "M1",
      hook: "把目标拆清楚，再稳稳推进。",
      description: "这是 Stage 6C Preview 的 mock 结果，用于验证 Cloudflare Pages Functions、页面跳转和结果渲染，不代表真实 Qwen 识别。",
      score: 0.82,
      tags: ["Preview", "Mock", "M1"],
      matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
    },
    top3: [
      { id: "P01", persona_id: "P01", name: "人生排位赛选手", mother_type: "M1", score: 0.82 },
      { id: "P06", persona_id: "P06", name: "目标感整理者", mother_type: "M1", score: 0.74 },
      { id: "P12", persona_id: "P12", name: "节奏规划者", mother_type: "M4", score: 0.66 },
    ],
    quality_gate: {
      status: "PASS",
      passed: true,
      confidence: 0.8,
      reasons: ["stage6c_mock_preview_only"],
    },
    recognition: {
      explanation: {
        persona: {
          reason: "Preview mock 链路已返回可渲染结果。",
          matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
        },
        low_confidence: false,
      },
      image: {
        file_name: image.file_name,
        content_type: image.content_type,
        size_bytes: image.size_bytes,
        side: image.side,
      },
    },
    error_codes: [],
    cache: {
      hit: false,
    },
    generated_at: now,
    warnings: ["STAGE6C_PREVIEW_MOCK_ONLY"],
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
      return errorResponse("INVALID_REQUEST_BODY", null, 400);
    }

    const requestId = typeof body.request_id === "string" && body.request_id.trim()
      ? body.request_id.trim()
      : `req_${Date.now()}`;
    const provider = readEnvValue(context.env, ["PALMMI_VLM_PROVIDER", "VLM_PROVIDER"], "mock").toLowerCase();
    const mode = readEnvValue(context.env, ["PALMMI_VLM_MODE", "VLM_MODE"], "mock-only").toLowerCase();

    if (provider !== "mock" || mode !== "mock-only") {
      return errorResponse("REAL_VLM_DISABLED_IN_STAGE6C", requestId, 503);
    }

    const image = normalizeImage(body.image || body.upload || body.file);
    if (!ACCEPTED_IMAGE_TYPES.has(image.content_type)) {
      return errorResponse("FILE_TYPE_UNSUPPORTED", requestId, 400);
    }
    if (!Number.isFinite(image.size_bytes) || image.size_bytes <= 0 || image.size_bytes > maxImageBytes(context.env)) {
      return errorResponse("FILE_TOO_LARGE", requestId, 400);
    }

    const analysisResult = createMockRecognitionResult({ requestId, image });
    return jsonResponse({
      ok: true,
      request_id: requestId,
      status: analysisResult.status,
      provider: "mock",
      model: "stage6c-preview-mock",
      recognition_result: analysisResult,
      analysis_result: analysisResult,
      warnings: analysisResult.warnings,
    });
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
