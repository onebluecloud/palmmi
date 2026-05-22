const fs = require("node:fs");
const path = require("node:path");

const {
  DEFAULT_QWEN_ENDPOINT,
  DEFAULT_QWEN_MODEL,
} = require("../../server/stage5p/env.js");
const {
  ERROR_CODES,
} = require("../../server/stage5p/errors.js");
const {
  QwenVlmProvider,
  buildVlmFeatures,
} = require("../../server/stage5p/providers/qwen-vlm-provider.js");
const {
  buildAnalysisResultContract,
} = require("../../src/stage5/analysis-result-contract.js");
const {
  runPalmmiRecognitionPipeline,
} = require("../../src/stage5/palmmi-recognition-pipeline.js");
const {
  runPalmmiAnalysisBridge,
} = require("../../src/stage5/palmmi-analysis-bridge.js");

const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_IMAGE_DIR = "E:\\其他\\Palmmi\\Palmmi-test-images";
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_REAL_CALLS = 5;
const DEFAULT_MIN_PALM_SAMPLES = 5;
const DEFAULT_MIN_UNIQUE_PERSONALITIES = 2;
const SAMPLE_DEFINITIONS = Object.freeze([
  {
    name: "not_palm",
    option: "not-palm",
    expected: "NOT_PALM",
    patterns: [/not[-_ ]?palm/i, /beer/i, /beverage/i, /drink/i, /非手掌/u, /啤酒/u, /饮料/u],
  },
  {
    name: "palm_faint",
    option: "palm-faint",
    expected: "LOW_CONFIDENCE_OR_VALID_PERSONALITY",
    patterns: [/palm[-_ ]?faint/i, /faint/i, /weak/i, /unclear/i, /偏淡/u, /模糊/u],
  },
  {
    name: "palm_clear",
    option: "palm-clear",
    expected: "VALID_PERSONALITY",
    patterns: [/palm[-_ ]?clear/i, /clear/i, /good/i, /清晰/u],
  },
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const CONTENT_TYPES = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
});

let frozenDisplayContent = [];
try {
  frozenDisplayContent = require("../../PalmTag_rule_engine_v0/data/display_content.json");
} catch (error) {
  frozenDisplayContent = [];
}
const VALID_PERSONA_IDS = new Set(
  Array.isArray(frozenDisplayContent)
    ? frozenDisplayContent
      .map((item) => item && typeof item.persona_id === "string" ? item.persona_id.trim() : "")
      .filter(Boolean)
    : []
);

