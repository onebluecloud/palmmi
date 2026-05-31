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
    hook: "照片掌纹不够清晰，请重新拍摄后再试。",
    tag: "暂无标签",
    matchedFeature: "掌纹线索不足，请重新拍摄",
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
    const keywords = unique([...normalizeList(data.traits), ...normalizeList(summary.keywords)]);
    const flatFeatures = normalizeList(data.features);
    const personaId = firstText(data.personality_id, ui.personaId, FALLBACKS.personaCode);
    const personaName = firstText(data.personality_name, ui.personaName, summary.title, FALLBACKS.personaName);
    const posterQuote = firstText(data.poster_quote, data.poster_subtitle, data.summary, summary.shortText, ui.secondaryDisplayText, FALLBACKS.summary);
    const shortText = posterQuote;
    const motherType = firstText(data.main_line_type, summary.subtitle, "Stage 5");
    const matchedFeatures = flatFeatures.length ? flatFeatures : (keywords.length ? keywords : ["HEAD_LINE_LENGTH"]);
    const candidateResults = Array.isArray(data.candidate_results) && data.candidate_results.length
      ? data.candidate_results
      : [{ personality_id: personaId, personality_name: personaName, main_line_type: motherType }];

    return {
      status: stage5StatusForRenderer(data, mapping),
      quality_status: firstText(data.quality_status, ui.qualityStatus),
      user_message: firstText(data.user_message),
      quality_gate: {
        status: firstText(data.quality_status, mapping.requiresWarning ? "WARN" : "PASS"),
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
        name: firstText(data.poster_title, personaName),
        mother_type: motherType,
        hook: posterQuote,
        description: firstText(data.description, shortText),
        tags: keywords,
        matched_features: matchedFeatures,
      },
      top3: candidateResults,
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
      evidence: firstText(data.evidence),
      match_reason: firstText(data.match_reason),
    };
  }

  function mainCandidateMismatch(data) {
    if (!isPlainObject(data)) {
      return false;
    }
    const mainId = firstText(data.personality_id, data.uiConsumable && data.uiConsumable.personaId);
    const candidates = Array.isArray(data.candidate_results) ? data.candidate_results : [];
    const firstCandidate = candidates.find(isPlainObject);
    const firstCandidateId = firstText(firstCandidate && firstCandidate.personality_id);
    return Boolean(mainId && firstCandidateId && mainId !== firstCandidateId);
  }

  function posterErrorCode(pageResponse, mapping) {
    if (!pageResponse || pageResponse.ok !== true) {
      return "POSTER_RESULT_READ_FAILED";
    }
    if (mainCandidateMismatch(pageResponse.data)) {
      return "POSTER_MAIN_CANDIDATE_MISMATCH";
    }
    const qualityStatus = firstText(pageResponse.data && pageResponse.data.quality_status).toUpperCase();
    if (["NOT_PALM", "IMAGE_NOT_CLEAR", "ANALYSIS_UNRELIABLE", "LOW_INFORMATION_FEATURE_SET", "RETRY_REQUIRED", "REJECTED"].includes(qualityStatus)) {
      return "POSTER_NOT_ALLOWED_FOR_INVALID_IMAGE";
    }
    return "POSTER_CONTRACT_INVALID";
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

    if (pageResponse && pageResponse.ok === true && mainCandidateMismatch(pageResponse.data)) {
      return {
        ok: false,
        state: POSTER_STATES.INVALID_RESULT,
        error_code: "POSTER_MAIN_CANDIDATE_MISMATCH",
        message: "分析结果主结果与候选结果不一致，请重新测试后再生成海报。",
        mapping,
      };
    }

    if (!pageResponse || pageResponse.ok !== true || !mapping.canRenderPoster) {
      return {
        ok: false,
        state: mapping.pageState,
        error_code: posterErrorCode(pageResponse, mapping),
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
        title: "照片掌纹不够清晰",
        message: "这张照片掌纹不够清晰，请重新拍摄后再试。",
        pill: "请重新拍摄",
        recoveryHint: "请使用清晰、正面、完整的单手掌照片重新测试。",
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
      problem: true,
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
      const code = firstText(candidate && candidate.id, candidate && candidate.persona_id, candidate && candidate.personality_id, `Top ${index + 1}`);
      const name = firstText(candidate && candidate.name, candidate && candidate.personality_name, FALLBACKS.personaCode);
      const motherType = firstText(candidate && candidate.mother_type, candidate && candidate.main_line_type, "");
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

  function isRetakeQualityStatus(value) {
    const status = firstText(value).toUpperCase();
    return status === "IMAGE_NOT_CLEAR"
      || status === "NOT_PALM"
      || status === "ANALYSIS_UNRELIABLE"
      || status === "LOW_INFORMATION_FEATURE_SET"
      || status === "RETRY_REQUIRED"
      || status === "REJECTED";
  }

  function createRetakeProblemViewModel(result) {
    const status = firstText(result && result.quality_status).toUpperCase();
    const message = firstText(result && result.user_message);
    const model = createProblemViewModel(
      POSTER_STATES.PARTIAL_RESULT,
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

  function createPosterViewModel(result) {
    if (!isPlainObject(result)) {
      return createProblemViewModel(POSTER_STATES.INVALID_RESULT);
    }

    const status = firstText(result.status, "SUCCESS");
    if (status === "RETRY_REQUIRED" || status === "REJECTED" || isRetakeQualityStatus(result.quality_status)) {
      return createRetakeProblemViewModel(result);
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

    if (isPartial) {
      return createProblemViewModel(
        POSTER_STATES.PARTIAL_RESULT,
        "这张照片掌纹不够清晰，请重新拍摄后再试。"
      );
    }

    return {
      state: isPartial ? POSTER_STATES.PARTIAL_RESULT : POSTER_STATES.READY,
      title: "你的分享海报",
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

  function cleanShareCopy(value, fallback = "") {
    return firstText(safeUserCopy(value), fallback).replace(/\s+/g, " ").trim();
  }

  function buildPosterShareText(viewModel) {
    if (!viewModel || viewModel.problem) {
      return "";
    }
    const personaName = cleanShareCopy(viewModel.personaName, FALLBACKS.personaName);
    const personaCode = cleanShareCopy(viewModel.personaCode);
    const hook = cleanShareCopy(viewModel.hook);
    const summary = cleanShareCopy(viewModel.summary);
    const tags = unique([
      ...(Array.isArray(viewModel.tags) ? viewModel.tags : []),
      "#Palmmi",
      "#掌纹人格标签",
    ]).map((tag) => cleanShareCopy(tag)).filter(Boolean).slice(0, 5);
    const title = personaCode ? `${personaName} (${personaCode})` : personaName;
    return [
      "我的 Palmmi 掌纹人格卡",
      title,
      hook,
      summary,
      tags.join(" "),
    ].filter(Boolean).join("\n");
  }

  function drawRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = Array.from(firstText(text));
    const lines = [];
    let line = "";
    chars.forEach((char) => {
      const nextLine = `${line}${char}`;
      if (line && ctx.measureText(nextLine).width > maxWidth) {
        lines.push(line);
        line = char;
        return;
      }
      line = nextLine;
    });
    if (line) {
      lines.push(line);
    }
    const limited = lines.slice(0, maxLines);
    if (lines.length > maxLines && limited.length) {
      const lastIndex = limited.length - 1;
      let lastLine = limited[lastIndex];
      while (lastLine && ctx.measureText(`${lastLine}…`).width > maxWidth) {
        lastLine = lastLine.slice(0, -1);
      }
      limited[lastIndex] = `${lastLine}…`;
    }
    limited.forEach((lineText, index) => {
      ctx.fillText(lineText, x, y + index * lineHeight);
    });
    return y + limited.length * lineHeight;
  }

  function renderPosterToCanvas(viewModel, options = {}) {
    const doc = options.document || global.document;
    if (!doc || typeof doc.createElement !== "function" || !viewModel || viewModel.problem) {
      return null;
    }
    const posterCanvas = doc.createElement("canvas");
    posterCanvas.width = options.width || 1080;
    posterCanvas.height = options.height || 1440;
    const ctx = posterCanvas.getContext && posterCanvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const width = posterCanvas.width;
    const height = posterCanvas.height;
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#151a1f");
    gradient.addColorStop(1, "#2e363b");
    drawRoundRect(ctx, 72, 72, width - 144, height - 144, 40);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(244, 241, 234, 0.32)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 241, 234, 0.66)";
    ctx.font = "30px sans-serif";
    ctx.fillText("Palmmi", 120, 160);

    ctx.fillStyle = "#f4f1ea";
    ctx.font = "42px sans-serif";
    ctx.fillText(cleanShareCopy(viewModel.personaCode, "P--"), 120, 245);

    ctx.font = "88px sans-serif";
    const titleBottom = drawWrappedText(ctx, cleanShareCopy(viewModel.personaName, FALLBACKS.personaName), 120, 350, width - 240, 104, 3);

    ctx.fillStyle = "#e8c56d";
    ctx.font = "46px sans-serif";
    const hookBottom = drawWrappedText(ctx, cleanShareCopy(viewModel.hook, FALLBACKS.hook), 120, titleBottom + 70, width - 240, 60, 3);

    ctx.fillStyle = "rgba(244, 241, 234, 0.84)";
    ctx.font = "34px sans-serif";
    drawWrappedText(ctx, cleanShareCopy(viewModel.summary, FALLBACKS.summary), 120, hookBottom + 70, width - 240, 48, 4);

    const tags = Array.isArray(viewModel.tags) ? viewModel.tags.slice(0, 4) : [];
    ctx.font = "28px sans-serif";
    let tagX = 120;
    let tagY = height - 300;
    tags.forEach((tag) => {
      const label = cleanShareCopy(tag);
      if (!label) {
        return;
      }
      const tagWidth = Math.min(ctx.measureText(label).width + 46, width - 240);
      if (tagX + tagWidth > width - 120) {
        tagX = 120;
        tagY += 58;
      }
      drawRoundRect(ctx, tagX, tagY - 34, tagWidth, 46, 23);
      ctx.fillStyle = "rgba(232, 197, 109, 0.18)";
      ctx.fill();
      ctx.fillStyle = "#f4f1ea";
      ctx.fillText(label, tagX + 22, tagY);
      tagX += tagWidth + 14;
    });

    ctx.fillStyle = "rgba(244, 241, 234, 0.62)";
    ctx.font = "26px sans-serif";
    ctx.fillText("娱乐向人格标签，不用于预测或判断现实结果", 120, height - 170);
    return posterCanvas;
  }

  function downloadPosterImage(viewModel, options = {}) {
    const doc = options.document || global.document;
    const win = options.window || global;
    const posterCanvas = renderPosterToCanvas(viewModel, { document: doc });
    if (!doc || !doc.body || !posterCanvas || typeof posterCanvas.toBlob !== "function") {
      return Promise.resolve({ ok: false, code: "POSTER_SAVE_UNSUPPORTED" });
    }

    return new Promise((resolve) => {
      posterCanvas.toBlob((blob) => {
        const urlApi = win.URL || win.webkitURL;
        if (!blob || !urlApi || typeof urlApi.createObjectURL !== "function") {
          resolve({ ok: false, code: "POSTER_SAVE_UNSUPPORTED" });
          return;
        }
        const objectUrl = urlApi.createObjectURL(blob);
        const link = doc.createElement("a");
        link.href = objectUrl;
        link.rel = "noopener";
        link.setAttribute("download", options.filename || "palmmi-poster.png");
        link.style.display = "none";
        doc.body.appendChild(link);
        link.click();
        link.remove();
        if (typeof urlApi.revokeObjectURL === "function") {
          win.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 0);
        }
        resolve({ ok: true, code: "POSTER_IMAGE_READY", mime_type: blob.type || "image/png" });
      }, "image/png");
    });
  }

  function fallbackCopyText(doc, text) {
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

  function copyPosterShareText(viewModel, options = {}) {
    const text = buildPosterShareText(viewModel);
    if (!text) {
      return Promise.resolve({ ok: false, code: "POSTER_COPY_EMPTY" });
    }
    const doc = options.document || global.document;
    const nav = options.navigator || global.navigator || {};
    const clipboard = nav["clipboard"];
    if (clipboard && typeof clipboard.writeText === "function") {
      return clipboard.writeText(text)
        .then(() => ({ ok: true, code: "POSTER_COPY_READY", text }))
        .catch(() => {
          if (fallbackCopyText(doc, text)) {
            return { ok: true, code: "POSTER_COPY_READY", text };
          }
          return { ok: false, code: "POSTER_COPY_UNSUPPORTED", text };
        });
    }
    return Promise.resolve(
      fallbackCopyText(doc, text)
        ? { ok: true, code: "POSTER_COPY_READY", text }
        : { ok: false, code: "POSTER_COPY_UNSUPPORTED", text }
    );
  }

  function setText(doc, id, value) {
    const element = doc.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function setButtonEnabled(element, enabled) {
    if (!element) {
      return;
    }
    element.disabled = !enabled;
    element.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function bindPosterShareActions(doc, viewModel) {
    const saveButton = doc.getElementById("posterSavePlaceholder");
    const copyButton = doc.getElementById("posterCopyPlaceholder");
    const win = doc.defaultView || global;
    const canUseActions = Boolean(viewModel && !viewModel.problem && viewModel.state === POSTER_STATES.READY);

    setText(doc, "posterSideCopy", canUseActions
      ? "这是一张适合手机保存和轻量分享的人格身份卡。"
      : "暂无可保存的有效海报，请重新测试后再试。");
    setText(doc, "posterSaveNote", canUseActions ? "生成 PNG 图片保存到本机。" : "需要有效分析结果后才能保存图片。");
    setText(doc, "posterCopyNote", canUseActions ? "复制一段不含技术细节的分享文案。" : "需要有效分析结果后才能复制分享文案。");
    setButtonEnabled(saveButton, canUseActions);
    setButtonEnabled(copyButton, canUseActions);

    if (!canUseActions) {
      if (saveButton) {
        saveButton.onclick = null;
      }
      if (copyButton) {
        copyButton.onclick = null;
      }
      return;
    }

    if (saveButton) {
      saveButton.onclick = () => {
        setButtonEnabled(saveButton, false);
        setText(doc, "posterSaveNote", "正在生成图片...");
        downloadPosterImage(viewModel, { document: doc, window: win })
          .then((result) => {
            setText(
              doc,
              "posterSaveNote",
              result.ok ? "已生成 PNG 图片，若浏览器拦截下载，请截图保存。" : "当前浏览器暂不支持直接保存，请截图保存海报。"
            );
          })
          .catch(() => {
            setText(doc, "posterSaveNote", "当前浏览器暂不支持直接保存，请截图保存海报。");
          })
          .finally(() => setButtonEnabled(saveButton, true));
      };
    }

    if (copyButton) {
      copyButton.onclick = () => {
        setButtonEnabled(copyButton, false);
        setText(doc, "posterCopyNote", "正在复制...");
        copyPosterShareText(viewModel, { document: doc, navigator: win.navigator })
          .then((result) => {
            setText(doc, "posterCopyNote", result.ok ? "已复制分享文案。" : "当前浏览器暂不支持自动复制，请手动选择页面文字。");
          })
          .catch(() => {
            setText(doc, "posterCopyNote", "当前浏览器暂不支持自动复制，请手动选择页面文字。");
          })
          .finally(() => setButtonEnabled(copyButton, true));
      };
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
    bindPosterShareActions(doc, null);
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
    bindPosterShareActions(doc, viewModel);
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
      const viewModel = createPosterViewModel({ status: "SUCCESS", primary_persona: {}, primary_mother: {}, top3: [] });
      if (viewModel && viewModel.problem) {
        renderProblem(doc, viewModel.state || POSTER_STATES.PARTIAL_RESULT, viewModel.message);
        return;
      }
      renderPoster(doc, viewModel);
      return;
    }

    const read = readAnalysisResult(options);
    if (!read.ok) {
      renderProblem(doc, read.state, read.message);
      return;
    }

    try {
      const viewModel = createPosterViewModel(read.result);
      if (viewModel && viewModel.problem) {
        renderProblem(doc, viewModel.state || POSTER_STATES.PARTIAL_RESULT, viewModel.message);
        return;
      }
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
    buildPosterShareText,
    copyPosterShareText,
    createPosterViewModel,
    createProblemViewModel,
    downloadPosterImage,
    initPosterPage,
    readAnalysisResult,
    readRequestedTestState,
    renderPosterToCanvas,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiPoster = api;

  if (global.document) {
    global.document.addEventListener("DOMContentLoaded", () => initPosterPage(global.document));
  }
})(typeof window !== "undefined" ? window : globalThis);
