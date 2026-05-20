const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  runAnalyzeApi,
} = require(path.join(root, "server", "stage5p", "analyze-service.js"));
const {
  resolveProviderConfig,
} = require(path.join(root, "server", "stage5p", "env.js"));

const DEFAULT_IMAGE_DIR = "E:\\其他\\Palmmi\\测试图片 - 副本";
const REAL_IMAGE_LIMIT = 5;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const FORBIDDEN_RESPONSE_MARKERS = [
  "provider_output",
  "raw_provider",
  "raw_response",
  "rawText",
  "choices",
  "Authorization",
  "PALMMI_QWEN_API_KEY",
  "QWEN_API_KEY",
  "data:image",
  ";base64,",
];

function envExists(name) {
  return typeof process.env[name] === "string" && process.env[name].trim() !== "";
}

function hasQwenKey() {
  return envExists("PALMMI_QWEN_API_KEY") || envExists("QWEN_API_KEY");
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function listImageFiles(imageDir) {
  if (!fs.existsSync(imageDir) || !fs.statSync(imageDir).isDirectory()) {
    return null;
  }
  return fs.readdirSync(imageDir)
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((name) => path.join(imageDir, name));
}

function responseLeakFlags(response) {
  const json = JSON.stringify(response);
  return FORBIDDEN_RESPONSE_MARKERS.filter((marker) => json.includes(marker));
}

function classifyError(code) {
  if (!code) {
    return null;
  }
  if (code === "VLM_API_KEY_MISSING") {
    return "API Key 缺失";
  }
  if (code === "VLM_API_TIMEOUT") {
    return "超时";
  }
  if (code === "VLM_API_REQUEST_FAILED") {
    return "网络或请求失败";
  }
  if (code === "VLM_API_INVALID_RESPONSE") {
    return "返回格式不符合 contract 或图片不可识别";
  }
  if (code === "VLM_RESPONSE_NORMALIZE_FAILED") {
    return "normalize 失败";
  }
  if (code === "FILE_TYPE_UNSUPPORTED") {
    return "图片格式错误";
  }
  if (code === "FILE_TOO_LARGE") {
    return "图片大小错误";
  }
  return "其他稳定错误";
}

function summarizeResponse(sampleType, fileName, response, elapsedMs, crashed = false, timeout = false) {
  const errorCode = response && response.error ? response.error.code : null;
  const confidence = response
    && response.recognition_result
    && response.recognition_result.quality_gate
    && response.recognition_result.quality_gate.confidence;
  const leakFlags = responseLeakFlags(response);
  return {
    file_name: fileName,
    sample_type: sampleType,
    success: response && response.ok === true,
    error_code: errorCode,
    error_category: classifyError(errorCode),
    has_recognition_result: !!(response && response.recognition_result),
    recognition_status: response && response.recognition_result
      ? response.recognition_result.status || null
      : null,
    confidence_present: Number.isFinite(confidence),
    provider: response && response.provider ? response.provider : null,
    leak_flags: leakFlags,
    crashed,
    timeout,
    elapsed_ms: elapsedMs,
  };
}

async function runOne(sampleType, filePath, overrides = {}) {
  const start = Date.now();
  const buffer = overrides.buffer || fs.readFileSync(filePath);
  const fileName = overrides.fileName || path.basename(filePath);
  try {
    const response = await runAnalyzeApi({
      request_id: overrides.requestId,
      anonymous_device_id: "anon_stage5q_local",
      locale: "zh-CN",
      image: {
        file_name: fileName,
        content_type: overrides.contentType || contentTypeFor(filePath),
        size_bytes: Number.isFinite(overrides.sizeBytes) ? overrides.sizeBytes : buffer.length,
        buffer,
        side: overrides.side || "unknown",
      },
    }, {
      env: overrides.env || process.env,
    });
    return summarizeResponse(sampleType, fileName, response, Date.now() - start);
  } catch (error) {
    return summarizeResponse(sampleType, fileName, null, Date.now() - start, true, false);
  }
}

async function assertMissingKeyIsStable(sampleFile) {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    throw new Error("fetch must not be called without a Qwen API key");
  };
  const buffer = fs.readFileSync(sampleFile);
  const response = await runAnalyzeApi({
    request_id: "req_stage5q_missing_key",
    anonymous_device_id: "anon_stage5q_local",
    locale: "zh-CN",
    image: {
      file_name: path.basename(sampleFile),
      content_type: contentTypeFor(sampleFile),
      size_bytes: buffer.length,
      buffer,
      side: "unknown",
    },
  }, {
    env: {
      PALMMI_VLM_PROVIDER: "qwen",
      PALMMI_VLM_MODE: "real-only",
    },
    fetchImpl,
  });
  assert.equal(response.ok, false);
  assert.equal(response.error.code, "VLM_API_KEY_MISSING");
  assert.equal(fetchCalls, 0);
  assert.deepEqual(responseLeakFlags(response), []);
  return summarizeResponse("missing-key-guard", path.basename(sampleFile), response, 0);
}

