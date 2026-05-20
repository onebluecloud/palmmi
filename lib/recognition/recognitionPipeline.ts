const { RULE_VERSION, SCHEMA_VERSION } = require("./recognitionTypes.ts");
const { matchPersona } = require("./personaMatcher.ts");
const { runQualityGate } = require("./qualityGate.ts");
const { validateAndNormalizeFeatures } = require("./schemaValidator.ts");
const { buildRecognitionCacheKey, createRecognitionCache } = require("./recognitionCache.ts");
const { RECOGNITION_STATUS, emptyRecognitionPayload } = require("./recognitionResult.ts");

function createDefaultPipelineConfig(overrides) {
  return {
    pipeline_version: "stage3j_v1",
    image_normalization_version: "image_norm_stage3_mock_v1",
    model_provider: "mock",
    model_name: "mock-vlm-fixture",
    mock_model_version: "mock_vlm_stage3j_v1",
    model_version: "mock_vlm_stage3j_v1",
    prompt_version: "prompt_v4_2_stage3_mock_v1",
    schema_version: SCHEMA_VERSION,
    degradation_policy_version: "degradation_v4_2_stage3j_v1",
    rule_version: RULE_VERSION,
    ...(overrides || {}),
  };
}

function runRecognitionPipeline({ image, mockVlm, cache, config }) {
  const runtimeConfig = createDefaultPipelineConfig(config);
  const runtimeCache = cache || createRecognitionCache();
  const qualityGate = runQualityGate(image);

  if (!qualityGate.can_continue) {
    return terminalResult({
      status: qualityGate.recognition_status,
      image,
      qualityGate,
      schema: emptySchema(),
      config: runtimeConfig,
      cacheInfo: emptyCacheInfo(image && image.file_hash),
      debugNotes: ["Stopped before mock VLM because quality gate did not pass."],
      mockVlmUsed: false,
    });
  }

  const cacheKey = buildRecognitionCacheKey({
    file_hash: qualityGate.image.file_hash,
    config: runtimeConfig,
  });
  const cached = runtimeCache.get(cacheKey);
  if (cached) {
    return resultFromCache({
      cached,
      image,
      qualityGate,
      cacheKey,
      config: runtimeConfig,
    });
  }

  if (typeof mockVlm !== "function") {
    return terminalResult({
      status: RECOGNITION_STATUS.RETRY_REQUIRED,
      image,
      qualityGate,
      schema: emptySchema(),
      config: runtimeConfig,
      cacheInfo: {
        file_hash: qualityGate.image.file_hash,
        cache_key: cacheKey,
        cache_hit: false,
        cache_write: false,
      },
      debugNotes: ["Mock VLM fixture provider is missing; real VLM is intentionally not called in Stage 3J."],
      mockVlmUsed: false,
    });
  }

  const rawFeatures = mockVlm({ image: qualityGate.image, config: runtimeConfig });
  const schema = validateAndNormalizeFeatures(rawFeatures);
  if (schema.should_retry) {
    return terminalResult({
      status: RECOGNITION_STATUS.RETRY_REQUIRED,
      image,
      qualityGate,
      schema,
      config: runtimeConfig,
      cacheInfo: {
        file_hash: qualityGate.image.file_hash,
        cache_key: cacheKey,
        cache_hit: false,
        cache_write: false,
      },
      debugNotes: ["Stopped before persona matching because schema validation requires retry."],
      mockVlmUsed: true,
    });
  }

  const matchResult = matchPersona(schema.normalized_features);
  const status = finalStatus({ qualityGate, schema, matchResult });
  const result = buildRecognitionResult({
    status,
    image,
    qualityGate,
    schema,
    matchResult,
    cacheInfo: {
      file_hash: qualityGate.image.file_hash,
      cache_key: cacheKey,
      cache_hit: false,
      cache_write: false,
    },
    config: runtimeConfig,
    mockVlmUsed: true,
    debugNotes: [],
  });

  if (status === RECOGNITION_STATUS.SUCCESS || status === RECOGNITION_STATUS.LOW_CONFIDENCE) {
    result.cache.cache_write = true;
    runtimeCache.set(cacheKey, createCacheValue({
      cacheKey,
      image: qualityGate.image,
      qualityGate,
      schema,
      matchResult,
      result,
      config: runtimeConfig,
    }));
  }

  return result;
}

function finalStatus({ qualityGate, schema, matchResult }) {
  if (!matchResult || matchResult.status === RECOGNITION_STATUS.RETRY_REQUIRED) {
    return RECOGNITION_STATUS.RETRY_REQUIRED;
  }
  if (
    qualityGate.status === "LOW_QUALITY_PASS" ||
    schema.degraded_fields.length > 0 ||
    matchResult.status === RECOGNITION_STATUS.LOW_CONFIDENCE ||
    matchResult.is_low_confidence
  ) {
    return RECOGNITION_STATUS.LOW_CONFIDENCE;
  }
  return RECOGNITION_STATUS.SUCCESS;
}

