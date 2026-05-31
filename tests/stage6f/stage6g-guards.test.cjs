const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

function syntheticPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
}

function qwenChatResponse(payload) {
  return new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify(payload),
        },
      },
    ],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function validQwenPayload() {
  return {
    validity: {
      is_palm_photo: true,
      is_single_hand: true,
      is_palm_side_visible: true,
      palm_lines_visible: true,
      image_quality: "clear",
      reject_reason: "",
    },
    palm_features: {
      main_line_type: "M2",
      line_depth: "deep",
      line_complexity: "medium",
      line_continuity: "continuous",
      branch_density: "medium",
      palm_shape_hint: "long",
      visible_features: ["clear major palm lines"],
      confidence: 0.82,
      feature_reasons: ["Major palm lines are visible enough for local classification."],
    },
    majorLines: {
      lifeLine: { visibility: "clear", depth: "deep", branches: "few", breaks: "none", confidence: 0.82 },
      headLine: { visibility: "clear", depth: "deep", slope: "flat", branches: "few", breaks: "none", confidence: 0.82 },
      heartLine: { visibility: "clear", depth: "medium", branches: "few", breaks: "none", confidence: 0.82 },
    },
    minorLines: {
      fateLine: { visibility: "clear", strength: "medium", continuity: "continuous", confidence: 0.7 },
    },
    palmShape: {
      palmWidth: "medium",
      palmLength: "long",
      fingerLength: "medium",
      shapeHint: "long",
      confidence: 0.78,
    },
    result: null,
    candidate_hints: [],
  };
}

function validAnalyzePayload(overrides = {}) {
  const imageBuffer = syntheticPngBuffer();
  return {
    request_id: overrides.request_id || "req_stage6g_guard",
    anonymous_device_id: overrides.anonymous_device_id || "anon_stage6g_guard",
    locale: "zh-CN",
    image: {
      file_name: overrides.file_name || "stage6g-duplicate.png",
      content_type: overrides.content_type || "image/png",
      size_bytes: Number.isFinite(overrides.size_bytes) ? overrides.size_bytes : imageBuffer.length,
      buffer: overrides.buffer === undefined ? imageBuffer : overrides.buffer,
      base64: overrides.base64 || "",
      side: "unknown",
    },
  };
}

async function testDuplicateImageDoesNotCallProviderTwice() {
  const { runAnalyzeApi, resetStage6GCostGuardForTests } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  resetStage6GCostGuardForTests();

  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6g-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return qwenChatResponse(validQwenPayload());
  };

  const first = await runAnalyzeApi(validAnalyzePayload({ request_id: "req_stage6g_duplicate_first" }), {
    env,
    fetchImpl,
    nowMs: () => 1000,
  });
  assert.equal(first.ok, true, "first valid palm request should still analyze normally");
  assert.equal(fetchCount, 2, "first valid palm request should use the existing two Qwen stages");

  const second = await runAnalyzeApi(validAnalyzePayload({ request_id: "req_stage6g_duplicate_second" }), {
    env,
    fetchImpl,
    nowMs: () => 2000,
  });
  assert.equal(second.ok, false, "duplicate valid palm request should be rejected before provider");
  assert.equal(second.error.code, "DUPLICATE_SUBMISSION");
  assert.equal(fetchCount, 2, "duplicate request must not call provider again");

  return {
    status: "PASS",
    first_fetch_count: 2,
    second_fetch_count: fetchCount,
    duplicate_error_code: second.error.code,
  };
}

async function testInvalidInputsDoNotCallProvider() {
  const { runAnalyzeApi, resetStage6GCostGuardForTests } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  resetStage6GCostGuardForTests();

  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6g-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    throw new Error("provider should not be called for invalid input");
  };

  const empty = await runAnalyzeApi({}, { env, fetchImpl });
  const nonImage = await runAnalyzeApi(validAnalyzePayload({
    request_id: "req_stage6g_non_image",
    content_type: "text/plain",
    file_name: "not-image.txt",
  }), { env, fetchImpl });
  const tooLarge = await runAnalyzeApi(validAnalyzePayload({
    request_id: "req_stage6g_too_large",
    size_bytes: 8 * 1024 * 1024 + 1,
  }), { env, fetchImpl });
  const oversizedBase64 = await runAnalyzeApi(validAnalyzePayload({
    request_id: "req_stage6g_oversized_base64",
    size_bytes: 1024,
    buffer: null,
    base64: "a".repeat(12 * 1024 * 1024),
  }), { env, fetchImpl });

  assert.equal(fetchCount, 0, "invalid inputs must be rejected before provider");
  assert.equal(empty.error.code, "FILE_TYPE_UNSUPPORTED");
  assert.equal(nonImage.error.code, "FILE_TYPE_UNSUPPORTED");
  assert.equal(tooLarge.error.code, "FILE_TOO_LARGE");
  assert.equal(oversizedBase64.error.code, "FILE_TOO_LARGE");

  return {
    status: "PASS",
    fetch_count: fetchCount,
    empty_code: empty.error.code,
    non_image_code: nonImage.error.code,
    too_large_code: tooLarge.error.code,
    oversized_base64_code: oversizedBase64.error.code,
  };
}

function testNetworkFailedUserMessage() {
  const upload = require(path.join(root, "scripts", "palmmi-upload.js"));
  const apiClient = require(path.join(root, "scripts", "palmmi-analyze-api-client.js"));
  const result = upload.createAnalyzeErrorResult("NETWORK_FAILED");

  assert.equal(result.ok, false);
  assert.equal(result.code, "NETWORK_FAILED");
  assert.match(result.message, /网络|连接|稍后/);
  assert.doesNotMatch(result.message, /TypeError|stack|fetch failed/i);

  return apiClient.callAnalyzeApi({
    upload: {
      fileName: "network-failed.jpg",
      fileType: "image/jpeg",
      fileSize: syntheticPngBuffer().length,
      previewDataUrl: "data:image/jpeg;base64,ZmFrZQ==",
    },
    anonymousDeviceId: "anon_stage6g_network_failed",
    endpoint: "/api/analyze",
    requestId: "req_stage6g_network_failed",
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  }).then((response) => {
    assert.equal(response.ok, false);
    assert.equal(response.error.code, "NETWORK_FAILED");
    assert.match(response.error.message, /网络|连接/);
    assert.doesNotMatch(response.error.message, /TypeError|stack|fetch failed/i);
    return {
      status: "PASS",
      code: result.code,
      api_client_code: response.error.code,
    };
  });
}

async function runStage6GGuardTests() {
  return {
    duplicate_image: await testDuplicateImageDoesNotCallProviderTwice(),
    invalid_inputs: await testInvalidInputsDoNotCallProvider(),
    network_failed_message: await testNetworkFailedUserMessage(),
  };
}

if (require.main === module) {
  runStage6GGuardTests()
    .then((summary) => {
      console.log(JSON.stringify({
        stage: "6G",
        ok: true,
        ...summary,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : error);
      process.exit(1);
    });
}

module.exports = {
  runStage6GGuardTests,
};
