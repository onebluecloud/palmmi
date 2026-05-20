const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const mapperPath = path.join(root, "src", "stage5", "page-analysis-state-mapper.js");

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
      assert.equal(forbiddenKeys.has(key), false, `state mapper must not expose ${key}`);
      walk(child);
    }
  }

  walk(value);
}

function resultPayload(status = "ok", overrides = {}) {
  return {
    ok: true,
    page: "result",
    data: {
      schemaVersion: "analysis-result.v1",
      status,
      persona: {
        id: "P_STAGE5L",
        name: "Stage 5L Persona",
        confidence: 0.88,
      },
      summary: {
        title: "Stage 5L Persona",
        subtitle: "State mapping",
        shortText: "Safe result.",
        keywords: ["state"],
      },
      scores: {
        overallConfidence: 0.88,
        qualityScore: 0.72,
        matchScore: 0.88,
      },
      sections: [],
      warnings: status === "degraded" ? ["LOW_CONFIDENCE"] : [],
      uiConsumable: {
        personaId: "P_STAGE5L",
        personaName: "Stage 5L Persona",
        confidence: 0.88,
        status,
        qualityStatus: status === "degraded" ? "WARN" : "PASS",
        primaryDisplayText: "Stage 5L Persona",
        secondaryDisplayText: "Safe result.",
        warningBadges: status === "degraded" ? ["LOW_CONFIDENCE"] : [],
      },
      diagnostics: {
        lowConfidenceFieldCount: status === "degraded" ? 1 : 0,
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
        sourceImage: null,
        provider: "mock",
        model: "stage5l-model",
        generatedAt: "2026-05-18T00:00:00.000Z",
      },
    },
    ...overrides,
  };
}

function posterPayload(status = "ok", overrides = {}) {
  return {
    ok: true,
    page: "poster",
    data: {
      schemaVersion: "analysis-result.v1",
      status,
      summary: {
        title: "Stage 5L Persona",
        subtitle: "State mapping",
        shortText: "Safe poster copy.",
        keywords: ["poster"],
      },
      poster: {},
      warnings: status === "degraded" ? ["LOW_CONFIDENCE"] : [],
      uiConsumable: {
        personaId: "P_STAGE5L",
        personaName: "Stage 5L Persona",
        confidence: 0.88,
        status,
        qualityStatus: status === "degraded" ? "WARN" : "PASS",
        primaryDisplayText: "Stage 5L Persona",
        secondaryDisplayText: "Safe poster copy.",
        warningBadges: status === "degraded" ? ["LOW_CONFIDENCE"] : [],
      },
      diagnostics: {
        lowConfidenceFieldCount: status === "degraded" ? 1 : 0,
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
        sourceImage: null,
        provider: "mock",
        model: "stage5l-model",
        generatedAt: "2026-05-18T00:00:00.000Z",
      },
    },
    ...overrides,
  };
}

