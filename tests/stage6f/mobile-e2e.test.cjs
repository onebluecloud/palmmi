const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const BASE_URL = process.env.PALMMI_STAGE6F_BASE_URL || "https://palmmi.pages.dev";
const API_URL = new URL("/api/analyze", BASE_URL).href;
const STORAGE_KEYS = Object.freeze({
  upload: "palmmi:lastUpload",
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
    abnormal_inputs: {},
    simulated_qwen_errors: null,
    missing_fixtures: [],
  };

  try {
    summary.production_access.api_endpoint = await validateApiEndpoint();
    summary.stage5_assets = await validateStage5Assets();

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
