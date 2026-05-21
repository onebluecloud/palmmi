(function palmmiUpload(global) {
  const UPLOAD_SCHEMA_VERSION = "stage4d_upload_v1";
  const UPLOAD_STORAGE_KEY = "palmmi:lastUpload";
  const STABLE_ANALYSIS_RESULT_STORAGE_KEY = "palmmi:last-analysis";
  const LEGACY_ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
  const ANALYSIS_RESULT_STORAGE_KEY = STABLE_ANALYSIS_RESULT_STORAGE_KEY;
  const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
  const MIN_IMAGE_DIMENSION = 160;
  const UPLOAD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const ANALYZE_TIMEOUT_MS = 60000;
  const TARGET_ANALYSIS_BYTES = Math.round(1.2 * 1024 * 1024);
  const PRIMARY_ANALYSIS_MAX_SIDE = 1280;
  const FALLBACK_ANALYSIS_MAX_SIDE = 1024;
  const ANALYSIS_JPEG_QUALITIES = Object.freeze([0.82, 0.75]);
  const ANALYSIS_JPEG_MIME_TYPE = "image/jpeg";
  const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  function validateUploadFile(file) {
    if (!file) {
      return {
        ok: false,
        code: "missing_file",
        message: "请先选择一张掌心照片。"
      };
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return {
        ok: false,
        code: "invalid_type",
        message: "图片格式不支持，请上传 JPG / PNG / WebP。"
      };
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        code: "too_large",
        message: "图片过大，请压缩或重新拍摄。"
      };
    }

    return {
      ok: true,
      code: "accepted",
      message: "图片已选择，可以预览。"
    };
  }

  function createImageDecodeFailureResult() {
    return {
      ok: false,
      code: "image_decode_failed",
      message: "照片无法读取，请重新选择。"
    };
  }

  function createImageDimensionFailureResult() {
    return {
      ok: false,
      code: "image_too_small",
      message: "照片尺寸过小，请重新拍摄。"
    };
  }

  function createImageCheckSuccessResult(dimensions) {
    return {
      ok: true,
      code: "image_check_passed",
      message: "照片已通过基础检查。开始分析后会继续判断是否为清晰掌心照片。",
      dimensions,
    };
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 KB";
    }

    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function buildUploadState({ file, previewDataUrl = "", handSide = null, now = () => new Date().toISOString() }) {
    const uploadedAt = now();
    const uploadedAtMs = Date.parse(uploadedAt);
    const expiresAt = Number.isFinite(uploadedAtMs)
      ? new Date(uploadedAtMs + UPLOAD_CACHE_TTL_MS).toISOString()
      : null;

    return {
      schemaVersion: UPLOAD_SCHEMA_VERSION,
      fileName: file && file.name ? file.name : "手掌照片",
      fileType: file && file.type ? file.type : "",
      fileSize: file && Number.isFinite(file.size) ? file.size : 0,
      fileSizeLabel: formatBytes(file && Number.isFinite(file.size) ? file.size : 0),
      previewDataUrl: typeof previewDataUrl === "string" ? previewDataUrl : "",
      uploadedAt,
      expiresAt,
      retentionTtlHours: 24,
      handSide,
    };
  }

  function createPreviewReadFailureResult() {
    return {
      ok: false,
      code: "preview_read_failed",
      message: "照片无法读取，请重新选择。"
    };
  }

  function saveUploadState(storage, state) {
    if (!storage || typeof storage.setItem !== "function") {
      return { ok: false, error: "storage_unavailable" };
    }

    try {
      storage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : "storage_write_failed",
      };
    }
  }

  function prepareUploadForAnalysis({ file, previewDataUrl = "", storage, now, handSide = null }) {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      return {
        ...validation,
        shouldNavigate: false,
      };
    }

    const fullState = buildUploadState({ file, previewDataUrl, handSide, now });
    let saved = saveUploadState(storage, fullState);

    if (!saved.ok && previewDataUrl) {
      saved = saveUploadState(storage, buildUploadState({ file, previewDataUrl: "", handSide, now }));
    }

    if (!saved.ok) {
      return {
        ok: false,
        code: "storage_unavailable",
        message: "浏览器暂时无法保存本次图片状态，请刷新后重新选择。",
        shouldNavigate: false,
      };
    }

    return {
      ok: true,
      code: "ready",
      message: "图片已准备好，正在进入分析页。",
      shouldNavigate: true,
      upload: fullState,
    };
  }

  function getUploadStorage() {
    try {
      return global.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || typeof global.FileReader !== "function") {
        resolve("");
        return;
      }

      const reader = new global.FileReader();
      reader.addEventListener("load", () => {
        resolve(typeof reader.result === "string" ? reader.result : "");
      });
      reader.addEventListener("error", () => {
        reject(reader.error || new Error("file_read_failed"));
      });
      reader.readAsDataURL(file);
    });
  }

  function decodeImageDimensions(file) {
    if (!file) {
      return Promise.resolve(null);
    }

    if (typeof global.createImageBitmap === "function") {
      return global.createImageBitmap(file)
        .then((bitmap) => {
          const dimensions = {
            width: bitmap.width,
            height: bitmap.height,
          };
          if (typeof bitmap.close === "function") {
            bitmap.close();
          }
          return dimensions;
        });
    }

    if (typeof global.Image !== "function" || !global.URL || typeof global.URL.createObjectURL !== "function") {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const image = new global.Image();
      const url = global.URL.createObjectURL(file);
      image.onload = () => {
        const dimensions = {
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
        };
        global.URL.revokeObjectURL(url);
        resolve(dimensions);
      };
      image.onerror = () => {
        global.URL.revokeObjectURL(url);
        reject(new Error("image_decode_failed"));
      };
      image.src = url;
    });
  }

  function replaceImageExtension(fileName) {
    const safeName = typeof fileName === "string" && fileName.trim() ? fileName.trim() : "palm.jpg";
    return safeName.replace(/\.[^.]+$/, "") + ".jpg";
  }

  function createCanvas(width, height) {
    if (!global.document || typeof global.document.createElement !== "function") {
      return null;
    }
    const canvas = global.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.toBlob !== "function") {
        reject(new Error("canvas_to_blob_unavailable"));
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("canvas_to_blob_failed"));
          return;
        }
        resolve(blob);
      }, mimeType, quality);
    });
  }

  function fitWithinMaxSide(width, height, maxSide) {
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
    const longest = Math.max(safeWidth, safeHeight);
    if (!longest || longest <= maxSide) {
      return { width: safeWidth, height: safeHeight };
    }
    const scale = maxSide / longest;
    return {
      width: Math.max(1, Math.round(safeWidth * scale)),
      height: Math.max(1, Math.round(safeHeight * scale)),
    };
  }

  function decodeImageForCanvas(file) {
    if (!file) {
      return Promise.reject(new Error("image_missing"));
    }

    if (typeof global.createImageBitmap === "function") {
      return global.createImageBitmap(file).then((bitmap) => ({
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close() {
          if (typeof bitmap.close === "function") {
            bitmap.close();
          }
        },
      }));
    }

    if (typeof global.Image !== "function" || !global.URL || typeof global.URL.createObjectURL !== "function") {
      return Promise.reject(new Error("image_decode_unavailable"));
    }

    return new Promise((resolve, reject) => {
      const image = new global.Image();
      const url = global.URL.createObjectURL(file);
      image.onload = () => {
        resolve({
          image,
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
          close() {
            global.URL.revokeObjectURL(url);
          },
        });
      };
      image.onerror = () => {
        global.URL.revokeObjectURL(url);
        reject(new Error("image_decode_failed"));
      };
      image.src = url;
    });
  }

  async function compressImageCandidate(file, maxSide, quality) {
    const decoded = await decodeImageForCanvas(file);
    try {
      const target = fitWithinMaxSide(decoded.width, decoded.height, maxSide);
      if (!target.width || !target.height) {
        throw new Error("image_dimension_invalid");
      }
      const canvas = createCanvas(target.width, target.height);
      if (!canvas) {
        throw new Error("canvas_unavailable");
      }
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("canvas_context_unavailable");
      }
      context.drawImage(decoded.image, 0, 0, target.width, target.height);
      const blob = await canvasToBlob(canvas, ANALYSIS_JPEG_MIME_TYPE, quality);
      return {
        blob,
        width: target.width,
        height: target.height,
        sourceWidth: decoded.width,
        sourceHeight: decoded.height,
        maxSide,
        quality,
      };
    } finally {
      if (decoded && typeof decoded.close === "function") {
        decoded.close();
      }
    }
  }

  async function normalizePalmImageForAnalysis(file, options = {}) {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      return {
        ...validation,
        shouldAnalyze: false,
      };
    }

    const targetBytes = Number.isFinite(options.targetBytes) ? options.targetBytes : TARGET_ANALYSIS_BYTES;
    const maxSides = Array.isArray(options.maxSides) && options.maxSides.length
      ? options.maxSides
      : [PRIMARY_ANALYSIS_MAX_SIDE, FALLBACK_ANALYSIS_MAX_SIDE];
    const qualities = Array.isArray(options.qualities) && options.qualities.length
      ? options.qualities
      : ANALYSIS_JPEG_QUALITIES;
    let best = null;

    try {
      for (const maxSide of maxSides) {
        for (const quality of qualities) {
          const candidate = await compressImageCandidate(file, maxSide, quality);
          if (!best || candidate.blob.size < best.blob.size) {
            best = candidate;
          }
          if (candidate.blob.size <= targetBytes) {
            return {
              ok: true,
              shouldAnalyze: true,
              fileName: replaceImageExtension(file.name),
              mimeType: ANALYSIS_JPEG_MIME_TYPE,
              blob: candidate.blob,
              sizeBefore: file.size,
              sizeAfter: candidate.blob.size,
              width: candidate.width,
              height: candidate.height,
              sourceWidth: candidate.sourceWidth,
              sourceHeight: candidate.sourceHeight,
              compressed: candidate.blob.size < file.size || file.type !== ANALYSIS_JPEG_MIME_TYPE,
              compression: {
                maxSide: candidate.maxSide,
                quality: candidate.quality,
                targetBytes,
              },
            };
          }
        }
      }

      if (best && best.blob.size < file.size) {
        return {
          ok: true,
          shouldAnalyze: true,
          fileName: replaceImageExtension(file.name),
          mimeType: ANALYSIS_JPEG_MIME_TYPE,
          blob: best.blob,
          sizeBefore: file.size,
          sizeAfter: best.blob.size,
          width: best.width,
          height: best.height,
          sourceWidth: best.sourceWidth,
          sourceHeight: best.sourceHeight,
          compressed: true,
          compression: {
            maxSide: best.maxSide,
            quality: best.quality,
            targetBytes,
          },
        };
      }
    } catch (error) {
      best = null;
    }

    let dimensions = null;
    try {
      dimensions = await decodeImageDimensions(file);
    } catch (error) {
      dimensions = null;
    }

    return {
      ok: true,
      shouldAnalyze: true,
      fileName: file.name || "palm.jpg",
      mimeType: file.type || ANALYSIS_JPEG_MIME_TYPE,
      blob: file,
      sizeBefore: file.size,
      sizeAfter: file.size,
      width: dimensions && dimensions.width,
      height: dimensions && dimensions.height,
      sourceWidth: dimensions && dimensions.width,
      sourceHeight: dimensions && dimensions.height,
      compressed: false,
      compression: {
        fallback: true,
        targetBytes,
      },
    };
  }

  function buildAnalysisUploadFromNormalized(normalized, previewDataUrl, options = {}) {
    const now = typeof options.now === "function" ? options.now() : new Date().toISOString();
    return {
      schemaVersion: UPLOAD_SCHEMA_VERSION,
      fileName: normalized.fileName || "palm.jpg",
      fileType: normalized.mimeType || ANALYSIS_JPEG_MIME_TYPE,
      fileSize: normalized.sizeAfter || 0,
      fileSizeLabel: formatBytes(normalized.sizeAfter || 0),
      previewDataUrl,
      uploadedAt: now,
      expiresAt: null,
      retentionTtlHours: 0,
      handSide: options.handSide || null,
      imageWidth: normalized.width || null,
      imageHeight: normalized.height || null,
      sourceFileSize: normalized.sizeBefore || 0,
      compressed: Boolean(normalized.compressed),
      compression: normalized.compression || null,
    };
  }

  function removeUploadState(storage) {
    if (storage && typeof storage.removeItem === "function") {
      try {
        storage.removeItem(UPLOAD_STORAGE_KEY);
      } catch (error) {
        // Best-effort cleanup only.
      }
    }
  }

  function verifyAnalysisReadback(storage) {
    if (!storage || typeof storage.getItem !== "function") {
      return { ok: false, code: "RESULT_WRITE_FAILED" };
    }

    try {
      const raw = storage.getItem(STABLE_ANALYSIS_RESULT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.analysis_result ? { ok: true } : { ok: false, code: "RESULT_WRITE_FAILED" };
    } catch (error) {
      return { ok: false, code: "RESULT_WRITE_FAILED" };
    }
  }

  function normalizeAnalyzeErrorCode(code) {
    if (code === "REQUEST_TIMEOUT") {
      return "REQUEST_TIMEOUT";
    }
    if (code === "IMAGE_NOT_CLEAR") {
      return "IMAGE_NOT_CLEAR";
    }
    if (code === "NOT_PALM") {
      return "NOT_PALM";
    }
    if (code === "ANALYSIS_UNRELIABLE") {
      return "ANALYSIS_UNRELIABLE";
    }
    if (code === "FILE_MISSING" || code === "UPLOAD_STATE_LOST") {
      return "UPLOAD_STATE_LOST";
    }
    if (code === "RESULT_READ_FAILED" || code === "ANALYZE_API_INVALID_RESPONSE" || code === "VLM_API_INVALID_RESPONSE") {
      return "RESULT_READ_FAILED";
    }
    return "API_REQUEST_FAILED";
  }

  function messageForAnalyzeError(code, fallbackMessage) {
    const messages = {
      UPLOAD_STATE_LOST: "当前上传状态已丢失，请重新选择照片后再试。",
      REQUEST_TIMEOUT: "当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片。",
      RESULT_READ_FAILED: "未找到可展示的分析结果，请重新分析。",
      RESULT_WRITE_FAILED: "分析结果暂时无法保存，请重新分析。",
      IMAGE_NOT_CLEAR: "照片掌纹不够清晰，请在光线均匀的位置重新拍摄，确保掌心完整、掌纹可见。",
      NOT_PALM: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
      ANALYSIS_UNRELIABLE: "本次识别结果不稳定，请换一张更清晰的掌心照片后重试。",
      API_REQUEST_FAILED: "分析服务暂时不可用，请稍后重试。",
    };
    const message = messages[code] || fallbackMessage || messages.API_REQUEST_FAILED;
    return `${message}（${code}）`;
  }

  function createAnalyzeErrorResult(code, fallbackMessage) {
    return {
      ok: false,
      code,
      message: messageForAnalyzeError(code, fallbackMessage),
      shouldNavigate: false,
    };
  }

  function getAnalyzePageApi(options = {}) {
    return options.analyzeApi || global.PalmmiAnalyze || null;
  }

  async function runInlineAnalyze(file, options = {}) {
    const check = await checkSelectedImageFile(file);
    if (!check.ok) {
      return {
        ...check,
        shouldNavigate: false,
      };
    }

    const storage = options.storage || getUploadStorage();
    if (!storage) {
      return createAnalyzeErrorResult("RESULT_WRITE_FAILED");
    }

    if (typeof options.onProgress === "function") {
      options.onProgress("正在压缩照片...");
    }
    const normalized = await normalizePalmImageForAnalysis(file, options);
    if (!normalized.ok || !normalized.shouldAnalyze) {
      return {
        ...normalized,
        shouldNavigate: false,
      };
    }

    if (typeof options.onProgress === "function") {
      options.onProgress("正在分析掌纹...");
    }
    let dataUrl = "";
    try {
      dataUrl = await readFileAsDataUrl(normalized.blob);
    } catch (error) {
      return createPreviewReadFailureResult();
    }

    if (!dataUrl) {
      return createPreviewReadFailureResult();
    }

    const analysisUpload = buildAnalysisUploadFromNormalized(normalized, dataUrl, options);
    const analyzeApi = getAnalyzePageApi(options);
    if (!analyzeApi || typeof analyzeApi.runStage5ApiAnalysis !== "function") {
      return createAnalyzeErrorResult("API_REQUEST_FAILED");
    }

    const response = await analyzeApi.runStage5ApiAnalysis(analysisUpload, {
      storage,
      localStorage: options.localStorage || global.localStorage,
      location: options.location || global.location,
      useAnalyzeApi: options.useAnalyzeApi !== false,
      apiClient: options.apiClient,
      analyzeEndpoint: options.analyzeEndpoint,
      requestId: options.requestId,
      timeoutMs: Number.isFinite(options.timeoutMs) ? options.timeoutMs : ANALYZE_TIMEOUT_MS,
    });

    if (!response) {
      return createAnalyzeErrorResult("API_REQUEST_FAILED");
    }

    if (response.ok !== true) {
      const code = normalizeAnalyzeErrorCode(response.error && response.error.code);
      return createAnalyzeErrorResult(code, response.error && response.error.message);
    }

    const readback = verifyAnalysisReadback(storage);
    if (!readback.ok) {
      return createAnalyzeErrorResult("RESULT_WRITE_FAILED");
    }

    removeUploadState(storage);
    return {
      ok: true,
      code: "ANALYSIS_READY",
      message: "分析完成，正在打开结果页。",
      shouldNavigate: true,
      response,
      normalized,
      upload: analysisUpload,
    };
  }

  async function checkSelectedImageFile(file) {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      return validation;
    }

    let dimensions = null;
    try {
      dimensions = await decodeImageDimensions(file);
    } catch (error) {
      return createImageDecodeFailureResult();
    }

    if (
      dimensions &&
      Number.isFinite(dimensions.width) &&
      Number.isFinite(dimensions.height) &&
      (dimensions.width < MIN_IMAGE_DIMENSION || dimensions.height < MIN_IMAGE_DIMENSION)
    ) {
      return createImageDimensionFailureResult();
    }

    return createImageCheckSuccessResult(dimensions);
  }

  function initUploadPage(doc, options = {}) {
    const fileInput = doc.getElementById("palmFile");
    const status = doc.getElementById("uploadStatus");
    const previewBox = doc.getElementById("previewBox");
    const previewImage = doc.getElementById("previewImage");
    const emptyState = doc.getElementById("emptyState");
    const fileName = doc.getElementById("fileName");
    const fileSize = doc.getElementById("fileSize");
    const resetButton = doc.getElementById("resetFile");
    const checkButton = doc.getElementById("checkFile");
    const startButton = doc.getElementById("startAnalyze");

    if (!fileInput || !status || !previewBox || !previewImage || !emptyState || !fileName || !fileSize) {
      return;
    }

    let previewUrl = "";
    let selectedFile = null;
    let previewReadVersion = 0;

    function setStatus(result) {
      status.textContent = result.message;
      status.classList.toggle("is-error", !result.ok);
      status.classList.toggle("is-success", result.ok);
    }

    function clearPreview() {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = "";
      }
      previewImage.removeAttribute("src");
      previewBox.classList.remove("is-visible");
      emptyState.hidden = false;
      fileName.textContent = "未选择";
      fileSize.textContent = "0 KB";
      selectedFile = null;
      if (resetButton) {
        resetButton.hidden = true;
      }
      if (startButton) {
        startButton.disabled = true;
        startButton.textContent = "开始分析";
      }
    }

    function handleFile(file) {
      const result = validateUploadFile(file);
      setStatus(result);

      if (!result.ok) {
        clearPreview();
        return result;
      }

      selectedFile = file;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      previewUrl = URL.createObjectURL(file);
      previewImage.src = previewUrl;
      previewBox.classList.add("is-visible");
      emptyState.hidden = true;
      fileName.textContent = file.name || "手掌照片";
      fileSize.textContent = formatBytes(file.size);
      if (resetButton) {
        resetButton.hidden = false;
      }
      if (startButton) {
        startButton.disabled = false;
      }

      return result;
    }

    fileInput.addEventListener("change", () => {
      handleFile(fileInput.files && fileInput.files[0]);
    });

    if (checkButton) {
      checkButton.addEventListener("click", async () => {
        const file = (fileInput.files && fileInput.files[0]) || selectedFile;
        if (!file) {
          if (startButton) {
            startButton.disabled = true;
          }
          setStatus(validateUploadFile(file));
          return;
        }

        checkButton.disabled = true;
        const result = await checkSelectedImageFile(file);
        checkButton.disabled = false;
        if (!result.ok) {
          fileInput.value = "";
          clearPreview();
        }
        setStatus(result);
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        fileInput.value = "";
        previewReadVersion += 1;
        clearPreview();
        setStatus({
          ok: false,
          code: "missing_file",
          message: "已清除图片，请重新选择一张清晰的手掌照片。"
        });
      });
    }

    if (startButton) {
      startButton.disabled = true;
      startButton.addEventListener("click", async () => {
        const file = (fileInput.files && fileInput.files[0]) || selectedFile;
        const validation = validateUploadFile(file);
        if (!validation.ok) {
          if (!file) {
            setStatus(createAnalyzeErrorResult("UPLOAD_STATE_LOST"));
          } else {
            setStatus(validation);
          }
          return;
        }

        startButton.disabled = true;
        startButton.textContent = "正在分析";
        setStatus({
          ok: true,
          code: "analyzing",
          message: "正在压缩照片...",
        });

        const prepared = await runInlineAnalyze(file, {
          ...options,
          storage: options.storage || getUploadStorage(),
          onProgress(message) {
            setStatus({
              ok: true,
              code: "analyzing",
              message,
            });
          },
        });
        setStatus(prepared);

        if (!prepared.ok || !prepared.shouldNavigate) {
          startButton.disabled = false;
          startButton.textContent = "开始分析";
          return;
        }

        global.location.href = "../result/index.html";
      });
    }
  }

  const api = {
    ACCEPTED_TYPES,
    ANALYSIS_RESULT_STORAGE_KEY,
    LEGACY_ANALYSIS_RESULT_STORAGE_KEY,
    MAX_UPLOAD_BYTES,
    MIN_IMAGE_DIMENSION,
    ANALYZE_TIMEOUT_MS,
    TARGET_ANALYSIS_BYTES,
    STABLE_ANALYSIS_RESULT_STORAGE_KEY,
    UPLOAD_CACHE_TTL_MS,
    UPLOAD_SCHEMA_VERSION,
    UPLOAD_STORAGE_KEY,
    buildAnalysisUploadFromNormalized,
    buildUploadState,
    createPreviewReadFailureResult,
    createAnalyzeErrorResult,
    checkSelectedImageFile,
    compressImageCandidate,
    decodeImageDimensions,
    formatBytes,
    initUploadPage,
    normalizePalmImageForAnalysis,
    prepareUploadForAnalysis,
    readFileAsDataUrl,
    runInlineAnalyze,
    saveUploadState,
    validateUploadFile
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiUpload = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initUploadPage(
      global.document,
      global.__PALMMI_UPLOAD_OPTIONS__ || {}
    ));
  }
})(typeof window !== "undefined" ? window : globalThis);
