const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..", "..");
const BASE_URL = process.env.PALMMI_STAGE6F_BASE_URL || "https://palmmi.pages.dev";
const API_URL = new URL("/api/analyze", BASE_URL).href;
const STORAGE_KEYS = Object.freeze({
  upload: "palmmi:lastUpload",
  stableAnalysis: "palmmi:last-analysis",
  analysis: "palmmi:lastAnalysisResult",
  analyzeError: "palmmi:lastAnalyzeError",
});
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const EXPECTED_STAGE5_ASSETS = [
  "/src/stage5/analysis-result-read-adapter.js",
  "/src/stage5/analysis-result-storage-reader.js",
  "/src/stage5/page-analysis-reader.js",
  "/src/stage5/page-analysis-state-mapper.js",
];
const RESPONSE_LEAK_MARKERS = [
  "provider_output",
  "raw_provider",
  "raw_response",
  "rawText",
  "Authorization",
  "PALMMI_QWEN_API_KEY",
  "QWEN_API_KEY",
  "data:image",
  ";base64,",
];
const DOM_LEAK_MARKERS = [
  "provider_output",
  "raw_provider",
  "raw_response",
  "rawText",
  "Authorization",
  "PALMMI_QWEN_API_KEY",
  "QWEN_API_KEY",
  "data:image",
  ";base64,",
  "PalmFeatureSet",
  "RuleInput",
  "RecognitionResult",
  "AnalysisInput",
];

function newestDirectory(directories) {
  return directories
    .map((directory) => ({ directory, mtimeMs: fs.statSync(directory).mtimeMs }))
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

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function localPageUrl(pageName) {
  return pathToFileURL(path.join(root, pageName, "index.html")).href;
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    keys() {
      return [...values.keys()];
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

function walkFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }
  const output = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        output.push(absolute);
      }
    }
  }
  return output;
}

function findRepoPalmFixture() {
  const candidates = [
    path.join(root, "tests", "stage6f", "fixtures"),
    path.join(root, "tests", "fixtures"),
    path.join(root, "tests", "stage5", "fixtures"),
    path.join(root, "PalmTag_rule_engine_v0", "samples", "palms"),
  ];
  for (const directory of candidates) {
    const image = walkFiles(directory)
      .find((filePath) => ALLOWED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
    if (image) {
      return image;
    }
  }
  return null;
}

function findRepoImageFixtureByName(pattern) {
  const directories = [
    path.join(root, "tests"),
    path.join(root, "PalmTag_rule_engine_v0", "samples", "palms"),
  ];
  for (const directory of directories) {
    const image = walkFiles(directory)
      .find((filePath) => {
        const extension = path.extname(filePath).toLowerCase();
        const name = path.basename(filePath).toLowerCase();
        return ALLOWED_IMAGE_EXTENSIONS.has(extension) && pattern.test(name);
      });
    if (image) {
      return image;
    }
  }
  return null;
}

function missingSpecializedFixtures() {
  const fixtures = [
    { name: "dark_palm_image", pattern: /(dark|dim|low-light|underexposed|偏暗)/i },
    { name: "blurry_palm_image", pattern: /(blur|blurry|模糊)/i },
    { name: "cropped_incomplete_palm_image", pattern: /(crop|cropped|incomplete|partial|裁切|不完整)/i },
  ];
  return fixtures
    .filter((fixture) => !findRepoImageFixtureByName(fixture.pattern))
    .map((fixture) => fixture.name);
}

function syntheticPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
}

function assertNoStorageLeaks(storage, label) {
  const snapshot = storage.snapshot ? storage.snapshot() : {};
  const text = JSON.stringify(snapshot);
  assert.equal(text.includes("data:image"), false, `${label} must not keep image data URLs after analysis`);
  assert.equal(text.includes(";base64,"), false, `${label} must not keep base64 after analysis`);
  assert.equal(text.includes("raw_response"), false, `${label} must not keep raw provider response`);
  assert.equal(text.includes("rawText"), false, `${label} must not keep raw provider text`);
  assert.equal(text.includes("Authorization"), false, `${label} must not keep Authorization tokens`);
  assert.equal(text.includes("QWEN_API_KEY"), false, `${label} must not keep API key names`);
}

