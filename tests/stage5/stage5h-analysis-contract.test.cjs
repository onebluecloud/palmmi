const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const stage5c = require(path.join(root, "scripts", "palmmi-stage5c-runner.js"));
const {
  ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION,
  buildAnalysisResultContract,
} = require(path.join(root, "src", "stage5", "analysis-result-contract.js"));

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "palmmi-stage5h-"));
}

function stage5GAnalysisResult(overrides = {}) {
  return {
    ok: true,
    schemaVersion: "analysis-result.v1",
    request_id: "req_stage5h",
    status: "SUCCESS",
    provider: "mock",
    provider_output: {
      provider: "mock",
      model: "stage5h-provider-model",
      persona_prediction: {
        id: "VLM_SHOULD_NOT_WIN",
        name: "VLM should not decide persona",
        confidence: 1,
      },
    },
    analysis_input: {
      schemaVersion: "analysis-input.v1",
      sourceImage: "fixtures/stage5h-palm.jpg",
      provider: "mock",
      model: "stage5h-analysis-input-model",
      finalPersona: {
        id: "DETERMINISTIC_STAGE5H_PERSONA",
        name: "Deterministic Stage 5H Persona",
        confidence: 0.87,
      },
      personaMatch: {
        primary_persona: {
          id: "DETERMINISTIC_STAGE5H_PERSONA",
          persona_id: "DETERMINISTIC_STAGE5H_PERSONA",
          name: "Deterministic Stage 5H Persona",
          score: 0.87,
        },
      },
      diagnostics: {
        lowConfidenceFieldCount: 2,
        missingFieldCount: 1,
        unknownFieldCount: 3,
        adapterWarnings: ["LOW_CONFIDENCE_FIELDS_PRESENT"],
        providerWarnings: ["MOCK_PROVIDER_ONLY"],
        matcherWarnings: ["MATCH_LOW_CONFIDENCE"],
      },
    },
    diagnostics: {
      lowConfidenceFieldCount: 2,
      missingFieldCount: 1,
      unknownFieldCount: 3,
      adapterWarnings: ["LOW_CONFIDENCE_FIELDS_PRESENT"],
      providerWarnings: ["MOCK_PROVIDER_ONLY"],
      matcherWarnings: ["MATCH_LOW_CONFIDENCE"],
    },
    recognition_result: {
      schema: {
        name: "palmmi.recognition_result",
        version: "stage5b.v1",
        status: "PASS",
      },
      status: "LOW_CONFIDENCE",
      request_id: "req_stage5h",
      image_input: {
        file_name: "stage5h-palm.jpg",
        upload_ref: "local:stage5h-palm.jpg",
      },
      quality_gate: {
        passed: true,
        status: "LOW_QUALITY_PASS",
        confidence: 0.64,
        reasons: ["LOW_CONFIDENCE_FIELDS_PRESENT"],
      },
      primary_persona: {
        id: "DETERMINISTIC_STAGE5H_PERSONA",
        persona_id: "DETERMINISTIC_STAGE5H_PERSONA",
        name: "Deterministic Stage 5H Persona",
        score: 0.87,
        mother_type: "M_STAGE5H",
        hook: "Existing hook from Stage 5B.",
        description: "Existing description from Stage 5B.",
        tags: ["existing", "stage5h"],
      },
      recognition: {
        explanation: {
          low_confidence: true,
        },
      },
      provider_meta: {
        provider: "mock",
        model: "stage5h-provider-model",
      },
      debug: {
        stage5g_bridge_used: true,
        stage5g_diagnostics: {
          lowConfidenceFieldCount: 2,
          missingFieldCount: 1,
          unknownFieldCount: 3,
        },
      },
      created_at: "2026-05-18T00:00:00.000Z",
    },
    ...overrides,
  };
}

