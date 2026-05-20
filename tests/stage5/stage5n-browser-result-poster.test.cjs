const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..", "..");
const storageKey = "palmmi:lastAnalysisResult";

const forbiddenDomTokens = [
  "internal",
  "provider_output",
  "recognition_result.debug",
  "PalmFeatureSet",
  "RuleInput",
  "RecognitionResult",
  "AnalysisInput",
];

function newestDirectory(directories) {
  return directories
    .map((directory) => ({
      directory,
      mtimeMs: fs.statSync(directory).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.directory || null;
}

function findCachedPlaywrightPackage() {
  const npmCache = childProcess.execSync("npm config get cache", { encoding: "utf8" }).trim();
  const npxCache = path.join(npmCache, "_npx");
  if (!fs.existsSync(npxCache)) {
    return null;
  }

  const candidates = fs.readdirSync(npxCache)
    .map((entry) => path.join(npxCache, entry, "node_modules", "playwright"))
    .filter((candidate) => fs.existsSync(path.join(candidate, "index.js")));

  return newestDirectory(candidates);
}

function findCachedChromiumExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return null;
  }

  const browserCache = path.join(localAppData, "ms-playwright");
  if (!fs.existsSync(browserCache)) {
    return null;
  }

  const candidates = fs.readdirSync(browserCache)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .map((entry) => path.join(browserCache, entry))
    .filter((directory) => fs.existsSync(path.join(directory, "chrome-win64", "chrome.exe")));
  const chromiumDirectory = newestDirectory(candidates);

  return chromiumDirectory ? path.join(chromiumDirectory, "chrome-win64", "chrome.exe") : null;
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    childProcess.execSync("npx --yes playwright --version", { stdio: "ignore" });
    const cachedPackage = findCachedPlaywrightPackage();
    if (!cachedPackage) {
      throw new Error("Playwright is not available from local dependencies or npx cache.");
    }
    return require(cachedPackage);
  }
}

function pageUrl(pageName) {
  return pathToFileURL(path.join(root, pageName, "index.html")).href;
}

function baseAnalysisResult(overrides = {}) {
  const status = overrides.status || "ok";
  const isDegraded = status === "degraded";
  const warnings = overrides.warnings || (isDegraded ? ["LOW_CONFIDENCE"] : []);
  const diagnostics = {
    lowConfidenceFieldCount: isDegraded ? 1 : 0,
    missingFieldCount: 0,
    unknownFieldCount: 0,
    adapterWarnings: [],
    providerWarnings: [],
    matcherWarnings: [],
    contractWarnings: [],
    ...(overrides.diagnostics || {}),
  };

  return {
    schemaVersion: "analysis-result.v1",
    sourceSchemaVersion: "stage5b.v1",
    status,
    result: {
      persona: {
        id: "P_STAGE5N",
        name: "Stage 5N Persona",
        confidence: 0.89,
        PalmFeatureSet: "must not render",
      },
      summary: {
        title: "Stage 5N Persona",
        subtitle: "Stage 5N Type",
        shortText: "A safe Stage 5N browser summary.",
        keywords: ["stage5n", "browser"],
        RecognitionResult: "must not render",
      },
      scores: {
        overallConfidence: 0.89,
        qualityScore: isDegraded ? 0.51 : 0.84,
        matchScore: 0.89,
        RuleInput: "must not render",
      },
      sections: [
        {
          key: "HEAD_LINE_LENGTH",
          title: "Head line",
          content: "Safe user-facing Stage 5N detail.",
          source: "stage5n",
        },
      ],
      warnings,
      recognition_result: {
        debug: "recognition_result.debug",
      },
    },
    uiConsumable: {
      personaId: "P_STAGE5N",
      personaName: "Stage 5N Persona",
      confidence: 0.89,
      status,
      qualityStatus: isDegraded ? "WARN" : "PASS",
      primaryDisplayText: "Stage 5N Persona",
      secondaryDisplayText: "A safe Stage 5N browser summary.",
      warningBadges: warnings,
      internal: "must not render",
    },
    diagnostics: {
      ...diagnostics,
      provider_output: "must not render",
    },
    trace: {
      stage: "5N",
      from: "stage5b.v1",
      contract: "analysis-result.v1",
      sourceImage: null,
      provider: "mock",
      model: "stage5n-browser-fixture",
      generatedAt: "2026-05-18T00:00:00.000Z",
      AnalysisInput: "must not render",
    },
    internal: {
      stage5bResult: {
        provider_output: "must not render",
      },
    },
    provider_output: "must not render",
    recognition_result: {
      debug: "recognition_result.debug",
    },
    ...overrides.extra,
  };
}

function rawAnalysisResult(overrides = {}) {
  return JSON.stringify(baseAnalysisResult(overrides));
}