function completeAnalysisResult(overrides = {}) {
  const status = overrides.status || "ok";
  return {
    schemaVersion: "analysis-result.v1",
    sourceSchemaVersion: "stage6f-fix.mock",
    status,
    result: {
      persona: {
        id: "P25",
        name: "老干部",
        confidence: 0.82,
      },
      summary: {
        title: "老干部",
        subtitle: "M1",
        shortText: "别人还在情绪开会，你已经端着保温杯散会了。",
        keywords: ["稳定", "降噪", "M1"],
      },
      scores: {
        overallConfidence: 0.82,
        qualityScore: 0.8,
        matchScore: 0.82,
      },
      sections: [
        {
          key: "HEAD_LINE_DEPTH",
          title: "智慧线清晰度",
          content: "这份结果已补齐用户可读描述，用于稳定展示。",
          source: "stage6f-fix",
        },
      ],
      warnings: [],
    },
    uiConsumable: {
      personaId: "P25",
      personaName: "老干部",
      confidence: 0.82,
      status,
      qualityStatus: "OK",
      primaryDisplayText: "老干部",
      secondaryDisplayText: "别人还在情绪开会，你已经端着保温杯散会了。",
      warningBadges: [],
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
      stage: "6F-Fix",
      from: "stage6f-fix.mock",
      contract: "analysis-result.v1",
      sourceImage: null,
      provider: "qwen",
      model: "qwen3-vl-flash",
      generatedAt: "2026-05-21T00:00:00.000Z",
    },
    personality_id: "P25",
    personality_name: "老干部",
    main_line_type: "M1",
    title: "老干部",
    summary: "别人还在情绪开会，你已经端着保温杯散会了。",
    description: "这份结果已补齐用户可读描述，用于稳定展示。",
    evidence: "本次结果主要参考：智慧线清晰度。",
    features: ["HEAD_LINE_DEPTH"],
    traits: ["稳定", "降噪", "M1"],
    match_reason: "本地冻结内容补齐后可以稳定展示。",
    candidate_results: [{ personality_id: "P25", personality_name: "老干部", main_line_type: "M1" }],
    quality_status: "OK",
    user_message: "分析已完成。",
    ...overrides.extra,
  };
}

function leakFlags(value, markers = RESPONSE_LEAK_MARKERS) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return markers.filter((marker) => text.includes(marker));
}

function assertNoResponseLeaks(value, label) {
  assert.deepEqual(leakFlags(value, RESPONSE_LEAK_MARKERS), [], `${label} must not leak response internals or secrets`);
}

function assertNoDomLeaks(html, label) {
  assert.deepEqual(leakFlags(html, DOM_LEAK_MARKERS), [], `${label} must not leak DOM internals or secrets`);
}

function createSignals(page) {
  const signals = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    badResponses: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      signals.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    signals.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("/api/analyze") && !url.startsWith("blob:")) {
      signals.requestFailures.push(`${url} ${request.failure() && request.failure().errorText}`);
    }
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    const sameOrigin = url.startsWith(BASE_URL);
    const resourceType = response.request().resourceType();
    if (sameOrigin && status >= 400 && ["document", "script", "stylesheet", "image"].includes(resourceType)) {
      signals.badResponses.push(`${status} ${url}`);
    }
  });

  return signals;
}

async function assertBrowserClean(signals, label) {
  assert.deepEqual(signals.consoleErrors, [], `${label} must not log console errors`);
  assert.deepEqual(signals.pageErrors, [], `${label} must not throw page errors`);
  assert.deepEqual(signals.requestFailures, [], `${label} must not have unexpected request failures`);
  assert.deepEqual(signals.badResponses, [], `${label} must not load static assets with HTTP errors`);
}

async function assertNotBlank(page, label) {
  const snapshot = await page.evaluate(() => ({
    textLength: document.body.innerText.trim().length,
    bodyHeight: Math.round(document.body.getBoundingClientRect().height),
    htmlLength: document.documentElement.outerHTML.length,
  }));
  assert.ok(snapshot.textLength > 20, `${label} must have visible text`);
  assert.ok(snapshot.bodyHeight > 120, `${label} must have non-trivial body height`);
  assert.ok(snapshot.htmlLength > 500, `${label} must have rendered HTML`);
}

async function viewportSnapshot(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
    uploadVisible: Boolean(document.querySelector("#palmFile")),
    ctaVisible: Array.from(document.querySelectorAll("a,button,label"))
      .some((element) => {
        const text = element.textContent || "";
        const rect = element.getBoundingClientRect();
        return /上传|开始|选择图片|分析|结果|海报/.test(text) && rect.width > 0 && rect.height > 0;
      }),
  }));
}

