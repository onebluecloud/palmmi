const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  normalizeVlmToPalmFeatureSet,
} = require(path.join(root, "src", "stage5", "normalize-vlm-to-palm-feature-set.js"));

function assertNoForbiddenPersonalityOutput(value) {
  const forbiddenKeys = new Set(["personality", "typeId", "archetype"]);
  const forbiddenText = [
    "finalAnalysis",
    "analysisText",
    "人生排位赛选手",
    "目标感整理者",
    "节奏规划者",
    ...Array.from({ length: 36 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`),
  ];

  function walk(node) {
    if (!node || typeof node !== "object") {
      if (typeof node === "string") {
        for (const text of forbiddenText) {
          assert.equal(
            node.includes(text),
            false,
            `PalmFeatureSet must not contain forbidden personality text: ${text}`
          );
        }
      }
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      assert.equal(
        forbiddenKeys.has(key),
        false,
        `PalmFeatureSet must not contain forbidden key: ${key}`
      );
      walk(child);
    }
  }

  walk(value);
}

function mockProviderResult() {
  return {
    provider: "mock",
    model: "stage5c-mock-vlm",
    ok: true,
    rawText: JSON.stringify({
      personality: "P01",
      finalAnalysis: "人生排位赛选手",
    }),
    parsed: {
      isValidPalmImage: true,
      majorLines: {
        lifeLine: {
          visibility: "clear",
          length: "long",
          depth: "medium",
          trend: "curved around thumb base",
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
          length: "medium",
          depth: "shallow",
          trend: "vertical",
          confidence: 0.62,
        },
      },
      palmShape: {
        palmWidth: "medium",
        fingerProportion: "medium",
        confidence: 0.8,
      },
      visibleFeatures: ["life line", "head line", "heart line", "faint fate line"],
      uncertainty: [],
      confidence: 0.86,
    },
  };
}

async function main() {
  {
    const featureSet = normalizeVlmToPalmFeatureSet(mockProviderResult());

    assert.equal(featureSet.schemaVersion, "palm-feature-set.v1");
    assert.equal(featureSet.hand.side, "unknown");
    assert.equal(featureSet.hand.orientation, "palm");
    assert.equal(featureSet.imageQuality.usable, true);
    assert.equal(featureSet.majorLines.lifeLine.visible, true);
    assert.equal(featureSet.majorLines.lifeLine.length, "long");
    assert.equal(featureSet.majorLines.lifeLine.depth, "medium");
    assert.equal(featureSet.majorLines.lifeLine.breaks, "none");
    assert.equal(featureSet.majorLines.headLine.slope, "downward");
    assert.equal(featureSet.majorLines.fateLine.visible, true);
    assert.equal(featureSet.majorLines.fateLine.strength, "weak");
    assert.equal(featureSet.palmShape.palmWidth, "medium");
    assert.equal(featureSet.palmShape.fingerLength, "medium");
    assert.equal(featureSet.specialMarks.branches, "few");
    assert.equal(featureSet.rawProvider.provider, "mock");
    assert.equal(featureSet.rawProvider.model, "stage5c-mock-vlm");
    assert.equal(featureSet.rawProvider.requestId, null);
    assertNoForbiddenPersonalityOutput(featureSet);
  }

  {
    const qwenRaw = {
      id: "chatcmpl-test-request",
      choices: [
        {
          message: {
            content: "```json\n{\"hand\":{\"side\":\"right\",\"orientation\":\"palm\",\"confidence\":0.91},\"imageQuality\":{\"usable\":true,\"reasons\":[\"minor crop\"],\"brightness\":\"normal\",\"blur\":\"low\",\"occlusion\":\"partial\",\"confidence\":0.74},\"majorLines\":{\"lifeLine\":{\"visible\":true,\"length\":\"medium\",\"depth\":\"deep\",\"curvature\":\"high\",\"breaks\":\"minor\",\"confidence\":0.88},\"headLine\":{\"visible\":true,\"length\":\"long\",\"depth\":\"medium\",\"slope\":\"flat\",\"breaks\":\"none\",\"confidence\":0.8},\"heartLine\":{\"visible\":true,\"length\":\"short\",\"depth\":\"shallow\",\"curvature\":\"low\",\"ending\":\"under_middle\",\"confidence\":0.66},\"fateLine\":{\"visible\":false,\"strength\":\"unknown\",\"continuity\":\"unknown\",\"confidence\":0.2}},\"palmShape\":{\"palmWidth\":\"wide\",\"palmLength\":\"long\",\"fingerLength\":\"short\",\"confidence\":0.7},\"specialMarks\":{\"crosses\":\"few\",\"islands\":\"many\",\"branches\":\"none\",\"confidence\":0.64},\"personality\":\"P36\",\"archetype\":\"目标感整理者\"}\n```",
          },
        },
      ],
    };

    const featureSet = normalizeVlmToPalmFeatureSet(qwenRaw, {
      provider: "qwen",
      model: "qwen3.6-flash",
    });

    assert.equal(featureSet.hand.side, "right");
    assert.equal(featureSet.hand.orientation, "palm");
    assert.equal(featureSet.hand.confidence, 0.91);
    assert.equal(featureSet.imageQuality.usable, true);
    assert.deepEqual(featureSet.imageQuality.reasons, ["minor crop"]);
    assert.equal(featureSet.majorLines.heartLine.ending, "under_middle");
    assert.equal(featureSet.palmShape.palmWidth, "wide");
    assert.equal(featureSet.specialMarks.islands, "many");
    assert.equal(featureSet.rawProvider.provider, "qwen");
    assert.equal(featureSet.rawProvider.model, "qwen3.6-flash");
    assert.equal(featureSet.rawProvider.requestId, "chatcmpl-test-request");
    assertNoForbiddenPersonalityOutput(featureSet);
  }

  {
    const featureSet = normalizeVlmToPalmFeatureSet({}, {
      provider: "qwen",
      model: "qwen3-vl-flash",
    });

    assert.equal(featureSet.schemaVersion, "palm-feature-set.v1");
    assert.equal(featureSet.hand.side, "unknown");
    assert.equal(featureSet.hand.orientation, "unknown");
    assert.equal(featureSet.hand.confidence, 0);
    assert.equal(featureSet.imageQuality.usable, false);
    assert.deepEqual(featureSet.imageQuality.reasons, []);
    assert.equal(featureSet.majorLines.lifeLine.visible, false);
    assert.equal(featureSet.majorLines.lifeLine.length, "unknown");
    assert.equal(featureSet.majorLines.headLine.slope, "unknown");
    assert.equal(featureSet.majorLines.heartLine.ending, "unknown");
    assert.equal(featureSet.majorLines.fateLine.continuity, "unknown");
    assert.equal(featureSet.palmShape.palmLength, "unknown");
    assert.equal(featureSet.specialMarks.crosses, "unknown");
    assert.equal(featureSet.rawProvider.provider, "qwen");
  }

  {
    const featureSet = normalizeVlmToPalmFeatureSet({
      provider: "mock",
      model: "bad-confidence",
      parsed: {
        isValidPalmImage: true,
        confidence: 2,
        majorLines: {
          lifeLine: { visibility: "clear", confidence: -3 },
          headLine: { visibility: "clear", confidence: "not-a-number" },
          heartLine: { visibility: "clear", confidence: 1.5 },
        },
        minorLines: {
          fateLine: { visibility: "clear", confidence: 0.4 },
        },
        palmShape: { confidence: 4 },
      },
    });

    assert.equal(featureSet.imageQuality.confidence, 1);
    assert.equal(featureSet.majorLines.lifeLine.confidence, 0);
    assert.equal(featureSet.majorLines.headLine.confidence, 0);
    assert.equal(featureSet.majorLines.heartLine.confidence, 1);
    assert.equal(featureSet.majorLines.fateLine.confidence, 0.4);
    assert.equal(featureSet.palmShape.confidence, 1);
  }

  {
    const cacheBefore = Object.keys(require.cache);
    normalizeVlmToPalmFeatureSet(mockProviderResult());
    const cacheAfter = Object.keys(require.cache).filter((entry) => !cacheBefore.includes(entry));

    assert.equal(
      cacheAfter.some((entry) => entry.includes(`${path.sep}tests${path.sep}stage4${path.sep}`)),
      false,
      "Stage 5D normalizer must not load Stage 4 tests"
    );
    assert.equal(
      cacheAfter.some((entry) => /palmmi-(analyze|result|poster)\.js$/.test(entry)),
      false,
      "Stage 5D normalizer must not depend on Stage 4 page scripts"
    );
  }

  console.log("Stage 5D PalmFeatureSet tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