function resultPageResponse(status) {
  if (status === "PAGE_ANALYSIS_RESULT_NOT_READY") {
    return {
      ok: false,
      page: "result",
      error: {
        code: "PAGE_ANALYSIS_RESULT_NOT_READY",
        message: "not ready",
      },
    };
  }
  if (status === "ANALYSIS_EXPIRED") {
    return {
      ok: false,
      page: "result",
      error: {
        code: "ANALYSIS_EXPIRED",
        message: "expired",
      },
    };
  }
  throw new Error(`Unsupported result fixture status: ${status}`);
}

function posterPageResponse(status) {
  if (status === "PAGE_ANALYSIS_RESULT_NOT_READY") {
    return {
      ok: false,
      page: "poster",
      error: {
        code: "PAGE_ANALYSIS_RESULT_NOT_READY",
        message: "not ready",
      },
    };
  }
  if (status === "ANALYSIS_EXPIRED") {
    return {
      ok: false,
      page: "poster",
      error: {
        code: "ANALYSIS_EXPIRED",
        message: "expired",
      },
    };
  }
  throw new Error(`Unsupported poster fixture status: ${status}`);
}

async function openPalmmiPage(browser, pageName, fixture) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const browserSignals = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserSignals.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    browserSignals.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.startsWith("file:")) {
      browserSignals.requestFailures.push(`${url} ${request.failure() && request.failure().errorText}`);
    }
  });

  await page.addInitScript(({ hasRaw, raw, storageKey: key }) => {
    window.__stage5nUnhandledRejections = [];
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      window.__stage5nUnhandledRejections.push(reason && reason.message ? reason.message : String(reason));
    });

    try {
      sessionStorage.clear();
      if (hasRaw) {
        sessionStorage.setItem(key, raw);
      }
    } catch (error) {
      window.__stage5nStorageSetupError = error && error.message ? error.message : String(error);
    }
  }, {
    hasRaw: Object.prototype.hasOwnProperty.call(fixture, "raw"),
    raw: fixture.raw || "",
    storageKey,
  });

  await page.goto(pageUrl(pageName), { waitUntil: "domcontentloaded" });
  await waitForPageState(page, pageName);

  if (fixture.pageResponse) {
    await page.evaluate(({ pageName: targetPageName, response }) => {
      const isResult = targetPageName === "result";
      const api = isResult ? window.PalmmiResult : window.PalmmiPoster;
      const init = isResult ? api.initResultPage : api.initPosterPage;
      const readerName = isResult ? "readResultPageAnalysisData" : "readPosterPageAnalysisData";
      const fakeReader = {
        [readerName]: () => response,
      };

      init(document, {
        pageReader: fakeReader,
        stateMapper: window.PalmmiPageAnalysisStateMapper,
        location: { search: "" },
      });
    }, {
      pageName,
      response: fixture.pageResponse,
    });
    await waitForPageState(page, pageName);
  }

  return { page, browserSignals };
}

async function waitForPageState(page, pageName) {
  const selector = pageName === "result" ? "#resultApp" : "#posterApp";
  await page.waitForFunction((rootSelector) => {
    const root = document.querySelector(rootSelector);
    return Boolean(root && root.dataset.state && root.dataset.state !== "loading");
  }, selector);
}

async function readPageState(page, pageName) {
  return page.evaluate((targetPageName) => {
    const isResult = targetPageName === "result";
    const root = document.querySelector(isResult ? "#resultApp" : "#posterApp");
    const ready = document.querySelector(isResult ? "#resultReady" : "#posterReady");
    const problem = document.querySelector(isResult ? "#resultProblem" : "#posterProblem");
    const bodyState = isResult ? document.body.dataset.resultState : document.body.dataset.posterState;
    const api = isResult ? window.PalmmiResult : window.PalmmiPoster;
    const states = isResult ? api.RESULT_STATES : api.POSTER_STATES;

    return {
      rootState: root && root.dataset.state,
      bodyState,
      readyHidden: ready ? ready.hidden : null,
      problemHidden: problem ? problem.hidden : null,
      stateValues: Object.values(states),
      dom: document.body.outerHTML,
      globals: {
        readAdapter: Boolean(window.PalmmiAnalysisResultReadAdapter),
        storageReader: Boolean(window.PalmmiAnalysisResultStorageReader),
        pageReader: Boolean(window.PalmmiPageAnalysisReader),
        stateMapper: Boolean(window.PalmmiPageAnalysisStateMapper),
        pageScript: Boolean(api),
      },
      warningText: isResult
        ? ((document.querySelector("#resultQualityHintCopy") || {}).textContent || "")
        : ((document.querySelector("#posterQualityHint") || {}).textContent || ""),
      readDebug: (() => {
        try {
          const pageResponse = isResult
            ? window.PalmmiPageAnalysisReader.readResultPageAnalysisData()
            : window.PalmmiPageAnalysisReader.readPosterPageAnalysisData();
          const pageRead = api.readAnalysisResult();
          return { pageResponse, pageRead };
        } catch (error) {
          return { error: error && error.message ? error.message : String(error) };
        }
      })(),
      storageSetupError: window.__stage5nStorageSetupError || "",
      unhandledRejections: window.__stage5nUnhandledRejections || [],
    };
  }, pageName);
}

