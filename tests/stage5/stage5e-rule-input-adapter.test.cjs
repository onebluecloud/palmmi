const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  FIELD_NAMES,
} = require(path.join(root, "lib", "recognition", "recognitionTypes.ts"));
const {
  matchPersona,
} = require(path.join(root, "lib", "recognition", "personaMatcher.ts"));
const {
  palmFeatureSetToRuleInput,
} = require(path.join(root, "src", "stage5", "palm-feature-set-to-rule-input.js"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fullPalmFeatureSet(overrides = {}) {
  return {
    schemaVersion: "palm-feature-set.v1",
    hand: {
      side: "right",
      orientation: "palm",
      confidence: 1.2,
    },
    imageQuality: {
      usable: true,
      reasons: ["minor crop"],
      brightness: "normal",
      blur: "low",
      occlusion: "partial",
      confidence: 0.82,
    },
    majorLines: {
      lifeLine: {
        visible: true,
        length: "long",
        depth: "deep",
        curvature: "high",
        breaks: "minor",
        confidence: 0.88,
      },
      headLine: {
        visible: true,
        length: "medium",
        depth: "shallow",
        slope: "downward",
        breaks: "none",
        confidence: -0.4,
      },
      heartLine: {
        visible: true,
        length: "short",
        depth: "medium",
        curvature: "low",
        ending: "under_middle",
        confidence: 2,
      },
      fateLine: {
        visible: true,
        strength: "strong",
        continuity: "continuous",
        confidence: 0.72,
      },
    },
    palmShape: {
      palmWidth: "wide",
      palmLength: "long",
      fingerLength: "medium",
      confidence: 0.67,
    },
    specialMarks: {
      crosses: "few",
      islands: "many",
      branches: "none",
      confidence: 0.44,
    },
    rawProvider: {
      provider: "qwen",
      model: "qwen3.6-flash",
      requestId: "req-stage5e-test",
    },
    ...overrides,
  };
}

function assertNoNaNOrUndefined(value) {
  function walk(node, trail) {
    assert.notEqual(node, undefined, `undefined at ${trail}`);
    if (typeof node === "number") {
      assert.equal(Number.isFinite(node), true, `non-finite number at ${trail}`);
      return;
    }
    if (!node || typeof node !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      walk(child, `${trail}.${key}`);
    }
  }
  walk(value, "$");
}

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
          assert.equal(node.includes(text), false, `forbidden personality text: ${text}`);
        }
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden key: ${key}`);
      walk(child);
    }
  }

  walk(value);
}

async function main() {
  {
    const input = fullPalmFeatureSet();
    const before = clone(input);
    const ruleInput = palmFeatureSetToRuleInput(input, {
      source: "vlm",
      provider: "qwen",
      model: "qwen3.6-flash",
      strict: false,
    });

    assert.deepEqual(input, before, "adapter must not mutate PalmFeatureSet");
    assert.equal(ruleInput.schemaVersion, "rule-input.v1");
    assert.equal(ruleInput.source, "palm-feature-set");
    assert.equal(ruleInput.features.handSide, "right");
    assert.equal(ruleInput.features.lifeLine.visible, true);
    assert.equal(ruleInput.features.lifeLine.lengthScore, 1);
    assert.equal(ruleInput.features.lifeLine.depthScore, 1);
    assert.equal(ruleInput.features.lifeLine.curvatureScore, 1);
    assert.equal(ruleInput.features.lifeLine.breakScore, 0.5);
    assert.equal(ruleInput.features.headLine.depthScore, -1);
    assert.equal(ruleInput.features.headLine.slopeScore, 1);
    assert.equal(ruleInput.features.heartLine.lengthScore, -1);
    assert.equal(ruleInput.features.heartLine.endingScore, 1);
    assert.equal(ruleInput.features.fateLine.strengthScore, 1);
    assert.equal(ruleInput.features.fateLine.continuityScore, 1);
    assert.equal(ruleInput.qualityGate.usable, true);
    assert.deepEqual(ruleInput.qualityGate.reasons, ["minor crop"]);
    assert.equal(ruleInput.diagnostics.provider, "qwen");
    assert.equal(ruleInput.diagnostics.model, "qwen3.6-flash");

    assert.deepEqual(Object.keys(ruleInput.normalized_33_fields), FIELD_NAMES);
    assert.equal(ruleInput.normalized_33_fields.LIFE_LINE_LENGTH, 3);
    assert.equal(ruleInput.normalized_33_fields.LIFE_LINE_DEPTH, 3);
    assert.equal(ruleInput.normalized_33_fields.LIFE_LINE_CURVE, 3);
    assert.equal(ruleInput.normalized_33_fields.HEAD_LINE_DEPTH, 1);
    assert.equal(ruleInput.normalized_33_fields.HEAD_LINE_SLOPE, 3);
    assert.equal(ruleInput.normalized_33_fields.HEART_LINE_LENGTH, 1);
    assert.equal(ruleInput.normalized_33_fields.FATE_LINE_CLARITY, 3);
    assert.equal(ruleInput.normalized_33_fields.LINE_COMPLEXITY, 3);
    assert.equal(ruleInput.normalized_33_fields.OVERALL_CLARITY, 3);

    const match = matchPersona(ruleInput);
    assert.notEqual(match.error_codes && match.error_codes[0], "RULE_FIELD_MISSING");
    assertNoNaNOrUndefined(ruleInput);
    assertNoForbiddenPersonalityOutput(ruleInput);
  }

  {
    const ruleInput = palmFeatureSetToRuleInput({}, {
      provider: "mock",
      model: "stage5e-test",
    });

    assert.equal(ruleInput.features.handSide, "unknown");
    assert.equal(ruleInput.features.lifeLine.visible, false);
    assert.equal(ruleInput.features.lifeLine.lengthScore, 0);
    assert.equal(ruleInput.features.headLine.slopeScore, 0);
    assert.equal(ruleInput.features.palmShape.widthScore, 0);
    assert.equal(ruleInput.qualityGate.usable, false);
    assert.equal(ruleInput.qualityGate.confidence, 0);
    assert.equal(ruleInput.diagnostics.unknownFieldCount > 0, true);
    assert.equal(ruleInput.diagnostics.lowConfidenceFieldCount > 0, true);
    assert.deepEqual(Object.keys(ruleInput.normalized_33_fields), FIELD_NAMES);
    assert.ok(Object.values(ruleInput.normalized_33_fields).every((value) => value === 0));
    assertNoNaNOrUndefined(ruleInput);
    assertNoForbiddenPersonalityOutput(ruleInput);
  }

  {
    const input = fullPalmFeatureSet({
      majorLines: {
        lifeLine: { visible: true, length: "unknown", depth: "unknown", curvature: "unknown", breaks: "unknown", confidence: 0.49 },
        headLine: { visible: true, length: "unknown", depth: "unknown", slope: "unknown", breaks: "unknown", confidence: 0.5 },
        heartLine: { visible: true, length: "unknown", depth: "unknown", curvature: "unknown", ending: "unknown", confidence: 0.51 },
        fateLine: { visible: true, strength: "unknown", continuity: "unknown", confidence: Number.POSITIVE_INFINITY },
      },
      palmShape: {
        palmWidth: "unknown",
        palmLength: "unknown",
        fingerLength: "unknown",
        confidence: Number.NaN,
      },
      specialMarks: {
        crosses: "unknown",
        islands: "unknown",
        branches: "unknown",
        confidence: -2,
      },
    });

    const ruleInput = palmFeatureSetToRuleInput(input);

    assert.equal(ruleInput.features.lifeLine.lengthScore, 0);
    assert.equal(ruleInput.features.headLine.slopeScore, 0);
    assert.equal(ruleInput.features.fateLine.confidence, 0);
    assert.equal(ruleInput.features.palmShape.confidence, 0);
    assert.equal(ruleInput.features.specialMarks.confidence, 0);
    assert.equal(ruleInput.normalized_33_fields.LIFE_LINE_LENGTH, 0);
    assert.equal(ruleInput.normalized_33_fields.HEAD_LINE_SLOPE, 0);
    assert.equal(ruleInput.normalized_33_fields.FATE_LINE_CLARITY, 0);
    assertNoNaNOrUndefined(ruleInput);
  }

  {
    const cacheBefore = Object.keys(require.cache);
    palmFeatureSetToRuleInput(fullPalmFeatureSet());
    const cacheAfter = Object.keys(require.cache).filter((entry) => !cacheBefore.includes(entry));

    assert.equal(
      cacheAfter.some((entry) => /palmmi-(analyze|result|poster|upload)\.js$/.test(entry)),
      false,
      "Stage 5E adapter must not depend on UI/page scripts"
    );

    const adapterSource = fs.readFileSync(
      path.join(root, "src", "stage5", "palm-feature-set-to-rule-input.js"),
      "utf8"
    );
    assert.equal(/\bfs\b|readFile|imageBuffer|PALMMI_QWEN_API_KEY|process\.env/.test(adapterSource), false);
  }

  console.log("Stage 5E rule input adapter tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