async function assertNoSevereHorizontalOverflow(page, label) {
  const snapshot = await viewportSnapshot(page);
  const overflow = snapshot.scrollWidth - snapshot.clientWidth;
  assert.ok(overflow <= 24, `${label} must not have severe horizontal overflow; overflow=${overflow}`);
  assert.ok(snapshot.scrollHeight >= snapshot.clientHeight, `${label} should remain scrollable or viewport-filling`);
  return snapshot;
}

async function gotoPage(context, pathname, selector, label) {
  const page = await context.newPage();
  const signals = createSignals(page);
  const response = await page.goto(new URL(pathname, BASE_URL).href, { waitUntil: "domcontentloaded" });
  assert.equal(response && response.status(), 200, `${label} must return HTTP 200`);
  if (selector) {
    await page.waitForSelector(selector, { timeout: 15000 });
  }
  await assertNotBlank(page, label);
  await assertBrowserClean(signals, label);
  const html = await page.evaluate(() => document.body.outerHTML);
  assertNoDomLeaks(html, label);
  return { page, signals };
}

async function waitForPageState(page, selector) {
  await page.waitForFunction((rootSelector) => {
    const root = document.querySelector(rootSelector);
    return Boolean(root && root.dataset.state && root.dataset.state !== "loading");
  }, selector, { timeout: 15000 });
}

async function validateHomeAndUpload(context, label) {
  const { page: home } = await gotoPage(context, "/", "main", `${label} home`);
  const homeState = await home.evaluate(() => ({
    title: document.title,
    uploadLinks: Array.from(document.querySelectorAll("a[href*='upload']")).length,
    mainText: document.body.innerText,
  }));
  assert.match(homeState.title, /Palmmi/);
  assert.ok(homeState.uploadLinks >= 1, `${label} home must expose upload entry`);
  assert.match(homeState.mainText, /上传|Palmmi/);
  const homeViewport = await assertNoSevereHorizontalOverflow(home, `${label} home viewport`);
  await home.close();

  const { page: upload } = await gotoPage(context, "/upload/", "#palmFile", `${label} upload`);
  const uploadState = await upload.evaluate(() => {
    const input = document.querySelector("#palmFile");
    const labelElement = document.querySelector("label[for='palmFile']");
    const startButton = document.querySelector("#startAnalyze");
    return {
      inputExists: Boolean(input),
      inputType: input ? input.getAttribute("type") : "",
      accept: input ? input.getAttribute("accept") : "",
      labelVisible: Boolean(labelElement && labelElement.getBoundingClientRect().height > 0),
      startVisible: Boolean(startButton && startButton.getBoundingClientRect().height > 0),
    };
  });
  assert.equal(uploadState.inputExists, true);
  assert.equal(uploadState.inputType, "file");
  assert.match(uploadState.accept, /image\/jpeg|image\/png|image\/webp/);
  assert.equal(uploadState.labelVisible, true, `${label} upload must expose touch-friendly file chooser`);
  assert.equal(uploadState.startVisible, true, `${label} upload must expose CTA button`);

  const chooserPromise = upload.waitForEvent("filechooser", { timeout: 5000 });
  await upload.click("label[for='palmFile']");
  const chooser = await chooserPromise;
  assert.equal(chooser.isMultiple(), false, `${label} file chooser should be single-image oriented`);
  const uploadViewport = await assertNoSevereHorizontalOverflow(upload, `${label} upload viewport`);
  await upload.close();

  return {
    title: homeState.title,
    upload_links: homeState.uploadLinks,
    home_viewport: homeViewport,
    upload_input_accept: uploadState.accept,
    upload_viewport: uploadViewport,
  };
}

