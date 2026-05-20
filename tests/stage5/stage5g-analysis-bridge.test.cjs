const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const stage5 = require(path.join(root, "scripts", "palmmi-stage5.js"));
const stage5c = require(path.join(root, "scripts", "palmmi-stage5c-runner.js"));
const {
  recognitionResultToAnalysisInput,
} = require(path.join(root, "src", "stage5", "recognition-result-to-analysis-input.js"));
const {
  runPalmmiAnalysisBridge,
} = require(path.join(root, "src", "stage5", "palmmi-analysis-bridge.js"));

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "palmmi-stage5g-"));
}

function upload(overrides = {}) {
  return {
    schemaVersion: "stage4d_upload_v1",
    fileName: "palm.jpg",
    fileType: "image/jpeg",
    fileSize: 512000,
    fileSizeLabel: "500 KB",
    previewDataUrl: "data:image/jpeg;base64,stage5g",
    uploadedAt: "2026-05-18T00:00:00.000Z",
    handSide: null,
    ...overrides,
  };
}

function recognitionResult(overrides = {}) {
  return {
    schemaVersion: "recognition-result.v1",
    sourceImage: "fixtures/stage5g-palm.jpg",
    sampleId: "sample-stage5g",
    provider: "mock",
    model: "stage5g-test-model",
    status: "SUCCESS",
    palmFeatureSet: {
      schemaVersion: "palm-feature-set.v1",
    },
    ruleInput: {
      schemaVersion: "rule-input.v1",
      normalized_33_fields: {},
    },
    personaMatch: {
      status: "SUCCESS",
      error_codes: [],
      primary_mother: {
        id: "M_STAGE5G",
        name: "Stage 5G mother",
      },
      secondary_mother: null,
      is_dual_mother: false,
      primary_persona: {
        id: "DETERMINISTIC_STAGE5G_PERSONA",
        persona_id: "DETERMINISTIC_STAGE5G_PERSONA",
        name: "Deterministic Stage 5G Persona",
        score: 0.87,
        mother_type: "M_STAGE5G",
        matched_features: ["HEAD_LINE_LENGTH"],
        conflict_features: [],
        reason_codes: ["MATCHED_BY_TEST_RULES"],
      },
      top3: [
        {
          id: "DETERMINISTIC_STAGE5G_PERSONA",
          persona_id: "DETERMINISTIC_STAGE5G_PERSONA",
          name: "Deterministic Stage 5G Persona",
          score: 0.87,
          mother_type: "M_STAGE5G",
          reason_codes: ["MATCHED_BY_TEST_RULES"],
        },
      ],
      debug: {
        notes: ["matcher note"],
      },
    },
    finalPersona: {
      id: "DETERMINISTIC_STAGE5G_PERSONA",
      name: "Deterministic Stage 5G Persona",
      confidence: 0.87,
    },
    qualityGate: {
      usable: true,
      reasons: [],
      confidence: 0.91,
    },
    diagnostics: {
      lowConfidenceFieldCount: 0,
      missingFieldCount: 0,
      unknownFieldCount: 0,
      adapterWarnings: [],
      providerWarnings: ["MOCK_PROVIDER_ONLY"],
      matcherWarnings: [],
    },
    ...overrides,
  };
}

