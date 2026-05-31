(function palmmiAnalyzeApiClient(global) {
  const DEFAULT_ANALYZE_ENDPOINT = "/api/analyze";
  const DEFAULT_ANALYZE_TIMEOUT_MS = 60000;

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

  function createTimeoutError(requestId) {
    return {
      ok: false,
      request_id: requestId || null,
      status: "RETRY_REQUIRED",
      error: {
        code: "REQUEST_TIMEOUT",
        message: "当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片。",
        message_key: "request_timeout",
        retryable: true,
      },
    };
  }

  async function callAnalyzeApi({ upload, anonymousDeviceId, endpoint, requestId, fetchImpl, timeoutMs } = {}) {
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
    const canAbort = typeof global.AbortController === "function";
    const controller = canAbort ? new global.AbortController() : null;
    const requestTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_ANALYZE_TIMEOUT_MS;
    let didTimeout = false;
    const timeoutTimer = requestTimeoutMs
      ? global.setTimeout(() => {
        didTimeout = true;
        if (controller) {
          controller.abort();
        }
      }, requestTimeoutMs)
      : null;
    let response;
    try {
      response = await activeFetch(endpoint || DEFAULT_ANALYZE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        ...(controller ? { signal: controller.signal } : {}),
      });
    } catch (error) {
      if (didTimeout || (error && error.name === "AbortError")) {
        return createTimeoutError(payload.request_id);
      }
      return {
        ok: false,
        request_id: payload.request_id,
        status: "RETRY_REQUIRED",
        error: {
          code: "NETWORK_FAILED",
          message: "网络连接暂时中断，请检查网络后重新上传。",
          message_key: "network_failed",
          retryable: true,
        },
      };
    } finally {
      if (timeoutTimer) {
        global.clearTimeout(timeoutTimer);
      }
    }

    try {
      const parsed = await response.json();
      if (!response.ok && parsed && parsed.ok !== false) {
        return {
          ok: false,
          request_id: payload.request_id,
          status: "RETRY_REQUIRED",
          error: {
            code: "API_REQUEST_FAILED",
            message: "分析服务暂时不可用，请稍后重试。",
            message_key: "api_request_failed",
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
          code: "RESULT_READ_FAILED",
          message: "未找到可展示的分析结果，请重新分析。",
          message_key: "result_read_failed",
          retryable: true,
        },
      };
    }
  }

  const api = {
    DEFAULT_ANALYZE_ENDPOINT,
    DEFAULT_ANALYZE_TIMEOUT_MS,
    buildAnalyzePayload,
    callAnalyzeApi,
    canUseApi,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiAnalyzeApiClient = api;
})(typeof window !== "undefined" ? window : globalThis);
