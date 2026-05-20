const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const stage5 = require(path.join(root, "scripts", "palmmi-stage5.js"));
const analyze = require(path.join(root, "scripts", "palmmi-analyze.js"));

function createMemoryStorage() {
  const values = new Map();
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

function file({ name = "palm.jpg", type = "image/jpeg", size = 1024 } = {}) {
  return { name, type, size };
}

function upload(overrides = {}) {
  return {
    schemaVersion: "stage4d_upload_v1",
    fileName: "palm.jpg",
    fileType: "image/jpeg",
    fileSize: 512000,
    fileSizeLabel: "500 KB",
    previewDataUrl: "data:image/jpeg;base64,stage5b",
    uploadedAt: "2026-05-18T00:00:00.000Z",
    handSide: null,
    ...overrides,
  };
}

assert.equal(stage5.DEVICE_ID_STORAGE_KEY, "palmmi:anonymousDeviceId");
assert.equal(stage5.ANALYSIS_RESULT_STORAGE_KEY, "palmmi:lastAnalysisResult");
assert.equal(stage5.ANALYZE_ERROR_STORAGE_KEY, "palmmi:lastAnalyzeError");
assert.equal(stage5.MAX_IMAGE_BYTES, 8 * 1024 * 1024);

{
  const storage = createMemoryStorage();
  const first = stage5.getOrCreateAnonymousDeviceId(storage, {
    now: () => 1770000000000,
    randomString: () => "abc123",
  });
  const second = stage5.getOrCreateAnonymousDeviceId(storage, {
    now: () => 1880000000000,
    randomString: () => "changed",
  });

  assert.deepEqual(first, {
    ok: true,
    anonymous_device_id: "pm_1770000000000_abc123",
    created: true,
  });
  assert.equal(second.ok, true);
  assert.equal(second.anonymous_device_id, "pm_1770000000000_abc123");
  assert.equal(second.created, false);
}

{
  assert.equal(stage5.validateAnalyzeImage(null).ok, false);
  assert.equal(stage5.validateAnalyzeImage(null).error.code, "FILE_MISSING");

  const unsupported = stage5.validateAnalyzeImage(file({ type: "text/plain" }));
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.error.code, "FILE_TYPE_UNSUPPORTED");

  const empty = stage5.validateAnalyzeImage(file({ size: 0 }));
  assert.equal(empty.ok, false);
  assert.equal(empty.error.code, "FILE_EMPTY");

  const tooLarge = stage5.validateAnalyzeImage(file({ size: stage5.MAX_IMAGE_BYTES + 1 }));
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error.code, "FILE_TOO_LARGE");

  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const accepted = stage5.validateAnalyzeImage(file({ type, size: stage5.MAX_IMAGE_BYTES }));
    assert.equal(accepted.ok, true);
    assert.equal(accepted.image.content_type, type);
  }
}

async function main() {
  {
    const provider = new stage5.MockVlmProvider({ latencyMs: 12 });
    const output = await provider.analyze({
      request_id: "req_test",
      anonymous_device_id: "pm_test",
      image: {
        content_type: "image/jpeg",
        size_bytes: 1024,
      },
      locale: "zh-CN",
      timeout_ms: 8000,
    });

    assert.equal(output.request_id, "req_test");
    assert.equal(output.provider, "mock");
    assert.equal(output.status, "OK");
    assert.equal(output.quality.palm_detected, true);
    assert.equal(output.quality.confidence, 0.86);
    assert.equal(output.features.schema_version, "palm_features.v1");
    assert.equal(output.features.major_lines.life_line.visibility, "clear");
    assert.equal(output.raw_provider.provider, "mock");
    assert.ok(output.warnings.includes("MOCK_PROVIDER_ONLY"));
    assert.ok(output.notes.some((note) => /Stage 5B/.test(note)));
  }

  {
    const sessionStorage = createMemoryStorage();
    const localStorage = createMemoryStorage();
    const response = await stage5.runAnalyzeSkeleton({
      upload: upload(),
      sessionStorage,
      localStorage,
      now: () => 1770000000000,
      randomString: () => "device",
      requestId: () => "req_success",
      provider: new stage5.MockVlmProvider({ latencyMs: 0 }),
    });

    assert.equal(response.ok, true);
    assert.equal(response.request_id, "req_success");
    assert.equal(response.provider_output.provider, "mock");
    assert.equal(response.recognition_result.status, "SUCCESS");
    assert.equal(response.recognition_result.anonymous_device_id, "pm_1770000000000_device");
    assert.equal(response.recognition_result.provider_meta.provider, "mock");

    const saved = JSON.parse(sessionStorage.getItem(stage5.ANALYSIS_RESULT_STORAGE_KEY));
    assert.equal(saved.schema.name, "palmmi.recognition_result");
    assert.equal(saved.schema.version, "stage5b.v1");
    assert.equal(saved.debug.mock_vlm_used, true);
    assert.equal(saved.primary_persona.id, "STAGE5B_MOCK_PERSONA");
    assert.equal(Object.prototype.hasOwnProperty.call(saved, "raw_provider"), false);
    assert.equal(sessionStorage.getItem(stage5.ANALYZE_ERROR_STORAGE_KEY), null);
  }

  {
    const response = await stage5.runAnalyzeSkeleton({
      upload: upload({ fileType: "text/plain" }),
      sessionStorage: createMemoryStorage(),
      localStorage: createMemoryStorage(),
      now: () => 1770000000000,
      randomString: () => "device",
      requestId: () => "req_error",
    });

    assert.equal(response.ok, false);
    assert.equal(response.request_id, "req_error");
    assert.equal(response.error.code, "FILE_TYPE_UNSUPPORTED");
    assert.equal(response.status, "RETRY_REQUIRED");
    assert.equal(response.error.retryable, true);
  }

  {
    const response = await stage5.runAnalyzeSkeleton({
      upload: upload(),
      sessionStorage: createMemoryStorage(),
      localStorage: null,
      requestId: () => "req_no_device",
    });

    assert.equal(response.ok, false);
    assert.equal(response.error.code, "DEVICE_ID_UNAVAILABLE");
  }

  {
    const sessionStorage = createMemoryStorage();
    const localStorage = createMemoryStorage();
    const response = await analyze.runStage5BAnalysis(upload(), {
      stage5Api: stage5,
      storage: sessionStorage,
      localStorage,
      now: () => 1770000000000,
      randomString: () => "device",
      requestId: () => "req_analyze_entry",
      provider: new stage5.MockVlmProvider({ latencyMs: 0 }),
    });

    assert.equal(response.ok, true);
    assert.equal(response.recognition_result.request_id, "req_analyze_entry");
    assert.equal(JSON.parse(sessionStorage.getItem(stage5.ANALYSIS_RESULT_STORAGE_KEY)).request_id, "req_analyze_entry");
  }

  {
    const analyzeHtml = fs.readFileSync(path.join(root, "analyze", "index.html"), "utf8");
    assert.match(analyzeHtml, /scripts\/palmmi-stage5\.js/);
    assert.ok(
      analyzeHtml.indexOf("scripts/palmmi-stage5.js") < analyzeHtml.indexOf("scripts/palmmi-analyze.js"),
      "Stage 5 module should load before the analyze page script"
    );
  }

  console.log("Stage 5B skeleton tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