async function main() {
  {
    const source = stage5GAnalysisResult();
    const contract = buildAnalysisResultContract(source, {
      now: () => "2026-05-18T00:00:00.000Z",
    });

    assert.equal(ANALYSIS_RESULT_CONTRACT_SCHEMA_VERSION, "analysis-result.v1");
    assert.equal(contract.schemaVersion, "analysis-result.v1");
    assert.equal(contract.sourceSchemaVersion, "stage5b.v1");
    assert.equal(contract.status, "degraded");
    assert.deepEqual(contract.result.persona, {
      id: "DETERMINISTIC_STAGE5H_PERSONA",
      name: "Deterministic Stage 5H Persona",
      confidence: 0.87,
    });
    assert.equal(contract.result.scores.overallConfidence, 0.87);
    assert.equal(contract.result.scores.qualityScore, 0.64);
    assert.equal(contract.result.scores.matchScore, 0.87);
    assert.equal(contract.result.summary.title, "Deterministic Stage 5H Persona");
    assert.equal(contract.result.summary.shortText, "Existing description from Stage 5B.");
    assert.deepEqual(contract.result.summary.keywords, ["existing", "stage5h"]);
    assert.equal(contract.uiConsumable.personaId, contract.result.persona.id);
    assert.equal(contract.uiConsumable.personaName, contract.result.persona.name);
    assert.equal(contract.uiConsumable.confidence, contract.result.persona.confidence);
    assert.equal(contract.uiConsumable.primaryDisplayText, contract.result.summary.title);
    assert.equal(contract.uiConsumable.secondaryDisplayText, contract.result.summary.shortText);
    assert.equal(Object.prototype.hasOwnProperty.call(contract.uiConsumable, "recognitionResult"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(contract.uiConsumable, "ruleInput"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(contract.uiConsumable, "palmFeatureSet"), false);
    assert.equal(contract.diagnostics.lowConfidenceFieldCount, 2);
    assert.equal(contract.diagnostics.missingFieldCount, 1);
    assert.equal(contract.diagnostics.unknownFieldCount, 3);
    assert.deepEqual(contract.diagnostics.adapterWarnings, ["LOW_CONFIDENCE_FIELDS_PRESENT"]);
    assert.deepEqual(contract.diagnostics.providerWarnings, ["MOCK_PROVIDER_ONLY"]);
    assert.deepEqual(contract.diagnostics.matcherWarnings, ["MATCH_LOW_CONFIDENCE"]);
    assert.ok(contract.diagnostics.contractWarnings.includes("CONTRACT_DEGRADED"));
    assert.equal(contract.trace.stage, "5H");
    assert.equal(contract.trace.from, "stage5b.v1");
    assert.equal(contract.trace.contract, "analysis-result.v1");
    assert.equal(contract.trace.sourceImage, "fixtures/stage5h-palm.jpg");
    assert.equal(contract.trace.provider, "mock");
    assert.equal(contract.trace.model, "stage5h-provider-model");
    assert.equal(contract.trace.generatedAt, "2026-05-18T00:00:00.000Z");
    assert.equal(contract.internal.stage5bResult, source);
  }

  {
    const source = stage5GAnalysisResult({
      diagnostics: {
        lowConfidenceFieldCount: 0,
        missingFieldCount: 0,
        unknownFieldCount: 0,
        adapterWarnings: [],
        providerWarnings: [],
        matcherWarnings: [],
      },
      recognition_result: {
        ...stage5GAnalysisResult().recognition_result,
        status: "SUCCESS",
        quality_gate: {
          passed: true,
          status: "PASS",
          confidence: 0.91,
          reasons: [],
        },
        recognition: {
          explanation: {
            low_confidence: false,
          },
        },
      },
    });
    const contract = buildAnalysisResultContract(source);

    assert.equal(contract.status, "ok");
    assert.deepEqual(contract.result.warnings, []);
    assert.deepEqual(contract.uiConsumable.warningBadges, []);
  }

  {
    const source = stage5GAnalysisResult({
      analysis_input: {
        ...stage5GAnalysisResult().analysis_input,
        finalPersona: {
          id: "ZERO_CONFIDENCE_PERSONA",
          name: "Zero Confidence Persona",
          confidence: 0,
        },
      },
      recognition_result: {
        ...stage5GAnalysisResult().recognition_result,
        primary_persona: {
          ...stage5GAnalysisResult().recognition_result.primary_persona,
          id: "ZERO_CONFIDENCE_PERSONA",
          persona_id: "ZERO_CONFIDENCE_PERSONA",
          name: "Zero Confidence Persona",
          score: 0.99,
        },
      },
    });
    const contract = buildAnalysisResultContract(source);

    assert.equal(contract.result.persona.confidence, 0);
    assert.equal(contract.uiConsumable.confidence, 0);
    assert.equal(contract.result.scores.overallConfidence, 0);
  }

  {
    assert.throws(
      () => buildAnalysisResultContract(stage5GAnalysisResult({ analysis_input: { finalPersona: null } })),
      /AnalysisResultContract requires persona id, name, and numeric confidence/
    );
    assert.throws(
      () => buildAnalysisResultContract(stage5GAnalysisResult({
        analysis_input: {
          ...stage5GAnalysisResult().analysis_input,
          finalPersona: {
            id: "BROKEN_FINAL_PERSONA",
            name: "Broken Final Persona",
            confidence: "0.5",
          },
        },
      })),
      /AnalysisResultContract requires persona id, name, and numeric confidence/
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

    const contract = buildAnalysisResultContract(stage5GAnalysisResult());

    assert.equal(contract.result.persona.id, "DETERMINISTIC_STAGE5H_PERSONA");
    assert.notEqual(contract.result.persona.id, "VLM_SHOULD_NOT_WIN");
    for (const file of ruleFiles) {
      assert.equal(fs.readFileSync(file, "utf8"), before.get(file), `${file} must not be modified by Stage 5H`);
    }
  }

  {
    assert.equal(stage5c.parseCliArgs(["--toAnalysisContract"]).toAnalysisContract, true);
    assert.match(stage5c.DEFAULT_STAGE5H_ANALYSIS_CONTRACT_OUTPUT_PATH, /stage5h-analysis-contract\.local\.json$/);

    const sampleDir = makeTempDir();
    const imagePath = path.join(sampleDir, "contract-right.jpg");
    const manifestPath = path.join(sampleDir, "contract-manifest.local.json");
    const outputPath = path.join(sampleDir, "contract-results.local.json");
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
      toAnalysisContract: true,
    });

    assert.equal(summary.normalized, true);
    assert.equal(summary.toRuleInput, true);
    assert.equal(summary.toRecognitionResult, true);
    assert.equal(summary.toAnalysisResult, true);
    assert.equal(summary.toAnalysisContract, true);
    assert.equal(summary.schema, "palmmi.stage5h.analysis-contract.local.v1");
    assert.equal(summary.results[0].ok, true);
    assert.equal(summary.results[0].analysisResult.schemaVersion, "analysis-result.v1");
    assert.equal(summary.results[0].analysisContract.schemaVersion, "analysis-result.v1");
    assert.equal(summary.results[0].analysisContract.sourceSchemaVersion, "stage5b.v1");
    assert.equal(
      summary.results[0].analysisContract.result.persona.id,
      summary.results[0].recognitionResult.finalPersona.id
    );

    const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(output.toAnalysisContract, true);
    assert.equal(output.results[0].analysisContract.schemaVersion, "analysis-result.v1");
  }

  {
    const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
    assert.match(gitignore, /docs\/stage5\/stage5h-analysis-contract\.local\.json/);

    const doc = fs.readFileSync(path.join(root, "docs", "stage5", "stage5h-analysis-contract.md"), "utf8");
    assert.match(doc, /stage5b\.v1/);
    assert.match(doc, /analysis-result\.v1/);
    assert.match(doc, /UI/);
    assert.match(doc, /internal/);
    assert.match(doc, /not rely on `internal`|不.*依赖.*internal/);
  }

  console.log("Stage 5H analysis contract tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
