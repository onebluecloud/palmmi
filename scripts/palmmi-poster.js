(function palmmiPoster(global) {
  const ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
  const POSTER_STATES = Object.freeze({
    LOADING: "loading",
    READY: "ready",
    MISSING_RESULT: "missing-result",
    INVALID_RESULT: "invalid-result",
    PARTIAL_RESULT: "partial-result",
    ERROR: "error",
  });

  const FALLBACKS = Object.freeze({
    personaName: "未知人格",
    personaCode: "结果待完善",
    hook: "暂无金句",
    tag: "暂无标签",
    matchedFeature: "暂无匹配特征",
    primaryMother: "结果待完善",
    summary: "这份结果适合作为娱乐参考",
  });

  const FEATURE_LABELS = Object.freeze({
    PALM_LENGTH_RATIO: "掌型比例",
    INDEX_RING_RATIO: "食指与无名指比例",
    THUMB_LENGTH_RATIO: "拇指比例",
    INDEX_LENGTH_RATIO: "食指长度",
    PINKY_LENGTH_RATIO: "小指长度",
    FINGER_SPREAD: "手指展开度",
    HAND_ASPECT_RATIO: "手掌长宽比例",
    OVERALL_PROPORTION_FLAG: "整体手型比例",
    FINGERTIP_SHAPE: "指尖形态",
    LIFE_LINE_DEPTH: "生命线清晰度",
    LIFE_LINE_LENGTH: "生命线长度",
    LIFE_LINE_CURVE: "生命线弧度",
    HEAD_LINE_LENGTH: "智慧线长度",
    HEAD_LINE_DEPTH: "智慧线清晰度",
    HEAD_LINE_SLOPE: "智慧线走势",
    HEAD_LIFE_GAP: "智慧线与生命线间距",
    HEAD_LINE_END_FORK: "智慧线末端分支",
    HEART_LINE_DEPTH: "感情线清晰度",
    HEART_LINE_LENGTH: "感情线长度",
    HEART_LINE_CURVE: "感情线弧度",
    HEART_LINE_END_FORK: "感情线末端分支",
    SIMIAN_LINE: "贯通掌纹",
    CHUAN_PALM: "川字掌结构",
    LINE_COMPLEXITY: "掌纹复杂度",
    OVERALL_CLARITY: "整体掌纹清晰度",
    FATE_LINE_CLARITY: "事业线清晰度",
    SUN_LINE_PRESENCE: "太阳线状态",
    MOUNT_VENUS: "金星丘区域",
    MOUNT_JUPITER: "木星丘区域",
    MOUNT_SATURN: "土星丘区域",
    MOUNT_APOLLO: "太阳丘区域",
    MOUNT_MERCURY: "水星丘区域",
    MOUNT_LUNA: "月丘区域",
  });

  function requireStage5Module(relativePath, globalName) {
    if (typeof require === "function" && typeof module !== "undefined" && module.exports) {
      return require(relativePath);
    }
    return global[globalName] || null;
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function firstText(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  }

  function readNestedText(source, path) {
    let current = source;
    for (const key of path) {
      if (!current || typeof current !== "object") {
        return "";
      }
      current = current[key];
    }
    return typeof current === "string" ? current : "";
  }

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }

  function normalizeFeatureLabels(features) {
    return normalizeList(features).map((feature) => FEATURE_LABELS[feature] || "已记录一项掌纹线索");
  }

  function unique(values) {
    const seen = new Set();
    return values.filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  function safeUserCopy(value) {
    if (typeof value !== "string" || !value.trim()) {
      return "";
    }
    if (/schema|pipeline|debug|rule|score|scored|candidate|cross[-_\s]?mother|adjacent|primary[-_\s]?mother|VLM/i.test(value)) {
      return "";
    }
    return value.trim();
  }

  function compactCode(value) {
    const text = firstText(value);
    if (text.length <= 16) {
      return text;
    }
    return `${text.slice(0, 12)}...`;
  }

  function limit(values, count) {
    return Array.isArray(values) ? values.slice(0, count) : [];
  }

  function formatSocialTag(value) {
    const text = firstText(value);
    if (!text || text === FALLBACKS.tag) {
      return text;
    }
    return text.startsWith("#") ? text : `#${text}`;
  }

  function hasNonPassStatus(value) {
    const normalized = firstText(value).toUpperCase();
    return Boolean(normalized && !["PASS", "OK", "SUCCESS"].includes(normalized));
  }

  function normalizeReadOptions(input) {
    if (
      input === undefined ||
      (isPlainObject(input) && Object.keys(input).length === 0)
    ) {
      return {};
    }
    if (
      isPlainObject(input) &&
      (Object.prototype.hasOwnProperty.call(input, "storage") ||
        Object.prototype.hasOwnProperty.call(input, "key") ||
        Object.prototype.hasOwnProperty.call(input, "pageReader") ||
        Object.prototype.hasOwnProperty.call(input, "stateMapper"))
    ) {
      return input;
    }
    return { storage: input };
  }

  function resolvePageReader(options) {
    return options.pageReader || requireStage5Module("../src/stage5/page-analysis-reader.js", "PalmmiPageAnalysisReader");
  }

  function resolveStateMapper(options) {
    return options.stateMapper || requireStage5Module("../src/stage5/page-analysis-state-mapper.js", "PalmmiPageAnalysisStateMapper");
  }

  function stage5StatusForRenderer(data, mapping) {
    if (mapping.analysisStatus === "ANALYSIS_LOW_CONFIDENCE" || mapping.requiresWarning) {
      return "LOW_CONFIDENCE";
    }
    if (data.status === "failed") {
      return "ERROR";
    }
    return "SUCCESS";
  }

  function stage5PageDataToPosterRendererInput(data, mapping) {
    const summary = isPlainObject(data.summary) ? data.summary : {};
    const ui = isPlainObject(data.uiConsumable) ? data.uiConsumable : {};
    const diagnostics = isPlainObject(data.diagnostics) ? data.diagnostics : {};
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    const keywords = normalizeList(summary.keywords);
    const personaId = firstText(ui.personaId, FALLBACKS.personaCode);
    const personaName = firstText(ui.personaName, summary.title, FALLBACKS.personaName);
    const shortText = firstText(summary.shortText, ui.secondaryDisplayText, FALLBACKS.summary);
    const motherType = firstText(summary.subtitle, "Stage 5");
    const matchedFeatures = keywords.length ? keywords : ["HEAD_LINE_LENGTH"];

    return {
      status: stage5StatusForRenderer(data, mapping),
      quality_gate: {
        status: mapping.requiresWarning ? "WARN" : "PASS",
      },
      schema: {
        status: mapping.allowsPartialResult && mapping.pageState === POSTER_STATES.PARTIAL_RESULT ? "WARN" : "PASS",
      },
      primary_mother: {
        id: motherType,
        name: motherType,
        core_fields_matched: matchedFeatures,
      },
      primary_persona: {
        id: personaId,
        persona_id: personaId,
        name: personaName,
        mother_type: motherType,
        hook: firstText(ui.secondaryDisplayText, shortText, FALLBACKS.hook),
        description: shortText,
        tags: keywords,
        matched_features: matchedFeatures,
      },
      top3: [
        {
          id: personaId,
          persona_id: personaId,
          name: personaName,
          mother_type: motherType,
        },
      ],
      recognition: {
        explanation: {
          persona: {
            reason: shortText,
            matched_features: matchedFeatures,
          },
          low_confidence: mapping.requiresWarning || diagnostics.lowConfidenceFieldCount > 0,
        },
      },
      error_codes: warnings,
    };
  }

  function readAnalysisResult(input = {}) {
    const options = normalizeReadOptions(input);
    const pageReader = resolvePageReader(options);
    const stateMapper = resolveStateMapper(options);

    if (
      !pageReader ||
      typeof pageReader.readPosterPageAnalysisData !== "function" ||
      !stateMapper ||
      typeof stateMapper.mapAnalysisStatusToPosterPageState !== "function"
    ) {
      return {
        ok: false,
        state: POSTER_STATES.ERROR,
        message: "海报页读取模块暂时不可用，请重新测试。",
      };
    }

    const pageResponse = pageReader.readPosterPageAnalysisData({
      storage: options.storage,
      key: options.key,
    });
    const mapping = stateMapper.mapAnalysisStatusToPosterPageState(pageResponse);

    if (!pageResponse || pageResponse.ok !== true || !mapping.canRenderPoster) {
      return {
        ok: false,
        state: mapping.pageState,
        message: mapping.message,
        mapping,
      };
    }

    return {
      ok: true,
      state: mapping.pageState,
      result: stage5PageDataToPosterRendererInput(pageResponse.data, mapping),
      mapping,
    };
  }

  function createProblemViewModel(state, messageOverride) {
    const models = {
      [POSTER_STATES.MISSING_RESULT]: {
        title: "还没有可生成的海报",
        message: "请先完成一次 Palmmi 测试，再查看分享海报预览。",
        pill: "等待结果",
        recoveryHint: "你可以返回结果页查看当前状态，或重新测试生成新的结果。",
      },
      [POSTER_STATES.INVALID_RESULT]: {
        title: "海报数据暂时无法读取",
        message: "本次结果数据不完整，请重新测试后再生成海报。",
        pill: "需要重试",
        recoveryHint: "这通常是本地暂存结果中断导致的，重新测试即可恢复。",
      },
      [POSTER_STATES.PARTIAL_RESULT]: {
        title: "海报字段暂时不完整",
        message: "可以先查看基础海报预览，缺失字段会使用短兜底文案。",
        pill: "结果待完善",
        recoveryHint: "如果想要更完整的海报内容，可以重新上传清晰照片。",
      },
      [POSTER_STATES.ERROR]: {
        title: "海报页暂时无法显示",
        message: "本次照片暂时不适合生成海报，请重新测试。",
        pill: "显示中断",
        recoveryHint: "不会展示技术错误信息；重新上传一张清晰照片即可再试。",
      },
    };

    const model = models[state] || models[POSTER_STATES.ERROR];
    return {
      state,
      ...model,
      message: messageOverride || model.message,
      backResultText: "返回结果页",
      backResultHref: "../result/index.html",
      retestText: "重新测试",
      retestHref: "../upload/index.html",
      uploadText: "返回上传页",
      uploadHref: "../upload/index.html",
      homeText: "返回首页",
      homeHref: "../index.html",
    };
  }

  function createTopCandidates(top3) {
    if (!Array.isArray(top3)) {
      return [];
    }

    return top3.slice(0, 3).map((candidate, index) => {
      const code = firstText(candidate && candidate.id, candidate && candidate.persona_id, `Top ${index + 1}`);
      const name = firstText(candidate && candidate.name, FALLBACKS.personaCode);
      const motherType = firstText(candidate && candidate.mother_type, "");
      return {
        code: compactCode(code),
        name,
        motherType,
      };
    });
  }

  function createScreenshotResult(scenario) {
    const base = {
      status: "SUCCESS",
      quality_gate: {
        status: "PASS",
      },
      schema: {
        status: "PASS",
      },
      primary_mother: {
        id: "M1",
        name: "钢线型",
        core_fields_matched: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH"],
      },
      primary_persona: {
        id: "P01",
        persona_id: "P01",
        name: "人生排位赛选手",
        mother_type: "M1",
        hook: "把目标拆清楚，再稳稳推进。",
        description: "这是来自本次结果数据的用户可读核心描述，适合作为一张基础分享海报的简短说明。",
        tags: ["目标感", "执行力", "稳定推进"],
        matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
      },
      top3: [
        { id: "P01", persona_id: "P01", name: "人生排位赛选手", mother_type: "M1" },
        { id: "P06", persona_id: "P06", name: "目标感整理者", mother_type: "M1" },
        { id: "P12", persona_id: "P12", name: "节奏规划者", mother_type: "M4" },
      ],
      recognition: {
        explanation: {
          persona: {
            matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
          },
          low_confidence: false,
        },
      },
      error_codes: [],
    };

    if (scenario !== "long-name") {
      return base;
    }

    return {
      ...base,
      status: "LOW_CONFIDENCE",
      quality_gate: {
        status: "WARN",
      },
      primary_mother: {
        id: "M8",
        name: "复合线型",
        core_fields_matched: ["HEAD_LINE_LENGTH", "HEART_LINE_LENGTH"],
      },
      primary_persona: {
        id: "P99",
        persona_id: "P99-SUPER-LONG-CODE-WITHOUT-SPACES-FOR-WRAPPING",
        name: "一个名字特别长但仍然需要在三百九十像素手机屏幕里读得下去的人格标签",
        mother_type: "M8",
        hook: "这是一句很长很长的金句，用来确认移动端海报页会保留完整文案，同时通过布局换行来避免撑爆。",
        description: "这段核心描述同样比较长，用于确认基础海报预览在移动端会保持正常阅读节奏，不横向溢出，也不会遮挡操作入口。",
        tags: ["复合线型", "超长人格名", "移动端换行", "结果说明", "掌纹结构"],
        matched_features: [
          "HEAD_LINE_LENGTH",
          "HEAD_LINE_DEPTH",
          "HEAD_LINE_SLOPE",
          "HEART_LINE_LENGTH",
          "HEART_LINE_DEPTH",
        ],
      },
      top3: [
        { id: "P99", persona_id: "P99-SUPER-LONG-CODE-WITHOUT-SPACES-FOR-WRAPPING", name: "一个名字特别长但仍然需要正常展示的候选人格", mother_type: "M8" },
        { id: "P21", persona_id: "P21", name: "移动端文本换行观察者", mother_type: "M4" },
        { id: "P32", persona_id: "P32", name: "标签收纳管理员", mother_type: "M6" },
      ],
      recognition: {
        explanation: {
          persona: {
            matched_features: [
              "HEAD_LINE_LENGTH",
              "HEAD_LINE_DEPTH",
              "HEAD_LINE_SLOPE",
              "HEART_LINE_LENGTH",
              "HEART_LINE_DEPTH",
            ],
          },
          low_confidence: true,
        },
      },
    };
  }

  function createQualityHint(result, status, explanation) {
    const qualityGate = isPlainObject(result.quality_gate) ? result.quality_gate : {};
    const schema = isPlainObject(result.schema) ? result.schema : {};
    const errorCodes = Array.isArray(result.error_codes) ? result.error_codes : [];
    const lowConfidence = status === "LOW_CONFIDENCE" || Boolean(explanation.low_confidence);

    if (lowConfidence || hasNonPassStatus(qualityGate.status)) {
      return "这次图片可读性一般，这份结果更适合作为娱乐参考。";
    }

    if (hasNonPassStatus(schema.status) || errorCodes.length > 0) {
      return "本次结果有部分字段不够完整，已优先渲染可读内容。";
    }

    return FALLBACKS.summary;
  }

  function createPosterSummary(...values) {
    const copy = firstText(...values.map(safeUserCopy), FALLBACKS.summary);
    if (copy.length <= 52) {
      return copy;
    }
    return `${copy.slice(0, 52)}…`;
  }

  function createPosterViewModel(result) {
    if (!isPlainObject(result)) {
      return createProblemViewModel(POSTER_STATES.INVALID_RESULT);
    }

    const status = firstText(result.status, "SUCCESS");
    if (status === "RETRY_REQUIRED" || status === "REJECTED") {
      return createProblemViewModel(
        POSTER_STATES.ERROR,
        "本次照片暂时不适合生成海报，请重新上传一张清晰、正面的单手掌照片。"
      );
    }

    const persona = isPlainObject(result.primary_persona) ? result.primary_persona : {};
    const mother = isPlainObject(result.primary_mother) ? result.primary_mother : {};
    const recognition = isPlainObject(result.recognition) ? result.recognition : {};
    const explanation = isPlainObject(recognition.explanation) ? recognition.explanation : {};
    const personaExplanation = isPlainObject(explanation.persona) ? explanation.persona : {};
    const personaName = firstText(persona.name, readNestedText(result, ["persona", "name"]), FALLBACKS.personaName);
    const personaCode = firstText(persona.persona_id, persona.id, readNestedText(result, ["persona", "id"]), FALLBACKS.personaCode);
    const primaryMother = firstText(mother.name, mother.id, persona.mother_type, FALLBACKS.primaryMother);
    const primaryMotherCode = firstText(mother.id, persona.mother_type, "");
    const matchedFeatures = normalizeFeatureLabels(
      persona.matched_features ||
      personaExplanation.matched_features ||
      (recognition.primary_persona && recognition.primary_persona.matched_features)
    );
    const baseTags = unique([
      ...normalizeList(persona.tags),
      ...normalizeList(result.tags),
      primaryMother === FALLBACKS.primaryMother ? "" : primaryMother,
      primaryMotherCode,
      ...matchedFeatures,
    ]);
    const tags = baseTags.length ? limit(baseTags.map(formatSocialTag), 4) : [FALLBACKS.tag];
    const hook = firstText(persona.hook, persona.quote, persona.summary, result.hook, result.quote, result.summary, FALLBACKS.hook);
    const summary = createPosterSummary(
      persona.description,
      persona.core_description,
      result.description,
      result.core_description,
      readNestedText(explanation, ["persona", "reason"])
    );
    const topCandidates = createTopCandidates(result.top3);
    const safeFeatures = matchedFeatures.length ? limit(unique(matchedFeatures), 5) : [FALLBACKS.matchedFeature];
    const qualityHint = createQualityHint(result, status, explanation);

    const isPartial =
      personaName === FALLBACKS.personaName ||
      personaCode === FALLBACKS.personaCode ||
      hook === FALLBACKS.hook ||
      tags[0] === FALLBACKS.tag ||
      safeFeatures[0] === FALLBACKS.matchedFeature ||
      primaryMother === FALLBACKS.primaryMother;

    return {
      state: isPartial ? POSTER_STATES.PARTIAL_RESULT : POSTER_STATES.READY,
      title: isPartial ? "基础海报预览" : "你的分享海报",
      pill: status === "LOW_CONFIDENCE" ? "保守结果" : "传播海报",
      status,
      personaName,
      personaCode,
      hook,
      tags,
      summary,
      matchedFeatures: safeFeatures,
      primaryMother,
      primaryMotherCode,
      topCandidates,
      qualityHint,
      backResultHref: "../result/index.html",
      retestHref: "../upload/index.html",
      homeHref: "../index.html",
    };
  }

  function setText(doc, id, value) {
    const element = doc.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function setHidden(element, hidden) {
    if (element) {
      element.hidden = hidden;
    }
  }

  function replaceList(doc, id, values, className) {
    const list = doc.getElementById(id);
    if (!list) {
      return;
    }
    list.innerHTML = "";
    values.forEach((value) => {
      const item = doc.createElement("li");
      if (className) {
        item.className = className;
      }
      item.textContent = value;
      list.appendChild(item);
    });
  }

  function replaceTopCandidates(doc, id, candidates) {
    const list = doc.getElementById(id);
    if (!list) {
      return;
    }
    list.innerHTML = "";
    const safeCandidates = candidates.length ? candidates : [{ code: "Top 3", name: FALLBACKS.personaCode, motherType: "" }];
    safeCandidates.forEach((candidate, index) => {
      const item = doc.createElement("li");
      item.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong></strong><em></em>`;
      const strong = item.querySelector("strong");
      const em = item.querySelector("em");
      if (strong) {
        strong.textContent = candidate.name;
      }
      if (em) {
        em.textContent = [candidate.code, candidate.motherType].filter(Boolean).join(" / ");
      }
      list.appendChild(item);
    });
  }

  function renderProblem(doc, state, message) {
    const root = doc.getElementById("posterApp");
    const readyPanel = doc.getElementById("posterReady");
    const problemPanel = doc.getElementById("posterProblem");
    const model = createProblemViewModel(state, message);

    if (root) {
      root.dataset.state = state;
    }
    if (doc.body) {
      doc.body.dataset.posterState = state;
    }
    setHidden(readyPanel, true);
    setHidden(problemPanel, false);
    setText(doc, "posterProblemPill", model.pill);
    setText(doc, "posterProblemTitle", model.title);
    setText(doc, "posterProblemCopy", model.message);
    setText(doc, "posterProblemHint", model.recoveryHint);

    const links = [
      ["posterProblemBackResult", model.backResultText, model.backResultHref],
      ["posterProblemRetest", model.retestText, model.retestHref],
      ["posterProblemUpload", model.uploadText, model.uploadHref],
      ["posterProblemHome", model.homeText, model.homeHref],
    ];
    links.forEach(([id, text, href]) => {
      const element = doc.getElementById(id);
      if (element) {
        element.textContent = text;
        element.href = href;
      }
    });
  }

  function renderPoster(doc, viewModel) {
    const root = doc.getElementById("posterApp");
    const readyPanel = doc.getElementById("posterReady");
    const problemPanel = doc.getElementById("posterProblem");

    if (root) {
      root.dataset.state = viewModel.state;
    }
    if (doc.body) {
      doc.body.dataset.posterState = viewModel.state;
    }
    setHidden(readyPanel, false);
    setHidden(problemPanel, true);
    const frame = doc.getElementById("posterPreview");
    if (frame && frame.classList) {
      frame.classList.toggle("is-long-copy", viewModel.personaName.length > 18 || viewModel.hook.length > 42);
    }
    setText(doc, "posterPill", viewModel.pill);
    setText(doc, "posterTitle", viewModel.title);
    setText(doc, "posterPersonaCode", viewModel.personaCode);
    setText(doc, "posterPersonaName", viewModel.personaName);
    setText(doc, "posterHook", viewModel.hook);
    setText(doc, "posterSummary", viewModel.summary);
    setText(doc, "posterPrimaryMother", viewModel.primaryMother);
    setText(doc, "posterStatusMeta", viewModel.status);
    setText(doc, "posterQualityHint", viewModel.qualityHint);
    setText(doc, "posterMotherDetail", viewModel.primaryMother);
    replaceList(doc, "posterTags", viewModel.tags, "chip");
    replaceList(doc, "posterMatchedFeatures", viewModel.matchedFeatures, "");
    replaceTopCandidates(doc, "posterTopCandidates", viewModel.topCandidates);
  }

  function readRequestedTestState(locationLike) {
    const search = locationLike && typeof locationLike.search === "string" ? locationLike.search : "";
    if (!search) {
      return null;
    }
    const params = new URLSearchParams(search);
    const state = params.get("state");
    const allowed = new Set([
      POSTER_STATES.READY,
      "long-name",
      POSTER_STATES.MISSING_RESULT,
      POSTER_STATES.INVALID_RESULT,
      POSTER_STATES.PARTIAL_RESULT,
      POSTER_STATES.ERROR,
    ]);
    return allowed.has(state) ? state : null;
  }

  function initPosterPage(doc, options = {}) {
    const requestedState = readRequestedTestState(options.location || global.location);

    if (requestedState === POSTER_STATES.READY || requestedState === "long-name") {
      renderPoster(doc, createPosterViewModel(createScreenshotResult(requestedState)));
      return;
    }

    if (requestedState && requestedState !== POSTER_STATES.PARTIAL_RESULT) {
      renderProblem(doc, requestedState);
      return;
    }

    if (requestedState === POSTER_STATES.PARTIAL_RESULT) {
      renderPoster(doc, createPosterViewModel({ status: "SUCCESS", primary_persona: {}, primary_mother: {}, top3: [] }));
      return;
    }

    const read = readAnalysisResult(options);
    if (!read.ok) {
      renderProblem(doc, read.state, read.message);
      return;
    }

    try {
      const viewModel = createPosterViewModel(read.result);
      viewModel.state = read.state;
      if (viewModel.state === POSTER_STATES.ERROR && viewModel.backResultHref) {
        renderProblem(doc, POSTER_STATES.ERROR, viewModel.message);
        return;
      }
      renderPoster(doc, viewModel);
    } catch (error) {
      renderProblem(doc, POSTER_STATES.ERROR);
    }
  }

  const api = {
    ANALYSIS_RESULT_STORAGE_KEY,
    POSTER_STATES,
    createPosterViewModel,
    createProblemViewModel,
    initPosterPage,
    readAnalysisResult,
    readRequestedTestState,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiPoster = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initPosterPage(global.document));
  }
})(typeof window !== "undefined" ? window : globalThis);
