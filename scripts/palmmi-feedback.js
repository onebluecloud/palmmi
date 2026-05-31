(function palmmiFeedback(global) {
  const STORAGE_KEYS = Object.freeze({
    stableAnalysis: "palmmi:last-analysis",
    legacyAnalysis: "palmmi:lastAnalysisResult",
    analyzeError: "palmmi:lastAnalyzeError",
  });

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function firstText(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
    return "";
  }

  function safeText(value, fallback = "未记录") {
    const text = firstText(value);
    if (!text) {
      return fallback;
    }
    if (/data:image\/|;base64,|api[_\s-]?key|authorization|secret|token|sk-[a-z0-9_-]+/i.test(text)) {
      return "[已省略敏感内容]";
    }
    return text.replace(/\s+/g, " ").trim().slice(0, 160);
  }

  function readJson(storage, key) {
    if (!storage || typeof storage.getItem !== "function") {
      return null;
    }
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function unwrapAnalysis(value) {
    if (!isPlainObject(value)) {
      return null;
    }
    return isPlainObject(value.analysis_result) ? value.analysis_result : value;
  }

  function getLastAnalysis(storage) {
    return unwrapAnalysis(readJson(storage, STORAGE_KEYS.stableAnalysis))
      || unwrapAnalysis(readJson(storage, STORAGE_KEYS.legacyAnalysis))
      || {};
  }

  function getLastError(storage) {
    const value = readJson(storage, STORAGE_KEYS.analyzeError);
    return isPlainObject(value) ? value : {};
  }

  function shortUserAgent(navigatorLike) {
    const userAgent = navigatorLike && typeof navigatorLike.userAgent === "string"
      ? navigatorLike.userAgent
      : "";
    if (!userAgent) {
      return "未记录";
    }
    if (/MicroMessenger/i.test(userAgent)) {
      return /iPhone|iPad|iPod/i.test(userAgent) ? "iPhone 微信" : "Android 微信";
    }
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return "iPhone Safari / iOS 浏览器";
    }
    if (/Android/i.test(userAgent)) {
      return "Android Chrome / Android 浏览器";
    }
    return "桌面或其他浏览器";
  }

  function buildFeedbackTemplate(options = {}) {
    const storage = options.storage || global.sessionStorage;
    const locationLike = options.location || global.location || {};
    const navigatorLike = options.navigator || global.navigator || {};
    const analysis = getLastAnalysis(storage);
    const lastError = getLastError(storage);
    const error = isPlainObject(lastError.error) ? lastError.error : lastError;
    const personaId = safeText(analysis.personality_id || analysis.persona_id || (analysis.uiConsumable && analysis.uiConsumable.personaId), "无");
    const personaName = safeText(analysis.personality_name || (analysis.uiConsumable && analysis.uiConsumable.personaName), "无");
    const qualityStatus = safeText(analysis.quality_status || (analysis.uiConsumable && analysis.uiConsumable.qualityStatus), "未记录");
    const errorCode = safeText(error.code || analysis.error_code || analysis.quality_status, "无");
    const errorMessage = safeText(error.message || analysis.user_message, "无");
    const pagePath = safeText(locationLike.pathname || "/", "/");

    return [
      "Palmmi 内测反馈",
      "",
      `- 测试环境：${shortUserAgent(navigatorLike)}`,
      `- 当前页面：${pagePath}`,
      "- 设备型号：请填写",
      "- 浏览器 / App：请填写",
      "- 上传：PASS / FAIL / 未测",
      "- 结果页：PASS / FAIL / 未测",
      "- 海报页：PASS / FAIL / 未测",
      "- 保存图片：PASS / FAIL / 未测",
      "- 复制分享文案：PASS / FAIL / 未测",
      "- 不白屏 / 不卡死：PASS / FAIL",
      `- 最近错误码：${errorCode}`,
      `- 最近错误提示：${errorMessage}`,
      `- 最近人格结果：${personaName} / ${personaId}`,
      `- 最近质量状态：${qualityStatus}`,
      "- 简短反馈：请用一句话描述问题或感受",
      "- 安全确认：没有看到 API key / token / base64 图片 / raw provider response / 堆栈",
    ].join("\n");
  }

  function fallbackCopy(doc, text) {
    if (!doc || typeof doc.createElement !== "function" || typeof doc.execCommand !== "function") {
      return false;
    }
    const input = doc.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "readonly");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "0";
    doc.body.appendChild(input);
    input.select();
    const copied = doc.execCommand("copy");
    input.remove();
    return copied;
  }

  function copyFeedbackTemplate(text, options = {}) {
    const doc = options.document || global.document;
    const nav = options.navigator || global.navigator || {};
    if (nav.clipboard && typeof nav.clipboard.writeText === "function") {
      return nav.clipboard.writeText(text)
        .then(() => ({ ok: true }))
        .catch(() => ({ ok: fallbackCopy(doc, text) }));
    }
    return Promise.resolve({ ok: fallbackCopy(doc, text) });
  }

  function initFeedbackPage(doc = global.document) {
    if (!doc) {
      return;
    }
    const template = doc.getElementById("feedbackTemplate");
    const button = doc.getElementById("copyFeedbackTemplate");
    const status = doc.getElementById("feedbackCopyStatus");
    const text = buildFeedbackTemplate();

    if (template) {
      template.value = text;
    }
    if (button) {
      button.disabled = false;
      button.onclick = () => {
        const currentText = template ? template.value : text;
        button.disabled = true;
        if (status) {
          status.textContent = "正在复制反馈模板...";
        }
        copyFeedbackTemplate(currentText, { document: doc, navigator: global.navigator })
          .then((result) => {
            if (status) {
              status.textContent = result.ok ? "已复制反馈模板。" : "当前浏览器不支持自动复制，请手动选择模板文字。";
            }
          })
          .catch(() => {
            if (status) {
              status.textContent = "当前浏览器不支持自动复制，请手动选择模板文字。";
            }
          })
          .finally(() => {
            button.disabled = false;
          });
      };
    }
  }

  const api = {
    STORAGE_KEYS,
    buildFeedbackTemplate,
    copyFeedbackTemplate,
    initFeedbackPage,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiFeedback = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initFeedbackPage(global.document));
  }
})(typeof window !== "undefined" ? window : globalThis);
