(function palmmiStage5(global) {
  const DEVICE_ID_STORAGE_KEY = "palmmi:anonymousDeviceId";
  const UPLOAD_STORAGE_KEY = "palmmi:lastUpload";
  const ANALYSIS_RESULT_STORAGE_KEY = "palmmi:lastAnalysisResult";
  const ANALYZE_ERROR_STORAGE_KEY = "palmmi:lastAnalyzeError";
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  const ERROR_MESSAGES = Object.freeze({
    FILE_MISSING: "请先选择一张清晰的手掌照片。",
    FILE_TYPE_UNSUPPORTED: "图片格式不支持，请上传 JPG / PNG / WebP。",
    FILE_TOO_LARGE: "图片过大，请压缩后重新上传。",
    FILE_EMPTY: "图片文件为空，请重新选择。",
    ANALYZE_MOCK_FAILED: "模拟分析暂时失败，请重新上传后再试。",
    DEVICE_ID_UNAVAILABLE: "浏览器暂时无法生成匿名设备 ID，请刷新后重试。",
    UNKNOWN_ERROR: "分析流程暂时没有完成，请重新上传后再试。",
  });

  function createRandomString() {
    return Math.random().toString(36).slice(2, 10) || "random";
  }

  function getStorageValue(storage, key) {
    if (!storage || typeof storage.getItem !== "function") {
      return null;
    }
    return storage.getItem(key);
  }

  function setStorageValue(storage, key, value) {
    if (!storage || typeof storage.setItem !== "function") {
      return { ok: false, error: "storage_unavailable" };
    }

    try {
      storage.setItem(key, value);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : "storage_write_failed",
      };
    }
  }

  function removeStorageValue(storage, key) {
    if (!storage || typeof storage.removeItem !== "function") {
      return;
    }

    try {
      storage.removeItem(key);
    } catch (error) {
      // Best-effort cleanup only.
    }
  }

  function getDefaultSessionStorage() {
    try {
      return global.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  function getDefaultLocalStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function getOrCreateAnonymousDeviceId(storage = getDefaultLocalStorage(), options = {}) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      return createErrorPayload("DEVICE_ID_UNAVAILABLE");
    }

    const existing = getStorageValue(storage, DEVICE_ID_STORAGE_KEY);
    if (typeof existing === "string" && existing.trim()) {
      return {
        ok: true,
        anonymous_device_id: existing,
        created: false,
      };
    }

    const now = options.now || (() => Date.now());
    const randomString = options.randomString || createRandomString;
    const anonymousDeviceId = `pm_${now()}_${randomString()}`;
    const saved = setStorageValue(storage, DEVICE_ID_STORAGE_KEY, anonymousDeviceId);

    if (!saved.ok) {
      return createErrorPayload("DEVICE_ID_UNAVAILABLE");
    }

    return {
      ok: true,
      anonymous_device_id: anonymousDeviceId,
      created: true,
    };
  }

  function normalizeImageCandidate(candidate) {
    if (!candidate) {
      return null;
    }

    const size = Number.isFinite(candidate.size)
      ? candidate.size
      : Number.isFinite(candidate.fileSize)
        ? candidate.fileSize
        : Number.isFinite(candidate.size_bytes)
          ? candidate.size_bytes
          : 0;

    return {
      file_name: candidate.name || candidate.fileName || candidate.file_name || "palm-image",
      content_type: candidate.type || candidate.fileType || candidate.content_type || candidate.mime_type || "",
      size_bytes: size,
      upload_ref: candidate.upload_ref || candidate.uploadRef || null,
      uploaded_at: candidate.uploadedAt || candidate.uploaded_at || null,
      width: Number.isFinite(candidate.width) ? candidate.width : undefined,
      height: Number.isFinite(candidate.height) ? candidate.height : undefined,
    };
  }

  function validateAnalyzeImage(candidate) {
    const image = normalizeImageCandidate(candidate);

    if (!image) {
      return createErrorPayload("FILE_MISSING");
    }

    if (!Number.isFinite(image.size_bytes) || image.size_bytes <= 0) {
      return createErrorPayload("FILE_EMPTY");
    }

    if (!ACCEPTED_IMAGE_TYPES.has(image.content_type)) {
      return createErrorPayload("FILE_TYPE_UNSUPPORTED");
    }

    if (image.size_bytes > MAX_IMAGE_BYTES) {
      return createErrorPayload("FILE_TOO_LARGE");
    }

    return {
      ok: true,
      image,
    };
  }

  function createRequestId() {
    return `req_${Date.now()}_${createRandomString()}`;
  }

  function createErrorPayload(code, overrides = {}) {
    return {
      ok: false,
      error: {
        code,
        message: overrides.message || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR,
        message_key: overrides.message_key || "retry_upload",
        retryable: overrides.retryable !== false,
      },
    };
  }

  function createAnalyzeErrorResponse(code, requestId, overrides = {}) {
    return {
      ok: false,
      request_id: requestId,
      status: overrides.status || "RETRY_REQUIRED",
      ...createErrorPayload(code, overrides),
    };
  }

  function createMockLineFeature(overrides = {}) {
    return {
      visibility: "clear",
      length: "medium",
      depth: "medium",
      curvature: "slight",
      branches: "few",
      breaks: "none",
      confidence: 0.84,
      ...overrides,
    };
  }

  class MockVlmProvider {
    constructor(options = {}) {
      this.name = "mock";
      this.model = options.model || "stage5b-mock-vlm";
      this.latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 0;
      this.shouldFail = Boolean(options.shouldFail);
    }

    async analyze(input) {
      if (this.shouldFail) {
        throw new Error("mock_provider_failed");
      }

      const confidence = 0.86;
      return {
        request_id: input.request_id,
        provider: "mock",
        model: this.model,
        status: "OK",
        features: {
          schema_version: "palm_features.v1",
          hand: {
            visible_side: "palm",
            handedness: "unknown",
            orientation: "upright",
          },
          image_quality: {
            sharpness: "medium",
            lighting: "good",
            occlusion: "minor",
            confidence,
          },
          palm_shape: {
            palm_width_ratio: 0.72,
            finger_length_ratio: 0.94,
            shape_hint: "rectangular",
            confidence: 0.8,
          },
          major_lines: {
            life_line: createMockLineFeature({ length: "long", curvature: "curved", confidence: 0.88 }),
            head_line: createMockLineFeature({ length: "long", depth: "deep", confidence: 0.87 }),
            heart_line: createMockLineFeature({ curvature: "curved", confidence: 0.82 }),
            fate_line: createMockLineFeature({ visibility: "faint", length: "medium", confidence: 0.66 }),
          },
          mounts: {
            venus: { prominence: "medium", texture: "lined", confidence: 0.75 },
            moon: { prominence: "medium", texture: "smooth", confidence: 0.72 },
            jupiter: { prominence: "medium", texture: "lined", confidence: 0.7 },
          },
          special_marks: [
            { type: "branch", region: "head_line", confidence: 0.62 },
          ],
          provider_notes: [
            "Mock provider uses deterministic Stage 5B palm features.",
          ],
        },
        quality: {
          palm_detected: true,
          single_hand: true,
          image_usable: true,
          confidence,
          reasons: [],
        },
        image_quality: {
          sharpness: "medium",
          lighting: "good",
          confidence,
        },
        major_lines: {
          life_line: "clear",
          head_line: "clear",
          heart_line: "clear",
        },
        confidence,
        refusal: {
          refused: false,
        },
        performance: {
          latency_ms: this.latencyMs,
          estimated_cost_usd: 0,
        },
        error_codes: [],
        raw_response_ref: "mock:stage5b:v1",
        raw_provider: {
          provider: "mock",
          model: this.model,
          response_ref: "mock:stage5b:v1",
        },
        warnings: ["MOCK_PROVIDER_ONLY"],
        notes: [
          "Stage 5B does not call a real VLM API.",
          "This output is only for upload/analyze skeleton verification.",
        ],
      };
    }
  }

  function isStage5GAnalysisInput(value) {
    return Boolean(value && typeof value === "object" && value.schemaVersion === "analysis-input.v1");
  }

  function normalizeStage5GStatus(status) {
    if (status === "LOW_CONFIDENCE" || status === "RETRY_REQUIRED") {
      return status;
    }
    return "SUCCESS";
  }

  function buildStage5GQualityGate(qualityGate) {
    const source = qualityGate && typeof qualityGate === "object" ? qualityGate : {};
    const usable = source.usable !== false;
    return {
      passed: usable,
      status: usable ? "PASS" : "LOW_QUALITY_PASS",
      can_continue: true,
      confidence: Number.isFinite(source.confidence) ? source.confidence : 0,
      reasons: Array.isArray(source.reasons) ? source.reasons : [],
      reason_codes: [],
    };
  }

  function buildStage5GPrimaryPersona(analysisInput) {
    const match = analysisInput.personaMatch && typeof analysisInput.personaMatch === "object"
      ? analysisInput.personaMatch
      : {};
    const matched = match.primary_persona && typeof match.primary_persona === "object"
      ? match.primary_persona
      : {};
    const finalPersona = analysisInput.finalPersona;
    return {
      ...matched,
      id: finalPersona.id,
      persona_id: finalPersona.id,
      name: finalPersona.name,
      score: finalPersona.confidence,
    };
  }

  function createStage5GRecognitionResult({ upload, image, anonymousDeviceId, requestId, analysisInput, vlmOutput, now }) {
    const createdAt = (now || (() => new Date().toISOString()))();
    const match = analysisInput.personaMatch && typeof analysisInput.personaMatch === "object"
      ? analysisInput.personaMatch
      : {};
    const primaryPersona = buildStage5GPrimaryPersona(analysisInput);
    const top3 = Array.isArray(match.top3) && match.top3.length > 0
      ? match.top3
      : [primaryPersona];

    return {
      schema: {
        name: "palmmi.recognition_result",
        version: "stage5b.v1",
        status: "PASS",
      },
      status: normalizeStage5GStatus(analysisInput.status),
      request_id: requestId,
      anonymous_device_id: anonymousDeviceId,
      cache: {
        hit: false,
        cache_hit: false,
        cache_write: false,
        key: null,
        expires_at: null,
      },
      image_input: {
        file_name: image.file_name,
        mime_type: image.content_type,
        content_type: image.content_type,
        file_size: image.size_bytes,
        size_bytes: image.size_bytes,
        uploaded_at: image.uploaded_at || (upload && upload.uploadedAt) || null,
        upload_ref: image.upload_ref || null,
        retained_until: null,
      },
      quality_gate: buildStage5GQualityGate(analysisInput.qualityGate),
      mother_scores: match.mother_type_scores || null,
      primary_mother: match.primary_mother || null,
      secondary_mother: match.secondary_mother || null,
      is_dual_mother: Boolean(match.is_dual_mother),
      primary_persona: primaryPersona,
      top3,
      recognition: match,
      error_codes: Array.isArray(match.error_codes) ? match.error_codes : [],
      provider_meta: {
        provider: analysisInput.provider,
        model: analysisInput.model,
        latency_ms: vlmOutput && vlmOutput.performance ? vlmOutput.performance.latency_ms : 0,
      },
      analysis_input: analysisInput,
      debug: {
        pipeline_version: "stage5g_analysis_bridge_v1",
        mock_vlm_used: false,
        stage5g_bridge_used: true,
        stage5g_trace: analysisInput.trace,
        stage5g_diagnostics: analysisInput.diagnostics,
        raw_provider_ref: vlmOutput && vlmOutput.raw_response_ref ? vlmOutput.raw_response_ref : "stage5g:analysis-input:v1",
      },
      created_at: createdAt,
    };
  }

  function createStage5BRecognitionResult({ upload, image, anonymousDeviceId, requestId, vlmOutput, now }) {
    const createdAt = (now || (() => new Date().toISOString()))();
    const quality = vlmOutput && vlmOutput.quality ? vlmOutput.quality : {};
    const features = vlmOutput && vlmOutput.features ? vlmOutput.features : {};
    const analysisInput = vlmOutput && vlmOutput.stage5g_analysis_input;

    if (isStage5GAnalysisInput(analysisInput)) {
      return createStage5GRecognitionResult({
        upload,
        image,
        anonymousDeviceId,
        requestId,
        analysisInput,
        vlmOutput,
        now,
      });
    }

    return {
      schema: {
        name: "palmmi.recognition_result",
        version: "stage5b.v1",
        status: "PASS",
      },
      status: "SUCCESS",
      request_id: requestId,
      anonymous_device_id: anonymousDeviceId,
      cache: {
        hit: false,
        cache_hit: false,
        cache_write: false,
        key: null,
        expires_at: null,
      },
      image_input: {
        file_name: image.file_name,
        mime_type: image.content_type,
        content_type: image.content_type,
        file_size: image.size_bytes,
        size_bytes: image.size_bytes,
        uploaded_at: image.uploaded_at || (upload && upload.uploadedAt) || null,
        upload_ref: image.upload_ref || null,
        retained_until: null,
      },
      quality_gate: {
        passed: true,
        status: "PASS",
        can_continue: true,
        confidence: Number.isFinite(quality.confidence) ? quality.confidence : 0.86,
        reasons: quality.reasons || [],
        reason_codes: [],
      },
      mother_scores: null,
      primary_mother: {
        id: "STAGE5B_MOCK_MOTHER",
        name: "Stage 5B mock mother",
        core_fields_matched: ["HEAD_LINE_LENGTH", "LIFE_LINE_VISIBILITY", "HEART_LINE_CURVE"],
      },
      secondary_mother: null,
      is_dual_mother: false,
      primary_persona: {
        id: "STAGE5B_MOCK_PERSONA",
        persona_id: "STAGE5B_MOCK_PERSONA",
        name: "Stage 5B mock persona",
        mother_type: "STAGE5B_MOCK_MOTHER",
        hook: "先验证链路，再进入真实模型选择。",
        description: "这是 Stage 5B 的模拟结果，用于确认上传、匿名设备 ID、Mock Provider 和结果页读取边界已经打通。",
        tags: ["Mock", "Stage 5B", "链路验证"],
        matched_features: ["HEAD_LINE_LENGTH", "LIFE_LINE_VISIBILITY", "HEART_LINE_CURVE"],
      },
      top3: [
        {
          id: "STAGE5B_MOCK_PERSONA",
          persona_id: "STAGE5B_MOCK_PERSONA",
          name: "Stage 5B mock persona",
          mother_type: "STAGE5B_MOCK_MOTHER",
          score: 1,
          reason_codes: ["STAGE5B_MOCK_FEATURES"],
        },
        {
          id: "STAGE5B_MOCK_ALT_1",
          persona_id: "STAGE5B_MOCK_ALT_1",
          name: "Stage 5B mock alternate",
          mother_type: "STAGE5B_MOCK_MOTHER",
          score: 0.72,
          reason_codes: ["STAGE5B_SECONDARY_MOCK"],
        },
        {
          id: "STAGE5B_MOCK_ALT_2",
          persona_id: "STAGE5B_MOCK_ALT_2",
          name: "Stage 5B mock backup",
          mother_type: "STAGE5B_MOCK_MOTHER",
          score: 0.58,
          reason_codes: ["STAGE5B_BACKUP_MOCK"],
        },
      ],
      recognition: {
        feature_schema_version: features.schema_version || "palm_features.v1",
        explanation: {
          persona: {
            reason: "Mock features were normalized into a RecognitionResult-shaped skeleton.",
            matched_features: ["HEAD_LINE_LENGTH", "LIFE_LINE_VISIBILITY", "HEART_LINE_CURVE"],
            conflict_features: [],
          },
          low_confidence: false,
        },
        feature_summary: [
          "Mock palm detected",
          "Mock major lines returned",
          "Mock image quality accepted",
        ],
      },
      error_codes: [],
      provider_meta: {
        provider: "mock",
        model: vlmOutput && vlmOutput.model ? vlmOutput.model : "stage5b-mock-vlm",
        latency_ms: vlmOutput && vlmOutput.performance ? vlmOutput.performance.latency_ms : 0,
      },
      debug: {
        pipeline_version: "stage5b_mock_analyze_skeleton_v1",
        mock_vlm_used: true,
        raw_provider_ref: vlmOutput && vlmOutput.raw_response_ref ? vlmOutput.raw_response_ref : "mock:stage5b:v1",
      },
      created_at: createdAt,
    };
  }

  function saveAnalyzeError(storage, response) {
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    removeStorageValue(storage, ANALYSIS_RESULT_STORAGE_KEY);
    setStorageValue(storage, ANALYZE_ERROR_STORAGE_KEY, JSON.stringify({
      request_id: response.request_id,
      status: response.status,
      error: response.error,
    }));
  }

  async function runAnalyzeSkeleton(options = {}) {
    const upload = options.upload || null;
    const requestId = typeof options.requestId === "function" ? options.requestId() : createRequestId();
    const sessionStorage = options.sessionStorage || getDefaultSessionStorage();
    const localStorage = options.localStorage === undefined ? getDefaultLocalStorage() : options.localStorage;
    const nowForId = options.now || (() => Date.now());
    const device = getOrCreateAnonymousDeviceId(localStorage, {
      now: nowForId,
      randomString: options.randomString,
    });

    if (!device.ok) {
      const response = createAnalyzeErrorResponse("DEVICE_ID_UNAVAILABLE", requestId);
      saveAnalyzeError(sessionStorage, response);
      return response;
    }

    const imageValidation = validateAnalyzeImage(options.file || upload);
    if (!imageValidation.ok) {
      const response = createAnalyzeErrorResponse(imageValidation.error.code, requestId, imageValidation.error);
      saveAnalyzeError(sessionStorage, response);
      return response;
    }

    const provider = options.provider || new MockVlmProvider();
    const providerInput = {
      request_id: requestId,
      anonymous_device_id: device.anonymous_device_id,
      image: {
        upload_ref: imageValidation.image.upload_ref || undefined,
        content_type: imageValidation.image.content_type,
        size_bytes: imageValidation.image.size_bytes,
        width: imageValidation.image.width,
        height: imageValidation.image.height,
      },
      locale: "zh-CN",
      timeout_ms: Number.isFinite(options.timeoutMs) ? options.timeoutMs : 8000,
      provider_options: {
        provider: "mock",
      },
    };

    let providerOutput;
    try {
      providerOutput = await provider.analyze(providerInput);
    } catch (error) {
      const response = createAnalyzeErrorResponse("ANALYZE_MOCK_FAILED", requestId);
      saveAnalyzeError(sessionStorage, response);
      return response;
    }

    const recognitionResult = createStage5BRecognitionResult({
      upload,
      image: imageValidation.image,
      anonymousDeviceId: device.anonymous_device_id,
      requestId,
      vlmOutput: providerOutput,
      now: options.nowIso || (() => new Date().toISOString()),
    });

    const saved = setStorageValue(sessionStorage, ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(recognitionResult));
    if (!saved.ok) {
      const response = createAnalyzeErrorResponse("UNKNOWN_ERROR", requestId);
      saveAnalyzeError(sessionStorage, response);
      return response;
    }
    removeStorageValue(sessionStorage, ANALYZE_ERROR_STORAGE_KEY);

    return {
      ok: true,
      request_id: requestId,
      status: recognitionResult.status,
      provider: "mock",
      provider_output: providerOutput,
      recognition_result: recognitionResult,
    };
  }

  const api = {
    ACCEPTED_IMAGE_TYPES,
    ANALYSIS_RESULT_STORAGE_KEY,
    ANALYZE_ERROR_STORAGE_KEY,
    DEVICE_ID_STORAGE_KEY,
    ERROR_MESSAGES,
    MAX_IMAGE_BYTES,
    UPLOAD_STORAGE_KEY,
    MockVlmProvider,
    createAnalyzeErrorResponse,
    createStage5BRecognitionResult,
    getOrCreateAnonymousDeviceId,
    runAnalyzeSkeleton,
    validateAnalyzeImage,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PalmmiStage5 = api;
})(typeof window !== "undefined" ? window : globalThis);
