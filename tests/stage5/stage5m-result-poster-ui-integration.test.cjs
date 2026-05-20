const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const resultScriptPath = path.join(root, "scripts", "palmmi-result.js");
const posterScriptPath = path.join(root, "scripts", "palmmi-poster.js");
const resultPage = require(resultScriptPath);
const posterPage = require(posterScriptPath);
const {
  ANALYSIS_PAGE_STATUSES,
  mapAnalysisStatusToPosterPageState,
  mapAnalysisStatusToResultPageState,
} = require(path.join(root, "src", "stage5", "page-analysis-state-mapper.js"));

function pageData(status = "ok", overrides = {}) {
  return {
    schemaVersion: "analysis-result.v1",
    status,
    persona: {
      id: "P_STAGE5M",
      name: "Stage 5M Persona",
      confidence: 0.87,
    },
    summary: {
      title: "Stage 5M Persona",
      subtitle: "Stage 5M Type",
      shortText: "A safe Stage 5M page summary.",
      keywords: ["stage5m", "safe"],
    },
    scores: {
      overallConfidence: 0.87,
      qualityScore: status === "degraded" ? 0.54 : 0.82,
      matchScore: 0.87,
    },
    sections: [
      {
        key: "HEAD_LINE_LENGTH",
        title: "Head line",
        content: "This is safe user-facing detail.",
        source: "stage5",
      },
    ],
    warnings: status === "degraded" ? ["LOW_CONFIDENCE"] : [],
    uiConsumable: {
      personaId: "P_STAGE5M",
      personaName: "Stage 5M Persona",
      confidence: 0.87,
      status,
      qualityStatus: status === "degraded" ? "WARN" : "PASS",
      primaryDisplayText: "Stage 5M Persona",
      secondaryDisplayText: "A safe Stage 5M page summary.",
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
      model: "stage5m-model",
      generatedAt: "2026-05-18T00:00:00.000Z",
    },
    ...overrides,
  };
}

function resultResponse(status = "ok", overrides = {}) {
  return {
    ok: true,
    page: "result",
    data: pageData(status, overrides),
  };
}

function posterResponse(status = "ok", overrides = {}) {
  const data = pageData(status, overrides);
  return {
    ok: true,
    page: "poster",
    data: {
      schemaVersion: data.schemaVersion,
      status: data.status,
      summary: data.summary,
      poster: {},
      warnings: data.warnings,
      uiConsumable: data.uiConsumable,
      diagnostics: data.diagnostics,
      trace: data.trace,
    },
  };
}

function resultReaderReturning(response, calls) {
  return {
    readResultPageAnalysisData(options) {
      calls.push(options);
      return response;
    },
  };
}

function posterReaderReturning(response, calls) {
  return {
    readPosterPageAnalysisData(options) {
      calls.push(options);
      return response;
    },
  };
}

function assertNoForbiddenFields(value) {
  const json = JSON.stringify(value);
  for (const forbidden of [
    "internal",
    "stage5bResult",
    "provider_output",
    "recognition_result",
    "PalmFeatureSet",
    "RuleInput",
    "RecognitionResult",
    "AnalysisInput",
  ]) {
    assert.equal(json.includes(forbidden), false, `output must not include ${forbidden}`);
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

{
  const resultSource = readSource("scripts/palmmi-result.js");
  const posterSource = readSource("scripts/palmmi-poster.js");
  const integrationSource = `${resultSource}\n${posterSource}`;

  assert.doesNotMatch(integrationSource, /localStorage\s*\.\s*getItem/);
  assert.doesNotMatch(integrationSource, /\bJSON\s*\.\s*parse\b/);
  assert.doesNotMatch(integrationSource, /\bfetch\s*\(/i);
  assert.doesNotMatch(integrationSource, /provider_output|internal\.stage5bResult|recognition_result/);
  assert.equal(Object.values(resultPage.RESULT_STATES).includes("success"), false);
  assert.equal(Object.values(posterPage.POSTER_STATES).includes("success"), false);
}

{
  const resultHtml = readSource("result/index.html");
  const posterHtml = readSource("poster/index.html");

  assert.match(resultHtml, /src="\.\.\/src\/stage5\/page-analysis-reader\.js"/);
  assert.match(resultHtml, /src="\.\.\/src\/stage5\/page-analysis-state-mapper\.js"/);
  assert.match(posterHtml, /src="\.\.\/src\/stage5\/page-analysis-reader\.js"/);
  assert.match(posterHtml, /src="\.\.\/src\/stage5\/page-analysis-state-mapper\.js"/);
}

{
  const calls = [];
  const read = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning(resultResponse("ok"), calls),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });

  assert.equal(calls.length, 1);
  assert.equal(read.ok, true);
  assert.equal(read.state, "ready");
  assert.equal(read.mapping.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS);
  assert.equal(read.result.primary_persona.name, "Stage 5M Persona");
  assert.equal(read.result.primary_persona.persona_id, "P_STAGE5M");
  assert.equal(read.result.status, "SUCCESS");
  assertNoForbiddenFields(read);
}

{
  const missing = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning({
      ok: false,
      page: "result",
      error: { code: "PAGE_ANALYSIS_RESULT_MISSING", message: "missing" },
    }, []),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });
  const invalid = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning({
      ok: false,
      page: "result",
      error: { code: "PAGE_ANALYSIS_RESULT_INVALID", message: "invalid" },
    }, []),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });
  const notReady = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning({
      ok: false,
      page: "result",
      error: { code: "PAGE_ANALYSIS_RESULT_NOT_READY", message: "not ready" },
    }, []),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });

  assert.equal(missing.ok, false);
  assert.equal(missing.state, "missing-result");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.state, "invalid-result");
  assert.equal(notReady.ok, false);
  assert.equal(notReady.state, "partial-result");
}