async function main() {
  {
    const source = recognitionResult();
    const analysisInput = recognitionResultToAnalysisInput(source);

    assert.equal(analysisInput.schemaVersion, "analysis-input.v1");
    assert.equal(analysisInput.sourceRecognitionResultSchemaVersion, "recognition-result.v1");
    assert.equal(analysisInput.sourceImage, source.sourceImage);
    assert.equal(analysisInput.provider, "mock");
    assert.deepEqual(analysisInput.finalPersona, source.finalPersona);
    assert.deepEqual(analysisInput.personaMatch, source.personaMatch);
    assert.deepEqual(analysisInput.qualityGate, source.qualityGate);
    assert.deepEqual(analysisInput.diagnostics, source.diagnostics);
    assert.deepEqual(analysisInput.trace, {
      from: "recognition-result.v1",
      adapter: "recognition-result-to-analysis-input",
      stage: "5G",
    });
  }

  {
    const source = recognitionResult();
    let skeletonCalls = 0;
    const analysis = await runPalmmiAnalysisBridge({
      recognitionResult: source,
      upload: upload(),
      stage5Api: {
        async runAnalyzeSkeleton(options) {
          skeletonCalls += 1;
          assert.equal(typeof options.provider.analyze, "function");
          const providerOutput = await options.provider.analyze({ request_id: "req_fake" });
          assert.equal(providerOutput.provider, "stage5g-analysis-input");
          assert.deepEqual(providerOutput.stage5g_analysis_input.finalPersona, source.finalPersona);
          return {
            ok: true,
            request_id: "req_fake",
            status: "SUCCESS",
            provider: "stage5g-analysis-input",
            provider_output: providerOutput,
            recognition_result: {
              status: "SUCCESS",
              primary_persona: {
                id: source.finalPersona.id,
                name: source.finalPersona.name,
                score: source.finalPersona.confidence,
              },
              debug: {
                mock_vlm_used: false,
              },
            },
          };
        },
      },
    });

    assert.equal(skeletonCalls, 1);
    assert.equal(analysis.schemaVersion, "analysis-result.v1");
    assert.equal(analysis.ok, true);
    assert.deepEqual(analysis.analysis_input.finalPersona, source.finalPersona);
    assert.equal(analysis.recognition_result.primary_persona.id, source.finalPersona.id);
  }

  {
    const source = recognitionResult();
    const analysis = await runPalmmiAnalysisBridge({
      recognitionResult: source,
      upload: upload(),
      stage5Api: stage5,
      requestId: () => "req_stage5g_real_skeleton",
      now: () => 1770000000000,
      randomString: () => "device",
      nowIso: () => "2026-05-18T00:00:00.000Z",
    });

    assert.equal(analysis.ok, true);
    assert.equal(analysis.recognition_result.schema.version, "stage5b.v1");
    assert.equal(analysis.recognition_result.primary_persona.id, source.finalPersona.id);
    assert.equal(analysis.recognition_result.primary_persona.name, source.finalPersona.name);
    assert.equal(analysis.recognition_result.primary_persona.score, source.finalPersona.confidence);
    assert.equal(analysis.recognition_result.debug.mock_vlm_used, false);
    assert.equal(analysis.recognition_result.debug.stage5g_bridge_used, true);
    assert.deepEqual(analysis.recognition_result.debug.stage5g_diagnostics, source.diagnostics);
  }

  {
    const lowConfidence = recognitionResult({
      status: "LOW_CONFIDENCE",
      personaMatch: {
        ...recognitionResult().personaMatch,
        status: "LOW_CONFIDENCE",
        is_low_confidence: true,
      },
      diagnostics: {
        lowConfidenceFieldCount: 3,
        missingFieldCount: 0,
        unknownFieldCount: 5,
        adapterWarnings: ["LOW_CONFIDENCE_FIELDS_PRESENT", "UNKNOWN_FIELDS_DEFAULTED_TO_NEUTRAL"],
        providerWarnings: [],
        matcherWarnings: ["MATCH_LOW_CONFIDENCE"],
      },
    });

    const analysis = await runPalmmiAnalysisBridge({
      recognitionResult: lowConfidence,
      upload: upload(),
      stage5Api: stage5,
    });

    assert.equal(analysis.diagnostics.lowConfidenceFieldCount, 3);
    assert.equal(analysis.diagnostics.unknownFieldCount, 5);
    assert.deepEqual(analysis.recognition_result.debug.stage5g_diagnostics, lowConfidence.diagnostics);
  }

  {
    assert.throws(
      () => recognitionResultToAnalysisInput(recognitionResult({ finalPersona: null })),
      /finalPersona/
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

    await runPalmmiAnalysisBridge({
      recognitionResult: recognitionResult(),
      upload: upload(),
      stage5Api: stage5,
    });

    for (const file of ruleFiles) {
      assert.equal(fs.readFileSync(file, "utf8"), before.get(file), `${file} must not be modified by Stage 5G`);
    }
  }

  {
    assert.equal(stage5c.parseCliArgs(["--toAnalysisResult"]).toAnalysisResult, true);

    const sampleDir = makeTempDir();
    const imagePath = path.join(sampleDir, "analysis-right.jpg");
    const manifestPath = path.join(sampleDir, "analysis-manifest.local.json");
    const outputPath = path.join(sampleDir, "analysis-results.local.json");
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
      toAnalysisResult: true,
    });

    assert.equal(summary.normalized, true);
    assert.equal(summary.toRuleInput, true);
    assert.equal(summary.toRecognitionResult, true);
    assert.equal(summary.toAnalysisResult, true);
    assert.equal(summary.results[0].ok, true);
    assert.equal(summary.results[0].recognitionResult.schemaVersion, "recognition-result.v1");
    assert.equal(summary.results[0].analysisResult.schemaVersion, "analysis-result.v1");
    assert.equal(
      summary.results[0].analysisResult.recognition_result.primary_persona.id,
      summary.results[0].recognitionResult.finalPersona.id
    );

    const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(output.toAnalysisResult, true);
    assert.equal(output.results[0].analysisResult.schemaVersion, "analysis-result.v1");
  }

  console.log("Stage 5G analysis bridge tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