async function validateResultAndPoster(context, label) {
  const { page: resultBase } = await gotoPage(context, "/result/", "#resultApp", `${label} result base`);
  await waitForPageState(resultBase, "#resultApp");
  const resultBaseState = await resultBase.evaluate(() => ({
    state: document.querySelector("#resultApp").dataset.state,
    readyVisible: !document.querySelector("#resultReady").hidden,
    problemVisible: !document.querySelector("#resultProblem").hidden,
  }));
  await assertNoSevereHorizontalOverflow(resultBase, `${label} result base viewport`);
  await resultBase.close();

  const { page: resultTest } = await gotoPage(context, "/result/?state=partial-result", "#resultApp", `${label} result test-state`);
  await waitForPageState(resultTest, "#resultApp");
  const resultTestState = await resultTest.evaluate(() => ({
    state: document.querySelector("#resultApp").dataset.state,
    readyVisible: !document.querySelector("#resultReady").hidden,
  }));
  assert.equal(resultTestState.readyVisible, true, `${label} result must render a test-state result panel`);
  await assertNoSevereHorizontalOverflow(resultTest, `${label} result test-state viewport`);
  await resultTest.close();

  const { page: posterBase } = await gotoPage(context, "/poster/", "#posterApp", `${label} poster base`);
  await waitForPageState(posterBase, "#posterApp");
  const posterBaseState = await posterBase.evaluate(() => ({
    state: document.querySelector("#posterApp").dataset.state,
    readyVisible: !document.querySelector("#posterReady").hidden,
    problemVisible: !document.querySelector("#posterProblem").hidden,
  }));
  await assertNoSevereHorizontalOverflow(posterBase, `${label} poster base viewport`);
  await posterBase.close();

  const { page: posterTest } = await gotoPage(context, "/poster/?state=ready", "#posterApp", `${label} poster test-state`);
  await waitForPageState(posterTest, "#posterApp");
  const posterTestState = await posterTest.evaluate(() => ({
    state: document.querySelector("#posterApp").dataset.state,
    readyVisible: !document.querySelector("#posterReady").hidden,
  }));
  assert.equal(posterTestState.readyVisible, true, `${label} poster must render a test-state poster panel`);
  await assertNoSevereHorizontalOverflow(posterTest, `${label} poster test-state viewport`);
  await posterTest.close();

  return {
    result_base: resultBaseState,
    result_test_state: resultTestState,
    poster_base: posterBaseState,
    poster_test_state: posterTestState,
  };
}

async function validateBlockedUpload(context, label, filePayload, expectedCodeFragment) {
  const page = await context.newPage();
  const signals = createSignals(page);
  await page.goto(new URL("/upload/", BASE_URL).href, { waitUntil: "domcontentloaded" });
  await page.setInputFiles("#palmFile", filePayload);
  await page.click("#startAnalyze");
  const state = await page.evaluate((keys) => ({
    url: location.href,
    statusText: (document.querySelector("#uploadStatus") || {}).textContent || "",
    statusIsError: Boolean((document.querySelector("#uploadStatus") || {}).classList
      && document.querySelector("#uploadStatus").classList.contains("is-error")),
    hasUpload: Boolean(sessionStorage.getItem(keys.upload)),
    hasAnalysisResult: Boolean(sessionStorage.getItem(keys.analysis)),
  }), STORAGE_KEYS);
  assert.match(state.url, /\/upload\/?$/);
  assert.equal(state.statusIsError, true, `${label} blocked upload should show an error status`);
  assert.match(state.statusText, expectedCodeFragment);
  assert.equal(state.hasUpload, false);
  assert.equal(state.hasAnalysisResult, false);
  await assertBrowserClean(signals, `${label} blocked upload`);
  await page.close();
  return {
    status_text: state.statusText,
    has_upload: state.hasUpload,
    has_analysis_result: state.hasAnalysisResult,
  };
}

