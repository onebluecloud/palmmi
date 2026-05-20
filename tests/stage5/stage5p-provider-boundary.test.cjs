const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  createVlmProvider,
  resolveProviderConfig,
} = require(path.join(root, "server", "stage5p", "provider-selection.js"));
const {
  QwenVlmProvider,
} = require(path.join(root, "server", "stage5p", "providers", "qwen-vlm-provider.js"));
const {
  runAnalyzeApi,
} = require(path.join(root, "server", "stage5p", "analyze-service.js"));
const apiAnalyze = require(path.join(root, "api", "analyze.js"));

function image(overrides = {}) {
  return {
    file_name: "palm.jpg",
    content_type: "image/jpeg",
    size_bytes: 16,
    base64: Buffer.from("stage5p-test-image").toString("base64"),
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    request_id: "req_stage5p",
    anonymous_device_id: "pm_stage5p",
    image: image(),
    locale: "zh-CN",
    ...overrides,
  };
}

function assertNoSensitiveOutput(value) {
  const json = JSON.stringify(value);
  for (const forbidden of [
    "provider_output",
    "raw_provider",
    "raw_response",
    "rawText",
    "choices",
    "Authorization",
    "PALMMI_QWEN_API_KEY",
    "QWEN_API_KEY",
    "TEST_QWEN_KEY_PLACEHOLDER",
    "recognition_result.debug",
    "PalmFeatureSet",
    "RuleInput",
    "RecognitionResult",
    "AnalysisInput",
  ]) {
    assert.equal(json.includes(forbidden), false, `response must not expose ${forbidden}`);
  }
}

function fakeQwenFetch() {
  let calls = 0;
  const fetchImpl = async (_url, init) => {
    calls += 1;
    assert.equal(init.method, "POST");
    assert.equal(typeof init.headers.Authorization, "string");
    assert.ok(init.headers.Authorization.endsWith("TEST_QWEN_KEY_PLACEHOLDER"));
    assert.doesNotMatch(init.body, /TEST_QWEN_KEY_PLACEHOLDER/);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  isValidPalmImage: true,
                  majorLines: {
                    lifeLine: {
                      visibility: "clear",
                      length: "long",
                      depth: "medium",
                      trend: "curved",
                      breaks: "none",
                      branches: "few",
                      islands: "none",
                      confidence: 0.86,
                    },
                    headLine: {
                      visibility: "clear",
                      length: "long",
                      depth: "medium",
                      trend: "slightly downward",
                      breaks: "none",
                      branches: "few",
                      islands: "none",
                      confidence: 0.84,
                    },
                    heartLine: {
                      visibility: "clear",
                      length: "medium",
                      depth: "medium",
                      trend: "curved",
                      breaks: "none",
                      branches: "few",
                      islands: "none",
                      confidence: 0.82,
                    },
                  },
                  minorLines: {
                    fateLine: {
                      visibility: "faint",
                      depth: "shallow",
                      breaks: "minor",
                      confidence: 0.62,
                    },
                  },
                  palmShape: {
                    shapeHint: "rectangular",
                    palmWidth: "medium",
                    fingerProportion: "medium",
                    confidence: 0.8,
                  },
                  visibleFeatures: ["life line", "head line", "heart line"],
                  uncertainty: [],
                  confidence: 0.86,
                }),
              },
            },
          ],
        });
      },
    };
  };
  fetchImpl.callCount = () => calls;
  return fetchImpl;
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