async function assertBrowserClean(page, browserSignals) {
  const unhandledRejections = await page.evaluate(() => window.__stage5nUnhandledRejections || []);
  assert.deepEqual(browserSignals.consoleErrors, [], "browser console must not contain console.error entries");
  assert.deepEqual(browserSignals.pageErrors, [], "page must not throw runtime errors");
  assert.deepEqual(browserSignals.requestFailures, [], "page must not have file script load failures");
  assert.deepEqual(unhandledRejections, [], "page must not have unhandled promise rejections");
}

async function assertScenario(page, pageName, expected) {
  const snapshot = await readPageState(page, pageName);
  const diagnostic = JSON.stringify({
    rootState: snapshot.rootState,
    bodyState: snapshot.bodyState,
    readyHidden: snapshot.readyHidden,
    problemHidden: snapshot.problemHidden,
    globals: snapshot.globals,
    storageSetupError: snapshot.storageSetupError,
    unhandledRejections: snapshot.unhandledRejections,
    warningText: snapshot.warningText,
    readDebug: snapshot.readDebug,
  });

  assert.equal(snapshot.storageSetupError, "", "fixture storage setup should not fail");
  assert.equal(snapshot.rootState, expected.state, `${pageName} root state ${diagnostic}`);
  assert.equal(snapshot.bodyState, expected.state, `${pageName} body state ${diagnostic}`);
  assert.equal(snapshot.readyHidden, !expected.readyVisible, `${pageName} ready visibility`);
  assert.equal(snapshot.problemHidden, expected.readyVisible, `${pageName} problem visibility`);
  assert.equal(snapshot.stateValues.includes("success"), false, `${pageName} must not define a success state`);
  assert.equal(snapshot.rootState === "success" || snapshot.bodyState === "success", false, `${pageName} must not render success state`);
  assert.deepEqual(snapshot.unhandledRejections, [], `${pageName} must not collect unhandled rejections`);

  for (const [name, present] of Object.entries(snapshot.globals)) {
    assert.equal(present, true, `${pageName} script global should load: ${name}`);
  }

  for (const forbidden of forbiddenDomTokens) {
    assert.equal(snapshot.dom.includes(forbidden), false, `${pageName} DOM must not expose ${forbidden}`);
  }

  if (expected.warning) {
    assert.match(snapshot.warningText, /可读性一般|娱乐参考|部分字段|优先/, `${pageName} should show a warning`);
  }
}

const resultScenarios = [
  {
    name: "ANALYSIS_SUCCESS -> ready",
    fixture: { raw: rawAnalysisResult({ status: "ok" }) },
    expected: { state: "ready", readyVisible: true },
    screenshot: true,
  },
  {
    name: "PAGE_ANALYSIS_RESULT_MISSING -> missing-result",
    fixture: {},
    expected: { state: "missing-result", readyVisible: false },
  },
  {
    name: "PAGE_ANALYSIS_RESULT_INVALID -> invalid-result",
    fixture: { raw: "{not json" },
    expected: { state: "invalid-result", readyVisible: false },
  },
  {
    name: "PAGE_ANALYSIS_RESULT_NOT_READY -> partial-result",
    fixture: { pageResponse: resultPageResponse("PAGE_ANALYSIS_RESULT_NOT_READY") },
    expected: { state: "partial-result", readyVisible: false },
  },
  {
    name: "ANALYSIS_FAILED -> error",
    fixture: { raw: rawAnalysisResult({ status: "failed" }) },
    expected: { state: "error", readyVisible: false },
  },
  {
    name: "ANALYSIS_PARTIAL -> partial-result",
    fixture: {
      raw: rawAnalysisResult({
        status: "degraded",
        warnings: ["PARTIAL_RESULT"],
        diagnostics: {
          lowConfidenceFieldCount: 0,
          missingFieldCount: 1,
        },
      }),
    },
    expected: { state: "partial-result", readyVisible: true },
  },
  {
    name: "ANALYSIS_LOW_CONFIDENCE -> partial-result with warning",
    fixture: {
      raw: rawAnalysisResult({
        status: "degraded",
        warnings: ["LOW_CONFIDENCE"],
        diagnostics: {
          lowConfidenceFieldCount: 1,
        },
      }),
    },
    expected: { state: "partial-result", readyVisible: true, warning: true },
  },
  {
    name: "ANALYSIS_EXPIRED -> missing-result",
    fixture: { pageResponse: resultPageResponse("ANALYSIS_EXPIRED") },
    expected: { state: "missing-result", readyVisible: false },
  },
];

