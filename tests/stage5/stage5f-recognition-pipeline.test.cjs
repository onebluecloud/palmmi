const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const pipelinePath = path.join(root, "src", "stage5", "palmmi-recognition-pipeline.js");
const stage5c = require(path.join(root, "scripts", "palmmi-stage5c-runner.js"));
const {
  palmFeatureSetToRuleInput,
} = require(path.join(root, "src", "stage5", "palm-feature-set-to-rule-input.js"));

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "palmmi-stage5f-"));
}

function fullPalmFeatureSet(overrides = {}) {
  return {
    schemaVersion: "palm-feature-set.v1",
    hand: {
      side: "right",
      orientation: "palm",
      confidence: 0.92,
    },
    imageQuality: {
      usable: true,
      reasons: [],
      brightness: "normal",
      blur: "low",
      occlusion: "none",
      confidence: 0.86,
    },
    majorLines: {
      lifeLine: {
        visible: true,
        length: "long",
        depth: "deep",
        curvature: "high",
        breaks: "none",
        confidence: 0.88,
      },
      headLine: {
        visible: true,
        length: "long",
        depth: "medium",
        slope: "downward",
        breaks: "none",
        confidence: 0.84,
      },
      heartLine: {
        visible: true,
        length: "medium",
        depth: "medium",
        curvature: "high",
        ending: "under_middle",
        confidence: 0.82,
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
      confidence: 0.8,
    },
    specialMarks: {
      crosses: "few",
      islands: "none",
      branches: "few",
      confidence: 0.64,
    },
    rawProvider: {
      provider: "mock",
      model: "stage5f-test-model",
      requestId: "req-stage5f-test",
    },
    ...overrides,
  };
}

function mockMatcherResult() {
  return {
    status: "SUCCESS",
    error_codes: [],
    primary_persona: {
      id: "DETERMINISTIC_TEST_PERSONA",
      persona_id: "DETERMINISTIC_TEST_PERSONA",
      name: "Deterministic Matcher Persona",
      score: 0.91,
    },
    top3: [],
    is_low_confidence: false,
    debug: {
      notes: [],
    },
  };
}

async function main() {
  const {
    runPalmmiRecognitionPipeline,
  } = require(pipelinePath);

  {
    const result = await runPalmmiRecognitionPipeline({
      sourceImage: "fixtures/palm.jpg",
      palmFeatureSet: fullPalmFeatureSet(),
    });

    assert.equal(result.schemaVersion, "recognition-result.v1");
    assert.equal(result.sourceImage, "fixtures/palm.jpg");
    assert.equal(result.provider, "mock");
    assert.equal(result.palmFeatureSet.schemaVersion, "palm-feature-set.v1");
    assert.equal(result.ruleInput.schemaVersion, "rule-input.v1");
    assert.equal(result.personaMatch.error_codes.includes("RULE_FIELD_MISSING"), false);
    assert.equal(typeof result.finalPersona.id, "string");
    assert.equal(typeof result.finalPersona.name, "string");
    assert.equal(typeof result.finalPersona.confidence, "number");
    assert.equal(result.qualityGate.usable, true);
    assert.equal(result.diagnostics.missingFieldCount, 0);
    assert.ok(Array.isArray(result.diagnostics.adapterWarnings));
    assert.ok(Array.isArray(result.diagnostics.providerWarnings));
    assert.ok(Array.isArray(result.diagnostics.matcherWarnings));
  }

  {
    let adapterCalls = 0;
    let matcherCalls = 0;
    const palmFeatureSet = fullPalmFeatureSet();
    const expectedRuleInput = palmFeatureSetToRuleInput(palmFeatureSet);

    const result = await runPalmmiRecognitionPipeline({
      sourceImage: "fixtures/injected.jpg",
      palmFeatureSet,
      adapter: (input) => {
        adapterCalls += 1;
        assert.equal(input, palmFeatureSet);
        return expectedRuleInput;
      },
      matcher: (input) => {
        matcherCalls += 1;
        assert.equal(input, expectedRuleInput);
        return mockMatcherResult();
      },
    });

    assert.equal(adapterCalls, 1);
    assert.equal(matcherCalls, 1);
    assert.deepEqual(result.finalPersona, {
      id: "DETERMINISTIC_TEST_PERSONA",
      name: "Deterministic Matcher Persona",
      confidence: 0.91,
    });
  }

  {
    const lowConfidenceFeatureSet = fullPalmFeatureSet({
      majorLines: {
        lifeLine: { visible: true, length: "unknown", depth: "unknown", curvature: "unknown", breaks: "unknown", confidence: 0.2 },
        headLine: { visible: true, length: "unknown", depth: "unknown", slope: "unknown", breaks: "unknown", confidence: 0.3 },
        heartLine: { visible: true, length: "unknown", depth: "unknown", curvature: "unknown", ending: "unknown", confidence: 0.4 },
        fateLine: { visible: true, strength: "unknown", continuity: "unknown", confidence: 0.1 },
      },
      palmShape: {
        palmWidth: "unknown",
        palmLength: "unknown",
        fingerLength: "unknown",
        confidence: 0.2,
      },
      specialMarks: {
        crosses: "unknown",
        islands: "unknown",
        branches: "unknown",
        confidence: 0.2,
      },
    });

    const result = await runPalmmiRecognitionPipeline({
      palmFeatureSet: lowConfidenceFeatureSet,
    });

    assert.equal(result.schemaVersion, "recognition-result.v1");
    assert.equal(result.diagnostics.lowConfidenceFieldCount > 0, true);
    assert.equal(result.diagnostics.unknownFieldCount > 0, true);
    assert.ok(result.diagnostics.adapterWarnings.includes("UNKNOWN_FIELDS_DEFAULTED_TO_NEUTRAL"));
    assert.ok(result.diagnostics.adapterWarnings.includes("LOW_CONFIDENCE_FIELDS_PRESENT"));
  }

  {
    await assert.rejects(
      () => runPalmmiRecognitionPipeline({ sourceImage: "missing-input.jpg" }),
      /PalmFeatureSet, providerResult, or provider with providerInput is required/
    );
  }

  {
    const ruleFiles = [
      "lib/recognition/personaCatalog.ts",
      "lib/recognition/personaRules.ts",
      "lib/recognition/motherScores.ts",
      "lib/recognition/personaMatcher.ts",
    ].map((file) => path.join(root, file));
    const before = new Map(ruleFiles.map((file) => [file, fs.readFileSync(file, "utf8")]));

    await runPalmmiRecognitionPipeline({
      palmFeatureSet: fullPalmFeatureSet(),
    });

    for (const file of ruleFiles) {
      assert.equal(fs.readFileSync(file, "utf8"), before.get(file), `${file} must not be modified by Stage 5F`);
    }
  }

  {
    assert.equal(stage5c.parseCliArgs(["--toRecognitionResult"]).toRecognitionResult, true);

    const sampleDir = makeTempDir();
    const imagePath = path.join(sampleDir, "recognition-right.jpg");
    const manifestPath = path.join(sampleDir, "recognition-manifest.local.json");
    const outputPath = path.join(sampleDir, "recognition-results.local.json");
    fs.writeFileSync(imagePath, Buffer.from("image bytes"));
    fs.writeFileSync(manifestPath, JSON.stringify([
      {
        sampleId: "sample-001",
        imagePath: imagePath.replace(/\\/g, "/"),
        side: "right",
        handLabel: "real-human-palm",
        expectedValidity: "valid",
      },
    ], null, 2));

    const summary = await stage5c.runStage5C({
      provider: "mock",
      manifest: manifestPath,
      output: outputPath,
      toRecognitionResult: true,
    });

    assert.equal(summary.normalized, true);
    assert.equal(summary.toRuleInput, true);
    assert.equal(summary.toRecognitionResult, true);
    assert.equal(summary.results[0].ok, true);
    assert.equal(summary.results[0].recognitionResult.schemaVersion, "recognition-result.v1");
    assert.equal(summary.results[0].recognitionResult.sourceImage, imagePath.replace(/\\/g, "/"));
    assert.equal(typeof summary.results[0].recognitionResult.finalPersona.id, "string");

    const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(output.toRecognitionResult, true);
    assert.equal(output.results[0].recognitionResult.schemaVersion, "recognition-result.v1");
  }

  console.log("Stage 5F recognition pipeline tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