function buildRecognitionResult({ status, image, qualityGate, schema, matchResult, cacheInfo, config, mockVlmUsed, debugNotes }) {
  const payload = matchResult
    ? {
        mother_scores: matchResult.mother_type_scores || null,
        primary_mother: matchResult.primary_mother || null,
        secondary_mother: matchResult.secondary_mother || null,
        is_dual_mother: Boolean(matchResult.is_dual_mother),
        primary_persona: matchResult.primary_persona || null,
        top3: matchResult.top3 || [],
        recognition: matchResult,
      }
    : emptyRecognitionPayload();

  return {
    status,
    cache: cacheInfo,
    image_input: image || null,
    quality_gate: qualityGate,
    schema,
    ...payload,
    error_codes: collectErrorCodes(qualityGate, schema, matchResult),
    debug: {
      pipeline_version: config.pipeline_version,
      rule_version: config.rule_version,
      matcher_rule_version: matchResult && matchResult.debug ? matchResult.debug.rule_version : RULE_VERSION,
      schema_version: config.schema_version,
      prompt_version: config.prompt_version,
      mock_model_version: config.mock_model_version || config.model_version,
      image_normalization_version: config.image_normalization_version,
      degradation_policy_version: config.degradation_policy_version,
      mock_vlm_used: mockVlmUsed,
      cache_hit: Boolean(cacheInfo.cache_hit),
      notes: debugNotes,
    },
  };
}

function terminalResult({ status, image, qualityGate, schema, config, cacheInfo, debugNotes, mockVlmUsed }) {
  return buildRecognitionResult({
    status,
    image,
    qualityGate,
    schema,
    matchResult: null,
    cacheInfo,
    config,
    mockVlmUsed,
    debugNotes,
  });
}

function resultFromCache({ cached, image, qualityGate, cacheKey, config }) {
  const snapshot = cached.result_snapshot || {};
  const result = {
    ...snapshot,
    status: cached.recognition_status || snapshot.status,
    cache: {
      file_hash: cached.file_hash,
      cache_key: cacheKey,
      cache_hit: true,
      cache_write: false,
    },
    image_input: image || snapshot.image_input || null,
    quality_gate: qualityGate,
    debug: {
      ...(snapshot.debug || {}),
      pipeline_version: config.pipeline_version,
      rule_version: config.rule_version,
      schema_version: config.schema_version,
      prompt_version: config.prompt_version,
      mock_model_version: config.mock_model_version || config.model_version,
      mock_vlm_used: false,
      cache_hit: true,
      notes: [...((snapshot.debug && snapshot.debug.notes) || []), "Returned from file_hash cache; mock VLM and rule matching were not rerun."],
    },
  };
  return result;
}

function createCacheValue({ cacheKey, image, qualityGate, schema, matchResult, result, config }) {
  return {
    cache_key: cacheKey,
    file_hash: image.file_hash,
    image_metadata: {
      file_hash: image.file_hash,
      mime_type: image.mime_type,
      width: image.width,
      height: image.height,
      file_size: image.file_size,
      image_normalization_version: config.image_normalization_version,
    },
    model_provider: config.model_provider,
    model_name: config.model_name,
    model_version: config.mock_model_version || config.model_version,
    mock_model_version: config.mock_model_version || config.model_version,
    prompt_version: config.prompt_version,
    schema_version: config.schema_version,
    rule_version: config.rule_version,
    degradation_policy_version: config.degradation_policy_version,
    image_quality_result: qualityGate,
    vlm_raw_output_ref: "mock_fixture",
    normalized_features: schema.normalized_features,
    normalized_33_fields: schema.normalized_features,
    validation_result: schema,
    degraded_fields: schema.degraded_fields,
    mother_scores: matchResult.mother_type_scores || null,
    primary_mother: matchResult.primary_mother || null,
    secondary_mother: matchResult.secondary_mother || null,
    primary_persona: matchResult.primary_persona || null,
    top3: matchResult.top3 || [],
    recognition_status: result.status,
    created_at: new Date().toISOString(),
    expires_at: null,
    debug: result.debug,
    result_snapshot: result,
  };
}

function collectErrorCodes(qualityGate, schema, matchResult) {
  const codes = [];
  if (qualityGate && qualityGate.reason_codes) {
    codes.push(...qualityGate.reason_codes);
  }
  if (schema && schema.should_retry) {
    codes.push("SCHEMA_RETRY_REQUIRED");
  }
  if (matchResult && matchResult.error_codes) {
    codes.push(...matchResult.error_codes);
  }
  return [...new Set(codes)];
}

function emptySchema() {
  return {
    status: "NOT_RUN",
    normalized_features: null,
    degraded_fields: [],
    missing_fields: [],
    null_fields: [],
    invalid_fields: [],
    schema_warnings: [],
    should_retry: false,
    degradation_count: 0,
    missing_or_null_count: 0,
    core_missing_or_null_count: 0,
    max_continuous_degraded_fields: 0,
  };
}

function emptyCacheInfo(fileHash) {
  return {
    file_hash: fileHash || null,
    cache_key: null,
    cache_hit: false,
    cache_write: false,
  };
}

module.exports = {
  createDefaultPipelineConfig,
  runRecognitionPipeline,
};
