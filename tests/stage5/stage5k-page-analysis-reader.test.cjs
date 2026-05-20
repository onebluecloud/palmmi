const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const pageReaderPath = path.join(root, "src", "stage5", "page-analysis-reader.js");
const storageReaderPath = path.join(root, "src", "stage5", "analysis-result-storage-reader.js");

const {
  ANALYSIS_RESULT_STORAGE_KEY,
} = require(storageReaderPath);

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
        id: "P_STAGE5K",
        name: "Stage 5K Persona",
        confidence: 0.91,
        PalmFeatureSet: {
          leaked: true,
        },
      },
      summary: {
        title: "Stage 5K Persona",
        subtitle: "Page reader",
        shortText: "Safe page data.",
        keywords: ["page", "safe"],
        RecognitionResult: {
          leaked: true,
        },
      },
      scores: {
        overallConfidence: 0.91,
        qualityScore: 0.82,
        matchScore: 0.91,
        RuleInput: {
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
      warnings: ["SAFE_WARNING"],
      recognition_result: {
        debug: {
          leaked: true,
        },
      },
    },
    uiConsumable: {
      personaId: "P_STAGE5K",
      personaName: "Stage 5K Persona",
      confidence: 0.91,
      status: "ok",
      qualityStatus: "PASS",
      primaryDisplayText: "Stage 5K Persona",
      secondaryDisplayText: "Safe page data.",
      warningBadges: ["SAFE_WARNING"],
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
      sourceImage: "fixtures/stage5k-palm.jpg",
      provider: "mock",
      model: "stage5k-model",
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
        PalmFeatureSet: {
          raw: true,
        },
        RuleInput: {
          raw: true,
        },
        AnalysisInput: {
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

function uiReadableAnalysis(overrides = {}) {
  return {
    schemaVersion: "analysis-result.v1",
    status: "ok",
    result: {
      persona: {
        id: "P_STAGE5K",
        name: "Stage 5K Persona",
        confidence: 0.91,
      },
      summary: {
        title: "Stage 5K Persona",
        subtitle: "Page reader",
        shortText: "Safe page data.",
        keywords: ["page", "safe"],
      },
      scores: {
        overallConfidence: 0.91,
        qualityScore: 0.82,
        matchScore: 0.91,
      },
      sections: [
        {
          key: "persona",
          title: "Persona",
          content: "Safe section.",
          source: "stage5b",
        },
      ],
      warnings: ["SAFE_WARNING"],
    },
    uiConsumable: {
      personaId: "P_STAGE5K",
      personaName: "Stage 5K Persona",
      confidence: 0.91,
      status: "ok",
      qualityStatus: "PASS",
      primaryDisplayText: "Stage 5K Persona",
      secondaryDisplayText: "Safe page data.",
      warningBadges: ["SAFE_WARNING"],
    },
    diagnostics: {
      lowConfidenceFieldCount: 0,
      missingFieldCount: 0,
      unknownFieldCount: 0,
      adapterWarnings: [],
      providerWarnings: [],
      matcherWarnings: [],
      contractWarnings: [],
    },
    trace: {
      stage: "5H",
      from: "stage5b.v1",
      contract: "analysis-result.v1",
      sourceImage: "fixtures/stage5k-palm.jpg",
      provider: "mock",
      model: "stage5k-model",
      generatedAt: "2026-05-18T00:00:00.000Z",
    },
    ...overrides,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNoForbiddenFields(value) {
  const forbiddenKeys = new Set([
    "internal",
    "stage5bResult",
    "provider_output",
    "recognition_result",
    "debug",
    "PalmFeatureSet",
    "RuleInput",
    "RecognitionResult",
    "AnalysisInput",
    "analysis_input",
  ]);

  function walk(node) {
    if (!node || typeof node !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      assert.equal(forbiddenKeys.has(key), false, `page reader must not expose ${key}`);
      walk(child);
    }
  }

  walk(value);
}

function loadFreshPageReader() {
  delete require.cache[require.resolve(pageReaderPath)];
  return require(pageReaderPath);
}

function withStubbedStorageReader(stub, callback) {
  const storageModule = require(storageReaderPath);
  const original = storageModule.readLastAnalysisResultFromStorage;
  storageModule.readLastAnalysisResultFromStorage = stub;
  delete require.cache[require.resolve(pageReaderPath)];
  try {
    return callback(require(pageReaderPath));
  } finally {
    storageModule.readLastAnalysisResultFromStorage = original;
    delete require.cache[require.resolve(pageReaderPath)];
  }
}

async function main() {
  const pageReaderSource = fs.readFileSync(pageReaderPath, "utf8");
  assert.equal(/\blocalStorage\b/.test(pageReaderSource), false);
  assert.equal(/JSON\s*\.\s*parse/.test(pageReaderSource), false);
  assert.equal(/\bdocument\b/.test(pageReaderSource), false);
  assert.equal(/\bquerySelector\b/.test(pageReaderSource), false);
  assert.equal(/\bgetElementById\b/.test(pageReaderSource), false);
  assert.equal(/\bcreateElement\b/.test(pageReaderSource), false);
  assert.equal(/\binnerHTML\b/.test(pageReaderSource), false);
  assert.equal(/\baddEventListener\b/.test(pageReaderSource), false);

  {
    const source = analysisContract();
    const sourceBefore = clone(source);
    const raw = JSON.stringify(source);
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: raw,
    });
    const resultFileBefore = fs.readFileSync(path.join(root, "result", "index.html"), "utf8");
    const posterFileBefore = fs.readFileSync(path.join(root, "poster", "index.html"), "utf8");
    const {
      readResultPageAnalysisData,
      readPosterPageAnalysisData,
    } = loadFreshPageReader();

    const resultResponse = readResultPageAnalysisData({ storage });
    const posterResponse = readPosterPageAnalysisData({ storage });

    assert.deepEqual(source, sourceBefore);
    assert.equal(storage.getItem(ANALYSIS_RESULT_STORAGE_KEY), raw);
    assert.equal(resultFileBefore, fs.readFileSync(path.join(root, "result", "index.html"), "utf8"));
    assert.equal(posterFileBefore, fs.readFileSync(path.join(root, "poster", "index.html"), "utf8"));
    assert.equal(resultResponse.ok, true);
    assert.equal(resultResponse.page, "result");
    assert.equal(resultResponse.data.schemaVersion, "analysis-result.v1");
    assert.equal(resultResponse.data.status, "ok");
    assert.deepEqual(resultResponse.data.persona, {
      id: "P_STAGE5K",
      name: "Stage 5K Persona",
      confidence: 0.91,
    });
    assert.deepEqual(resultResponse.data.summary, {
      title: "Stage 5K Persona",
      subtitle: "Page reader",
      shortText: "Safe page data.",
      keywords: ["page", "safe"],
    });
    assert.deepEqual(resultResponse.data.scores, {
      overallConfidence: 0.91,
      qualityScore: 0.82,
      matchScore: 0.91,
    });
    assert.deepEqual(resultResponse.data.sections, [
      {
        key: "persona",
        title: "Persona",
        content: "Safe section.",
        source: "stage5b",
      },
    ]);
    assert.deepEqual(resultResponse.data.warnings, ["SAFE_WARNING"]);
    assert.deepEqual(resultResponse.data.uiConsumable, {
      personaId: "P_STAGE5K",
      personaName: "Stage 5K Persona",
      confidence: 0.91,
      status: "ok",
      qualityStatus: "PASS",
      primaryDisplayText: "Stage 5K Persona",
      secondaryDisplayText: "Safe page data.",
      warningBadges: ["SAFE_WARNING"],
    });
    assertNoForbiddenFields(resultResponse);

    assert.equal(posterResponse.ok, true);
    assert.equal(posterResponse.page, "poster");
    assert.equal(posterResponse.data.schemaVersion, "analysis-result.v1");
    assert.equal(posterResponse.data.status, "ok");
    assert.deepEqual(posterResponse.data.summary, resultResponse.data.summary);
    assert.deepEqual(posterResponse.data.poster, {});
    assert.deepEqual(posterResponse.data.warnings, ["SAFE_WARNING"]);
    assert.deepEqual(posterResponse.data.uiConsumable, resultResponse.data.uiConsumable);
    assertNoForbiddenFields(posterResponse);
  }

  {
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract()),
    });
    const calls = [];
    withStubbedStorageReader((options) => {
      calls.push(options);
      return {
        ok: true,
        data: uiReadableAnalysis(),
      };
    }, ({
      readResultPageAnalysisData,
      readPosterPageAnalysisData,
    }) => {
      const resultResponse = readResultPageAnalysisData({ storage, key: "custom-result-key" });
      const posterResponse = readPosterPageAnalysisData({ storage, key: "custom-poster-key" });

      assert.equal(resultResponse.ok, true);
      assert.equal(posterResponse.ok, true);
      assert.equal(calls.length, 2);
      assert.strictEqual(calls[0].storage, storage);
      assert.equal(calls[0].key, "custom-result-key");
      assert.strictEqual(calls[1].storage, storage);
      assert.equal(calls[1].key, "custom-poster-key");
    });
  }

  {
    const inputData = uiReadableAnalysis();
    const inputBefore = clone(inputData);
    withStubbedStorageReader(() => ({
      ok: true,
      data: inputData,
    }), ({ readResultPageAnalysisData }) => {
      const response = readResultPageAnalysisData();

      assert.deepEqual(inputData, inputBefore);
      response.data.persona.id = "MUTATED_OUTPUT";
      response.data.uiConsumable.warningBadges.push("MUTATED_OUTPUT");
      assert.deepEqual(inputData, inputBefore);
    });
  }

  {
    const {
      PAGE_ANALYSIS_ERRORS,
      readResultPageAnalysisData,
    } = loadFreshPageReader();

    assert.deepEqual(readResultPageAnalysisData({ storage: null }), {
      ok: false,
      page: "result",
      error: {
        code: PAGE_ANALYSIS_ERRORS.STORAGE_READ_FAILED,
        message: "Analysis result storage could not be read for this page.",
      },
    });
  }

  {
    const {
      PAGE_ANALYSIS_ERRORS,
      readResultPageAnalysisData,
    } = loadFreshPageReader();
    const storage = createMemoryStorage();

    assert.deepEqual(readResultPageAnalysisData({ storage }), {
      ok: false,
      page: "result",
      error: {
        code: PAGE_ANALYSIS_ERRORS.RESULT_MISSING,
        message: "No analysis result is available for this page.",
      },
    });
  }

  {
    const {
      PAGE_ANALYSIS_ERRORS,
      readPosterPageAnalysisData,
    } = loadFreshPageReader();
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: "{not-json",
    });

    assert.deepEqual(readPosterPageAnalysisData({ storage }), {
      ok: false,
      page: "poster",
      error: {
        code: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
        message: "Analysis result is not valid for this page.",
      },
    });
  }

  {
    const {
      PAGE_ANALYSIS_ERRORS,
      readResultPageAnalysisData,
    } = loadFreshPageReader();
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify({ schemaVersion: "stage5b.v1" }),
    });

    assert.deepEqual(readResultPageAnalysisData({ storage }), {
      ok: false,
      page: "result",
      error: {
        code: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
        message: "Analysis result is not valid for this page.",
      },
    });
  }

  {
    const {
      PAGE_ANALYSIS_ERRORS,
      readPosterPageAnalysisData,
    } = loadFreshPageReader();
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract({ result: null })),
    });

    assert.deepEqual(readPosterPageAnalysisData({ storage }), {
      ok: false,
      page: "poster",
      error: {
        code: PAGE_ANALYSIS_ERRORS.RESULT_INVALID,
        message: "Analysis result is not valid for this page.",
      },
    });
  }

  {
    const { readResultPageAnalysisData } = loadFreshPageReader();
    const storage = createMemoryStorage({
      [ANALYSIS_RESULT_STORAGE_KEY]: JSON.stringify(analysisContract({ status: "failed" })),
    });

    const response = readResultPageAnalysisData({ storage });
    assert.equal(response.ok, true);
    assert.equal(response.page, "result");
    assert.equal(response.data.status, "failed");
    assert.deepEqual(response.data.persona, {
      id: "P_STAGE5K",
      name: "Stage 5K Persona",
      confidence: 0.91,
    });
    assertNoForbiddenFields(response);
  }

  {
    const {
      PAGE_ANALYSIS_ERRORS,
      readPageAnalysisData,
    } = loadFreshPageReader();

    assert.deepEqual(readPageAnalysisData("share"), {
      ok: false,
      page: "share",
      error: {
        code: PAGE_ANALYSIS_ERRORS.UNSUPPORTED_PAGE,
        message: "Unsupported analysis page.",
      },
    });
  }

  {
    withStubbedStorageReader(() => {
      throw new Error("unexpected reader failure");
    }, ({
      PAGE_ANALYSIS_ERRORS,
      readResultPageAnalysisData,
    }) => {
      assert.deepEqual(readResultPageAnalysisData(), {
        ok: false,
        page: "result",
        error: {
          code: PAGE_ANALYSIS_ERRORS.UNKNOWN,
          message: "Unknown page analysis reader error.",
        },
      });
    });
  }

  console.log("Stage 5K page analysis reader tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