async function validateLocalPhotoCheckButton(context, fixturePath) {
  if (!fixturePath) {
    return {
      status: "BLOCKED_BY_MISSING_FIXTURE",
      reason: "normal_palm_image missing",
    };
  }

  const page = await context.newPage();
  const signals = createSignals(page);
  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkFile");

  const buttonProbe = await page.evaluate(() => {
    const button = document.querySelector("#checkFile");
    if (!button) {
      return { exists: false };
    }
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    return {
      exists: true,
      disabled: Boolean(button.disabled),
      width: rect.width,
      height: rect.height,
      topElementId: topElement ? topElement.id : "",
      topElementTag: topElement ? topElement.tagName : "",
    };
  });
  assert.equal(buttonProbe.exists, true, "检查照片 button must exist");
  assert.equal(buttonProbe.disabled, false, "检查照片 button must be enabled");
  assert.ok(buttonProbe.width > 20 && buttonProbe.height > 20, "检查照片 button must be touch-sized");
  assert.ok(
    ["checkFile", ""].includes(buttonProbe.topElementId) || buttonProbe.topElementTag === "BUTTON",
    `检查照片 button must not be covered by another layer: ${JSON.stringify(buttonProbe)}`
  );

  await page.setInputFiles("#palmFile", fixturePath);
  await page.click("#checkFile");
  await page.waitForFunction(() => {
    const status = document.querySelector("#uploadStatus");
    return Boolean(status && /照片可以使用/.test(status.textContent || ""));
  }, null, { timeout: 10000 });

  const checkState = await page.evaluate((keys) => ({
    statusText: document.querySelector("#uploadStatus").textContent,
    statusIsSuccess: document.querySelector("#uploadStatus").classList.contains("is-success"),
    startDisabled: document.querySelector("#startAnalyze").disabled,
    hasUpload: Boolean(sessionStorage.getItem(keys.upload)),
    hasStableAnalysis: Boolean(sessionStorage.getItem(keys.stableAnalysis)),
    hasLegacyAnalysis: Boolean(sessionStorage.getItem(keys.analysis)),
  }), STORAGE_KEYS);
  assert.equal(checkState.statusIsSuccess, true, "photo check should render success state");
  assert.equal(checkState.startDisabled, false, "photo check should leave start analysis available");
  assert.equal(checkState.hasUpload, false, "photo check alone must not persist image upload state");
  assert.equal(checkState.hasStableAnalysis, false, "photo check alone must not create analysis result");
  assert.equal(checkState.hasLegacyAnalysis, false, "photo check alone must not create legacy analysis result");

  await assertBrowserClean(signals, "local upload photo check");
  await page.close();
  return {
    status: "PASS",
    status_text: checkState.statusText,
  };
}

