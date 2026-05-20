const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  ANALYSIS_RESULT_READ_ERRORS,
  readAnalysisResultForUI,
} = require(path.join(root, "src", "stage5", "analysis-result-read-adapter.js"));

function analysisContract(overrides = {}) {
  return {
    schemaVersion: "analysis-result.v1",
    sourceSchemaVersion: "stage5b.v1",
    status: "degraded",
    result: {
      persona: {
        id: "P_STAGE5I",
        name: "Stage 5I Persona",
        confidence: 0.82,
        palmFeatureSet: {
          leaked: true,
        },
      },
      summary: {
        title: "Stage 5I Persona",
        subtitle: "Stable contract summary",
        shortText: "Existing contract text.",
        keywords: ["stable", "readonly"],
        recognitionResult: {
          leaked: true,
        },
      },
      scores: {
        overallConfidence: 0.82,
        qualityScore: 0.7,
        matchScore: 0.82,
        ruleInput: {
          leaked: true,
        },
      },
      sections: [
        {
          key: "persona",
          title: "Persona",
          content: "Existing contract section.",
          source: "stage5b",
          debug: {
            leaked: true,
          },
        },
      ],
      warnings: ["CONTRACT_DEGRADED"],
      recognition_result: {
        leaked: true,
      },
    },
    uiConsumable: {
      personaId: "P_STAGE5I",
      personaName: "Stage 5I Persona",
      confidence: 0.82,
      status: "degraded",
      qualityStatus: "LOW_QUALITY_PASS",
      primaryDisplayText: "Stage 5I Persona",
      secondaryDisplayText: "Existing contract text.",
      warningBadges: ["CONTRACT_DEGRADED"],
      internal: {
        leaked: true,
      },
    },
    diagnostics: {
      lowConfidenceFieldCount: 1,
      missingFieldCount: 0,
      unknownFieldCount: 2,
      adapterWarnings: ["LOW_CONFIDENCE_FIELDS_PRESENT"],
      providerWarnings: ["MOCK_PROVIDER_ONLY"],
      matcherWarnings: ["MATCH_LOW_CONFIDENCE"],
      contractWarnings: ["CONTRACT_DEGRADED"],
      provider_output: {
        leaked: true,
      },
    },
    trace: {
      stage: "5H",
      from: "stage5b.v1",
      contract: "analysis-result.v1",
      sourceImage: "fixtures/stage5i-palm.jpg",
      provider: "mock",
      model: "stage5i-model",
      generatedAt: "2026-05-18T00:00:00.000Z",
      analysis_input: {
        leaked: true,
      },
    },
    internal: {
      stage5bResult: {
        recognition_result: {
          debug: {
            leaked: true,
          },
          primary_persona: {
            id: "P_STAGE5I",
          },
        },
        provider_output: {
          raw: true,
        },
        analysis_input: {
          finalPersona: {
            id: "P_STAGE5I",
          },
        },
      },
    },
    provider_output: {
      leaked: true,
    },
    recognition_result: {
      debug: {
        leaked: true,
      },
    },
    ...overrides,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNoForbiddenFields(value) {
  const json = JSON.stringify(value);
  for (const forbidden of [
    "internal",
    "stage5bResult",
    "provider_output",
    "recognition_result",
    "debug",
    "palmFeatureSet",
    "ruleInput",
    "RecognitionResult",
    "AnalysisInput",
    "analysis_input",
    "primary_persona",
  ]) {
    assert.equal(json.includes(forbidden), false, `UI read model must not expose ${forbidden}`);
  }
}

async function main() {
  {
    const source = analysisContract();
    const before = clone(source);
    const readable = readAnalysisResultForUI(source);

    assert.deepEqual(source, before);
    assert.equal(readable.schemaVersion, "analysis-result.v1");
    assert.equal(readable.status, "degraded");
    assert.deepEqual(readable.result.persona, {
      id: "P_STAGE5I",
      name: "Stage 5I Persona",
      confidence: 0.82,
    });
    assert.deepEqual(readable.result.summary, {
      title: "Stage 5I Persona",
      subtitle: "Stable contract summary",
      shortText: "Existing contract text.",
      keywords: ["stable", "readonly"],
    });
    assert.deepEqual(readable.result.scores, {
      overallConfidence: 0.82,
      qualityScore: 0.7,
      matchScore: 0.82,
    });
    assert.deepEqual(readable.result.sections, [
      {
        key: "persona",
        title: "Persona",
        content: "Existing contract section.",
        source: "stage5b",
      },
    ]);
    assert.deepEqual(readable.result.warnings, ["CONTRACT_DEGRADED"]);
    assert.deepEqual(readable.uiConsumable, {
      personaId: "P_STAGE5I",
      personaName: "Stage 5I Persona",
      confidence: 0.82,
      status: "degraded",
      qualityStatus: "LOW_QUALITY_PASS",
      primaryDisplayText: "Stage 5I Persona",
      secondaryDisplayText: "Existing contract text.",
      warningBadges: ["CONTRACT_DEGRADED"],
    });
    assert.deepEqual(readable.diagnostics, {
      lowConfidenceFieldCount: 1,
      missingFieldCount: 0,
      unknownFieldCount: 2,
      adapterWarnings: ["LOW_CONFIDENCE_FIELDS_PRESENT"],
      providerWarnings: ["MOCK_PROVIDER_ONLY"],
      matcherWarnings: ["MATCH_LOW_CONFIDENCE"],
      contractWarnings: ["CONTRACT_DEGRADED"],
    });
    assert.deepEqual(readable.trace, {
      stage: "5H",
      from: "stage5b.v1",
      contract: "analysis-result.v1",
      sourceImage: "fixtures/stage5i-palm.jpg",
      provider: "mock",
      model: "stage5i-model",
      generatedAt: "2026-05-18T00:00:00.000Z",
    });
    assert.equal(Object.prototype.hasOwnProperty.call(readable, "sourceSchemaVersion"), false);
    assertNoForbiddenFields(readable);
  }

  {
    assert.deepEqual(readAnalysisResultForUI(null), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_READ_ERRORS.MISSING,
        message: "Analysis result is missing.",
      },
    });
  }

  {
    assert.deepEqual(readAnalysisResultForUI({ schemaVersion: "stage5b.v1" }), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_READ_ERRORS.SCHEMA_UNSUPPORTED,
        message: "Unsupported analysis result schema.",
      },
    });
  }

  {
    assert.deepEqual(readAnalysisResultForUI(analysisContract({ status: "SUCCESS" })), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_READ_ERRORS.STATUS_INVALID,
        message: "Analysis result status is invalid.",
      },
    });
  }

  {
    assert.deepEqual(readAnalysisResultForUI(analysisContract({ result: null })), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_READ_ERRORS.MALFORMED,
        message: "Analysis result is malformed.",
      },
    });
  }

  {
    assert.deepEqual(readAnalysisResultForUI(analysisContract({ uiConsumable: null })), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_READ_ERRORS.UI_FIELD_MISSING,
        message: "Analysis result UI field is missing.",
      },
    });
  }

  {
    const malformedPersona = analysisContract({
      result: {
        ...analysisContract().result,
        persona: {
          id: "P_STAGE5I",
          name: "Stage 5I Persona",
        },
      },
    });

    assert.deepEqual(readAnalysisResultForUI(malformedPersona), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_READ_ERRORS.MALFORMED,
        message: "Analysis result is malformed.",
      },
    });
  }

  console.log("Stage 5I analysis read adapter tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
