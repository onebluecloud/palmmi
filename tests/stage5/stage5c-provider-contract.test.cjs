const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const stage5c = require(path.join(root, "scripts", "palmmi-stage5c-runner.js"));

async function main() {
  assert.deepEqual(stage5c.listProviderNames(), [
    "mock",
    "qwen",
    "doubao",
    "glm",
    "gemini",
    "openai",
  ]);

  {
    const provider = stage5c.createProvider("mock", { model: "stage5c-mock-test" });
    const result = await provider.analyzePalmImage({
      imagePath: "fixture.jpg",
      imageBuffer: Buffer.from("mock image bytes"),
      mimeType: "image/jpeg",
      side: "unknown",
      handLabel: "real-human-palm",
      sampleId: "sample-001",
      metadata: { source: "test" },
    });

    assert.equal(result.provider, "mock");
    assert.equal(result.model, "stage5c-mock-test");
    assert.equal(result.ok, true);
    assert.equal(result.parsed.isValidPalmImage, true);
    assert.equal(result.parsed.majorLines.lifeLine.visibility, "clear");
    assert.equal(result.parsed.confidence, 0.86);
    assert.ok(Array.isArray(result.warnings));
    assert.equal(typeof result.latencyMs, "number");
    assert.equal(result.costHint, null);
  }

  {
    const provider = stage5c.createProvider("qwen", {
      env: { PALMMI_QWEN_MODEL: "qwen3-vl-flash" },
    });
    const result = await provider.analyzePalmImage({
      imagePath: "fixture.jpg",
      imageBuffer: Buffer.from("mock image bytes"),
      mimeType: "image/jpeg",
      side: "unknown",
      handLabel: "real-human-palm",
      sampleId: "sample-002",
      metadata: {},
    });

    assert.equal(result.provider, "qwen");
    assert.equal(result.model, "qwen3-vl-flash");
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "API_KEY_MISSING");
    assert.match(result.errorMessage, /PALMMI_QWEN_API_KEY/);
    assert.equal(typeof result.latencyMs, "number");
  }

  {
    const provider = stage5c.createProvider("qwen", {
      env: {
        PALMMI_QWEN_API_KEY: "test-key",
        PALMMI_QWEN_MODEL: "qwen3-vl-flash",
      },
      fetch: async (url, options) => {
        const body = JSON.parse(options.body);
        assert.match(String(url), /dashscope\.aliyuncs\.com/);
        assert.equal(options.headers.Authorization, "Bearer test-key");
        assert.equal(body.model, "qwen3-vl-flash");
        assert.equal(body.messages[0].content[1].type, "image_url");
        assert.match(body.messages[0].content[1].image_url.url, /^data:image\/jpeg;base64,/);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    isValidPalmImage: true,
                    majorLines: { lifeLine: { visibility: "clear" } },
                    minorLines: { fateLine: { visibility: "faint" } },
                    palmShape: { shapeHint: "rectangular" },
                    visibleFeatures: ["life line visible"],
                    uncertainty: [],
                    confidence: 0.72,
                  }),
                },
              },
            ],
          }),
        };
      },
    });

    const result = await provider.analyzePalmImage({
      imagePath: "fixture.jpg",
      imageBuffer: Buffer.from("mock image bytes"),
      mimeType: "image/jpeg",
      side: "unknown",
      handLabel: "real-human-palm",
      sampleId: "sample-003",
      metadata: {},
    });

    assert.equal(result.provider, "qwen");
    assert.equal(result.ok, true);
    assert.equal(result.parsed.isValidPalmImage, true);
    assert.equal(result.parsed.confidence, 0.72);
    assert.equal(result.rawText.includes("isValidPalmImage"), true);
  }

  {
    const provider = stage5c.createProvider("not-a-provider");
    const result = await provider.analyzePalmImage({
      imagePath: "fixture.jpg",
      imageBuffer: Buffer.from("mock image bytes"),
      mimeType: "image/jpeg",
      side: "unknown",
      handLabel: "real-human-palm",
      sampleId: "sample-004",
      metadata: {},
    });

    assert.equal(result.provider, "not-a-provider");
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "NOT_IMPLEMENTED");
    assert.match(result.errorMessage, /Unknown provider/);
  }

  console.log("Stage 5C provider contract tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
