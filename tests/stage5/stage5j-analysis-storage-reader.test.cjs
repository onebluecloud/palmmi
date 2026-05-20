const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const {
  ANALYSIS_RESULT_STORAGE_ERRORS,
  ANALYSIS_RESULT_STORAGE_KEY,
  readLastAnalysisResultFromStorage,
} = require(path.join(root, "src", "stage5", "analysis-result-storage-reader.js"));

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    dump() {
      return Object.fromEntries(values);
    },
  };
}

function analysisContract(overrides = {}) {
  return {
    schemaVersion: "analysis-result.v1",
    sourceSchemaVersion: "stage5b.v1",
    status: "ok",
    result: {
      persona: {
        id: "P_STAGE5J",
        name: "Stage 5J Persona",
        confidence: 0.9,
        palmFeatureSet: {
          leaked: true,
        },
      },
      summary: {
        title: "Stage 5J Persona",
        subtitle: "Storage reader",
        shortText: "Safe UI result.",
        keywords: ["storage", "safe"],
        RecognitionResult: {
          leaked: true,
        },
      },
      scores: {
        overallConfidence: 0.9,
        qualityScore: 0.8,
        matchScore: 0.9,
        ruleInput: {
          leaked: true,
        },
      },
      sections: [
        {
          key: "persona",
          title: "Persona",
          content: "Safe section.",
          source: "stage5b",
          debug: {
            leaked: true,
          },
        },
      ],
      warnings: [],
      recognition_result: {
        debug: {
          leaked: true,
        },
      },
    },
    uiConsumable: {
      personaId: "P_STAGE5J",
      personaName: "Stage 5J Persona",
      confidence: 0.9,
      status: "ok",
      qualityStatus: "PASS",
      primaryDisplayText: "Stage 5J Persona",
      secondaryDisplayText: "Safe UI result.",
      warningBadges: [],
      internal: {
        leaked: true,
      },
    },
    diagnostics: {
      lowConfidenceFieldCount: 0,
      missingFieldCount: 0,
      unknownFieldCount: 0,
      adapterWarnings: [],
      providerWarnings: [],
      matcherWarnings: [],
      contractWarnings: [],
      provider_output: {
        leaked: true,
      },
    },
    trace: {
      stage: "5H",
      from: "stage5b.v1",
      contract: "analysis-result.v1",
      sourceImage: "fixtures/stage5j-palm.jpg",
      provider: "mock",
      model: "stage5j-model",
      generatedAt: "2026-05-18T00:00:00.000Z",
      AnalysisInput: {
        leaked: true,
      },
    },
    internal: {
      stage5bResult: {
        provider_output: {
          raw: true,
        },
        recognition_result: {
          debug: {
            raw: true,
          },
        },
        palmFeatureSet: {
          raw: true,
        },
        ruleInput: {
          raw: true,
        },
        analysis_input: {
          raw: true,
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
  ]) {
    assert.equal(json.includes(forbidden), false, `storage reader must not expose ${forbidden}`);
  }
}

async function main() {
  {
    const source = analysisContract();
    const sourceBefore = clone(source);
    const raw = JSON.stringify(source);
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: raw,
    });

    const response = readLastAnalysisResultFromStorage({ storage });

    assert.deepEqual(source, sourceBefore);
    assert.equal(storage.getItem(ANALYSIS_RESULT_STORAGE_KEY), raw);
    assert.equal(response.ok, true);
    assert.equal(response.data.schemaVersion, "analysis-result.v1");
    assert.equal(response.data.status, "ok");
    assert.deepEqual(response.data.result.persona, {
      id: "P_STAGE5J",
      name: "Stage 5J Persona",
      confidence: 0.9,
    });
    assert.deepEqual(response.data.uiConsumable, {
      personaId: "P_STAGE5J",
      personaName: "Stage 5J Persona",
      confidence: 0.9,
      status: "ok",
      qualityStatus: "PASS",
      primaryDisplayText: "Stage 5J Persona",
      secondaryDisplayText: "Safe UI result.",
      warningBadges: [],
    });
    assertNoForbiddenFields(response);
  }

  {
    const storage = createMemoryStorage();
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage }), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_STORAGE_ERRORS.VALUE_MISSING,
        message: "No analysis result found in storage.",
      },
    });
  }

  {
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage: null }), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_STORAGE_ERRORS.STORAGE_UNAVAILABLE,
        message: "Analysis result storage is unavailable.",
      },
    });
  }

  {
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: "{not-json",
    });
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage }), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_STORAGE_ERRORS.JSON_INVALID,
        message: "Analysis result storage value is not valid JSON.",
      },
    });
  }

  {
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify({ schemaVersion: "stage5b.v1" }),
    });
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage }), {
      ok: false,
      error: {
        code: "ANALYSIS_RESULT_SCHEMA_UNSUPPORTED",
        message: "Unsupported analysis result schema.",
      },
    });
  }

  {
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract({ result: null })),
    });
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage }), {
      ok: false,
      error: {
        code: "ANALYSIS_RESULT_MALFORMED",
        message: "Analysis result is malformed.",
      },
    });
  }

  {
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract({ uiConsumable: null })),
    });
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage }), {
      ok: false,
      error: {
        code: "ANALYSIS_RESULT_UI_FIELD_MISSING",
        message: "Analysis result UI field is missing.",
      },
    });
  }

  {
    const storage = createMemoryStorage({
      customKey: JSON.stringify(analysisContract({
        uiConsumable: {
          ...analysisContract().uiConsumable,
          personaId: "P_CUSTOM_KEY",
        },
      })),
    });
    const response = readLastAnalysisResultFromStorage({ storage, key: "customKey" });

    assert.equal(response.ok, true);
    assert.equal(response.data.uiConsumable.personaId, "P_CUSTOM_KEY");
  }

  {
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract()),
    });
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage, key: "" }), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_STORAGE_ERRORS.KEY_MISSING,
        message: "Analysis result storage key is missing.",
      },
    });
  }

  {
    const throwingStorage = {
      getItem() {
        throw new Error("storage broke");
      },
    };
    assert.deepEqual(readLastAnalysisResultFromStorage({ storage: throwingStorage }), {
      ok: false,
      error: {
        code: ANALYSIS_RESULT_STORAGE_ERRORS.UNKNOWN,
        message: "Unknown analysis storage reader error.",
      },
    });
  }

  {
    const fakeDocument = { touched: false };
    globalThis.document = fakeDocument;
    try {
      const storage = createMemoryStorage({
        [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract()),
      });
      const response = readLastAnalysisResultFromStorage({ storage });

      assert.equal(response.ok, true);
      assert.deepEqual(globalThis.document, fakeDocument);
    } finally {
      delete globalThis.document;
    }
  }

  console.log("Stage 5J analysis storage reader tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