async function validateStage6FFixStorageContract() {
  const analyzePage = require(path.join(root, "scripts", "palmmi-analyze.js"));
  const resultPage = require(path.join(root, "scripts", "palmmi-result.js"));
  const posterPage = require(path.join(root, "scripts", "palmmi-poster.js"));
  const {
    buildAnalysisResultContract,
  } = require(path.join(root, "src", "stage5", "analysis-result-contract.js"));

  const upload = {
    schemaVersion: "stage4d_upload_v1",
    fileName: "stage6f-fix.png",
    fileType: "image/png",
    fileSize: syntheticPngBuffer().length,
    fileSizeLabel: `${syntheticPngBuffer().length} B`,
    previewDataUrl: "",
    uploadedAt: "2026-05-21T00:00:00.000Z",
    expiresAt: "2026-05-22T00:00:00.000Z",
    handSide: null,
  };
  const storage = createMemoryStorage();
  const successClient = {
    canUseApi: () => true,
    callAnalyzeApi: async () => ({
      ok: true,
      request_id: "req_stage6f_fix_success",
      status: "SUCCESS",
      provider: "qwen",
      analysis_result: completeAnalysisResult(),
    }),
  };

  const first = await analyzePage.runStage5ApiAnalysis(upload, {
    storage,
    localStorage: createMemoryStorage(),
    useAnalyzeApi: true,
    apiClient: successClient,
  });
  assert.equal(first.ok, true, "first analysis should succeed");
  assert.ok(storage.getItem(STORAGE_KEYS.stableAnalysis), "analysis must be written to stable storage key");
  assert.ok(storage.getItem(STORAGE_KEYS.analysis), "analysis must remain available on legacy storage key");

  const resultRead = resultPage.readAnalysisResult({ storage });
  const posterRead = posterPage.readAnalysisResult({ storage });
  assert.equal(resultRead.ok, true, "/result/ must read stable stored result");
  assert.equal(posterRead.ok, true, "/poster/ must read stable stored result");

  const stableBeforeFailure = storage.getItem(STORAGE_KEYS.stableAnalysis);
  const legacyBeforeFailure = storage.getItem(STORAGE_KEYS.analysis);
  const failureClient = {
    canUseApi: () => true,
    callAnalyzeApi: async () => ({
      ok: false,
      request_id: "req_stage6f_fix_failure",
      status: "RETRY_REQUIRED",
      error: {
        code: "VLM_API_REQUEST_FAILED",
        message: "分析流程暂时没有完成，请重新上传后再试。",
        retryable: true,
      },
    }),
  };
  const second = await analyzePage.runStage5ApiAnalysis(upload, {
    storage,
    localStorage: createMemoryStorage(),
    useAnalyzeApi: true,
    apiClient: failureClient,
  });
  assert.equal(second.ok, false, "second mocked API call should fail");
  assert.equal(storage.getItem(STORAGE_KEYS.stableAnalysis), stableBeforeFailure, "API failure must not clear stable last-good result");
  assert.equal(storage.getItem(STORAGE_KEYS.analysis), legacyBeforeFailure, "API failure must not clear legacy last-good result");
  assert.ok(storage.getItem(STORAGE_KEYS.analyzeError), "API failure may store a sanitized error");
  assertNoStorageLeaks(storage, "analysis storage");

  const contract = buildAnalysisResultContract({
    ok: true,
    status: "SUCCESS",
    provider: "qwen",
    model: "qwen3-vl-flash",
    analysis_input: {
      finalPersona: {
        id: "P25",
        name: "老干部",
        confidence: 0.82,
      },
    },
    recognition_result: {
      status: "SUCCESS",
      primary_persona: {
        id: "P25",
        persona_id: "P25",
        name: "老干部",
        mother_type: "M1",
        score: 0.82,
        matched_features: ["HEAD_LINE_DEPTH"],
      },
      top3: [
        { id: "P25", persona_id: "P25", name: "老干部", mother_type: "M1", score: 0.82 },
      ],
      primary_mother: {
        id: "M1",
        name: "M1",
        core_fields_matched: ["HEAD_LINE_DEPTH"],
      },
      quality_gate: {
        passed: true,
        status: "PASS",
        confidence: 0.8,
        reasons: [],
      },
      recognition: {
        explanation: {
          persona: {
            matched_features: ["HEAD_LINE_DEPTH"],
          },
          low_confidence: false,
        },
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
    },
  }, {
    now: () => "2026-05-21T00:00:00.000Z",
  });
  assert.equal(contract.personality_id, "P25", "contract must expose flat personality_id");
  assert.equal(contract.personality_name, "老干部", "contract must expose flat personality_name");
  assert.equal(contract.main_line_type, "M1", "contract must expose flat main_line_type");
  assert.ok(contract.description.length > 20, "contract must fill user-facing description from frozen content");
  assert.ok(contract.evidence.length > 0, "contract must fill user-facing evidence");
  assert.ok(Array.isArray(contract.candidate_results), "contract must expose candidate_results");
  assert.notEqual(contract.quality_status, "IMAGE_NOT_CLEAR", "known persona with frozen content should be displayable");

  const partialView = resultPage.createResultViewModel({
    status: "SUCCESS",
    primary_persona: {
      id: "P_UNKNOWN",
      persona_id: "P_UNKNOWN",
      name: "Unknown",
      mother_type: "M1",
    },
    primary_mother: {
      id: "M1",
      name: "M1",
    },
    top3: [],
  });
  const partialText = JSON.stringify(partialView);
  assert.match(partialText, /照片掌纹不够清晰|重新拍摄/, "partial result should ask user to retake");
  assert.doesNotMatch(partialText, /结果字段暂时不完整|暂无详细描述|暂无掌纹依据/, "partial result must not show broken placeholders");

  return {
    status: "PASS",
    stable_key: STORAGE_KEYS.stableAnalysis,
    legacy_key: STORAGE_KEYS.analysis,
  };
}

async function validateApiEndpoint() {
  const getResponse = await fetch(API_URL, { method: "GET" });
  const getJson = await getResponse.json();
  assert.equal(getResponse.status, 405, "GET /api/analyze should return a stable method error");
  assert.equal(getJson.ok, false);
  assertNoResponseLeaks(getJson, "GET /api/analyze");

  const emptyResponse = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const emptyJson = await emptyResponse.json();
  assert.equal(emptyResponse.status, 400, "empty POST should return a stable client error");
  assert.equal(emptyJson.ok, false);
  assert.ok(emptyJson.error && typeof emptyJson.error.code === "string");
  assertNoResponseLeaks(emptyJson, "empty POST /api/analyze");

  return {
    get: {
      http_status: getResponse.status,
      ok: getJson.ok,
      error_code: getJson.error && getJson.error.code,
    },
    empty_post: {
      http_status: emptyResponse.status,
      ok: emptyJson.ok,
      error_code: emptyJson.error && emptyJson.error.code,
    },
  };
}

async function validateStage5Assets() {
  const results = [];
  for (const assetPath of EXPECTED_STAGE5_ASSETS) {
    const response = await fetch(new URL(assetPath, BASE_URL).href);
    const text = await response.text();
    assert.equal(response.status, 200, `${assetPath} must exist in production build output`);
    assert.doesNotMatch(text.slice(0, 80), /<!doctype html>|<html/i, `${assetPath} must not be HTML fallback`);
    results.push({
      path: assetPath,
      http_status: response.status,
      bytes: text.length,
      javascript_like: /function|const|module|globalThis|window/.test(text),
    });
  }
  return results;
}

async function validateNormalPalmUpload(context, fixturePath) {
  if (!fixturePath) {
    return {
      status: "BLOCKED_BY_MISSING_FIXTURE",
      fixture: null,
      provider: null,
      has_analysis_result: false,
    };
  }

  const page = await context.newPage();
  const signals = createSignals(page);
  const apiResponses = [];
  page.on("response", async (response) => {
    if (response.url() === API_URL && response.request().method() === "POST") {
      const parsed = await response.json();
      assertNoResponseLeaks(parsed, "normal palm API response");
      apiResponses.push({
        http_status: response.status(),
        ok: parsed.ok,
        provider: parsed.provider || null,
        has_analysis_result: Boolean(parsed.analysis_result),
      });
    }
  });

  await page.goto(new URL("/upload/", BASE_URL).href, { waitUntil: "domcontentloaded" });
  await page.setInputFiles("#palmFile", fixturePath);
  await page.click("#startAnalyze");
  await page.waitForURL(/\/analyze\/?/, { timeout: 15000 });
  await page.waitForFunction(() => {
    const root = document.querySelector("#analysisApp");
    return root && ["done", "missing-upload", "invalid-upload", "timeout", "error"].includes(root.dataset.state);
  }, null, { timeout: 90000 });
  const state = await page.evaluate((keys) => ({
    analysis_state: document.querySelector("#analysisApp").dataset.state,
    has_upload: Boolean(sessionStorage.getItem(keys.upload)),
    has_analysis_result: Boolean(sessionStorage.getItem(keys.analysis)),
    has_analyze_error: Boolean(sessionStorage.getItem(keys.analyzeError)),
  }), STORAGE_KEYS);
  assert.equal(state.analysis_state, "done", "normal palm upload should finish analysis");
  assert.equal(state.has_analysis_result, true, "normal palm upload should store analysis result");

  await page.click("#viewResult");
  await waitForPageState(page, "#resultApp");
  const resultState = await page.evaluate(() => ({
    state: document.querySelector("#resultApp").dataset.state,
    readyVisible: !document.querySelector("#resultReady").hidden,
    html: document.body.outerHTML,
  }));
  assert.equal(resultState.readyVisible, true, "result page should read the real analysis result");
  assert.ok(["ready", "partial-result"].includes(resultState.state), `unexpected result state ${resultState.state}`);
  assertNoDomLeaks(resultState.html, "real-result page");

  await page.click("#resultPosterLink");
  await waitForPageState(page, "#posterApp");
  const posterState = await page.evaluate(() => ({
    state: document.querySelector("#posterApp").dataset.state,
    readyVisible: !document.querySelector("#posterReady").hidden,
    html: document.body.outerHTML,
  }));
  assert.equal(posterState.readyVisible, true, "poster page should read the real analysis result");
  assert.ok(["ready", "partial-result"].includes(posterState.state), `unexpected poster state ${posterState.state}`);
  assertNoDomLeaks(posterState.html, "real-poster page");

  await assertBrowserClean(signals, "normal palm upload");
  await page.close();

  const api = apiResponses[0] || null;
  assert.ok(api, "normal palm upload must call /api/analyze");
  assert.equal(api.http_status, 200, "normal palm upload should receive HTTP 200");
  assert.equal(api.provider, "qwen", "normal palm upload should use qwen provider");
  assert.equal(api.has_analysis_result, true, "normal palm upload should return analysis_result");
  return {
    status: "PASS",
    fixture: path.relative(root, fixturePath),
    api,
    state,
    result_state: resultState.state,
    poster_state: posterState.state,
  };
}

async function validateSimulatedQwenErrors() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const basePayload = {
    request_id: "req_stage6f_simulated",
    anonymous_device_id: "anon_stage6f_simulated",
    locale: "zh-CN",
    image: {
      file_name: "synthetic.png",
      content_type: "image/png",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  };
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };

  const requestFailed = await runAnalyzeApi(basePayload, {
    env,
    fetchImpl: async () => {
      throw new TypeError("stage6f simulated fetch failure");
    },
  });
  assert.equal(requestFailed.ok, false);
  assert.equal(requestFailed.error.code, "VLM_API_REQUEST_FAILED");
  assertNoResponseLeaks(requestFailed, "simulated Qwen request failure");

  const parseFailed = await runAnalyzeApi(basePayload, {
    env,
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: "not-json" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  assert.equal(parseFailed.ok, false);
  assert.equal(parseFailed.error.code, "VLM_API_INVALID_RESPONSE");
  assertNoResponseLeaks(parseFailed, "simulated Qwen parse failure");

  const emptyReturned = await runAnalyzeApi(basePayload, {
    env,
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: "" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  assert.equal(emptyReturned.ok, false);
  assert.equal(emptyReturned.error.code, "VLM_API_INVALID_RESPONSE");
  assertNoResponseLeaks(emptyReturned, "simulated Qwen empty return");

  return {
    request_failed: {
      ok: requestFailed.ok,
      error_code: requestFailed.error.code,
    },
    parse_failed: {
      ok: parseFailed.ok,
      error_code: parseFailed.error.code,
    },
    empty_return: {
      ok: emptyReturned.ok,
      error_code: emptyReturned.error.code,
    },
  };
}

function deviceMatrix(playwright) {
  const fallbackIphone = {
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  };
  const fallbackPixel = {
    viewport: { width: 393, height: 851 },
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.75,
  };
  return [
    {
      key: "desktop_chrome",
      label: "Desktop Chrome baseline",
      options: { viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      key: "iphone_safari",
      label: "iPhone Safari simulated",
      options: playwright.devices["iPhone 13"] || fallbackIphone,
    },
    {
      key: "android_chrome",
      label: "Android Chrome simulated",
      options: playwright.devices["Pixel 5"] || fallbackPixel,
    },
  ];
}

async function main() {
  const playwright = loadPlaywright();
  const executablePath = findCachedChromiumExecutable();
  const browser = await playwright.chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const fixturePath = findRepoPalmFixture();
  const summary = {
    stage: "6F",
    base_url: BASE_URL,
    api_url: API_URL,
    production_access: {},
    stage5_assets: [],
    devices: {},
    normal_palm_upload: null,
    stage6f_fix: {},
    abnormal_inputs: {},
    simulated_qwen_errors: null,
    missing_fixtures: [],
  };

  try {
    summary.production_access.api_endpoint = await validateApiEndpoint();
    summary.stage5_assets = await validateStage5Assets();
    summary.stage6f_fix.storage_contract = await validateStage6FFixStorageContract();

    for (const device of deviceMatrix(playwright)) {
      const context = await browser.newContext(device.options);
      try {
        const homeUpload = await validateHomeAndUpload(context, device.label);
        const resultPoster = await validateResultAndPoster(context, device.label);
        summary.devices[device.key] = {
          label: device.label,
          status: "PASS",
          home_upload: homeUpload,
          result_poster: resultPoster,
        };
      } finally {
        await context.close();
      }
    }

    const mobileContext = await browser.newContext((playwright.devices["iPhone 13"] || deviceMatrix(playwright)[1].options));
    try {
      summary.stage6f_fix.photo_check_button = await validateLocalPhotoCheckButton(mobileContext, fixturePath);
      summary.abnormal_inputs.non_image = await validateBlockedUpload(
        mobileContext,
        "iPhone Safari simulated non-image",
        { name: "not-image.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") },
        /格式不支持/
      );
      summary.abnormal_inputs.too_large = await validateBlockedUpload(
        mobileContext,
        "iPhone Safari simulated oversized image",
        { name: "too-large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(MAX_UPLOAD_BYTES + 1) },
        /太大|8MB/
      );
      summary.normal_palm_upload = await validateNormalPalmUpload(mobileContext, fixturePath);
    } finally {
      await mobileContext.close();
    }

    if (!fixturePath) {
      summary.missing_fixtures.push("normal_palm_image");
    }
    summary.missing_fixtures.push(...missingSpecializedFixtures());

    summary.simulated_qwen_errors = await validateSimulatedQwenErrors();

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : (error && error.message ? error.message : "Stage6FMobileE2EError"));
  process.exit(1);
});