async function main() {
  {
    const config = resolveProviderConfig({
      PALMMI_VLM_PROVIDER: "",
      PALMMI_VLM_MODE: "",
    });
    assert.equal(config.provider, "mock");
    assert.equal(config.mode, "mock-only");
    assert.equal(config.timeoutMs, 60000);
    assert.equal(config.maxImageBytes, 8388608);
  }

  {
    const env = new Proxy(
      { PALMMI_VLM_PROVIDER: "mock", PALMMI_VLM_MODE: "mock-only" },
      {
        get(target, key) {
          if (String(key).includes("QWEN")) {
            throw new Error("mock provider must not read Qwen key env vars");
          }
          return target[key];
        },
      }
    );
    const provider = createVlmProvider({ env });
    assert.equal(provider.name, "mock");
    const providerResult = await provider.analyze({
      request_id: "req_mock_provider",
      image: image(),
    });
    assert.equal(providerResult.ok, true);
    assert.equal(providerResult.provider, "mock");
  }

  {
    const fetchImpl = fakeQwenFetch();
    const provider = createVlmProvider({
      env: {
        PALMMI_VLM_PROVIDER: "qwen",
        PALMMI_QWEN_API_KEY: "",
      },
      fetchImpl,
    });
    assert.equal(provider.name, "qwen");
    const providerResult = await provider.analyze({
      request_id: "req_missing_key",
      image: image(),
    });
    assert.equal(providerResult.ok, false);
    assert.equal(providerResult.error.code, "VLM_API_KEY_MISSING");
    assert.equal(fetchImpl.callCount(), 0);
    assertNoSensitiveOutput(providerResult);
  }

  {
    const fetchImpl = fakeQwenFetch();
    const provider = new QwenVlmProvider({
      env: {
        PALMMI_QWEN_API_KEY: "TEST_QWEN_KEY_PLACEHOLDER",
      },
      model: "qwen-stage5p-test",
      fetchImpl,
      timeoutMs: 1000,
    });
    const providerResult = await provider.analyze({
      request_id: "req_fake_qwen",
      image: image(),
    });
    assert.equal(providerResult.ok, true);
    assert.equal(providerResult.provider, "qwen");
    assert.equal(providerResult.model, "qwen-stage5p-test");
    assert.equal(providerResult.status, "OK");
    assert.equal(providerResult.parsed.isValidPalmImage, true);
    assert.equal(fetchImpl.callCount(), 1);
    assertNoSensitiveOutput(providerResult);
  }

  {
    const response = await runAnalyzeApi(request(), {
      env: {
        PALMMI_VLM_PROVIDER: "mock",
        PALMMI_VLM_MODE: "mock-only",
      },
    });
    assert.equal(response.ok, true);
    assert.equal(response.provider, "mock");
    assert.ok(["SUCCESS", "LOW_CONFIDENCE"].includes(response.recognition_result.status));
    assert.equal(response.analysis_result.schemaVersion, "analysis-result.v1");
    assert.equal(response.recognition_result.debug, undefined);
    assert.equal(response.recognition_result.analysis_input, undefined);
    assert.equal(response.provider_output, undefined);
    assertNoSensitiveOutput(response);
  }

  {
    const fetchImpl = fakeQwenFetch();
    const response = await runAnalyzeApi(request({ request_id: "req_qwen_missing_key" }), {
      env: {
        PALMMI_VLM_PROVIDER: "qwen",
        PALMMI_VLM_MODE: "real-only",
      },
      fetchImpl,
    });
    assert.equal(response.ok, false);
    assert.equal(response.error.code, "VLM_API_KEY_MISSING");
    assert.equal(fetchImpl.callCount(), 0);
    assertNoSensitiveOutput(response);
  }

  {
    const fetchImpl = fakeQwenFetch();
    const response = await runAnalyzeApi(request({ request_id: "req_qwen_fake_success" }), {
      env: {
        PALMMI_VLM_PROVIDER: "qwen",
        PALMMI_VLM_MODE: "real-only",
        PALMMI_QWEN_API_KEY: "TEST_QWEN_KEY_PLACEHOLDER",
        PALMMI_QWEN_MODEL: "qwen-stage5p-test",
      },
      fetchImpl,
    });
    assert.equal(response.ok, true);
    assert.equal(response.provider, "qwen");
    assert.equal(response.recognition_result.provider_meta.provider, "qwen");
    assert.equal(response.analysis_result.trace.provider, "qwen");
    assert.equal(response.provider_output, undefined);
    assertNoSensitiveOutput(response);
  }

  {
    const response = await runAnalyzeApi(request({
      request_id: "req_too_large",
      image: image({ size_bytes: 8388609 }),
    }), {
      env: {
        PALMMI_VLM_PROVIDER: "mock",
        PALMMI_VLM_MAX_IMAGE_BYTES: "8388608",
      },
    });
    assert.equal(response.ok, false);
    assert.equal(response.error.code, "FILE_TOO_LARGE");
  }

  {
    const response = await runAnalyzeApi(request({
      request_id: "req_unsupported",
      image: image({ content_type: "text/plain" }),
    }), {
      env: {
        PALMMI_VLM_PROVIDER: "mock",
      },
    });
    assert.equal(response.ok, false);
    assert.equal(response.error.code, "FILE_TYPE_UNSUPPORTED");
  }

  {
    assert.equal(typeof apiAnalyze.runAnalyzeApi, "function");
    assert.equal(typeof apiAnalyze.handleAnalyzeRequest, "function");
  }

  {
    const envExample = readSource(".env.example");
    for (const name of [
      "PALMMI_VLM_PROVIDER=mock",
      "PALMMI_VLM_MODE=mock-only",
      "PALMMI_QWEN_API_KEY=",
      "PALMMI_QWEN_MODEL=qwen3-vl-flash",
      "PALMMI_VLM_TIMEOUT_MS=60000",
      "PALMMI_VLM_MAX_IMAGE_BYTES=8388608",
      "QWEN_API_KEY=",
      "QWEN_MODEL=",
      "VLM_TIMEOUT_MS=60000",
      "VLM_MAX_IMAGE_BYTES=8388608",
    ]) {
      assert.ok(envExample.includes(name), `.env.example should contain ${name}`);
    }
    assert.doesNotMatch(envExample, /sk-[A-Za-z0-9_-]+/);
    assert.doesNotMatch(envExample, /Bearer\s+\S+/);
    assert.match(envExample, /^PALMMI_QWEN_API_KEY=\s*$/m);
    assert.match(envExample, /^QWEN_API_KEY=\s*$/m);
  }

  {
    const frontendSources = [
      "index.html",
      "upload/index.html",
      "analyze/index.html",
      "result/index.html",
      "poster/index.html",
      "scripts/palmmi-upload.js",
      "scripts/palmmi-analyze.js",
      "scripts/palmmi-stage5.js",
      "scripts/palmmi-result.js",
      "scripts/palmmi-poster.js",
    ].map(readSource).join("\n");
    assert.doesNotMatch(frontendSources, /QWEN_API_KEY|PALMMI_QWEN_API_KEY/);
    assert.doesNotMatch(frontendSources, /dashscope\.aliyuncs\.com|compatible-mode\/v1\/chat\/completions/i);
  }

  {
    const resultPosterSources = [
      "result/index.html",
      "poster/index.html",
      "scripts/palmmi-result.js",
      "scripts/palmmi-poster.js",
    ].map(readSource).join("\n");
    assert.doesNotMatch(resultPosterSources, /\bfetch\s*\(/i);
    assert.doesNotMatch(resultPosterSources, /qwen|dashscope|QWEN_API_KEY|PALMMI_QWEN_API_KEY/i);
    assert.doesNotMatch(resultPosterSources, /provider_output|raw_provider|raw_response/);
  }

  console.log("Stage 5P provider boundary tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
