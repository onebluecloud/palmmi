(function palmmiResult(global) {
  const ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
  const RESULT_STATES = Object.freeze({
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
    hook: "照片掌纹不够清晰，请重新拍摄后再试。",
    coreDescription: "照片掌纹不够清晰，请重新拍摄后再试。",
    summary: "当前结果基于可识别的掌纹结构生成。",
    tag: "暂无标签",
    evidence: "掌纹线索不足，请重新拍摄。",
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

  function safeUserCopy(value) {
    if (typeof value !== "string" || !value.trim()) {
      return "";
    }
    if (/schema|pipeline|debug|rule|score|scored|candidate|cross[-_\s]?mother|adjacent|primary[-_\s]?mother|VLM/i.test(value)) {
      return "";
    }
    return value.trim();
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

  function limitWithRemainder(values, limit, suffix) {
    if (!Array.isArray(values) || values.length <= limit) {
      return values;
    }
    const visible = values.slice(0, limit);
    visible.push(`另有 ${values.length - limit} ${suffix}已纳入结果`);
    return visible;
  }

  function createSummaryPreview(copy) {
    const safeCopy = firstText(copy, FALLBACKS.coreDescription);
    if (safeCopy.length <= 88) {
      return safeCopy;
    }
    return `${safeCopy.slice(0, 88)}…完整说明见下方。`;
  }

  function hasNonPassStatus(value) {
    const normalized = firstText(value).toUpperCase();
    return Boolean(normalized && !["PASS", "OK", "SUCCESS"].includes(normalized));
  }

  function createQualityHint(result, status, explanation) {
    const qualityGate = isPlainObject(result.quality_gate) ? result.quality_gate : {};
    const schema = isPlainObject(result.schema) ? result.schema : {};
    const errorCodes = Array.isArray(result.error_codes) ? result.error_codes : [];
    const lowConfidence = status === "LOW_CONFIDENCE" || Boolean(explanation.low_confidence);

    if (lowConfidence || hasNonPassStatus(qualityGate.status)) {
      return {
        text: "这次图片可读性一般，结果更适合作为娱乐参考。",
        confidenceCopy: "当前结果基于可识别的掌纹结构生成；如果想要更稳定的结果，可以重新上传一张更清晰的手掌照片。",
      };
    }

    if (hasNonPassStatus(schema.status) || errorCodes.length > 0) {
      return {
        text: "本次结果有部分字段不够完整，已优先展示可读内容。",
        confidenceCopy: "结果基于当前可识别的信息生成，适合作为娱乐参考。",
      };
    }

    return {
      text: "",
      confidenceCopy: "当前结果基于可识别的掌纹结构生成。",
    };
  }

  function compactCode(value) {
    const text = firstText(value);
    if (text.length <= 16) {
      return text;
    }
    return `${text.slice(0, 12)}...`;
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

  function stage5PageDataToResultRendererInput(data, mapping) {
    const persona = isPlainObject(data.persona) ? data.persona : {};
    const summary = isPlainObject(data.summary) ? data.summary : {};
    const ui = isPlainObject(data.uiConsumable) ? data.uiConsumable : {};
    const scores = isPlainObject(data.scores) ? data.scores : {};
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    const featureKeys = sections.map((section) => firstText(section.key, section.title)).filter(Boolean);
    const flatFeatures = normalizeList(data.features);
    const tags = unique([...normalizeList(data.traits), ...normalizeList(summary.keywords)]);
    const personaId = firstText(data.personality_id, persona.id, ui.personaId, FALLBACKS.personaCode);
    const personaName = firstText(data.personality_name, persona.name, ui.personaName, summary.title, FALLBACKS.personaName);
    const shortText = firstText(data.summary, summary.shortText, ui.secondaryDisplayText, ui.primaryDisplayText, FALLBACKS.hook);
    const description = firstText(
      data.description,
      sections[0] && sections[0].content,
      summary.shortText,
      ui.secondaryDisplayText,
      FALLBACKS.coreDescription
    );
    const motherType = firstText(data.main_line_type, summary.subtitle, "Stage 5");
    const matchedFeatures = flatFeatures.length ? flatFeatures : (featureKeys.length ? featureKeys : tags);
    const candidateResults = Array.isArray(data.candidate_results) && data.candidate_results.length
      ? data.candidate_results
      : [{
        personality_id: personaId,
        personality_name: personaName,
        main_line_type: motherType,
        score: scores.matchScore || scores.overallConfidence || persona.confidence || ui.confidence || null,
      }];

    return {
      status: stage5StatusForRenderer(data, mapping),
      quality_status: firstText(data.quality_status, ui.qualityStatus),
      user_message: firstText(data.user_message),
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
        hook: shortText,
        description,
        score: scores.matchScore || scores.overallConfidence || persona.confidence || ui.confidence || null,
        tags,
        matched_features: matchedFeatures,
      },
      top3: [
        {
          id: personaId,
          persona_id: personaId,
          name: personaName,
          mother_type: motherType,
          score: scores.matchScore || scores.overallConfidence || persona.confidence || ui.confidence || null,
        },
      ],
      recognition: {
        explanation: {
          persona: {
            reason: shortText,
            matched_features: matchedFeatures,
          },
          low_confidence: mapping.requiresWarning,
        },
      },
      quality_gate: {
        status: firstText(data.quality_status, mapping.requiresWarning ? "WARN" : "PASS"),
      },
      schema: {
        status: mapping.allowsPartialResult && mapping.pageState === RESULT_STATES.PARTIAL_RESULT ? "WARN" : "PASS",
      },
      error_codes: warnings,
      evidence: firstText(data.evidence),
      match_reason: firstText(data.match_reason),
      candidate_results: candidateResults,
    };
  }

  function readAnalysisResult(input = {}) {
    const options = normalizeReadOptions(input);
    const pageReader = resolvePageReader(options);
    const stateMapper = resolveStateMapper(options);

    if (
      !pageReader ||
      typeof pageReader.readResultPageAnalysisData !== "function" ||
      !stateMapper ||
      typeof stateMapper.mapAnalysisStatusToResultPageState !== "function"
    ) {
      return {
        ok: false,
        state: RESULT_STATES.ERROR,
        message: "结果页读取模块暂时不可用，请重新测试。",
      };
    }

    const pageResponse = pageReader.readResultPageAnalysisData({
      storage: options.storage,
      key: options.key,
    });
    const mapping = stateMapper.mapAnalysisStatusToResultPageState(pageResponse);

    if (!pageResponse || pageResponse.ok !== true || !mapping.canRenderResult) {
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
      result: stage5PageDataToResultRendererInput(pageResponse.data, mapping),
      mapping,
    };
  }

  function createProblemViewModel(state, messageOverride) {
    const models = {
      [RESULT_STATES.MISSING_RESULT]: {
        title: "还没有可查看的结果",
        message: "请先上传手掌照片并完成分析，再查看结果页。",
        pill: "等待结果",
        recoveryHint: "重新测试会回到上传页，你也可以返回首页重新开始。",
      },
      [RESULT_STATES.INVALID_RESULT]: {
        title: "结果暂时无法读取",
        message: "本次结果数据不完整，请重新测试。",
        pill: "需要重试",
        recoveryHint: "这通常是本地暂存结果中断导致的，重新测试即可恢复。",
      },
      [RESULT_STATES.ERROR]: {
        title: "结果页暂时无法显示",
        message: "请重新测试，或返回首页稍后再试。",
        pill: "显示中断",
        recoveryHint: "不会展示技术错误信息；重新上传一张清晰照片即可再试。",
      },
      [RESULT_STATES.PARTIAL_RESULT]: {
        title: "照片掌纹不够清晰",
        message: "这张照片掌纹不够清晰，请重新拍摄后再试。",
        pill: "请重新拍摄",
        recoveryHint: "请使用清晰、正面、完整的单手掌照片重新测试。",
      },
    };

    const model = models[state] || models[RESULT_STATES.ERROR];
    return {
      state,
      problem: true,
      ...model,
      message: messageOverride || model.message,
      primaryActionText: "重新测试",
      primaryHref: "../upload/index.html",
      secondaryActionText: "返回首页",
      secondaryHref: "../index.html",
    };
  }

  function createTopCandidates(top3) {
    if (!Array.isArray(top3)) {
      return [];
    }

    return top3.slice(0, 3).map((candidate, index) => {
      const code = firstText(candidate && candidate.id, candidate && candidate.persona_id, candidate && candidate.personality_id, `Top ${index + 1}`);
      const name = firstText(candidate && candidate.name, candidate && candidate.personality_name, "结果待完善");
      const motherType = firstText(candidate && candidate.mother_type, candidate && candidate.main_line_type, "");
      return {
        code: compactCode(code),
        name,
        motherType,
      };
    });
  }

  function isRetakeQualityStatus(value) {
    const status = firstText(value).toUpperCase();
    return status === "IMAGE_NOT_CLEAR"
      || status === "NOT_PALM"
      || status === "ANALYSIS_UNRELIABLE"
      || status === "LOW_INFORMATION_FEATURE_SET"
      || status === "RETRY_REQUIRED"
      || status === "REJECTED";
  }

  function mainCandidateMismatch(result) {
    if (!isPlainObject(result)) {
      return false;
    }
    const mainId = firstText(result.personality_id, result.primary_persona && result.primary_persona.persona_id, result.primary_persona && result.primary_persona.id);
    const candidates = Array.isArray(result.candidate_results) ? result.candidate_results : [];
    const firstCandidate = candidates.find(isPlainObject);
    const firstCandidateId = firstText(firstCandidate && firstCandidate.personality_id, firstCandidate && firstCandidate.persona_id, firstCandidate && firstCandidate.id);
    return Boolean(mainId && firstCandidateId && mainId !== firstCandidateId);
  }

  function createRetakeProblemViewModel(result) {
    const status = firstText(result && result.quality_status).toUpperCase();
    const message = firstText(result && result.user_message);
    const model = createProblemViewModel(
      RESULT_STATES.PARTIAL_RESULT,
      message || (
        status === "NOT_PALM"
          ? "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。"
          : status === "ANALYSIS_UNRELIABLE"
            ? "本次识别结果不稳定，请换一张更清晰的掌心照片后重试。"
            : "照片掌纹不够清晰，请在光线均匀的位置重新拍摄，确保掌心完整、掌纹可见。"
      )
    );
    if (status === "NOT_PALM") {
      return {
        ...model,
        title: "未检测到清晰掌心",
        pill: "请重新上传",
        recoveryHint: "请上传清晰、正面、完整的单手掌照片重新测试。",
      };
    }
    if (status === "ANALYSIS_UNRELIABLE") {
      return {
        ...model,
        title: "本次识别结果不稳定",
        pill: "请重新拍摄",
        recoveryHint: "请换一张更清晰的掌心照片后重试。",
      };
    }
    if (status === "LOW_INFORMATION_FEATURE_SET") {
      return {
        ...model,
        title: "掌纹特征信息不足",
        pill: "请重新拍摄",
        recoveryHint: "请换一张掌纹更清晰、信息更完整的掌心照片后重试。",
      };
    }
    return model;
  }

  function createResultViewModel(result) {
    if (!isPlainObject(result)) {
      return createProblemViewModel(RESULT_STATES.INVALID_RESULT);
    }
    if (mainCandidateMismatch(result)) {
      return createProblemViewModel(
        RESULT_STATES.INVALID_RESULT,
        "本次结果候选数据不一致，请重新测试。"
      );
    }

    const persona = isPlainObject(result.primary_persona) ? result.primary_persona : {};
    const mother = isPlainObject(result.primary_mother) ? result.primary_mother : {};
    const recognition = isPlainObject(result.recognition) ? result.recognition : {};
    const explanation = isPlainObject(recognition.explanation) ? recognition.explanation : {};
    const personaExplanation = isPlainObject(explanation.persona) ? explanation.persona : {};
    const status = firstText(result.status, "SUCCESS");
    const isTerminalProblem = status === "RETRY_REQUIRED" || status === "REJECTED" || isRetakeQualityStatus(result.quality_status);

    if (isTerminalProblem) {
      return createRetakeProblemViewModel(result);
    }

    const personaName = firstText(persona.name, readNestedText(result, ["persona", "name"]), FALLBACKS.personaName);
    const personaCode = firstText(persona.persona_id, persona.id, readNestedText(result, ["persona", "id"]), FALLBACKS.personaCode);
    const motherName = firstText(mother.name, persona.mother_type, "");
    const motherCode = firstText(mother.id, persona.mother_type, "");
    const tags = unique([
      motherName,
      motherCode,
      ...normalizeList(persona.tags),
      ...normalizeList(result.tags),
    ]);
    const matchedFeatures = normalizeFeatureLabels(
      persona.matched_features ||
      personaExplanation.matched_features ||
      (recognition.primary_persona && recognition.primary_persona.matched_features)
    );
    const qualityHint = createQualityHint(result, status, explanation);
    const hook = firstText(persona.hook, persona.quote, persona.summary, result.hook, result.quote, result.summary, FALLBACKS.hook);
    const coreDescription = firstText(
      persona.description,
      persona.core_description,
      result.description,
      result.core_description,
      safeUserCopy(readNestedText(explanation, ["persona", "reason"])),
      FALLBACKS.coreDescription
    );
    const motherFields = normalizeFeatureLabels(mother.core_fields_matched);
    const motherSummary = motherName
      ? `主要掌纹倾向：${motherName}。当前结果基于可识别的掌纹结构生成。`
      : FALLBACKS.summary;
    const topCandidates = createTopCandidates(result.candidate_results || result.top3);

    const isPartial =
      personaName === FALLBACKS.personaName ||
      personaCode === FALLBACKS.personaCode ||
      tags.length === 0 ||
      matchedFeatures.length === 0 ||
      coreDescription === FALLBACKS.coreDescription;

    if (isPartial) {
      return createProblemViewModel(
        RESULT_STATES.PARTIAL_RESULT,
        "这张照片掌纹不够清晰，请重新拍摄后再试。"
      );
    }

    return {
      state: isPartial ? RESULT_STATES.PARTIAL_RESULT : RESULT_STATES.READY,
      status,
      title: "你的 Palmmi 结果",
      pill: status === "LOW_CONFIDENCE" ? "保守结果" : "结果已生成",
      personaName,
      personaCode,
      hook,
      coreDescription,
      summaryPreview: createSummaryPreview(coreDescription),
      motherSummary: motherFields.length
        ? `${motherSummary} 主要依据包含：${motherFields.slice(0, 3).join("、")}。`
        : motherSummary,
      tags: tags.length ? limitWithRemainder(tags, 6, "个标签") : [FALLBACKS.tag],
      evidence: matchedFeatures.length ? limitWithRemainder(unique(matchedFeatures), 8, "项掌纹线索") : [FALLBACKS.evidence],
      qualityHintText: qualityHint.text,
      confidenceCopy: qualityHint.confidenceCopy,
      topCandidates,
      retestText: "重新测试",
      retestHref: "../upload/index.html",
      homeText: "返回首页",
      homeHref: "../index.html",
      posterActionText: "生成分享海报",
      posterActionNote: "进入基础海报预览页，保存图片和分享文案仍为占位。",
      posterHref: "../poster/index.html",
      posterEnabled: true,
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
    const safeCandidates = candidates.length ? candidates : [{ code: "Top 3", name: "结果待完善", motherType: "" }];
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
    const root = doc.getElementById("resultApp");
    const resultPanel = doc.getElementById("resultReady");
    const problemPanel = doc.getElementById("resultProblem");
    const model = createProblemViewModel(state, message);

    if (root) {
      root.dataset.state = state;
    }
    if (doc.body) {
      doc.body.dataset.resultState = state;
    }
    setHidden(resultPanel, true);
    setHidden(problemPanel, false);
    setText(doc, "resultProblemPill", model.pill);
    setText(doc, "resultProblemTitle", model.title);
    setText(doc, "resultProblemCopy", model.message);
    setText(doc, "resultProblemHint", model.recoveryHint);

    const primary = doc.getElementById("resultProblemPrimary");
    const secondary = doc.getElementById("resultProblemSecondary");
    if (primary) {
      primary.textContent = model.primaryActionText;
      primary.href = model.primaryHref;
    }
    if (secondary) {
      secondary.textContent = model.secondaryActionText;
      secondary.href = model.secondaryHref;
    }
  }

  function renderResult(doc, viewModel) {
    const root = doc.getElementById("resultApp");
    const resultPanel = doc.getElementById("resultReady");
    const problemPanel = doc.getElementById("resultProblem");
    if (root) {
      root.dataset.state = viewModel.state;
    }
    if (doc.body) {
      doc.body.dataset.resultState = viewModel.state;
    }
    setHidden(resultPanel, false);
    setHidden(problemPanel, true);
    setText(doc, "resultPill", viewModel.pill);
    setText(doc, "resultTitle", viewModel.title);
    setText(doc, "personaName", viewModel.personaName);
    setText(doc, "personaCode", viewModel.personaCode);
    setText(doc, "resultHook", viewModel.hook);
    setText(doc, "resultSummary", viewModel.summaryPreview);
    setText(doc, "resultDescription", viewModel.coreDescription);
    setText(doc, "resultMotherSummary", viewModel.motherSummary);
    setText(doc, "resultConfidence", viewModel.confidenceCopy);
    setText(doc, "resultQualityHintCopy", viewModel.qualityHintText);
    setText(doc, "posterNote", viewModel.posterActionNote);
    const posterLink = doc.getElementById("resultPosterLink");
    if (posterLink) {
      posterLink.textContent = viewModel.posterActionText;
      posterLink.href = viewModel.posterHref;
    }
    setHidden(doc.getElementById("resultQualityHint"), !viewModel.qualityHintText);
    replaceList(doc, "resultTags", viewModel.tags, "chip");
    replaceList(doc, "resultEvidence", viewModel.evidence, "");
    replaceTopCandidates(doc, "resultTopCandidates", viewModel.topCandidates);
  }

  function readRequestedTestState(locationLike) {
    const search = locationLike && typeof locationLike.search === "string" ? locationLike.search : "";
    if (!search) {
      return null;
    }
    const params = new URLSearchParams(search);
    const state = params.get("state");
    const allowed = new Set([
      RESULT_STATES.MISSING_RESULT,
      RESULT_STATES.INVALID_RESULT,
      RESULT_STATES.PARTIAL_RESULT,
      RESULT_STATES.ERROR,
    ]);
    return allowed.has(state) ? state : null;
  }

  function initResultPage(doc, options = {}) {
    const requestedState = readRequestedTestState(options.location || global.location);

    if (requestedState && requestedState !== RESULT_STATES.PARTIAL_RESULT) {
      renderProblem(doc, requestedState);
      return;
    }

    if (requestedState === RESULT_STATES.PARTIAL_RESULT) {
      const viewModel = createResultViewModel({ status: "SUCCESS", primary_persona: {}, top3: [] });
      if (viewModel && viewModel.problem) {
        renderProblem(doc, viewModel.state || RESULT_STATES.PARTIAL_RESULT, viewModel.message);
        return;
      }
      renderResult(doc, viewModel);
      return;
    }

    const read = readAnalysisResult(options);
    if (!read.ok) {
      renderProblem(doc, read.state, read.message);
      return;
    }

    try {
      const viewModel = createResultViewModel(read.result);
      if (viewModel && viewModel.problem) {
        renderProblem(doc, viewModel.state || RESULT_STATES.PARTIAL_RESULT, viewModel.message);
        return;
      }
      viewModel.state = read.state;
      if (read.mapping && read.mapping.requiresWarning && !viewModel.qualityHintText) {
        viewModel.qualityHintText = "这次图片可读性一般，结果更适合作为娱乐参考。";
      }
      renderResult(doc, viewModel);
    } catch (error) {
      renderProblem(doc, RESULT_STATES.ERROR);
    }
  }

  const api = {
    ANALYSIS_RESULT_STORAGE_KEY,
    RESULT_STATES,
    createProblemViewModel,
    createResultViewModel,
    initResultPage,
    readAnalysisResult,
    readRequestedTestState,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiResult = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initResultPage(global.document));
  }
})(typeof window !== "undefined" ? window : globalThis);