async function assertMockStillWorks(sampleFile) {
  const result = await runOne("mock-regression", sampleFile, {
    requestId: "req_stage5q_mock_regression",
    env: {
      PALMMI_VLM_PROVIDER: "mock",
      PALMMI_VLM_MODE: "mock-only",
    },
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.leak_flags, []);
  return result;
}

function syntheticBlankPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
}

async function main() {
  const imageDir = process.env.PALMMI_STAGE5Q_IMAGE_DIR || DEFAULT_IMAGE_DIR;
  const envStatus = {
    PALMMI_QWEN_API_KEY: envExists("PALMMI_QWEN_API_KEY"),
    QWEN_API_KEY: envExists("QWEN_API_KEY"),
    PALMMI_QWEN_MODEL: envExists("PALMMI_QWEN_MODEL"),
    QWEN_MODEL: envExists("QWEN_MODEL"),
    PALMMI_VLM_PROVIDER: envExists("PALMMI_VLM_PROVIDER"),
    PALMMI_VLM_MODE: envExists("PALMMI_VLM_MODE"),
  };
  const effectiveConfig = resolveProviderConfig(process.env, {});
  const imageFiles = listImageFiles(imageDir);

  if (!imageFiles) {
    console.log(JSON.stringify({
      stage: "5Q",
      blocked: true,
      blocker: "IMAGE_DIR_MISSING",
      image_dir_checked: imageDir,
      env_status: envStatus,
      effective_provider: effectiveConfig.provider,
      effective_mode: effectiveConfig.mode,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (imageFiles.length === 0) {
    console.log(JSON.stringify({
      stage: "5Q",
      blocked: true,
      blocker: "NO_IMAGE_FILES",
      image_dir_checked: imageDir,
      env_status: envStatus,
      effective_provider: effectiveConfig.provider,
      effective_mode: effectiveConfig.mode,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const guardResults = [
    await assertMissingKeyIsStable(imageFiles[0]),
    await assertMockStillWorks(imageFiles[0]),
  ];

  const realResults = [];
  const errorResults = [];
  let blocked = false;
  let blocker = null;

  if (!hasQwenKey()) {
    blocked = true;
    blocker = "VLM_API_KEY_MISSING";
  } else {
    if (effectiveConfig.provider !== "qwen" || effectiveConfig.mode === "mock-only") {
      blocked = true;
      blocker = "PROVIDER_MODE_NOT_QWEN_REAL";
    } else {
      const realSamples = imageFiles.slice(0, REAL_IMAGE_LIMIT);
      const first = await runOne("real-palm", realSamples[0], {
        requestId: "req_stage5q_real_001",
      });
      realResults.push(first);
      if (first.success) {
        for (let index = 1; index < realSamples.length; index += 1) {
          realResults.push(await runOne("real-palm", realSamples[index], {
            requestId: `req_stage5q_real_${String(index + 1).padStart(3, "0")}`,
          }));
        }

        errorResults.push(await runOne("unsupported-content-type", imageFiles[0], {
          requestId: "req_stage5q_error_unsupported",
          contentType: "text/plain",
        }));
        errorResults.push(await runOne("synthetic-non-palm", imageFiles[0], {
          requestId: "req_stage5q_error_blank_png",
          fileName: "synthetic-blank.png",
          contentType: "image/png",
          buffer: syntheticBlankPng(),
        }));
      }
    }
  }

  const allResults = [...guardResults, ...realResults, ...errorResults];
  const leakCount = allResults.filter((result) => result.leak_flags.length > 0).length;
  const crashCount = allResults.filter((result) => result.crashed).length;
  const realSuccessCount = realResults.filter((result) => result.success).length;
  const realFailureCount = realResults.length - realSuccessCount;

  const summary = {
    stage: "5Q",
    blocked,
    blocker,
    env_status: envStatus,
    effective_provider: effectiveConfig.provider,
    effective_mode: effectiveConfig.mode,
    image_dir_checked: imageDir,
    available_image_count: imageFiles.length,
    real_palm_tested_count: realResults.length,
    error_sample_tested_count: errorResults.length,
    real_success_count: realSuccessCount,
    real_failure_count: realFailureCount,
    leak_count: leakCount,
    crash_count: crashCount,
    missing_key_guard_passed: guardResults[0].error_code === "VLM_API_KEY_MISSING",
    mock_regression_passed: guardResults[1].success === true,
    results: allResults,
  };

  console.log(JSON.stringify(summary, null, 2));

  assert.equal(leakCount, 0);
  assert.equal(crashCount, 0);
  if (!blocked) {
    assert.ok(realSuccessCount >= 1, "at least one real palm image must complete the Qwen chain");
  }
}

main().catch((error) => {
  console.error(error && error.name ? error.name : "Stage5QError");
  process.exit(1);
});