function parseArgs(argv) {
  const options = {
    real: false,
    imageDir: "",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    model: DEFAULT_QWEN_MODEL,
    models: [DEFAULT_QWEN_MODEL],
    maxRealCalls: DEFAULT_MAX_REAL_CALLS,
    collapseCheck: false,
    debugClassifier: false,
    minPalmSamples: DEFAULT_MIN_PALM_SAMPLES,
    minUniquePersonalities: DEFAULT_MIN_UNIQUE_PERSONALITIES,
    samples: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--real") {
      options.real = true;
    } else if (arg === "--image-dir") {
      options.imageDir = argv[++index] || "";
    } else if (arg === "--not-palm") {
      options.samples.not_palm = argv[++index] || "";
    } else if (arg === "--palm-faint") {
      options.samples.palm_faint = argv[++index] || "";
    } else if (arg === "--palm-clear") {
      options.samples.palm_clear = argv[++index] || "";
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number.parseInt(argv[++index] || "", 10) || DEFAULT_TIMEOUT_MS;
    } else if (arg === "--model") {
      options.model = argv[++index] || DEFAULT_QWEN_MODEL;
      options.models = [options.model];
    } else if (arg === "--models") {
      const value = argv[++index] || "";
      const models = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      options.models = models.length ? [...new Set(models)] : [DEFAULT_QWEN_MODEL];
      options.model = options.models[0];
    } else if (arg === "--max-real-calls") {
      options.maxRealCalls = Number.parseInt(argv[++index] || "", 10) || DEFAULT_MAX_REAL_CALLS;
    } else if (arg === "--collapse-check") {
      options.collapseCheck = true;
    } else if (arg === "--debug-classifier") {
      options.debugClassifier = true;
    } else if (arg === "--min-palm-samples") {
      options.minPalmSamples = Number.parseInt(argv[++index] || "", 10) || DEFAULT_MIN_PALM_SAMPLES;
    } else if (arg === "--min-unique-personalities") {
      options.minUniquePersonalities = Number.parseInt(argv[++index] || "", 10) || DEFAULT_MIN_UNIQUE_PERSONALITIES;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function endpointLabel(endpoint) {
  try {
    const host = new URL(endpoint).host;
    return host.includes("dashscope") ? "dashscope-compatible" : "custom-compatible";
  } catch (error) {
    return "custom-compatible";
  }
}

function keyFromEnv(env) {
  for (const name of ["PALMMI_QWEN_API_KEY", "QWEN_API_KEY", "DASHSCOPE_API_KEY"]) {
    const value = env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function listImageFiles(directory) {
  if (!directory || !fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }
  return fs.readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((filePath) => {
      const extension = path.extname(filePath).toLowerCase();
      return fs.statSync(filePath).isFile() && IMAGE_EXTENSIONS.has(extension);
    })
    .sort((left, right) => left.localeCompare(right));
}

function resolvePath(filePath) {
  return path.resolve(process.cwd(), filePath);
}

function findByPatterns(files, patterns) {
  return files.find((filePath) => {
    const fileName = path.basename(filePath);
    return patterns.some((pattern) => pattern.test(fileName));
  }) || "";
}

function optionalCollapsePalmSamples(files, selected) {
  const selectedPaths = new Set(Object.values(selected));
  return files
    .filter((filePath) => {
      const fileName = path.basename(filePath).toLowerCase();
      return /^palm[-_ ]?\d+\.(jpe?g|png|webp)$/i.test(path.basename(filePath))
        && !selectedPaths.has(filePath)
        && !/faint|weak|unclear|clear|good|not[-_ ]?palm|beer|beverage|drink/.test(fileName);
    })
    .slice(0, 8)
    .map((filePath, index) => ({
      name: `palm_${index + 2}`,
      expected: "VALID_PERSONALITY",
      filePath,
    }));
}

function sampleDefinitionsFor(selectedSamples) {
  return Object.keys(selectedSamples).map((name) => {
    const definition = SAMPLE_DEFINITIONS.find((item) => item.name === name);
    return {
      name,
      expected: definition ? definition.expected : "VALID_PERSONALITY",
    };
  });
}

function selectSamples(options) {
  const explicit = {};
  for (const sample of SAMPLE_DEFINITIONS) {
    if (options.samples[sample.name]) {
      explicit[sample.name] = resolvePath(options.samples[sample.name]);
    }
  }
  if (Object.keys(explicit).length > 0) {
    return {
      ok: SAMPLE_DEFINITIONS.every((sample) => explicit[sample.name]),
      samples: explicit,
      available: [],
      mode: "explicit",
    };
  }

  const directory = options.imageDir ? resolvePath(options.imageDir) : "";
  if (!directory) {
    return {
      ok: false,
      samples: {},
      available: [],
      mode: "none",
    };
  }

  const files = listImageFiles(directory);
  const samples = {};
  for (const sample of SAMPLE_DEFINITIONS) {
    const match = findByPatterns(files, sample.patterns);
    if (match) {
      samples[sample.name] = match;
    }
  }
  if (options.collapseCheck) {
    for (const sample of optionalCollapsePalmSamples(files, samples)) {
      samples[sample.name] = sample.filePath;
    }
  }
  return {
    ok: SAMPLE_DEFINITIONS.every((sample) => samples[sample.name]),
    samples,
    available: files.map((filePath) => path.basename(filePath)),
    mode: "image-dir",
  };
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "";
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function isKnownPersonaId(personalityId) {
  return typeof personalityId === "string"
    && personalityId.trim()
    && VALID_PERSONA_IDS.has(personalityId.trim());
}

function safeUsage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const usage = {};
  for (const key of ["prompt_tokens", "completion_tokens", "total_tokens"]) {
    if (Number.isFinite(value[key])) {
      usage[key] = value[key];
    }
  }
  return Object.keys(usage).length > 0 ? usage : null;
}

function sampleBase(sampleName) {
  const definition = SAMPLE_DEFINITIONS.find((item) => item.name === sampleName);
  return {
    name: sampleName,
    expected: definition ? definition.expected : "VALID_PERSONALITY",
  };
}

function publicCodeFromProviderFailure(response) {
  return response && response.error && typeof response.error.code === "string"
    ? response.error.code
    : ERROR_CODES.UNKNOWN_ERROR;
}

function diagnosticCodeFromFailure(response, sampleName, apiCalls) {
  const errorType = response && response.diagnostics && typeof response.diagnostics.errorType === "string"
    ? response.diagnostics.errorType
    : "";
  if (errorType === "VALIDITY_PASS_RESULT_MISSING") {
    return "VALIDITY_PASS_RESULT_MISSING";
  }
  if (errorType === "VALIDITY_PASS_FEATURES_MISSING") {
    return "VALIDITY_PASS_FEATURES_MISSING";
  }
  if ((sampleName === "palm_faint" || sampleName === "palm_clear")
    && apiCalls < 2
    && publicCodeFromProviderFailure(response) === ERROR_CODES.ANALYSIS_UNRELIABLE) {
    return "SMOKE_PIPELINE_INCOMPLETE";
  }
  return errorType || null;
}

async function buildContractSummary(parsed, image, sampleName, model) {
  const providerResult = {
    ok: true,
    request_id: `real_qwen_smoke_${sampleName}`,
    provider: "qwen",
    model,
    status: "OK",
    parsed,
    features: buildVlmFeatures(parsed),
    quality: {
      palm_detected: parsed.validity.is_palm_photo === true,
      single_hand: parsed.validity.is_single_hand === true,
      image_usable: parsed.isValidPalmImage === true,
      confidence: parsed.confidence,
      reasons: parsed.uncertainty,
    },
    confidence: parsed.confidence,
    warnings: parsed.uncertainty.length > 0 ? ["UNCERTAINTY_REPORTED"] : [],
    latencyMs: 0,
    performance: {
      latency_ms: 0,
      estimated_cost_usd: null,
    },
    error_codes: [],
    response_ref: "qwen:redacted",
  };

  const recognitionResult = await runPalmmiRecognitionPipeline({
    sourceImage: image.fileName,
    sampleId: `real_qwen_smoke_${sampleName}`,
    providerResult,
    providerWarnings: providerResult.warnings,
    side: "unknown",
  });
  const upload = {
    schemaVersion: "stage6f_real_qwen_smoke_upload_v1",
    fileName: image.fileName,
    fileType: image.contentType,
    fileSize: image.sizeBytes,
    fileSizeLabel: `${image.sizeBytes} B`,
    previewDataUrl: "",
    uploadedAt: new Date().toISOString(),
    handSide: null,
  };
  const stage5bResult = await runPalmmiAnalysisBridge({
    recognitionResult,
    upload,
    sessionStorage: createMemoryStorage(),
    localStorage: createMemoryStorage({ "palmmi:device-id": "stage6f_real_qwen_smoke" }),
    requestId: () => `real_qwen_smoke_${sampleName}`,
  });
  const contract = buildAnalysisResultContract(stage5bResult, {
    now: () => new Date().toISOString(),
  });

  return {
    quality_status: contract.quality_status || (contract.uiConsumable && contract.uiConsumable.qualityStatus) || "UNKNOWN",
    personality_id: contract.personality_id || null,
    has_personality_result: Boolean(contract.personality_id),
    candidate_count: Array.isArray(contract.candidate_results) ? contract.candidate_results.length : 0,
    candidate_ids: Array.isArray(contract.candidate_results)
      ? contract.candidate_results
        .map((candidate) => candidate && candidate.personality_id)
        .filter(Boolean)
        .slice(0, 3)
      : [],
    classifier_debug: {
      score_margin: contract.diagnostics && Number.isFinite(contract.diagnostics.scoreMargin)
        ? contract.diagnostics.scoreMargin
        : null,
      unknown_feature_count: contract.diagnostics && Number.isFinite(contract.diagnostics.unknownFeatureCount)
        ? contract.diagnostics.unknownFeatureCount
        : null,
      usable_feature_count: contract.diagnostics && Number.isFinite(contract.diagnostics.usableFeatureCount)
        ? contract.diagnostics.usableFeatureCount
        : null,
      collapse_risk_hint: Boolean(contract.diagnostics && contract.diagnostics.collapseRiskHint),
      classifier_version: contract.diagnostics && typeof contract.diagnostics.classifierVersion === "string"
        ? contract.diagnostics.classifierVersion
        : null,
      warnings: contract.diagnostics
        ? [
          ...(Array.isArray(contract.diagnostics.adapterWarnings) ? contract.diagnostics.adapterWarnings : []),
          ...(Array.isArray(contract.diagnostics.matcherWarnings) ? contract.diagnostics.matcherWarnings : []),
          ...(Array.isArray(contract.diagnostics.contractWarnings) ? contract.diagnostics.contractWarnings : []),
        ].slice(0, 12)
        : [],
    },
  };
}

function statusForSample(sampleName, result) {
  if (sampleName === "not_palm") {
    return result.actual_code === "NOT_PALM"
      && result.valid_palm === false
      && result.has_personality_result === false
      && result.personality_id === null
      ? "PASS"
      : "FAIL";
  }
  if (sampleName === "palm_faint") {
    if ((result.actual_code === "OK" || result.actual_code === "LOW_CONFIDENCE")
      && result.valid_palm === true
      && result.has_personality_result === true
      && isKnownPersonaId(result.personality_id)) {
      return "PASS_OR_REVIEW";
    }
    return "FAIL_OR_NEEDS_PROMPT_TUNING";
  }
  if ((result.actual_code === "OK" || result.actual_code === "LOW_CONFIDENCE")
    && result.valid_palm === true
    && result.has_personality_result === true
    && isKnownPersonaId(result.personality_id)) {
    return "PASS";
  }
  return "FAIL";
}

function noteFor(result) {
  if (result.actual_code === "NOT_PALM") {
    return "Rejected as non-palm.";
  }
  if (result.actual_code === "IMAGE_NOT_CLEAR") {
    return "Palm validity failed because palm lines were not clear enough.";
  }
  if (result.actual_code === "ANALYSIS_UNRELIABLE") {
    return result.has_personality_result
      ? "Current parser rejected a possible palm result as unreliable."
      : "Current parser rejected the result as unreliable.";
  }
  if (result.actual_code === "REQUEST_TIMEOUT") {
    return "Real Qwen request timed out.";
  }
  if (result.actual_quality_status === "LOW_CONFIDENCE") {
    return "Valid palm accepted with low confidence.";
  }
  if (result.actual_code === "OK") {
    return "Valid palm returned a personality result.";
  }
  return "Review required.";
}

function estimatedCallsForSample(sample) {
  return sample && sample.name === "not_palm" ? 1 : 2;
}

function estimateRealCalls(samples, models) {
  const modelCount = Array.isArray(models) && models.length ? models.length : 1;
  return samples.reduce((sum, sample) => sum + estimatedCallsForSample(sample), 0) * modelCount;
}

function topPersonalityCount(ids) {
  const counts = new Map();
  ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0] || [null, 0];
}

function personalityDistribution(ids) {
  return ids.reduce((distribution, id) => {
    distribution[id] = (distribution[id] || 0) + 1;
    return distribution;
  }, {});
}

function buildCollapseAnalysis(samples, models, options = {}) {
  const minPalmSamples = Number.isFinite(options.minPalmSamples)
    ? options.minPalmSamples
    : DEFAULT_MIN_PALM_SAMPLES;
  const minUniquePersonalities = Number.isFinite(options.minUniquePersonalities)
    ? options.minUniquePersonalities
    : DEFAULT_MIN_UNIQUE_PERSONALITIES;
  const analysis = {};
  for (const model of models) {
    const personalityIds = [];
    for (const sample of samples) {
      const byModel = sample && sample.by_model ? sample.by_model : {};
      const result = byModel[model];
      if (
        result &&
        result.valid_palm === true &&
        result.has_personality_result === true &&
        isKnownPersonaId(result.personality_id)
      ) {
        personalityIds.push(result.personality_id);
      }
    }
    const unique = [...new Set(personalityIds)];
    const [topPersonality] = topPersonalityCount(personalityIds);
    const collapseRisk = personalityIds.length >= 3 && unique.length <= 1;
    const hardFail = personalityIds.length >= minPalmSamples && unique.length < minUniquePersonalities;
    const allP25 = collapseRisk && topPersonality === "P25";
    const allLiuyishou = collapseRisk && topPersonality === "P31";
    analysis[model] = {
      palm_sample_count: personalityIds.length,
      unique_personality_count: unique.length,
      top_personality: topPersonality,
      collapse_risk: collapseRisk,
      hard_fail: hardFail,
      diagnostic_code: hardFail && allLiuyishou
        ? "P31_COLLAPSE_CONFIRMED"
        : collapseRisk
          ? "PERSONALITY_COLLAPSE_RISK"
          : null,
      candidate_distribution: personalityDistribution(personalityIds),
      notes: collapseRisk
        ? (allP25
          ? "All tested palm samples collapsed to P25."
          : allLiuyishou
            ? "All tested palm samples collapsed to 留一手."
            : "All tested palm samples collapsed to one personality.")
        : (personalityIds.length >= 3 ? "No collapse risk detected in tested palm samples." : "INSUFFICIENT_PALM_SAMPLES_FOR_COLLAPSE_DECISION"),
    };
  }
  return analysis;
}

function buildRecommendation(collapseAnalysis, models) {
  const viable = models
    .map((model) => ({ model, analysis: collapseAnalysis[model] || {} }))
    .filter((entry) => entry.analysis.palm_sample_count >= 3 && entry.analysis.collapse_risk === false);
  if (viable.length === 1) {
    return {
      preferred_model: viable[0].model,
      reason: "Only one tested model avoided personality collapse across at least three palm samples.",
    };
  }
  if (viable.length > 1) {
    viable.sort((left, right) => right.analysis.unique_personality_count - left.analysis.unique_personality_count);
    return {
      preferred_model: viable[0].model,
      reason: "This model produced the highest unique personality count among tested palm samples.",
    };
  }
  return {
    preferred_model: "inconclusive",
    reason: "A/B smoke has insufficient varied palm samples or all tested models still need review.",
  };
}

async function runSample({ provider, sampleName, filePath, model }) {
  const start = Date.now();
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const contentType = contentTypeFor(filePath);
  let usage = null;
  let apiCalls = 0;
  const image = {
    fileName,
    contentType,
    sizeBytes: buffer.length,
  };

  if (!contentType) {
    const result = {
      ...sampleBase(sampleName),
      file_name: fileName,
      file_size_bytes: buffer.length,
      duration_ms: Date.now() - start,
      status: "FAIL",
      actual_code: "FILE_TYPE_UNSUPPORTED",
      actual_quality_status: "FILE_TYPE_UNSUPPORTED",
      valid_palm: false,
      personality_id: null,
      has_personality_result: false,
      candidate_count: 0,
      candidate_ids: [],
      notes: "Unsupported image extension.",
      usage: null,
      api_calls_made: 0,
    };
    return result;
  }

  const originalFetch = provider.fetchImpl;
  provider.fetchImpl = async (endpoint, init) => {
    apiCalls += 1;
    const response = await originalFetch(endpoint, init);
    try {
      const cloned = response.clone();
      const parsed = await cloned.json();
      usage = safeUsage(parsed.usage);
    } catch (error) {
      usage = null;
    }
    return response;
  };

  let providerResult;
  try {
    providerResult = await provider.analyze({
      request_id: `real_qwen_smoke_${sampleName}`,
      image: {
        file_name: fileName,
        content_type: contentType,
        size_bytes: buffer.length,
        buffer,
      },
    });
  } finally {
    provider.fetchImpl = originalFetch;
  }

  const base = {
    ...sampleBase(sampleName),
    file_name: fileName,
    file_size_bytes: buffer.length,
    duration_ms: Date.now() - start,
    usage,
    api_calls_made: apiCalls,
  };

  if (!providerResult || providerResult.ok === false) {
    const actualCode = publicCodeFromProviderFailure(providerResult);
    const diagnosticCode = diagnosticCodeFromFailure(providerResult, sampleName, apiCalls);
    const result = {
      ...base,
      status: "FAIL",
      actual_code: actualCode,
      actual_quality_status: diagnosticCode || actualCode,
      diagnostic_code: diagnosticCode,
      valid_palm: diagnosticCode === "VALIDITY_PASS_RESULT_MISSING",
      personality_id: null,
      has_personality_result: false,
      candidate_count: 0,
      candidate_ids: [],
      notes: diagnosticCode === "VALIDITY_PASS_RESULT_MISSING"
        ? "Validity passed, but the personality result was missing after full analysis."
        : diagnosticCode === "SMOKE_PIPELINE_INCOMPLETE"
          ? "Smoke pipeline did not reach the full personality analysis stage."
          : noteFor({ actual_code: actualCode }),
    };
    result.status = statusForSample(sampleName, result);
    return result;
  }

  const parsed = providerResult.parsed;
  let contractSummary = null;
  try {
    contractSummary = await buildContractSummary(parsed, image, sampleName, model);
  } catch (error) {
    contractSummary = null;
  }

  const lowConfidence = parsed.confidence > 0 && parsed.confidence < 0.65;
  const actualCode = providerResult.status === "LOW_CONFIDENCE" || lowConfidence ? "LOW_CONFIDENCE" : "OK";
  const actualQualityStatus = contractSummary && contractSummary.quality_status
    ? contractSummary.quality_status
    : actualCode;
  const result = {
    ...base,
    status: "FAIL",
    actual_code: actualCode,
    actual_quality_status: actualQualityStatus,
    valid_palm: parsed.isValidPalmImage === true,
    personality_id: contractSummary && contractSummary.personality_id
      ? contractSummary.personality_id
      : null,
    has_personality_result: Boolean(contractSummary && contractSummary.has_personality_result),
    candidate_count: contractSummary && Number.isFinite(contractSummary.candidate_count)
      ? contractSummary.candidate_count
      : 0,
    candidate_ids: contractSummary && Array.isArray(contractSummary.candidate_ids)
      ? contractSummary.candidate_ids
      : [],
    classifier_debug: contractSummary && contractSummary.classifier_debug
      ? contractSummary.classifier_debug
      : null,
    notes: "",
  };
  result.notes = noteFor(result);
  result.status = statusForSample(sampleName, result);
  return result;
}

function disabledSummary(options) {
  return {
    ok: true,
    status: "REAL_QWEN_DISABLED",
    message: "No API call was made.",
    notice: [
      "This script validates up to 3 required samples; --collapse-check may include extra palm samples.",
      "Complete provider.analyze() may make up to 5 calls for 3 samples per model.",
      "It may consume quota.",
      "Use --real to confirm.",
    ],
    model: options.model,
    models: options.models,
    collapse_check: options.collapseCheck,
    debug_classifier: options.debugClassifier,
    min_palm_samples: options.minPalmSamples,
    min_unique_personalities: options.minUniquePersonalities,
    max_real_calls: options.maxRealCalls,
    endpoint: endpointLabel(DEFAULT_QWEN_ENDPOINT),
    api_calls_made: 0,
    safety: {
      printed_key: false,
      printed_base64: false,
      printed_raw_response: false,
    },
  };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    printJson({
      ok: false,
      status: "ARGUMENT_ERROR",
      message: error.message,
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printJson({
      ok: true,
      status: "HELP",
      usage: [
        "npm run smoke:stage6f:qwen -- --real --image-dir \"E:\\其他\\Palmmi\\Palmmi-test-images\"",
        "npm run smoke:stage6f:qwen -- --real --not-palm <path> --palm-faint <path> --palm-clear <path>",
        "npm run smoke:stage6f:qwen -- --real --image-dir \"E:\\其他\\Palmmi\\Palmmi-test-images\" --models qwen3-vl-flash,qwen3.6-flash --collapse-check --max-real-calls 10",
        "npm run smoke:stage6f:qwen -- --real --image-dir \"E:\\其他\\Palmmi\\Palmmi-test-images\" --collapse-check --debug-classifier --min-palm-samples 5 --min-unique-personalities 2 --max-real-calls 10",
      ],
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    return;
  }

  if (!options.real) {
    printJson(disabledSummary(options));
    return;
  }

  const selected = selectSamples(options);
  if (!selected.ok) {
    printJson({
      ok: false,
      status: "IMAGE_SELECTION_REQUIRED",
      message: selected.mode === "none"
        ? "Provide --image-dir or explicit --not-palm / --palm-faint / --palm-clear paths."
        : "Could not identify all three samples from file names. Use explicit paths.",
      expected_samples: SAMPLE_DEFINITIONS.map((sample) => sample.name),
      available_images: selected.available,
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
    return;
  }

  const selectedDefinitions = sampleDefinitionsFor(selected.samples);
  const missing = Object.values(selected.samples)
    .filter((filePath) => !fs.existsSync(filePath));
  if (missing.length > 0) {
    printJson({
      ok: false,
      status: "IMAGE_FILE_MISSING",
      missing_files: missing.map((filePath) => path.basename(filePath)),
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
    return;
  }

  const estimatedRealCalls = estimateRealCalls(selectedDefinitions, options.models);
  if (estimatedRealCalls > options.maxRealCalls) {
    printJson({
      ok: false,
      status: "MAX_REAL_CALLS_EXCEEDED",
      message: "Estimated real Qwen calls exceed --max-real-calls. Increase the limit explicitly if you want to run this smoke.",
      sample_count: selectedDefinitions.length,
      models: options.models,
      estimated_real_calls: estimatedRealCalls,
      max_real_calls: options.maxRealCalls,
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
    return;
  }

  const apiKey = keyFromEnv(process.env);
  if (!apiKey) {
    printJson({
      ok: false,
      status: "QWEN_API_KEY_MISSING",
      message: "QWEN_API_KEY_MISSING",
      model: options.model,
      models: options.models,
      endpoint: endpointLabel(DEFAULT_QWEN_ENDPOINT),
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
    return;
  }

  if (typeof fetch !== "function") {
    printJson({
      ok: false,
      status: "FETCH_UNAVAILABLE",
      model: options.model,
      models: options.models,
      endpoint: endpointLabel(DEFAULT_QWEN_ENDPOINT),
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
    return;
  }

  const bySample = selectedDefinitions.map((sample) => ({
    name: sample.name,
    expected: sample.expected,
    file_name: path.basename(selected.samples[sample.name]),
    file_size_bytes: fs.statSync(selected.samples[sample.name]).size,
    by_model: {},
  }));
  let apiCallsMade = 0;
  for (const model of options.models) {
    const env = {
      ...process.env,
      PALMMI_QWEN_API_KEY: apiKey,
      PALMMI_QWEN_MODEL: model,
      PALMMI_VLM_TIMEOUT_MS: String(options.timeoutMs),
    };
    const provider = new QwenVlmProvider({
      env,
      model,
      timeoutMs: options.timeoutMs,
      fetchImpl: fetch,
    });

    for (const sample of selectedDefinitions) {
      const result = await runSample({
        provider,
        sampleName: sample.name,
        filePath: selected.samples[sample.name],
        model: provider.model,
      });
      apiCallsMade += result.api_calls_made || 0;
      const publicResult = {
        duration_ms: result.duration_ms,
        usage: result.usage,
        status: result.status,
        actual_code: result.actual_code,
        actual_quality_status: result.actual_quality_status,
        diagnostic_code: result.diagnostic_code || null,
        valid_palm: result.valid_palm,
        personality_id: result.personality_id,
        has_personality_result: result.has_personality_result,
        candidate_count: result.candidate_count,
        candidate_ids: result.candidate_ids || [],
        classifier_debug: options.debugClassifier ? (result.classifier_debug || null) : null,
        notes: result.notes,
      };
      const sampleEntry = bySample.find((item) => item.name === sample.name);
      sampleEntry.by_model[provider.model] = publicResult;
    }
  }

  const collapseAnalysis = options.collapseCheck
    ? buildCollapseAnalysis(bySample, options.models, {
      minPalmSamples: options.minPalmSamples,
      minUniquePersonalities: options.minUniquePersonalities,
    })
    : null;
  const collapseOk = !collapseAnalysis || Object.values(collapseAnalysis).every((analysis) => analysis.hard_fail !== true);
  const summary = {
    ok: bySample.every((sample) => Object.values(sample.by_model)
      .every((result) => result.status === "PASS" || result.status === "PASS_OR_REVIEW")) && collapseOk,
    models: options.models,
    endpoint: endpointLabel(DEFAULT_QWEN_ENDPOINT),
    mode: selected.mode,
    sample_count: selectedDefinitions.length,
    estimated_real_calls: estimatedRealCalls,
    max_real_calls: options.maxRealCalls,
    debug_classifier: options.debugClassifier,
    min_palm_samples: options.minPalmSamples,
    min_unique_personalities: options.minUniquePersonalities,
    samples: bySample,
    collapse_analysis: collapseAnalysis,
    recommendation: collapseAnalysis ? buildRecommendation(collapseAnalysis, options.models) : {
      preferred_model: "inconclusive",
      reason: "Run with --collapse-check and at least three palm samples to compare model collapse risk.",
    },
    api_calls_made: apiCallsMade,
    safety: {
      printed_key: false,
      printed_base64: false,
      printed_raw_response: false,
    },
  };
  printJson(summary);
  process.exitCode = summary.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    printJson({
      ok: false,
      status: "SMOKE_SCRIPT_FAILED",
      message: error && error.message ? error.message.slice(0, 160) : "unknown",
      api_calls_made: 0,
      safety: {
        printed_key: false,
        printed_base64: false,
        printed_raw_response: false,
      },
    });
    process.exitCode = 1;
  });
}

module.exports = {
  buildCollapseAnalysis,
  buildContractSummary,
  buildRecommendation,
  disabledSummary,
  estimateRealCalls,
  parseArgs,
  selectSamples,
};
