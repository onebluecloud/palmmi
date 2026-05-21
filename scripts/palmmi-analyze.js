(function palmmiAnalyze(global) {
  const UPLOAD_STORAGE_KEY = "palmmi:lastUpload";
  const STABLE_ANALYSIS_RESULT_STORAGE_KEY = "palmmi:last-analysis";
  const LEGACY_ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
  const ANALYSIS_RESULT_STORAGE_KEY = STABLE_ANALYSIS_RESULT_STORAGE_KEY;
  const ANALYZE_ERROR_STORAGE_KEY = "palmmi:lastAnalyzeError";
  const ANALYSIS_STORAGE_VERSION = 1;
  const UPLOAD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const ANALYSIS_STATES = Object.freeze({
    IDLE: "idle",
    ANALYZING: "analyzing",
    DONE: "done",
    MISSING_UPLOAD: "missing-upload",
    INVALID_UPLOAD: "invalid-upload",
    TIMEOUT: "timeout",
    ERROR: "error",
  });
  const ANALYSIS_STEPS = Object.freeze([
    "正在读取掌纹结构",
    "正在匹配人格标签",
    "正在生成专属结果",
    "正在整理人格档案",
  ]);

  function getDefaultStorage() {
    try {
      return global.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  function isValidUploadState(value) {
    const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    return Boolean(
      value &&
      typeof value === "object" &&
      typeof value.fileName === "string" &&
      value.fileName &&
      typeof value.fileType === "string" &&
      acceptedTypes.has(value.fileType) &&
      Number.isFinite(value.fileSize) &&
      value.fileSize > 0
    );
  }

  function isUploadExpired(upload, nowMs = () => Date.now()) {
    const expiresAtMs = Date.parse(upload && upload.expiresAt);
    if (Number.isFinite(expiresAtMs)) {
      return nowMs() > expiresAtMs;
    }

    const uploadedAtMs = Date.parse(upload && upload.uploadedAt);
    if (!Number.isFinite(uploadedAtMs)) {
      return false;
    }
    return nowMs() - uploadedAtMs > UPLOAD_CACHE_TTL_MS;
  }

  function createProblemViewModel(state, messageOverride) {
    const models = {
      [ANALYSIS_STATES.MISSING_UPLOAD]: {
        title: "还没有可分析的照片",
        message: "请先上传一张清晰的手掌照片，再开始分析。",
        pill: "等待上传",
      },
      [ANALYSIS_STATES.INVALID_UPLOAD]: {
        title: "需要重新上传",
        message: "当前上传状态已丢失，请重新选择照片后再试。",
        pill: "状态已失效",
      },
      [ANALYSIS_STATES.TIMEOUT]: {
        title: "分析超时",
        message: "当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片。",
        pill: "等待超时",
      },
      [ANALYSIS_STATES.ERROR]: {
        title: "结果暂时无法读取",
        message: "未找到可展示的分析结果，请重新分析。",
        pill: "分析中断",
      },
    };

    const model = models[state] || models[ANALYSIS_STATES.ERROR];
    return {
      ...model,
      message: messageOverride || model.message,
      primaryActionText: "重新上传",
      primaryHref: "../upload/index.html",
      secondaryActionText: "返回首页",
      secondaryHref: "../index.html",
    };
  }

  function readRequestedTestState(locationLike) {
    const search = locationLike && typeof locationLike.search === "string" ? locationLike.search : "";
    if (!search) {
      return null;
    }

    const params = new URLSearchParams(search);
    const state = params.get("state");
    const allowed = new Set([
      ANALYSIS_STATES.MISSING_UPLOAD,
      ANALYSIS_STATES.INVALID_UPLOAD,
      ANALYSIS_STATES.TIMEOUT,
      ANALYSIS_STATES.ERROR,
    ]);
    return allowed.has(state) ? state : null;
  }

  function readUploadState(storage = getDefaultStorage(), options = {}) {
    if (!storage || typeof storage.getItem !== "function") {
      return {
        ok: false,
        state: ANALYSIS_STATES.MISSING_UPLOAD,
        message: "当前上传状态已丢失，请重新选择照片后再试。",
      };
    }

    const raw = storage.getItem(UPLOAD_STORAGE_KEY);
    if (!raw) {
      return {
        ok: false,
        state: ANALYSIS_STATES.MISSING_UPLOAD,
        message: "当前上传状态已丢失，请重新选择照片后再试。",
      };
    }

    try {
      const upload = JSON.parse(raw);
      if (!isValidUploadState(upload)) {
        return {
          ok: false,
          state: ANALYSIS_STATES.INVALID_UPLOAD,
          message: "当前上传状态已丢失，请重新选择照片后再试。",
        };
      }

      if (isUploadExpired(upload, options.nowMs)) {
        removeStorageItem(storage, UPLOAD_STORAGE_KEY);
        return {
          ok: false,
          state: ANALYSIS_STATES.INVALID_UPLOAD,
          message: "本次上传状态已超过 24 小时，请重新上传一张掌心照片。",
        };
      }

      return {
        ok: true,
        state: ANALYSIS_STATES.IDLE,
        upload,
      };
    } catch (error) {
      return {
        ok: false,
        state: ANALYSIS_STATES.INVALID_UPLOAD,
        message: "当前上传状态已丢失，请重新选择照片后再试。",
      };
    }
  }

  function createStage4DMockRecognitionResult(upload, options = {}) {
    const now = options.now || (() => new Date().toISOString());
    return {
      status: "SUCCESS",
      cache: {
        file_hash: null,
        cache_key: null,
        cache_hit: false,
        cache_write: false,
      },
      image_input: {
        file_name: upload.fileName,
        mime_type: upload.fileType,
        file_size: upload.fileSize,
        uploaded_at: upload.uploadedAt || null,
      },
      quality_gate: {
        status: "STAGE4D_STATIC_PASS",
        can_continue: true,
        reason_codes: [],
      },
      schema: {
        status: "STAGE4D_THIN_ADAPTER",
        normalized_features: null,
        degraded_fields: [],
        missing_fields: [],
        schema_warnings: [],
        should_retry: false,
      },
      mother_scores: null,
      primary_mother: {
        id: "STAGE4D_MOCK_MOTHER",
        name: "Stage 4D mock mother",
      },
      secondary_mother: null,
      is_dual_mother: false,
      primary_persona: {
        id: "STAGE4D_MOCK_PERSONA",
        name: "Stage 4D mock persona",
        mother_type: "STAGE4D_MOCK_MOTHER",
      },
      top3: [],
      recognition: null,
      error_codes: [],
      debug: {
        pipeline_version: "stage4d_static_browser_adapter_v1",
        rule_version: null,
        schema_version: "stage4d_upload_v1",
        prompt_version: null,
        mock_model_version: null,
        image_normalization_version: null,
        degradation_policy_version: null,
        mock_vlm_used: false,
        cache_hit: false,
        notes: [
          "Stage 4D runs in a static browser page, so it stores a RecognitionResult-shaped placeholder through a thin adapter.",
          "The frozen Stage 3 pipeline boundary remains the later integration point.",
        ],
      },
      created_at: now(),
    };
  }

  function runStage4DAnalysis(upload, options = {}) {
    if (typeof options.pipeline === "function") {
      return options.pipeline({ upload });
    }

    return createStage4DMockRecognitionResult(upload, options);
  }

  function getStage5Api(options = {}) {
    if (options.stage5Api) {
      return options.stage5Api;
    }

    if (global.PalmmiStage5) {
      return global.PalmmiStage5;
    }

    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try {
        return require("./palmmi-stage5.js");
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  function getAnalyzeApiClient(options = {}) {
    if (options.apiClient) {
      return options.apiClient;
    }

    return global.PalmmiAnalyzeApiClient || null;
  }

  function removeStorageItem(storage, key) {
    if (!storage || typeof storage.removeItem !== "function") {
      return;
    }

    try {
      storage.removeItem(key);
    } catch (error) {
      // Best-effort cleanup only.
    }
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function removeForbiddenStorageFields(value) {
    const forbidden = new Set([
      "analysis_input",
      "internal",
      "stage5bResult",
      "provider_output",
      "raw_provider",
      "raw_response",
      "rawText",
      "base64",
      "data_url",
      "dataUrl",
      "previewDataUrl",
      "buffer",
      "imageBuffer",
      "Authorization",
    ]);
    if (Array.isArray(value)) {
      return value.map(removeForbiddenStorageFields);
    }
    if (!isPlainObject(value)) {
      return value;
    }
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) {
        continue;
      }
      output[key] = removeForbiddenStorageFields(child);
    }
    return output;
  }

  function createAnalysisStorageEnvelope(result, options = {}) {
    const now = options.now || (() => new Date().toISOString());
    const safeResult = removeForbiddenStorageFields(result);
    const trace = isPlainObject(safeResult && safeResult.trace) ? safeResult.trace : {};
    return {
      version: ANALYSIS_STORAGE_VERSION,
      analysis_id: options.analysisId || safeResult.analysis_id || safeResult.request_id || null,
      created_at: now(),
      provider: typeof trace.provider === "string" && trace.provider ? trace.provider : "qwen",
      analysis_result: safeResult,
    };
  }

  function firstText(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  }

  function normalizeQualityStatus(value) {
    return firstText(value).toUpperCase();
  }

  function hasStableAnalysisContract(result) {
    if (!isPlainObject(result)) {
      return false;
    }
    const qualityStatus = normalizeQualityStatus(result.quality_status);
    if (result.valid_palm === false || ["NOT_PALM", "IMAGE_NOT_CLEAR", "ANALYSIS_UNRELIABLE", "RETRY_REQUIRED", "REJECTED"].includes(qualityStatus)) {
      return false;
    }
    const requiredText = [
      result.personality_id,
      result.personality_name,
      result.main_line_type,
      result.title,
      result.summary,
      result.description,
      result.evidence,
    ];
    const hasRequiredText = requiredText.every((value) => firstText(value));
    const hasCandidate = Array.isArray(result.candidate_results)
      && result.candidate_results.some((candidate) => (
        isPlainObject(candidate)
          && firstText(candidate.personality_id)
          && firstText(candidate.personality_name)
      ));
    return Boolean(
      result.schemaVersion === "analysis-result.v1"
        && ["ok", "degraded"].includes(firstText(result.status))
        && hasRequiredText
        && hasCandidate
    );
  }

  function createUnreliableAnalysisResponse(response, requestId) {
    return {
      ok: false,
      request_id: (response && response.request_id) || requestId || null,
      status: "RETRY_REQUIRED",
      error: {
        code: "ANALYSIS_UNRELIABLE",
        message: "本次识别结果不稳定，请换一张更清晰的掌心照片后重试。",
        retryable: true,
      },
    };
  }

  function saveAnalyzeError(storage, response) {
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    try {
      storage.setItem(ANALYZE_ERROR_STORAGE_KEY, JSON.stringify({
        request_id: response && response.request_id ? response.request_id : null,
        status: response && response.status ? response.status : "RETRY_REQUIRED",
        error: response && response.error ? response.error : {
          code: "UNKNOWN_ERROR",
          message: "分析流程暂时没有完成，请重新上传后再试。",
          retryable: true,
        },
      }));
    } catch (error) {
      // Error storage is diagnostic only; the UI state remains the source of truth.
    }
  }

  function getAnonymousDeviceId(options = {}) {
    const stage5Api = getStage5Api(options);
    if (stage5Api && typeof stage5Api.getOrCreateAnonymousDeviceId === "function") {
      const result = stage5Api.getOrCreateAnonymousDeviceId(options.localStorage);
      if (result && result.ok) {
        return result.anonymous_device_id;
      }
    }
    return "pm_browser_anonymous";
  }

  async function runStage5ApiAnalysis(upload, options = {}) {
    const storage = options.storage || getDefaultStorage();
    const apiClient = getAnalyzeApiClient(options);
    const canUseApi = apiClient
      && typeof apiClient.canUseApi === "function"
      && apiClient.canUseApi({
        location: options.location || global.location,
        enabled: options.useAnalyzeApi,
      });

    if (!canUseApi || typeof apiClient.callAnalyzeApi !== "function") {
      return null;
    }

    const requestId = typeof options.requestId === "function" ? options.requestId() : undefined;
    const analysisId = options.analysisId || requestId || `analysis_${Date.now()}`;
    const response = await apiClient.callAnalyzeApi({
      upload,
      anonymousDeviceId: getAnonymousDeviceId(options),
      endpoint: options.analyzeEndpoint,
      requestId,
      timeoutMs: options.timeoutMs,
    });

    if (!response || response.ok !== true) {
      saveAnalyzeError(storage, response);
      return response;
    }

    const resultForPage = response.analysis_result || response.recognition_result;
    if (!hasStableAnalysisContract(resultForPage)) {
      const contractError = createUnreliableAnalysisResponse(response, analysisId);
      saveAnalyzeError(storage, contractError);
      return contractError;
    }

    const saved = saveAnalysisResult(storage, resultForPage, { analysisId });
    if (!saved.ok) {
      const storageError = {
        ok: false,
        request_id: response.request_id || null,
        status: "RETRY_REQUIRED",
        error: {
          code: "UNKNOWN_ERROR",
          message: "分析结果暂时无法保存，请重新上传后再试。",
          retryable: true,
        },
      };
      saveAnalyzeError(storage, storageError);
      return storageError;
    }

    removeStorageItem(storage, ANALYZE_ERROR_STORAGE_KEY);
    return response;
  }

  function getStage5BProblemState(response) {
    const code = response && response.error ? response.error.code : "";
    if (code === "FILE_MISSING" || code === "UPLOAD_STATE_LOST") {
      return ANALYSIS_STATES.MISSING_UPLOAD;
    }
    if (code === "FILE_TYPE_UNSUPPORTED" || code === "FILE_TOO_LARGE" || code === "FILE_EMPTY") {
      return ANALYSIS_STATES.INVALID_UPLOAD;
    }
    if (code === "REQUEST_TIMEOUT") {
      return ANALYSIS_STATES.TIMEOUT;
    }
    return ANALYSIS_STATES.ERROR;
  }

  async function runStage5BAnalysis(upload, options = {}) {
    const apiResponse = await runStage5ApiAnalysis(upload, options);
    if (apiResponse) {
      return apiResponse;
    }

    const stage5Api = getStage5Api(options);

    if (!stage5Api || typeof stage5Api.runAnalyzeSkeleton !== "function") {
      const result = runStage4DAnalysis(upload, options);
      const saved = saveAnalysisResult(options.storage || getDefaultStorage(), result);
      if (!saved.ok) {
        return {
          ok: false,
          request_id: null,
          status: "ERROR",
          error: {
            code: "UNKNOWN_ERROR",
            message: "分析结果暂时无法保存，请重新上传后再试。",
            retryable: true,
          },
        };
      }
      return {
        ok: true,
        request_id: null,
        status: result.status,
        provider: "stage4d-fallback",
        recognition_result: result,
      };
    }

    return stage5Api.runAnalyzeSkeleton({
      upload,
      sessionStorage: options.storage || getDefaultStorage(),
      localStorage: options.localStorage,
      provider: options.provider,
      now: options.now,
      nowIso: options.nowIso,
      randomString: options.randomString,
      requestId: options.requestId,
      timeoutMs: options.timeoutMs,
    });
  }

  function saveAnalysisResult(storage, result, options = {}) {
    if (!storage || typeof storage.setItem !== "function") {
      return { ok: false, error: "storage_unavailable" };
    }

    try {
      const safeResult = removeForbiddenStorageFields(result);
      const envelope = createAnalysisStorageEnvelope(safeResult, options);
      storage.setItem(STABLE_ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(envelope));
      storage.setItem(LEGACY_ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(safeResult));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : "storage_write_failed",
      };
    }
  }

  function setHidden(element, hidden) {
    if (element) {
      element.hidden = hidden;
    }
  }

  function initAnalyzePage(doc, options = {}) {
    const storage = options.storage || getDefaultStorage();
    const root = doc.getElementById("analysisApp");
    const title = doc.getElementById("analysisTitle");
    const copy = doc.getElementById("analysisCopy");
    const statusPill = doc.getElementById("analysisStatusPill");
    const runningPanel = doc.getElementById("analysisRunning");
    const donePanel = doc.getElementById("analysisDone");
    const problemPanel = doc.getElementById("analysisProblem");
    const problemTitle = doc.getElementById("analysisProblemTitle");
    const problemCopy = doc.getElementById("analysisProblemCopy");
    const previewImage = doc.getElementById("analysisPreviewImage");
    const previewFallback = doc.getElementById("analysisPreviewFallback");
    const fileName = doc.getElementById("analysisFileName");
    const fileMeta = doc.getElementById("analysisFileMeta");
    const viewResult = doc.getElementById("viewResult");
    const stepItems = Array.from(doc.querySelectorAll("[data-analysis-step]"));

    if (!root || !title || !copy || !statusPill) {
      return;
    }

    let activeTimer = null;

    function setState(state) {
      root.dataset.state = state;
      doc.body.dataset.analysisState = state;
    }

    function setStep(index) {
      stepItems.forEach((item, itemIndex) => {
        const isDone = itemIndex < index;
        const isActive = itemIndex === index;
        item.classList.toggle("is-done", isDone);
        item.classList.toggle("is-active", isActive);
        const marker = item.querySelector("span");
        if (marker) {
          marker.textContent = isDone ? "✓" : String(itemIndex + 1).padStart(2, "0");
        }
      });
      if (index < ANALYSIS_STEPS.length) {
        copy.textContent = ANALYSIS_STEPS[index];
      }
    }

    function renderUploadPreview(upload) {
      if (fileName) {
        fileName.textContent = upload.fileName;
      }
      if (fileMeta) {
        fileMeta.textContent = `${upload.fileSizeLabel || ""} · ${upload.fileType || "图片"}`;
      }
      if (previewImage && typeof upload.previewDataUrl === "string" && upload.previewDataUrl.startsWith("data:image/")) {
        previewImage.src = upload.previewDataUrl;
        previewImage.hidden = false;
        setHidden(previewFallback, true);
      } else {
        if (previewImage) {
          previewImage.removeAttribute("src");
          previewImage.hidden = true;
        }
        setHidden(previewFallback, false);
      }
    }

    function renderProblem(state, message) {
      const model = createProblemViewModel(state, message);
      setState(state);
      setHidden(runningPanel, true);
      setHidden(donePanel, true);
      setHidden(problemPanel, false);
      setHidden(viewResult, true);
      title.textContent = model.title;
      copy.textContent = model.message;
      statusPill.textContent = model.pill;
      if (problemTitle) {
        problemTitle.textContent = model.title;
      }
      if (problemCopy) {
        problemCopy.textContent = model.message;
      }
      if (fileName) {
        fileName.textContent = "等待重新上传";
      }
      if (fileMeta) {
        fileMeta.textContent = "需要新的本地上传状态";
      }
      stepItems.forEach((item, itemIndex) => {
        item.classList.toggle("is-done", false);
        item.classList.toggle("is-active", false);
        const marker = item.querySelector("span");
        if (marker) {
          marker.textContent = String(itemIndex + 1).padStart(2, "0");
        }
      });
    }

    function renderDone(result) {
      setState(ANALYSIS_STATES.DONE);
      setHidden(runningPanel, true);
      setHidden(problemPanel, true);
      setHidden(donePanel, false);
      setHidden(viewResult, false);
      title.textContent = "分析已完成";
      copy.textContent = "结果数据已准备，可以进入结果页查看。";
      statusPill.textContent = result && result.status === "SUCCESS" ? "结果已暂存" : "已完成";
      setStep(ANALYSIS_STEPS.length);
    }

    function renderAnalysis(upload) {
      setState(ANALYSIS_STATES.ANALYZING);
      setHidden(runningPanel, false);
      setHidden(donePanel, true);
      setHidden(problemPanel, true);
      setHidden(viewResult, true);
      title.textContent = "正在生成掌纹人格";
      statusPill.textContent = "分析中";
      renderUploadPreview(upload);
      setStep(0);

      let currentStep = 0;
      let isSettled = false;
      activeTimer = global.setInterval(() => {
        currentStep = Math.min(currentStep + 1, ANALYSIS_STEPS.length - 1);
        setStep(currentStep);
      }, options.stepIntervalMs || 520);

      const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000;
      const timeoutTimer = global.setTimeout(() => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        if (activeTimer) {
          global.clearInterval(activeTimer);
          activeTimer = null;
        }
        renderProblem(ANALYSIS_STATES.TIMEOUT);
      }, timeoutMs);

      global.setTimeout(async () => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        global.clearTimeout(timeoutTimer);
        if (activeTimer) {
          global.clearInterval(activeTimer);
          activeTimer = null;
        }

        try {
          const response = await runStage5BAnalysis(upload, { ...options, storage });
          if (!response || !response.ok) {
            const message = response && response.error ? response.error.message : "分析流程暂时没有完成，请重新上传后再试。";
            renderProblem(getStage5BProblemState(response), message);
            return;
          }
          removeStorageItem(storage, UPLOAD_STORAGE_KEY);
          renderDone(response.recognition_result);
        } catch (error) {
          renderProblem(ANALYSIS_STATES.ERROR, "分析流程暂时没有完成，请重新上传后再试。");
        }
      }, options.durationMs || 2100);
    }

    const requestedState = readRequestedTestState(options.location || global.location);
    if (requestedState) {
      renderProblem(requestedState);
      return;
    }

    const uploadState = readUploadState(storage);
    if (!uploadState.ok) {
      renderProblem(uploadState.state, uploadState.message);
      return;
    }

    renderAnalysis(uploadState.upload);
  }

  const api = {
    ANALYZE_ERROR_STORAGE_KEY,
    ANALYSIS_RESULT_STORAGE_KEY,
    LEGACY_ANALYSIS_RESULT_STORAGE_KEY,
    STABLE_ANALYSIS_RESULT_STORAGE_KEY,
    ANALYSIS_STATES,
    ANALYSIS_STEPS,
    UPLOAD_CACHE_TTL_MS,
    UPLOAD_STORAGE_KEY,
    createStage4DMockRecognitionResult,
    createProblemViewModel,
    getAnalyzeApiClient,
    getStage5BProblemState,
    initAnalyzePage,
    readRequestedTestState,
    readUploadState,
    runStage5ApiAnalysis,
    runStage4DAnalysis,
    runStage5BAnalysis,
    saveAnalysisResult,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiAnalyze = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initAnalyzePage(global.document));
  }
})(typeof window !== "undefined" ? window : globalThis);
