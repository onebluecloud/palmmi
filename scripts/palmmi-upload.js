(function palmmiUpload(global) {
  const UPLOAD_SCHEMA_VERSION = "stage4d_upload_v1";
  const UPLOAD_STORAGE_KEY = "palmmi:lastUpload";
  const ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  function validateUploadFile(file) {
    if (!file) {
      return {
        ok: false,
        code: "missing_file",
        message: "请先选择一张清晰的手掌照片。"
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
        message: "图片太大，请换一张 10MB 以内的图片。"
      };
    }

    return {
      ok: true,
      code: "accepted",
      message: "图片已选择，可以预览。"
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
    return {
      schemaVersion: UPLOAD_SCHEMA_VERSION,
      fileName: file && file.name ? file.name : "手掌照片",
      fileType: file && file.type ? file.type : "",
      fileSize: file && Number.isFinite(file.size) ? file.size : 0,
      fileSizeLabel: formatBytes(file && Number.isFinite(file.size) ? file.size : 0),
      previewDataUrl: typeof previewDataUrl === "string" ? previewDataUrl : "",
      uploadedAt: now(),
      handSide,
    };
  }

  function createPreviewReadFailureResult() {
    return {
      ok: false,
      code: "preview_read_failed",
      message: "这张图片暂时无法读取，请重新选择。"
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

    try {
      if (storage && typeof storage.removeItem === "function") {
        storage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
      }
    } catch (error) {
      // Clearing a stale result is helpful but not required for the upload flow.
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

  function initUploadPage(doc) {
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
    let previewDataUrl = "";
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
      previewDataUrl = "";
      selectedFile = null;
      if (resetButton) {
        resetButton.hidden = true;
      }
      if (startButton) {
        startButton.disabled = false;
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

      const readVersion = previewReadVersion + 1;
      previewReadVersion = readVersion;
      readFileAsDataUrl(file)
        .then((dataUrl) => {
          if (readVersion === previewReadVersion) {
            if (dataUrl) {
              previewDataUrl = dataUrl;
              return;
            }

            fileInput.value = "";
            clearPreview();
            setStatus(createPreviewReadFailureResult());
          }
        })
        .catch(() => {
          if (readVersion === previewReadVersion) {
            fileInput.value = "";
            clearPreview();
            setStatus(createPreviewReadFailureResult());
          }
        });

      return result;
    }

    fileInput.addEventListener("change", () => {
      handleFile(fileInput.files && fileInput.files[0]);
    });

    if (checkButton) {
      checkButton.addEventListener("click", () => {
        handleFile(fileInput.files && fileInput.files[0]);
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
      startButton.disabled = false;
      startButton.addEventListener("click", async () => {
        const file = (fileInput.files && fileInput.files[0]) || selectedFile;
        const result = handleFile(file);

        if (!result.ok) {
          return;
        }

        startButton.disabled = true;
        startButton.textContent = "正在进入分析页";

        let safePreviewDataUrl = previewDataUrl;
        if (!safePreviewDataUrl) {
          try {
            safePreviewDataUrl = await readFileAsDataUrl(file);
          } catch (error) {
            fileInput.value = "";
            clearPreview();
            setStatus(createPreviewReadFailureResult());
            startButton.disabled = false;
            startButton.textContent = "开始分析";
            return;
          }
        }

        if (!safePreviewDataUrl && typeof global.FileReader === "function") {
          fileInput.value = "";
          clearPreview();
          setStatus(createPreviewReadFailureResult());
          startButton.disabled = false;
          startButton.textContent = "开始分析";
          return;
        }

        const storage = getUploadStorage();
        const prepared = prepareUploadForAnalysis({ file, previewDataUrl: safePreviewDataUrl, storage });
        setStatus(prepared);

        if (!prepared.ok || !prepared.shouldNavigate) {
          startButton.disabled = false;
          startButton.textContent = "开始分析";
          return;
        }

        global.location.href = "../analyze/index.html";
      });
    }
  }

  const api = {
    ACCEPTED_TYPES,
    ANALYSIS_RESULT_STORAGE_KEY,
    MAX_UPLOAD_BYTES,
    UPLOAD_SCHEMA_VERSION,
    UPLOAD_STORAGE_KEY,
    buildUploadState,
    createPreviewReadFailureResult,
    formatBytes,
    initUploadPage,
    prepareUploadForAnalysis,
    readFileAsDataUrl,
    saveUploadState,
    validateUploadFile
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiUpload = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initUploadPage(global.document));
  }
})(typeof window !== "undefined" ? window : globalThis);