{
  const failed = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning(resultResponse("failed"), []),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });
  const partial = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning(resultResponse("degraded", {
      diagnostics: {
        ...pageData("degraded").diagnostics,
        lowConfidenceFieldCount: 0,
        missingFieldCount: 1,
      },
      warnings: ["PARTIAL_RESULT"],
    }), []),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });
  const lowConfidence = resultPage.readAnalysisResult({
    pageReader: resultReaderReturning(resultResponse("degraded"), []),
    stateMapper: { mapAnalysisStatusToResultPageState },
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.state, "error");
  assert.equal(failed.mapping.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_FAILED);
  assert.equal(partial.ok, true);
  assert.equal(partial.state, "partial-result");
  assert.equal(partial.mapping.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_PARTIAL);
  assert.equal(lowConfidence.ok, true);
  assert.equal(lowConfidence.state, "partial-result");
  assert.equal(lowConfidence.mapping.requiresWarning, true);
  assert.match(resultPage.createResultViewModel(lowConfidence.result).qualityHintText, /可读性一般|娱乐参考/);
}

{
  const calls = [];
  const read = posterPage.readAnalysisResult({
    pageReader: posterReaderReturning(posterResponse("ok"), calls),
    stateMapper: { mapAnalysisStatusToPosterPageState },
  });

  assert.equal(calls.length, 1);
  assert.equal(read.ok, true);
  assert.equal(read.state, "ready");
  assert.equal(read.mapping.analysisStatus, ANALYSIS_PAGE_STATUSES.ANALYSIS_SUCCESS);
  assert.equal(read.result.primary_persona.name, "Stage 5M Persona");
  assert.equal(read.result.status, "SUCCESS");
  assertNoForbiddenFields(read);
}

{
  const missing = posterPage.readAnalysisResult({
    pageReader: posterReaderReturning({
      ok: false,
      page: "poster",
      error: { code: "PAGE_ANALYSIS_RESULT_MISSING", message: "missing" },
    }, []),
    stateMapper: { mapAnalysisStatusToPosterPageState },
  });
  const invalid = posterPage.readAnalysisResult({
    pageReader: posterReaderReturning({
      ok: false,
      page: "poster",
      error: { code: "PAGE_ANALYSIS_RESULT_INVALID", message: "invalid" },
    }, []),
    stateMapper: { mapAnalysisStatusToPosterPageState },
  });
  const notReady = posterPage.readAnalysisResult({
    pageReader: posterReaderReturning({
      ok: false,
      page: "poster",
      error: { code: "PAGE_ANALYSIS_RESULT_NOT_READY", message: "not ready" },
    }, []),
    stateMapper: { mapAnalysisStatusToPosterPageState },
  });
  const expired = posterPage.readAnalysisResult({
    pageReader: posterReaderReturning({
      ok: false,
      page: "poster",
      error: { code: "ANALYSIS_EXPIRED", message: "expired" },
    }, []),
    stateMapper: { mapAnalysisStatusToPosterPageState },
  });

  assert.equal(missing.ok, false);
  assert.equal(missing.state, "missing-result");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.state, "invalid-result");
  assert.equal(notReady.ok, false);
  assert.equal(notReady.state, "error");
  assert.equal(expired.ok, false);
  assert.equal(expired.state, "error");
  assert.equal(missing.mapping.canRenderPoster, false);
  assert.equal(invalid.mapping.canRenderPoster, false);
  assert.equal(notReady.mapping.canRenderPoster, false);
  assert.equal(expired.mapping.canRenderPoster, false);
}

{
  const lowConfidence = posterPage.readAnalysisResult({
    pageReader: posterReaderReturning(posterResponse("degraded"), []),
    stateMapper: { mapAnalysisStatusToPosterPageState },
  });

  assert.equal(lowConfidence.ok, true);
  assert.equal(lowConfidence.state, "partial-result");
  assert.equal(lowConfidence.mapping.requiresWarning, true);
  assert.match(posterPage.createPosterViewModel(lowConfidence.result).qualityHint, /可读性一般|娱乐参考/);
}

console.log("Stage 5M result/poster UI integration tests passed.");
