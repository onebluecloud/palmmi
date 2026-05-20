(function palmmiAnalyzeApiClient(global) {
  const DEFAULT_ANALYZE_ENDPOINT = "/api/analyze";

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function canUseApi(options = {}) {
    if (options.enabled === false) {
      return false;
    }
    const locationLike = options.location || global.location || {};
    const protocol = typeof locationLike.protocol === "string" ? locationLike.protocol : "";
    return (protocol === "http:" || protocol === "https:") && typeof global.fetch === "function";
  }

  function createRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10) || "random"}`;
  }

  function normalizeUpload(upload = {}) {
    const source = isPlainObject(upload) ? upload : {};
    return {
      file_name: source.fileName || source.file_name || source.name || "palm.jpg",
      content_type: source.fileType || source.content_type || source.type || "",
      size_bytes: Number.isFinite(source.fileSize)
        ? source.fileSize
        : Number.isFinite(source.size_bytes)
          ? source.size_bytes
          : 0,
      uploaded_at: source.uploadedAt || source.uploaded_at || null,
      side: source.handSide || source.side || "unknown",
      data_url: typeof source.previewDataUrl === "string" ? source.previewDataUrl : "",
    };
  }

  function buildAnalyzePayload({ upload, anonymousDeviceId, requestId }) {
    return {
      request_id: requestId || createRequestId(),
      anonymous_device_id: anonymousDeviceId,
      locale: "zh-CN",
      image: normalizeUpload(upload),
    };
  }

  async function callAnalyzeApi({ upload, anonymousDeviceId, endpoint, requestId, fetchImpl } = {}) {
    const activeFetch = fetchImpl || global.fetch;
    if (typeof activeFetch !== "function") {
      return {
        ok: false,
        request_id: requestId || null,
        status: "RETRY_REQUIRED",
        error: {
          code: "ANALYZE_API_UNAVAILABLE",
          message: "分析服务暂时不可用，请重新上传后再试。",
          message_key: "retry_upload",
          retryable: true,
        },
      };
    }

    const payload = buildAnalyzePayload({ upload, anonymousDeviceId, requestId });
    let response;
    try {
      response = await activeFetch(endpoint || DEFAULT_ANALYZE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return {
        ok: false,
        request_id: payload.request_id,
        status: "RETRY_REQUIRED",
        error: {
          code: "ANALYZE_API_REQUEST_FAILED",
          message: "分析服务暂时不可用，请重新上传后再试。",
          message_key: "retry_upload",
          retryable: true,
        },
      };
    }

    try {
      const parsed = await response.json();
      if (!response.ok && parsed && parsed.ok !== false) {
        return {
          ok: false,
          request_id: payload.request_id,
          status: "RETRY_REQUIRED",
          error: {
            code: "ANALYZE_API_REQUEST_FAILED",
            message: "分析服务暂时不可用，请重新上传后再试。",
            message_key: "retry_upload",
            retryable: true,
          },
        };
      }
      return parsed;
    } catch (error) {
      return {
        ok: false,
        request_id: payload.request_id,
        status: "RETRY_REQUIRED",
        error: {
          code: "ANALYZE_API_INVALID_RESPONSE",
          message: "分析结果暂时无法读取，请重新上传后再试。",
          message_key: "retry_upload",
          retryable: true,
        },
      };
    }
  }

  const api = {
    DEFAULT_ANALYZE_ENDPOINT,
    buildAnalyzePayload,
    callAnalyzeApi,
    canUseApi,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiAnalyzeApiClient = api;
})(typeof window !== "undefined" ? window : globalThis);