const posterScenarios = [
  {
    name: "ANALYSIS_SUCCESS -> ready",
    fixture: { raw: rawAnalysisResult({ status: "ok" }) },
    expected: { state: "ready", readyVisible: true },
    screenshot: true,
  },
  {
    name: "PAGE_ANALYSIS_RESULT_MISSING -> missing-result",
    fixture: {},
    expected: { state: "missing-result", readyVisible: false },
  },
  {
    name: "PAGE_ANALYSIS_RESULT_INVALID -> invalid-result",
    fixture: { raw: "{not json" },
    expected: { state: "invalid-result", readyVisible: false },
  },
  {
    name: "PAGE_ANALYSIS_RESULT_NOT_READY -> error",
    fixture: { pageResponse: posterPageResponse("PAGE_ANALYSIS_RESULT_NOT_READY") },
    expected: { state: "error", readyVisible: false },
  },
  {
    name: "ANALYSIS_FAILED -> error",
    fixture: { raw: rawAnalysisResult({ status: "failed" }) },
    expected: { state: "error", readyVisible: false },
  },
  {
    name: "ANALYSIS_PARTIAL -> partial-result",
    fixture: {
      raw: rawAnalysisResult({
        status: "degraded",
        warnings: ["PARTIAL_RESULT"],
        diagnostics: {
          lowConfidenceFieldCount: 0,
          missingFieldCount: 1,
        },
      }),
    },
    expected: { state: "partial-result", readyVisible: true },
  },
  {
    name: "ANALYSIS_LOW_CONFIDENCE -> partial-result with warning",
    fixture: {
      raw: rawAnalysisResult({
        status: "degraded",
        warnings: ["LOW_CONFIDENCE"],
        diagnostics: {
          lowConfidenceFieldCount: 1,
        },
      }),
    },
    expected: { state: "partial-result", readyVisible: true, warning: true },
  },
  {
    name: "ANALYSIS_EXPIRED -> error",
    fixture: { pageResponse: posterPageResponse("ANALYSIS_EXPIRED") },
    expected: { state: "error", readyVisible: false },
  },
];

function assertStaticBoundaries() {
  const resultSource = fs.readFileSync(path.join(root, "scripts", "palmmi-result.js"), "utf8");
  const posterSource = fs.readFileSync(path.join(root, "scripts", "palmmi-poster.js"), "utf8");
  const source = `${resultSource}\n${posterSource}`;
  const resultStates = require(path.join(root, "scripts", "palmmi-result.js")).RESULT_STATES;
  const posterStates = require(path.join(root, "scripts", "palmmi-poster.js")).POSTER_STATES;

  assert.doesNotMatch(source, /localStorage\s*\.\s*getItem/);
  assert.doesNotMatch(source, /\bJSON\s*\.\s*parse\b/);
  assert.doesNotMatch(source, /\bfetch\s*\(/i);
  assert.doesNotMatch(source, /provider_output|internal\.stage5bResult|recognition_result\.debug/);
  assert.equal(Object.values(resultStates).includes("success"), false);
  assert.equal(Object.values(posterStates).includes("success"), false);
  assert.match(resultSource, /readResultPageAnalysisData/);
  assert.match(resultSource, /mapAnalysisStatusToResultPageState/);
  assert.match(posterSource, /readPosterPageAnalysisData/);
  assert.match(posterSource, /mapAnalysisStatusToPosterPageState/);
}

async function runScenario(browser, pageName, scenario) {
  const { page, browserSignals } = await openPalmmiPage(browser, pageName, scenario.fixture);
  try {
    await assertScenario(page, pageName, scenario.expected);
    await assertBrowserClean(page, browserSignals);

    if (scenario.screenshot) {
      const screenshot = await page.screenshot();
      assert.ok(screenshot.length > 5000, `${pageName} ready screenshot buffer should not be blank`);
    }
  } finally {
    await page.close();
  }
}

async function main() {
  assertStaticBoundaries();

  const { chromium } = loadPlaywright();
  const executablePath = findCachedChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    for (const scenario of resultScenarios) {
      await runScenario(browser, "result", scenario);
      console.log(`Stage 5N result browser scenario passed: ${scenario.name}`);
    }

    for (const scenario of posterScenarios) {
      await runScenario(browser, "poster", scenario);
      console.log(`Stage 5N poster browser scenario passed: ${scenario.name}`);
    }
  } finally {
    await browser.close();
  }

  console.log("Stage 5N browser result/poster tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