async function main() {
  const source = fs.readFileSync(mapperPath, "utf8");
  assert.equal(/\blocalStorage\b/.test(source), false);
  assert.equal(/JSON\s*\.\s*parse/.test(source), false);
  assert.equal(/\bdocument\b/.test(source), false);
  assert.equal(/\bquerySelector\b/.test(source), false);
  assert.equal(/\bgetElementById\b/.test(source), false);
  assert.equal(/\bcreateElement\b/.test(source), false);
  assert.equal(/\binnerHTML\b/.test(source), false);
  assert.equal(/\baddEventListener\b/.test(source), false);
  assert.equal(/\bfetch\b/.test(source), false);
  assert.equal(/\brequire\s*\(/.test(source), false);

  const {
    ANALYSIS_PAGE_STATUSES,
    STAGE4_PAGE_STATES,
    mapAnalysisStatusToPageState,
    mapAnalysisStatusToPosterPageState,
    mapAnalysisStatusToResultPageState,
  } = require(mapperPath);

  {
    const mapped = mapAnalysisStatusToResultPageState(ANALYSIS_PAGE_STATUSES.PAGE_RESULT_MISSING);
    assert.equal(mapped.analysisStatus, ANALYSIS_PAGE_STATUSES.PAGE_RESULT_MISSING);
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.MISSING_RESULT);
    assert.equal(mapped.canRenderResult, false);
    assert.equal(mapped.canRenderPoster, false);
    assert.equal(mapped.shouldRedirectToUpload, true);
    assert.equal(mapped.shouldShowRetry, true);
    assert.equal(mapped.severity, "error");
    assertNoForbiddenFields(mapped);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState(ANALYSIS_PAGE_STATUSES.PAGE_RESULT_INVALID);
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.INVALID_RESULT);
    assert.equal(mapped.canRenderResult, false);
    assert.equal(mapped.canRenderPoster, false);
    assert.equal(mapped.shouldRedirectToUpload, true);
    assert.equal(mapped.shouldShowRetry, true);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState(ANALYSIS_PAGE_STATUSES.PAGE_RESULT_NOT_READY);
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(mapped.canRenderResult, false);
    assert.equal(mapped.allowsPartialResult, false);
    assert.equal(mapped.canRenderPoster, false);
    assert.equal(mapped.shouldShowRetry, true);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState({
      status: ANALYSIS_PAGE_STATUSES.PAGE_RESULT_NOT_READY,
      hasPersona: true,
    });
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(mapped.canRenderResult, true);
    assert.equal(mapped.allowsPartialResult, true);
    assert.equal(mapped.canRenderPoster, false);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState(ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS);
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.READY);
    assert.equal(mapped.canRenderResult, true);
    assert.equal(mapped.canRenderPoster, true);
    assert.equal(mapped.shouldRedirectToUpload, false);
    assert.equal(mapped.shouldShowRetry, false);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState(ANALYSIS_PAGE_STATUSES.ANALYSIS_FAILED);
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.ERROR);
    assert.equal(mapped.canRenderResult, false);
    assert.equal(mapped.canRenderPoster, false);
    assert.equal(mapped.shouldRedirectToUpload, true);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState({
      status: ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL,
      hasPersona: true,
    });
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(mapped.canRenderResult, true);
    assert.equal(mapped.allowsPartialResult, true);
    assert.equal(mapped.canRenderPoster, false);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState({
      status: ANALYSIS_PAGE_STATUSES.ANALYSIS_LOW_CONFIDENCE,
      hasPersona: true,
    });
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(mapped.canRenderResult, true);
    assert.equal(mapped.requiresWarning, true);
    assert.equal(mapped.canRenderPoster, false);
  }

  {
    const mapped = mapAnalysisStatusToResultPageState(ANALYSIS_PAGE_STATUSES.ANALYSIS_EXPIRED);
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.MISSING_RESULT);
    assert.equal(mapped.canRenderResult, false);
    assert.equal(mapped.canRenderPoster, false);
    assert.equal(mapped.shouldRedirectToUpload, true);
  }

  {
    const missing = mapAnalysisStatusToPosterPageState(ANALYSIS_PAGE_STATUSES.PAGE_RESULT_MISSING);
    const invalid = mapAnalysisStatusToPosterPageState(ANALYSIS_PAGE_STATUSES.PAGE_RESULT_INVALID);
    const notReady = mapAnalysisStatusToPosterPageState(ANALYSIS_PAGE_STATUSES.PAGE_RESULT_NOT_READY);
    assert.equal(missing.pageState, STAGE4_PAGE_STATES.MISSING_RESULT);
    assert.equal(invalid.pageState, STAGE4_PAGE_STATES.INVALID_RESULT);
    assert.equal(notReady.pageState, STAGE4_PAGE_STATES.ERROR);
    assert.equal(missing.canRenderPoster, false);
    assert.equal(invalid.canRenderPoster, false);
    assert.equal(notReady.canRenderPoster, false);
    assert.equal(notReady.isPosterBlocked, true);
  }

  {
    const partial = mapAnalysisStatusToPosterPageState({
      status: ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL,
      hasPersona: true,
      hasCompletePosterPayload: false,
    });
    const lowConfidence = mapAnalysisStatusToPosterPageState({
      status: ANALYSIS_PAGE_STATUSES.ANALYSIS_LOW_CONFIDENCE,
      hasPersona: true,
      hasCompletePosterPayload: true,
    });
    assert.equal(partial.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(partial.canRenderPoster, false);
    assert.equal(partial.isPosterBlocked, true);
    assert.equal(lowConfidence.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(lowConfidence.canRenderPoster, true);
    assert.equal(lowConfidence.requiresWarning, true);
  }

  {
    const unknown = mapAnalysisStatusToResultPageState("SOMETHING_NEW");
    assert.equal(unknown.analysisStatus, ANALYSIS_PAGE_STATUSES.UNKNOWN);
    assert.equal(unknown.pageState, STAGE4_PAGE_STATES.ERROR);
    assert.equal(unknown.usesFallback, true);
    assert.equal(unknown.canRenderResult, false);
    assert.doesNotThrow(() => mapAnalysisStatusToPosterPageState({ status: "SOMETHING_NEW" }));
  }

  {
    const input = {
      status: ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL,
      hasPersona: true,
      hasCompletePosterPayload: false,
      nested: {
        untouched: true,
      },
    };
    const before = clone(input);
    const mapped = mapAnalysisStatusToResultPageState(input);
    mapped.message = "mutated output";
    assert.deepEqual(input, before);
  }

  {
    const missing = mapAnalysisStatusToResultPageState({
      ok: false,
      page: "result",
      error: {
        code: "PAGE_ANALYSIS_RESULT_MISSING",
        message: "No analysis result is available for this page.",
      },
    });
    const invalid = mapAnalysisStatusToPosterPageState({
      ok: false,
      page: "poster",
      error: {
        code: "PAGE_ANALYSIS_RESULT_INVALID",
        message: "Analysis result is not valid for this page.",
      },
    });
    assert.equal(missing.pageState, STAGE4_PAGE_STATES.MISSING_RESULT);
    assert.equal(invalid.pageState, STAGE4_PAGE_STATES.INVALID_RESULT);
  }

  {
    const success = mapAnalysisStatusToResultPageState(resultPayload("ok"));
    const lowConfidence = mapAnalysisStatusToResultPageState(resultPayload("degraded"));
    const failed = mapAnalysisStatusToResultPageState(resultPayload("failed"));
    const posterSuccess = mapAnalysisStatusToPosterPageState(posterPayload("ok"));

    assert.equal(success.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS);
    assert.equal(success.pageState, STAGE4_PAGE_STATES.READY);
    assert.equal(lowConfidence.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_LOW_CONFIDENCE);
    assert.equal(lowConfidence.pageState, STAGE4_PAGE_STATES.PARTIAL_RESULT);
    assert.equal(lowConfidence.requiresWarning, true);
    assert.equal(failed.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_FAILED);
    assert.equal(failed.pageState, STAGE4_PAGE_STATES.ERROR);
    assert.equal(posterSuccess.pageState, STAGE4_PAGE_STATES.READY);
    assert.equal(posterSuccess.canRenderPoster, true);
  }

  {
    const mapped = mapAnalysisStatusToPageState("poster", {
      status: ANALYSIS_PAGE_STATUSES.ANALYSIS_EXPIRED,
    });
    assert.equal(mapped.page, "poster");
    assert.equal(mapped.pageState, STAGE4_PAGE_STATES.ERROR);
    assert.equal(mapped.shouldRedirectToUpload, true);
    assert.equal(mapped.canRenderPoster, false);
    assertNoForbiddenFields(mapped);
  }

  console.log("Stage 5L page analysis state mapper tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
