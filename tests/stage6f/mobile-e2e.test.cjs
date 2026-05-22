const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
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

class Stage6FetchResponse {
  constructor(status, body) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.body = body;
  }

  async text() {
    return this.body;
  }

  async json() {
    return JSON.parse(this.body);
  }
}

function powershellFetch(url, options = {}) {
  const payload = {
    url,
    method: options.method || "GET",
    headers: options.headers || {},
    body: typeof options.body === "string" ? options.body : "",
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const script = `
$ErrorActionPreference = 'Stop'
$payloadJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPayload}'))
$payload = $payloadJson | ConvertFrom-Json
$headers = @{}
if ($payload.headers) {
  foreach ($item in $payload.headers.PSObject.Properties) {
    $headers[$item.Name] = [string]$item.Value
  }
}
$params = @{
  Uri = [string]$payload.url
  Method = [string]$payload.method
  Headers = $headers
  TimeoutSec = 60
  SkipHttpErrorCheck = $true
}
if ($payload.body) {
  $params.Body = [string]$payload.body
}
$response = $null
$lastError = $null
for ($attempt = 0; $attempt -lt 3; $attempt++) {
  try {
    $response = Invoke-WebRequest @params
    break
  } catch {
    $lastError = $_
    Start-Sleep -Milliseconds 500
  }
}
if ($null -eq $response) {
  throw $lastError
}
$result = @{
  status = [int]$response.StatusCode
  body = [string]$response.Content
} | ConvertTo-Json -Compress
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($result))
`;
  const output = childProcess.execFileSync(process.env.PWSH || "pwsh", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 4,
  }).trim();
  const decoded = Buffer.from(output, "base64").toString("utf8");
  const result = JSON.parse(decoded);
  return new Stage6FetchResponse(result.status, result.body);
}

async function stage6Fetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (error) {
    return powershellFetch(url, options);
  }
}

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

async function attachGeneratedImageFile(page, options = {}) {
  return page.evaluate(async (settings) => {
    const input = document.querySelector("#palmFile");
    if (!input) {
      throw new Error("palmFile input missing");
    }

    const width = settings.width || 1800;
    const height = settings.height || 1400;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const imageData = context.createImageData(width, height);
    for (let index = 0; index < imageData.data.length; index += 4) {
      const pixel = index / 4;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      imageData.data[index] = (x * 17 + y * 7) % 256;
      imageData.data[index + 1] = (x * 5 + y * 13) % 256;
      imageData.data[index + 2] = (x * 3 + y * 19) % 256;
      imageData.data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    const mimeType = settings.type || "image/jpeg";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, settings.quality || 0.95));
    const parts = [blob];
    if (settings.minBytes && blob.size < settings.minBytes) {
      parts.push(new Uint8Array(settings.minBytes - blob.size));
    }

    const file = new File(parts, settings.name || "camera.jpg", {
      type: mimeType,
      lastModified: Date.now(),
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      blobSize: blob.size,
      width,
      height,
    };
  }, options);
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
    poster_title: "老干部",
    poster_subtitle: "M1",
    poster_quote: "别人还在情绪开会，你已经端着保温杯散会了。",
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

async function gotoLocalPage(context, pageName, search, selector, label) {
  const page = await context.newPage();
  const signals = createSignals(page);
  await page.goto(`${localPageUrl(pageName)}${search || ""}`, { waitUntil: "domcontentloaded" });
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

  const { page: resultTest } = await gotoLocalPage(context, "result", "?state=partial-result", "#resultApp", `${label} result test-state`);
  await waitForPageState(resultTest, "#resultApp");
  const resultTestState = await resultTest.evaluate(() => ({
    state: document.querySelector("#resultApp").dataset.state,
    readyVisible: !document.querySelector("#resultReady").hidden,
    problemVisible: !document.querySelector("#resultProblem").hidden,
  }));
  assert.equal(
    resultTestState.readyVisible || resultTestState.problemVisible,
    true,
    `${label} result must render a test-state result or retake panel`
  );
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

  const { page: posterTest } = await gotoLocalPage(context, "poster", "?state=ready", "#posterApp", `${label} poster test-state`);
  await waitForPageState(posterTest, "#posterApp");
  const posterTestState = await posterTest.evaluate(() => ({
    state: document.querySelector("#posterApp").dataset.state,
    readyVisible: !document.querySelector("#posterReady").hidden,
    problemVisible: !document.querySelector("#posterProblem").hidden,
  }));
  assert.equal(
    posterTestState.readyVisible || posterTestState.problemVisible,
    true,
    `${label} poster must render a test-state poster or retake panel`
  );
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
  const canClickStart = await page.evaluate(() => {
    const button = document.querySelector("#startAnalyze");
    return Boolean(button && !button.disabled);
  });
  if (canClickStart) {
    await page.click("#startAnalyze");
  }
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
    return Boolean(status && /基础检查/.test(status.textContent || ""));
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

async function validateStage6FFix2InlineAnalyzeFlow(context) {
  const page = await context.newPage();
  const signals = createSignals(page);
  const result = completeAnalysisResult({
    extra: {
      trace: {
        stage: "6F-Fix-2",
        from: "stage6f-fix2.inline-flow",
      },
    },
  });

  await page.addInitScript((analysisResult) => {
    window.__stage6fFix2 = {
      capturedUploads: [],
      resolveAnalyze: null,
      analyzeStarted: false,
    };
    window.__PALMMI_UPLOAD_OPTIONS__ = {
      location: { protocol: "https:" },
      useAnalyzeApi: true,
      analyzeEndpoint: "/api/analyze",
      requestId: () => "req_stage6f_fix2_inline",
      apiClient: {
        canUseApi: () => true,
        callAnalyzeApi: async ({ upload }) => {
          window.__stage6fFix2.analyzeStarted = true;
          const captured = {
            fileName: upload.fileName,
            fileType: upload.fileType,
            fileSize: upload.fileSize,
            sourceFileSize: upload.sourceFileSize,
            compressed: upload.compressed,
            hasDataUrl: typeof upload.previewDataUrl === "string" && upload.previewDataUrl.startsWith("data:image/jpeg"),
          };
          window.__stage6fFix2.capturedUploads.push(captured);
          sessionStorage.setItem("__stage6fFix2Captured", JSON.stringify(window.__stage6fFix2.capturedUploads));
          return new Promise((resolve) => {
            window.__stage6fFix2.resolveAnalyze = () => resolve({
              ok: true,
              request_id: "req_stage6f_fix2_inline",
              status: "SUCCESS",
              provider: "qwen",
              analysis_result: analysisResult,
            });
          });
        },
      },
    };
  }, result);

  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  const fileInfo = await attachGeneratedImageFile(page, {
    name: "camera.jpg",
    type: "image/jpeg",
    width: 1800,
    height: 1400,
    minBytes: 2 * 1024 * 1024,
  });
  assert.ok(fileInfo.size >= 2 * 1024 * 1024, "camera fixture should simulate a large mobile capture");

  await page.click("#checkFile");
  await page.waitForFunction(() => {
    const status = document.querySelector("#uploadStatus");
    return Boolean(status && /基础检查/.test(status.textContent || ""));
  }, null, { timeout: 15000 });

  await page.click("#startAnalyze");
  await page.waitForFunction(() => window.__stage6fFix2 && window.__stage6fFix2.analyzeStarted, null, { timeout: 30000 });

  const whilePending = await page.evaluate((keys) => ({
    url: location.href,
    statusText: document.querySelector("#uploadStatus").textContent,
    hasStableAnalysis: Boolean(sessionStorage.getItem(keys.stableAnalysis)),
    hasUploadState: Boolean(sessionStorage.getItem(keys.upload)),
  }), STORAGE_KEYS);
  assert.match(whilePending.url, /\/upload\/index\.html|\/upload\/?$/, "upload page must keep the file context while analysis is pending");
  assert.doesNotMatch(whilePending.url, /\/analyze\//, "start analysis must not jump to /analyze/ before API success");
  assert.doesNotMatch(whilePending.url, /\/result\//, "start analysis must not jump to /result/ before API success");
  assert.equal(whilePending.hasStableAnalysis, false, "analysis storage must be written only after API success");
  assert.equal(whilePending.hasUploadState, false, "inline flow must not persist a base64 upload handoff");
  assert.match(whilePending.statusText, /分析|压缩/, "pending upload page should show an analysis status");

  await page.evaluate(() => window.__stage6fFix2.resolveAnalyze());
  await page.waitForURL(/\/result\/index\.html|\/result\/?$/, { timeout: 30000 });

  const successState = await page.evaluate((keys) => {
    const stableRaw = sessionStorage.getItem(keys.stableAnalysis);
    const snapshot = {};
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      snapshot[key] = sessionStorage.getItem(key);
    }
    return {
      url: location.href,
      stableRaw,
      legacyRaw: sessionStorage.getItem(keys.analysis),
      uploadRaw: sessionStorage.getItem(keys.upload),
      capturedUploads: JSON.parse(sessionStorage.getItem("__stage6fFix2Captured") || "[]"),
      storageText: JSON.stringify(snapshot),
    };
  }, STORAGE_KEYS);
  assert.ok(successState.stableRaw, "successful inline analysis must write palmmi:last-analysis");
  assert.ok(successState.legacyRaw, "successful inline analysis must preserve legacy result compatibility");
  assert.equal(successState.uploadRaw, null, "successful inline analysis must not keep upload image state");
  assert.equal(successState.capturedUploads.length, 1, "inline flow should call API exactly once");
  assert.equal(successState.capturedUploads[0].fileType, "image/jpeg", "request should use compressed JPEG");
  assert.equal(successState.capturedUploads[0].compressed, true, "large camera image should be compressed before API call");
  assert.ok(successState.capturedUploads[0].fileSize < successState.capturedUploads[0].sourceFileSize, "API payload should be smaller than original mobile capture");
  assert.equal(successState.storageText.includes("data:image"), false, "storage must not contain image data URLs");
  assert.equal(successState.storageText.includes(";base64,"), false, "storage must not contain image base64");

  await assertBrowserClean(signals, "stage6f fix2 inline analyze");
  await page.close();
  return {
    status: "PASS",
    source_size: fileInfo.size,
    request_size: successState.capturedUploads[0].fileSize,
    compressed: successState.capturedUploads[0].compressed,
  };
}

async function validateStage6FFix2TimeoutHandling(context) {
  const page = await context.newPage();
  const signals = createSignals(page);
  const previous = completeAnalysisResult({
    extra: {
      trace: {
        stage: "6F-Fix-2",
        from: "stage6f-fix2.previous-result",
      },
    },
  });

  await page.addInitScript((analysisResult) => {
    const envelope = {
      version: 1,
      created_at: "2026-05-21T00:00:00.000Z",
      provider: "qwen",
      analysis_result: analysisResult,
    };
    sessionStorage.setItem("palmmi:last-analysis", JSON.stringify(envelope));
    sessionStorage.setItem("palmmi:lastAnalysisResult", JSON.stringify(analysisResult));
    window.__PALMMI_UPLOAD_OPTIONS__ = {
      location: { protocol: "https:" },
      useAnalyzeApi: true,
      analyzeEndpoint: "/api/analyze",
      requestId: () => "req_stage6f_fix2_timeout",
      apiClient: {
        canUseApi: () => true,
        callAnalyzeApi: async () => ({
          ok: false,
          request_id: "req_stage6f_fix2_timeout",
          status: "RETRY_REQUIRED",
          error: {
            code: "REQUEST_TIMEOUT",
            message: "当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片。",
            retryable: true,
          },
        }),
      },
    };
  }, previous);

  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  const stableBefore = await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEYS.stableAnalysis);
  await attachGeneratedImageFile(page, {
    name: "gallery.jpg",
    type: "image/jpeg",
    width: 1800,
    height: 1400,
    minBytes: Math.round(2.5 * 1024 * 1024),
  });
  await page.click("#checkFile");
  await page.waitForFunction(() => {
    const status = document.querySelector("#uploadStatus");
    return Boolean(status && /基础检查/.test(status.textContent || ""));
  }, null, { timeout: 15000 });
  await page.click("#startAnalyze");
  await page.waitForFunction(() => {
    const status = document.querySelector("#uploadStatus");
    return Boolean(status && /REQUEST_TIMEOUT|响应超时|分析超时/.test(status.textContent || ""));
  }, null, { timeout: 30000 });

  const timeoutState = await page.evaluate((keys) => {
    const snapshot = {};
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      snapshot[key] = sessionStorage.getItem(key);
    }
    return {
      url: location.href,
      statusText: document.querySelector("#uploadStatus").textContent,
      stableAfter: sessionStorage.getItem(keys.stableAnalysis),
      hasResultReadFailedText: /RESULT_READ_FAILED|结果暂时无法读取/.test(document.body.innerText || ""),
      storageText: JSON.stringify(snapshot),
    };
  }, STORAGE_KEYS);
  assert.match(timeoutState.url, /\/upload\/index\.html|\/upload\/?$/, "timeout must keep user on upload page");
  assert.match(timeoutState.statusText, /REQUEST_TIMEOUT|响应超时|分析超时/, "timeout should show REQUEST_TIMEOUT-specific copy");
  assert.equal(timeoutState.stableAfter, stableBefore, "timeout must not clear previous valid analysis result");
  assert.equal(timeoutState.hasResultReadFailedText, false, "timeout must not be displayed as RESULT_READ_FAILED");
  assert.equal(timeoutState.storageText.includes("data:image"), false, "timeout storage must not contain image data URLs");
  assert.equal(timeoutState.storageText.includes(";base64,"), false, "timeout storage must not contain image base64");

  await assertBrowserClean(signals, "stage6f fix2 timeout handling");
  await page.close();
  return {
    status: "PASS",
    code: "REQUEST_TIMEOUT",
  };
}

async function validateStage6FFix3InvalidImageGate(context) {
  const page = await context.newPage();
  const signals = createSignals(page);

  await page.addInitScript(() => {
    window.__PALMMI_UPLOAD_OPTIONS__ = {
      location: { protocol: "https:" },
      useAnalyzeApi: true,
      analyzeEndpoint: "/api/analyze",
      requestId: () => "req_stage6f_fix3_not_palm",
      apiClient: {
        canUseApi: () => true,
        callAnalyzeApi: async () => ({
          ok: false,
          request_id: "req_stage6f_fix3_not_palm",
          status: "RETRY_REQUIRED",
          error: {
            code: "NOT_PALM",
            message: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
            retryable: true,
          },
        }),
      },
    };
  });

  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  await attachGeneratedImageFile(page, {
    name: "not-palm-beverage.jpg",
    type: "image/jpeg",
    width: 1000,
    height: 1000,
    minBytes: 128 * 1024,
  });
  await page.click("#checkFile");
  await page.waitForFunction(() => {
    const text = document.querySelector("#uploadStatus").textContent || "";
    return /基础检查/.test(text);
  }, null, { timeout: 15000 });
  const checkText = await page.locator("#uploadStatus").textContent();
  assert.doesNotMatch(checkText, /照片可以使用|掌纹清晰完整/, "basic check copy must not promise the image is a usable palm");

  await page.click("#startAnalyze");
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return /未检测到清晰掌心|NOT_PALM/.test(text);
  }, null, { timeout: 30000 });

  const state = await page.evaluate((keys) => {
    const text = document.body.innerText || "";
    return {
      url: location.href,
      text,
      hasStableAnalysis: Boolean(sessionStorage.getItem(keys.stableAnalysis)),
      stableText: sessionStorage.getItem(keys.stableAnalysis) || "",
    };
  }, STORAGE_KEYS);
  assert.match(state.url, /\/upload\/index\.html|\/upload\/?$/, "NOT_PALM must keep user on upload page");
  assert.equal(state.hasStableAnalysis, false, "NOT_PALM must not write a personality result");
  assert.doesNotMatch(state.text, /P25|老干部/, "NOT_PALM must not display P25 or 老干部");
  assert.doesNotMatch(state.stableText, /P25|老干部/, "NOT_PALM storage must not contain P25 or 老干部");

  await assertBrowserClean(signals, "stage6f fix3 invalid image gate");
  await page.close();
  return {
    status: "PASS",
    code: "NOT_PALM",
  };
}

async function validateStage6FFix3NoDefaultPersonaFallback(context) {
  const page = await context.newPage();
  const signals = createSignals(page);

  await page.addInitScript(() => {
    window.__PALMMI_UPLOAD_OPTIONS__ = {
      location: { protocol: "https:" },
      useAnalyzeApi: true,
      analyzeEndpoint: "/api/analyze",
      requestId: () => "req_stage6f_fix3_incomplete_result",
      apiClient: {
        canUseApi: () => true,
        callAnalyzeApi: async () => ({
          ok: true,
          request_id: "req_stage6f_fix3_incomplete_result",
          status: "SUCCESS",
          provider: "qwen",
          analysis_result: {
            personality_id: null,
            personality_name: null,
            main_line_type: null,
            quality_status: "PARTIAL",
          },
        }),
      },
    };
  });

  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  await attachGeneratedImageFile(page, {
    name: "mock-palm-incomplete.jpg",
    type: "image/jpeg",
    width: 1200,
    height: 1200,
    minBytes: 256 * 1024,
  });
  await page.click("#checkFile");
  await page.waitForFunction(() => /基础检查/.test(document.querySelector("#uploadStatus").textContent || ""), null, { timeout: 15000 });
  await page.click("#startAnalyze");
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return /ANALYSIS_UNRELIABLE|识别结果不稳定|掌纹不够清晰/.test(text);
  }, null, { timeout: 30000 });

  const state = await page.evaluate((keys) => ({
    url: location.href,
    text: document.body.innerText || "",
    stableRaw: sessionStorage.getItem(keys.stableAnalysis),
  }), STORAGE_KEYS);
  assert.match(state.url, /\/upload\/index\.html|\/upload\/?$/, "incomplete success must not navigate to result");
  assert.equal(state.stableRaw, null, "incomplete success must not be stored as last analysis");
  assert.doesNotMatch(state.text, /P25|老干部/, "incomplete result must not fall back to P25 老干部");

  await assertBrowserClean(signals, "stage6f fix3 no default persona");
  await page.close();
  return {
    status: "PASS",
    code: "ANALYSIS_UNRELIABLE",
  };
}

async function validateStage6FFix3RepeatedAnalysisIsolation(context) {
  const page = await context.newPage();
  const signals = createSignals(page);
  const firstResult = completeAnalysisResult({
    extra: {
      analysis_id: "analysis_first_valid",
    },
  });

  await page.addInitScript((analysisResult) => {
    window.__stage6fFix3CallCount = Number(sessionStorage.getItem("__stage6fFix3CallCount") || "0");
    window.__PALMMI_UPLOAD_OPTIONS__ = {
      location: { protocol: "https:" },
      useAnalyzeApi: true,
      analyzeEndpoint: "/api/analyze",
      requestId: () => `req_stage6f_fix3_isolation_${window.__stage6fFix3CallCount + 1}`,
      apiClient: {
        canUseApi: () => true,
        callAnalyzeApi: async () => {
          window.__stage6fFix3CallCount += 1;
          sessionStorage.setItem("__stage6fFix3CallCount", String(window.__stage6fFix3CallCount));
          if (window.__stage6fFix3CallCount === 1) {
            return {
              ok: true,
              request_id: "req_stage6f_fix3_isolation_1",
              status: "SUCCESS",
              provider: "qwen",
              analysis_result: analysisResult,
            };
          }
          return {
            ok: false,
            request_id: "req_stage6f_fix3_isolation_2",
            status: "RETRY_REQUIRED",
            error: {
              code: "NOT_PALM",
              message: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
              retryable: true,
            },
          };
        },
      },
    };
  }, firstResult);

  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  await attachGeneratedImageFile(page, {
    name: "mock-palm-a.jpg",
    type: "image/jpeg",
    width: 1200,
    height: 1200,
    minBytes: 256 * 1024,
  });
  await page.click("#checkFile");
  await page.waitForFunction(() => /基础检查/.test(document.querySelector("#uploadStatus").textContent || ""), null, { timeout: 15000 });
  await page.click("#startAnalyze");
  await page.waitForURL(/\/result\/index\.html|\/result\/?/, { timeout: 30000 });
  const firstStored = await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEYS.stableAnalysis);
  assert.ok(firstStored, "first valid analysis should store a result");
  assert.match(firstStored, /P25|老干部/, "first valid mocked result intentionally uses P25");

  await page.goto(localPageUrl("upload"), { waitUntil: "domcontentloaded" });
  await attachGeneratedImageFile(page, {
    name: "not-palm-second.jpg",
    type: "image/jpeg",
    width: 1000,
    height: 1000,
    minBytes: 128 * 1024,
  });
  await page.click("#checkFile");
  await page.waitForFunction(() => /基础检查/.test(document.querySelector("#uploadStatus").textContent || ""), null, { timeout: 15000 });
  await page.click("#startAnalyze");
  await page.waitForFunction(() => /未检测到清晰掌心|NOT_PALM/.test(document.body.innerText || ""), null, { timeout: 30000 });

  const secondState = await page.evaluate((key) => ({
    url: location.href,
    text: document.body.innerText || "",
    stableRaw: sessionStorage.getItem(key),
    callCount: window.__stage6fFix3CallCount,
  }), STORAGE_KEYS.stableAnalysis);
  assert.match(secondState.url, /\/upload\/index\.html|\/upload\/?$/, "second NOT_PALM must not navigate to result");
  assert.equal(secondState.callCount, 2, "second analysis should be a distinct API call");
  assert.equal(secondState.stableRaw, firstStored, "invalid second analysis must not overwrite last valid result");
  assert.doesNotMatch(secondState.text, /P25|老干部/, "second NOT_PALM status must not display previous P25 result");

  await assertBrowserClean(signals, "stage6f fix3 repeated analysis isolation");
  await page.close();
  return {
    status: "PASS",
    first_result_preserved: true,
    second_code: "NOT_PALM",
  };
}

async function validateStage6FFix3PosterContract(context) {
  const page = await context.newPage();
  const signals = createSignals(page);
  const result = completeAnalysisResult({
    extra: {
      analysis_id: "analysis_stage6f_fix3_poster",
      valid_palm: true,
    },
  });

  await page.addInitScript((analysisResult) => {
    sessionStorage.setItem("palmmi:last-analysis", JSON.stringify({
      version: 1,
      analysis_id: "analysis_stage6f_fix3_poster",
      created_at: "2026-05-21T00:00:00.000Z",
      provider: "qwen",
      analysis_result: analysisResult,
    }));
    sessionStorage.setItem("palmmi:lastAnalysisResult", JSON.stringify(analysisResult));
  }, result);

  await page.goto(localPageUrl("poster"), { waitUntil: "domcontentloaded" });
  await waitForPageState(page, "#posterApp");
  const state = await page.evaluate(() => ({
    state: document.querySelector("#posterApp").dataset.state,
    readyVisible: !document.querySelector("#posterReady").hidden,
    problemVisible: !document.querySelector("#posterProblem").hidden,
    text: document.body.innerText || "",
  }));
  assert.equal(state.readyVisible, true, "valid analysis_result must render a basic poster");
  assert.equal(state.problemVisible, false, "valid poster contract must not render problem panel");
  assert.doesNotMatch(state.text, /字段缺失|照片掌纹不够清晰/, "valid poster must not show missing-field or retake copy");

  await assertBrowserClean(signals, "stage6f fix3 poster contract");
  await page.close();
  return {
    status: "PASS",
    poster_state: state.state,
  };
}

async function validateStage6FFix3InvalidPosterBlocked(context) {
  const page = await context.newPage();
  const signals = createSignals(page);
  const invalidResult = {
    ...completeAnalysisResult(),
    status: "failed",
    valid_palm: false,
    quality_status: "NOT_PALM",
    user_message: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
  };

  await page.addInitScript((analysisResult) => {
    sessionStorage.setItem("palmmi:last-analysis", JSON.stringify({
      version: 1,
      analysis_id: "analysis_stage6f_fix3_not_palm",
      created_at: "2026-05-21T00:00:00.000Z",
      provider: "qwen",
      analysis_result: analysisResult,
    }));
  }, invalidResult);

  await page.goto(localPageUrl("poster"), { waitUntil: "domcontentloaded" });
  await waitForPageState(page, "#posterApp");
  const state = await page.evaluate(() => ({
    state: document.querySelector("#posterApp").dataset.state,
    readyVisible: !document.querySelector("#posterReady").hidden,
    problemVisible: !document.querySelector("#posterProblem").hidden,
    text: document.body.innerText || "",
  }));
  assert.equal(state.readyVisible, false, "invalid result must not render poster");
  assert.equal(state.problemVisible, true, "invalid result must show poster problem panel");
  assert.match(state.text, /未检测到清晰掌心|重新拍摄|清晰、正面、完整/, "invalid poster should ask for a clear palm retake");

  await assertBrowserClean(signals, "stage6f fix3 invalid poster blocked");
  await page.close();
  return {
    status: "PASS",
    poster_state: state.state,
  };
}

async function validateStage6FFix3ServerValidityContract() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  const payload = {
    request_id: "req_stage6f_fix3_server_not_palm",
    anonymous_device_id: "anon_stage6f_fix3_server",
    locale: "zh-CN",
    image: {
      file_name: "not-palm-beverage.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  };

  const notPalm = await runAnalyzeApi(payload, {
    env,
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            validity: {
              is_palm_photo: false,
              is_single_hand: false,
              is_palm_side_visible: false,
              palm_lines_visible: false,
              image_quality: "not_palm",
              reject_reason: "beverage object",
            },
            palm_features: {
              visible_features: [],
              confidence: 0,
            },
            result: {
              personality_id: null,
              candidate_results: [],
            },
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  assert.equal(notPalm.ok, false, "server must reject non-palm images");
  assert.equal(notPalm.error.code, "NOT_PALM", "server must expose NOT_PALM");
  assertNoResponseLeaks(notPalm, "server NOT_PALM response");

  const unreliable = await runAnalyzeApi({
    ...payload,
    request_id: "req_stage6f_fix3_server_unreliable",
  }, {
    env,
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            validity: {
              is_palm_photo: true,
              is_single_hand: true,
              is_palm_side_visible: true,
              palm_lines_visible: true,
              image_quality: "clear",
              reject_reason: "",
            },
            palm_features: {
              visible_features: [],
              confidence: 0.2,
            },
            result: {
              personality_id: null,
              candidate_results: [],
            },
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  assert.equal(unreliable.ok, false, "server must reject unreliable incomplete results");
  assert.equal(unreliable.error.code, "ANALYSIS_UNRELIABLE", "server must expose ANALYSIS_UNRELIABLE");
  assert.doesNotMatch(JSON.stringify(unreliable), /P25|老干部/, "unreliable response must not contain default P25");
  assertNoResponseLeaks(unreliable, "server ANALYSIS_UNRELIABLE response");

  return {
    status: "PASS",
    not_palm_code: notPalm.error.code,
    unreliable_code: unreliable.error.code,
  };
}

async function validateStage6FFix4NotPalmGateDoesNotTimeout() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const response = await runAnalyzeApi({
    request_id: "req_stage6f_fix4_not_palm_no_timeout",
    anonymous_device_id: "anon_stage6f_fix4",
    locale: "zh-CN",
    image: {
      file_name: "not-palm-beverage.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async (endpoint, init) => {
      fetchCount += 1;
      const body = JSON.parse(init.body);
      const prompt = body.messages[0].content[0].text || "";
      assert.doesNotMatch(prompt, /personality_id|candidate_results|majorLines/, "non-palm validation request must not ask for personality analysis fields");
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              validity: {
                is_palm_photo: false,
                is_single_hand: false,
                is_palm_side_visible: false,
                palm_lines_visible: false,
                image_quality: "not_palm",
                reject_reason: "beverage",
              },
              palm_features: null,
              result: null,
            }),
          },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });

  assert.equal(fetchCount, 1, "non-palm image must stop after validity request");
  assert.equal(response.ok, false, "non-palm response must be rejected");
  assert.equal(response.error.code, "NOT_PALM", "non-palm image must return NOT_PALM");
  assert.notEqual(response.error.code, "REQUEST_TIMEOUT", "non-palm image must not be reported as REQUEST_TIMEOUT");
  assert.doesNotMatch(JSON.stringify(response), /P25|老干部/, "non-palm response must not contain a personality result");
  assertNoResponseLeaks(response, "stage6f fix4 NOT_PALM no-timeout response");

  return {
    status: "PASS",
    code: response.error.code,
    fetch_count: fetchCount,
  };
}

async function validateStage6FFix4ValidityMissingIsUnreliable() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  const response = await runAnalyzeApi({
    request_id: "req_stage6f_fix4_missing_validity",
    anonymous_device_id: "anon_stage6f_fix4",
    locale: "zh-CN",
    image: {
      file_name: "missing-validity.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            palm_features: null,
            result: {
              personality_id: "P25",
              candidate_results: [{ personality_id: "P25" }],
            },
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }),
  });

  assert.equal(response.ok, false, "missing validity must be rejected");
  assert.equal(response.error.code, "ANALYSIS_UNRELIABLE", "missing validity must return ANALYSIS_UNRELIABLE");
  assert.notEqual(response.error.code, "REQUEST_TIMEOUT", "missing validity must not be reported as REQUEST_TIMEOUT");
  assert.doesNotMatch(JSON.stringify(response), /P25|老干部/, "missing validity response must not expose default personality");
  assertNoResponseLeaks(response, "stage6f fix4 missing validity response");

  return {
    status: "PASS",
    code: response.error.code,
  };
}

async function validateStage6FFix4FetchTimeoutOnlyForRealTimeout() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    PALMMI_VLM_TIMEOUT_MS: "10",
    QWEN_API_KEY: "",
  };
  const response = await runAnalyzeApi({
    request_id: "req_stage6f_fix4_fetch_timeout",
    anonymous_device_id: "anon_stage6f_fix4",
    locale: "zh-CN",
    image: {
      file_name: "timeout.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async (endpoint, init) => new Promise((resolve, reject) => {
      if (init && init.signal) {
        init.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }
    }),
  });

  assert.equal(response.ok, false, "true fetch timeout must fail");
  assert.equal(response.error.code, "REQUEST_TIMEOUT", "true fetch timeout must return REQUEST_TIMEOUT");
  assertNoResponseLeaks(response, "stage6f fix4 fetch timeout response");

  return {
    status: "PASS",
    code: response.error.code,
  };
}

function validateRealQwenSmokeDryRun() {
  const output = childProcess.execFileSync(process.execPath, [
    path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"),
    "--models",
    "qwen3-vl-flash,qwen3.6-flash",
    "--collapse-check",
    "--max-real-calls",
    "10",
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  const summary = JSON.parse(output);
  assert.equal(summary.ok, true, "real Qwen smoke dry run should exit successfully");
  assert.equal(summary.status, "REAL_QWEN_DISABLED", "real Qwen smoke must be disabled without --real");
  assert.equal(summary.api_calls_made, 0, "real Qwen smoke dry run must not call Qwen");
  assert.deepEqual(summary.models, ["qwen3-vl-flash", "qwen3.6-flash"], "dry run should preserve requested A/B models");
  assert.equal(summary.safety.printed_key, false, "dry run summary must not print keys");
  assert.equal(summary.safety.printed_base64, false, "dry run summary must not print base64");
  assert.equal(summary.safety.printed_raw_response, false, "dry run summary must not print raw responses");
  const leakCheckSummary = JSON.stringify(summary).replace(/printed_raw_response/g, "printedRawResponse");
  assert.deepEqual(leakFlags(leakCheckSummary, RESPONSE_LEAK_MARKERS), [], "real Qwen smoke dry run summary must not leak response internals or secrets");

  return {
    status: "PASS",
    mode: summary.status,
    api_calls_made: summary.api_calls_made,
    models: summary.models,
  };
}

function withTemporarySmokeImages(fileNames, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "palmmi-smoke-selection-"));
  try {
    for (const fileName of fileNames) {
      fs.writeFileSync(path.join(directory, fileName), "stage6f smoke fixture");
    }
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function runSmokeCli(args, allowFailure = false) {
  try {
    const output = childProcess.execFileSync(process.execPath, [
      path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"),
      ...args,
    ], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
    return JSON.parse(output);
  } catch (error) {
    if (!allowFailure) {
      throw error;
    }
    const stdout = error && typeof error.stdout === "string" ? error.stdout : "";
    return JSON.parse(stdout);
  }
}

function validateStage6FSmokeMultiPalmSelection() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  return withTemporarySmokeImages([
    "not-palm-beer.jpg",
    "palm-1.jpg",
    "palm-2.jpg",
    "palm-3.jpg",
    "palm-4.jpg",
    "palm-5.jpg",
  ], (directory) => {
    const options = smoke.parseArgs([
      "--real",
      "--image-dir",
      directory,
      "--models",
      "qwen3-vl-flash",
      "--collapse-check",
      "--debug-classifier",
      "--min-palm-samples",
      "5",
      "--min-unique-personalities",
      "2",
      "--max-real-calls",
      "12",
    ]);
    const selected = smoke.selectSamples(options);
    assert.equal(selected.ok, true, "collapse-check image-dir must accept not-palm plus palm-1..palm-5");
    assert.equal(selected.mode, "collapse-check", "collapse-check selection should report collapse-check mode");
    assert.equal(path.basename(selected.samples.not_palm), "not-palm-beer.jpg");
    const palmNames = Object.entries(selected.samples)
      .filter(([name]) => /^palm_\d+$/.test(name))
      .map(([, filePath]) => path.basename(filePath));
    assert.deepEqual(palmNames, [
      "palm-1.jpg",
      "palm-2.jpg",
      "palm-3.jpg",
      "palm-4.jpg",
      "palm-5.jpg",
    ], "collapse-check must preserve ordered palm numbered samples");
    assert.equal(Boolean(selected.samples.palm_faint), false, "collapse-check must not require palm_faint");
    assert.equal(Boolean(selected.samples.palm_clear), false, "collapse-check must not require palm_clear");
    const estimatedCalls = smoke.estimateRealCalls(
      Object.keys(selected.samples).map((name) => ({ name })),
      options.models
    );
    assert.equal(estimatedCalls, 11, "1 not-palm plus 5 palm samples should estimate 11 calls for one model");

    const explicitOptions = smoke.parseArgs([
      "--real",
      "--not-palm",
      path.join(directory, "not-palm-beer.jpg"),
      "--palm-sample",
      path.join(directory, "palm-1.jpg"),
      "--palm-sample",
      path.join(directory, "palm-2.jpg"),
      "--palm-sample",
      path.join(directory, "palm-3.jpg"),
      "--palm-sample",
      path.join(directory, "palm-4.jpg"),
      "--palm-sample",
      path.join(directory, "palm-5.jpg"),
      "--collapse-check",
      "--min-palm-samples",
      "5",
      "--max-real-calls",
      "12",
    ]);
    const explicitSelected = smoke.selectSamples(explicitOptions);
    assert.equal(explicitOptions.palmSamples.length, 5, "parseArgs must support repeated --palm-sample");
    assert.equal(explicitSelected.ok, true, "explicit repeated --palm-sample paths must be accepted");

    return {
      status: "PASS",
      not_palm: path.basename(selected.samples.not_palm),
      palm_samples: palmNames,
      estimated_real_calls: estimatedCalls,
      explicit_palm_sample_count: explicitOptions.palmSamples.length,
    };
  });
}

function validateStage6FSmokeSelectionFailures() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));

  const insufficient = withTemporarySmokeImages([
    "not-palm-beer.jpg",
    "palm-1.jpg",
    "palm-2.jpg",
    "palm-3.jpg",
    "palm-4.jpg",
  ], (directory) => {
    const options = smoke.parseArgs([
      "--real",
      "--image-dir",
      directory,
      "--collapse-check",
      "--min-palm-samples",
      "5",
    ]);
    const selected = smoke.selectSamples(options);
    assert.equal(selected.ok, false);
    assert.equal(selected.status, "INSUFFICIENT_PALM_SAMPLES");
    assert.equal(selected.api_calls_made || 0, 0);
    return selected.status;
  });

  const missingNotPalm = withTemporarySmokeImages([
    "palm-1.jpg",
    "palm-2.jpg",
    "palm-3.jpg",
    "palm-4.jpg",
    "palm-5.jpg",
  ], (directory) => {
    const options = smoke.parseArgs([
      "--real",
      "--image-dir",
      directory,
      "--collapse-check",
      "--min-palm-samples",
      "5",
    ]);
    const selected = smoke.selectSamples(options);
    assert.equal(selected.ok, false);
    assert.equal(selected.status, "NOT_PALM_SAMPLE_MISSING");
    assert.equal(selected.api_calls_made || 0, 0);
    return selected.status;
  });

  const maxExceeded = withTemporarySmokeImages([
    "not-palm-beer.jpg",
    "palm-1.jpg",
    "palm-2.jpg",
    "palm-3.jpg",
    "palm-4.jpg",
    "palm-5.jpg",
  ], (directory) => runSmokeCli([
    "--real",
    "--image-dir",
    directory,
    "--models",
    "qwen3-vl-flash",
    "--collapse-check",
    "--min-palm-samples",
    "5",
    "--max-real-calls",
    "10",
  ], true));
  assert.equal(maxExceeded.status, "MAX_REAL_CALLS_EXCEEDED");
  assert.equal(maxExceeded.estimated_real_calls, 11);
  assert.equal(maxExceeded.api_calls_made, 0);

  const dryRun = withTemporarySmokeImages([
    "not-palm-beer.jpg",
    "palm-1.jpg",
    "palm-2.jpg",
    "palm-3.jpg",
    "palm-4.jpg",
    "palm-5.jpg",
  ], (directory) => runSmokeCli([
    "--image-dir",
    directory,
    "--collapse-check",
    "--debug-classifier",
    "--min-palm-samples",
    "5",
    "--max-real-calls",
    "12",
  ]));
  assert.equal(dryRun.status, "REAL_QWEN_DISABLED");
  assert.equal(dryRun.api_calls_made, 0);
  const dryRunLeakCheck = JSON.stringify(dryRun).replace(/printed_raw_response/g, "printedRawResponse");
  assert.deepEqual(leakFlags(dryRunLeakCheck, RESPONSE_LEAK_MARKERS), [], "dry-run selection summary must not leak secrets or image payloads");

  return {
    status: "PASS",
    insufficient_palm_samples: insufficient,
    not_palm_missing: missingNotPalm,
    max_real_calls_exceeded: maxExceeded.status,
    dry_run: dryRun.status,
  };
}

async function validateStage6FFix5ValidPalmProducesPersonalityResult() {
  const {
    QwenVlmProvider,
  } = require(path.join(root, "server", "stage5p", "providers", "qwen-vlm-provider.js"));
  const provider = new QwenVlmProvider({
    env: {
      PALMMI_QWEN_API_KEY: "stage6f-test-key",
      QWEN_API_KEY: "",
    },
    fetchImpl: async () => {
      fetchCount += 1;
      const payload = fetchCount === 1
        ? {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: null,
          result: null,
        }
        : {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "acceptable",
            reject_reason: "",
          },
          palm_features: {
            main_line_type: "M1",
            line_depth: "medium",
            line_complexity: "simple",
            line_continuity: "continuous",
            branch_density: "low",
            palm_shape_hint: "wide",
            visible_features: ["HEAD_LINE_DEPTH", "OVERALL_CLARITY"],
            confidence: 0.42,
          },
          result: {
            personality_id: "P25",
            candidate_results: [{
              personality_id: "P25",
              main_line_type: "M1",
              confidence: 0.42,
              reason: "observable palm features only",
            }],
          },
        };
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  let fetchCount = 0;

  const result = await provider.analyze({
    request_id: "req_stage6f_fix5_valid_palm",
    image: {
      file_name: "valid-palm.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
    },
  });

  assert.equal(fetchCount, 2, "valid palm must continue from validity request to personality analysis request");
  assert.equal(result.ok, true, "valid palm with legal low-confidence personality result must not become ANALYSIS_UNRELIABLE");
  assert.equal(result.status, "LOW_CONFIDENCE", "valid palm confidence below review threshold should be LOW_CONFIDENCE");
  assert.equal(result.parsed.isValidPalmImage, true);
  assert.equal(result.parsed.result.personalityId, "P25");
  assert.equal(result.parsed.result.candidateResults.length, 1);
  assertNoResponseLeaks(result, "stage6f fix5 valid palm provider result");

  return {
    status: "PASS",
    fetch_count: fetchCount,
    provider_status: result.status,
    personality_id: result.parsed.result.personalityId,
    candidate_count: result.parsed.result.candidateResults.length,
  };
}

async function validateStage6FFix5ValidPalmMissingResultDiagnosed() {
  const {
    QwenVlmProvider,
  } = require(path.join(root, "server", "stage5p", "providers", "qwen-vlm-provider.js"));
  let fetchCount = 0;
  const provider = new QwenVlmProvider({
    env: {
      PALMMI_QWEN_API_KEY: "stage6f-test-key",
      QWEN_API_KEY: "",
    },
    fetchImpl: async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              validity: {
                is_palm_photo: true,
                is_single_hand: true,
                is_palm_side_visible: true,
                palm_lines_visible: true,
                image_quality: "clear",
                reject_reason: "",
              },
              palm_features: fetchCount === 1 ? null : {
                main_line_type: "M1",
                line_depth: "medium",
                line_complexity: "simple",
                line_continuity: "continuous",
                branch_density: "low",
                palm_shape_hint: "wide",
                visible_features: ["HEAD_LINE_DEPTH", "OVERALL_CLARITY"],
                confidence: 0.6,
              },
              result: null,
            }),
          },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });

  const result = await provider.analyze({
    request_id: "req_stage6f_fix5_validity_pass_result_missing",
    image: {
      file_name: "valid-palm-missing-result.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
    },
  });

  assert.equal(fetchCount, 2, "valid palm with missing Qwen final result must still execute the feature extraction stage");
  assert.equal(result.ok, true, "valid palm with usable palm_features must not require Qwen personality output");
  assert.equal(result.parsed.isValidPalmImage, true);
  assert.equal(result.parsed.result.personalityId, "");
  assert.equal(result.diagnostics.local_classifier_required, true);
  assertNoResponseLeaks(result, "stage6f fix5 valid palm missing result response");

  return {
    status: "PASS",
    provider_status: result.status,
    local_classifier_required: result.diagnostics.local_classifier_required,
    fetch_count: fetchCount,
  };
}

function validateStage6FFix5ParserPersonaAliases() {
  const {
    normalizeParsedPalmFeatures,
  } = require(path.join(root, "server", "stage5p", "providers", "qwen-response-parser.js"));
  const parsed = normalizeParsedPalmFeatures({
    validity: {
      is_palm_photo: true,
      is_single_hand: true,
      is_palm_side_visible: true,
      palm_lines_visible: true,
      image_quality: "acceptable",
    },
    palm_features: {
      main_line_type: "M1",
      confidence: 0.62,
    },
    result: {
      personality: "老干部",
      candidates: [{
        personality: "老干部",
        mainLineType: "M1",
        confidence: 0.62,
        reason: "exact frozen persona name",
      }],
    },
  });

  assert.equal(parsed.result.personalityId, "P25", "parser must map exact frozen persona names to known persona ids");
  assert.equal(parsed.result.mainLineType, "M1");
  assert.equal(parsed.result.candidateResults.length, 1);
  assert.equal(parsed.result.candidateResults[0].personality_id, "P25");

  return {
    status: "PASS",
    personality_id: parsed.result.personalityId,
    candidate_count: parsed.result.candidateResults.length,
  };
}

function validateStage6FFinalModelConfig() {
  const {
    QwenVlmProvider,
  } = require(path.join(root, "server", "stage5p", "providers", "qwen-vlm-provider.js"));

  const envModel = new QwenVlmProvider({
    env: {
      PALMMI_QWEN_API_KEY: "stage6f-test-key",
      PALMMI_QWEN_MODEL: "qwen3.6-flash",
      QWEN_MODEL: "qwen3-vl-flash",
    },
    fetchImpl: async () => new Response("{}"),
  });
  assert.equal(envModel.model, "qwen3.6-flash", "PALMMI_QWEN_MODEL must configure the provider model");

  const explicitModel = new QwenVlmProvider({
    env: {
      PALMMI_QWEN_API_KEY: "stage6f-test-key",
      PALMMI_QWEN_MODEL: "qwen3.6-flash",
      QWEN_MODEL: "qwen3-vl-flash",
    },
    model: "qwen3-vl-flash",
    fetchImpl: async () => new Response("{}"),
  });
  assert.equal(explicitModel.model, "qwen3-vl-flash", "explicit model must override env model");

  return {
    status: "PASS",
    env_model: envModel.model,
    explicit_model: explicitModel.model,
  };
}

async function validateStage6FFinalP25RequiresReason() {
  const {
    QwenVlmProvider,
  } = require(path.join(root, "server", "stage5p", "providers", "qwen-vlm-provider.js"));

  let fetchCount = 0;
  const ignoredQwenPersonaProvider = new QwenVlmProvider({
    env: {
      PALMMI_QWEN_API_KEY: "stage6f-test-key",
      QWEN_API_KEY: "",
    },
    fetchImpl: async () => {
      fetchCount += 1;
      const payload = fetchCount === 1
        ? {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: null,
          result: null,
        }
        : {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: {
            main_line_type: "M1",
            line_depth: "medium",
            line_complexity: "simple",
            line_continuity: "continuous",
            branch_density: "low",
            palm_shape_hint: "wide",
            visible_features: ["HEAD_LINE_DEPTH"],
            confidence: 0.62,
          },
          result: {
            personality_id: "P25",
            candidate_results: [{
              personality_id: "P25",
              main_line_type: "M1",
              confidence: 0.62,
            }],
          },
        };
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });

  const ignoredQwenPersona = await ignoredQwenPersonaProvider.analyze({
    request_id: "req_stage6f_final_p25_ignored_persona",
    image: {
      file_name: "p25-missing-reason.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
    },
  });
  assert.equal(ignoredQwenPersona.ok, true, "Qwen personality hints are ignored rather than accepted as final output");
  assert.equal(ignoredQwenPersona.diagnostics.qwen_personality_ignored, true);
  assert.equal(ignoredQwenPersona.diagnostics.local_classifier_required, true);

  let validFetchCount = 0;
  const featureReasonProvider = new QwenVlmProvider({
    env: {
      PALMMI_QWEN_API_KEY: "stage6f-test-key",
      QWEN_API_KEY: "",
    },
    fetchImpl: async () => {
      validFetchCount += 1;
      const payload = validFetchCount === 1
        ? {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: null,
          result: null,
        }
        : {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "acceptable",
            reject_reason: "",
          },
          palm_features: {
            main_line_type: "M1",
            line_depth: "medium",
            line_complexity: "simple",
            line_continuity: "continuous",
            branch_density: "low",
            palm_shape_hint: "square",
            visible_features: ["HEAD_LINE_DEPTH", "LINE_COMPLEXITY"],
            confidence: 0.62,
          },
          result: {
            personality_id: "P25",
            candidate_results: [{
              personality_id: "P25",
              main_line_type: "M1",
              confidence: 0.62,
              reason: "P25 is selected because palm_features show medium line_depth, simple line_complexity, continuous line_continuity, and low branch_density.",
            }],
            collapse_guard: {
              not_default_personality: true,
              reason_if_p25: "Specific palm feature evidence supports P25; it is not a fallback.",
            },
          },
        };
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const featureReason = await featureReasonProvider.analyze({
    request_id: "req_stage6f_final_p25_valid_reason",
    image: {
      file_name: "p25-valid-reason.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
    },
  });
  assert.equal(featureReason.ok, true, "feature extraction with concrete palm reasons must remain allowed");
  assert.equal(featureReason.parsed.result.personalityId, "P25");
  assert.equal(featureReason.parsed.diagnostics.has_collapse_guard, true);
  assert.match(
    featureReasonProvider.prompt || "",
    /local frozen Stage 3 classifier|Do not decide the final personality/,
    "provider prompt must state that final personality is local and feature-driven"
  );

  return {
    status: "PASS",
    qwen_personality_ignored: ignoredQwenPersona.diagnostics.qwen_personality_ignored,
    local_classifier_required: featureReason.diagnostics.local_classifier_required,
    qwen_hint_personality_id: featureReason.parsed.result.personalityId,
  };
}

function validateStage6FFinalSmokeCollapseDiagnostics() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  assert.equal(typeof smoke.parseArgs, "function", "smoke script must export parseArgs for testable CLI parsing");
  assert.equal(typeof smoke.estimateRealCalls, "function", "smoke script must export estimateRealCalls");
  assert.equal(typeof smoke.buildCollapseAnalysis, "function", "smoke script must export collapse analysis helper");

  const args = smoke.parseArgs([
    "--models",
    "qwen3-vl-flash,qwen3.6-flash",
    "--collapse-check",
    "--max-real-calls",
    "10",
  ]);
  assert.deepEqual(args.models, ["qwen3-vl-flash", "qwen3.6-flash"]);
  assert.equal(args.collapseCheck, true);
  assert.equal(args.maxRealCalls, 10);

  const estimated = smoke.estimateRealCalls([
    { name: "not_palm" },
    { name: "palm_faint" },
    { name: "palm_clear" },
  ], args.models);
  assert.equal(estimated, 10, "two-model smoke over three standard samples should budget 10 real Qwen calls");

  const collapse = smoke.buildCollapseAnalysis([
    {
      name: "palm_1",
      by_model: {
        "qwen3-vl-flash": { valid_palm: true, personality_id: "P25", has_personality_result: true },
        "qwen3.6-flash": { valid_palm: true, personality_id: "P01", has_personality_result: true },
      },
    },
    {
      name: "palm_2",
      by_model: {
        "qwen3-vl-flash": { valid_palm: true, personality_id: "P25", has_personality_result: true },
        "qwen3.6-flash": { valid_palm: true, personality_id: "P08", has_personality_result: true },
      },
    },
    {
      name: "palm_3",
      by_model: {
        "qwen3-vl-flash": { valid_palm: true, personality_id: "P25", has_personality_result: true },
        "qwen3.6-flash": { valid_palm: true, personality_id: "P12", has_personality_result: true },
      },
    },
  ], args.models);

  assert.equal(collapse["qwen3-vl-flash"].collapse_risk, true, "all palm samples on one personality should mark collapse risk");
  assert.equal(collapse["qwen3-vl-flash"].diagnostic_code, "PERSONALITY_COLLAPSE_RISK");
  assert.match(collapse["qwen3-vl-flash"].notes, /collapsed to P25/);
  assert.equal(collapse["qwen3.6-flash"].collapse_risk, false, "varied palm personalities should not mark collapse risk");

  return {
    status: "PASS",
    estimated_calls: estimated,
    collapse_code: collapse["qwen3-vl-flash"].diagnostic_code,
    varied_collapse_risk: collapse["qwen3.6-flash"].collapse_risk,
  };
}

function validateStage6FFinalLowConfidencePosterContract() {
  const resultPage = require(path.join(root, "scripts", "palmmi-result.js"));
  const posterPage = require(path.join(root, "scripts", "palmmi-poster.js"));
  const storage = createMemoryStorage();
  const lowConfidence = completeAnalysisResult({
    status: "degraded",
    extra: {
      valid_palm: true,
      quality_status: "LOW_CONFIDENCE",
      evidence: "",
      user_message: "这次图片可读性一般，结果更适合作为娱乐参考。",
      diagnostics: {
        lowConfidenceFieldCount: 1,
        missingFieldCount: 0,
        unknownFieldCount: 0,
        adapterWarnings: [],
        providerWarnings: [],
        matcherWarnings: [],
        contractWarnings: ["CONTRACT_DEGRADED"],
      },
      uiConsumable: {
        personaId: "P25",
        personaName: "老干部",
        confidence: 0.48,
        status: "degraded",
        qualityStatus: "LOW_CONFIDENCE",
        primaryDisplayText: "老干部",
        secondaryDisplayText: "别人还在情绪开会，你已经端着保温杯散会了。",
        warningBadges: ["CONTRACT_DEGRADED"],
      },
    },
  });
  storage.setItem(STORAGE_KEYS.stableAnalysis, JSON.stringify({
    version: 1,
    analysis_id: "analysis_stage6f_final_low_confidence_poster",
    created_at: "2026-05-22T00:00:00.000Z",
    provider: "qwen",
    analysis_result: lowConfidence,
  }));

  const resultRead = resultPage.readAnalysisResult({ storage });
  const posterRead = posterPage.readAnalysisResult({ storage });
  assert.equal(resultRead.ok, true, "LOW_CONFIDENCE valid palm must render result page");
  assert.equal(posterRead.ok, true, "LOW_CONFIDENCE valid palm must render a basic poster");

  const resultView = resultPage.createResultViewModel(resultRead.result);
  const posterView = posterPage.createPosterViewModel(posterRead.result);
  assert.equal(resultView.posterEnabled, true, "LOW_CONFIDENCE valid result should keep poster action enabled");
  assert.equal(posterView.problem, undefined, "LOW_CONFIDENCE valid result must not become a poster problem view");
  assert.notEqual(posterView.state, "partial-result", "LOW_CONFIDENCE poster rendering should be ready when minimum contract exists");

  const notPalmStorage = createMemoryStorage();
  const notPalm = {
    ...completeAnalysisResult(),
    status: "failed",
    valid_palm: false,
    quality_status: "NOT_PALM",
    user_message: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
  };
  notPalmStorage.setItem(STORAGE_KEYS.stableAnalysis, JSON.stringify({
    version: 1,
    analysis_id: "analysis_stage6f_final_not_palm_poster",
    created_at: "2026-05-22T00:00:00.000Z",
    provider: "qwen",
    analysis_result: notPalm,
  }));
  const notPalmRead = posterPage.readAnalysisResult({ storage: notPalmStorage });
  assert.equal(notPalmRead.ok, false, "NOT_PALM must remain blocked from poster generation");

  return {
    status: "PASS",
    low_confidence_poster: "PASS",
    not_palm_poster_blocked: "PASS",
  };
}

function qwenChatResponse(payload) {
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function validPalmFeatureOnlyPayload(overrides = {}) {
  return {
    validity: {
      is_palm_photo: true,
      is_single_hand: true,
      is_palm_side_visible: true,
      palm_lines_visible: true,
      image_quality: "acceptable",
      reject_reason: "",
    },
    palm_features: {
      main_line_type: "M2",
      line_depth: "deep",
      line_complexity: "complex",
      line_continuity: "mixed",
      branch_density: "high",
      palm_shape_hint: "long",
      visible_features: ["HEAD_LINE_DEPTH", "LINE_COMPLEXITY", "HEART_LINE_LENGTH"],
      confidence: 0.68,
      feature_reasons: [
        "palm_features show deep line_depth, complex line_complexity, mixed line_continuity, and high branch_density.",
      ],
    },
    majorLines: {
      lifeLine: {
        visibility: "clear",
        length: "long",
        depth: "deep",
        curvature: "high",
        breaks: "minor",
        branches: "many",
        confidence: 0.68,
      },
      headLine: {
        visibility: "clear",
        length: "long",
        depth: "deep",
        slope: "downward",
        breaks: "minor",
        branches: "many",
        confidence: 0.68,
      },
      heartLine: {
        visibility: "clear",
        length: "long",
        depth: "medium",
        curvature: "high",
        ending: "under_middle",
        breaks: "minor",
        branches: "few",
        confidence: 0.62,
      },
    },
    minorLines: {
      fateLine: {
        visibility: "clear",
        strength: "strong",
        continuity: "partial",
        confidence: 0.58,
      },
    },
    palmShape: {
      palmWidth: "medium",
      palmLength: "long",
      fingerLength: "long",
      shapeHint: "long",
      confidence: 0.6,
    },
    result: null,
    ...overrides,
  };
}

async function runFeatureDrivenMockAnalysis(requestId = "req_stage6f_final_fix_feature_driven") {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const response = await runAnalyzeApi({
    request_id: requestId,
    anonymous_device_id: "anon_stage6f_final_fix",
    locale: "zh-CN",
    image: {
      file_name: "feature-driven-palm.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async () => {
      fetchCount += 1;
      return qwenChatResponse(fetchCount === 1
        ? {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: null,
          result: null,
        }
        : validPalmFeatureOnlyPayload());
    },
  });

  return { response, fetchCount };
}

async function validateStage6FFinalFixFeatureDrivenLocalClassification() {
  const firstRun = await runFeatureDrivenMockAnalysis("req_stage6f_final_fix_feature_driven_a");
  const secondRun = await runFeatureDrivenMockAnalysis("req_stage6f_final_fix_feature_driven_b");
  const first = firstRun.response;
  const second = secondRun.response;

  assert.equal(firstRun.fetchCount, 2, "valid palm must pass validity and then run feature extraction");
  assert.equal(first.ok, true, "valid palm with palm_features but no Qwen final personality must still produce a local classifier result");
  assert.equal(first.provider, "qwen");
  assert.equal(first.analysis_result.valid_palm, true);
  assert.ok(first.analysis_result.personality_id, "local classifier must produce a personality_id");
  assert.ok(Array.isArray(first.analysis_result.candidate_results), "local classifier must produce candidate_results");
  assert.ok(first.analysis_result.candidate_results.length > 0, "local classifier must produce at least one candidate");
  assert.equal(
    first.analysis_result.personality_id,
    first.analysis_result.candidate_results[0].personality_id,
    "saved main personality must always equal candidate_results[0]"
  );
  assert.notEqual(first.analysis_result.personality_id, "STAGE4D_MOCK_PERSONA", "local classifier must not fall back to Stage 4 mock persona");
  assertNoResponseLeaks(first, "stage6f final fix feature-driven local classification response");

  assert.equal(second.ok, true, "same feature payload must remain classifiable on repeated runs");
  assert.equal(second.analysis_result.personality_id, first.analysis_result.personality_id, "classifier must be deterministic for identical palm_features");
  assert.deepEqual(
    second.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
    first.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
    "candidate ranking must be deterministic for identical palm_features"
  );

  return {
    status: "PASS",
    personality_id: first.analysis_result.personality_id,
    candidate_ids: first.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
    fetch_count: firstRun.fetchCount,
  };
}

async function validateStage6FFinalFixSmokeUsesLocalCandidates() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  const { normalizeParsedPalmFeatures } = require(path.join(root, "server", "stage5p", "providers", "qwen-response-parser.js"));
  assert.equal(typeof smoke.buildContractSummary, "function", "smoke script must expose contract summary helper for candidate consistency tests");

  const parsed = normalizeParsedPalmFeatures(validPalmFeatureOnlyPayload({
    result: {
      personality_id: "P25",
      candidate_results: [
        { personality_id: "P12", main_line_type: "M1", confidence: 0.7, reason: "raw Qwen candidate hint" },
        { personality_id: "P08", main_line_type: "M1", confidence: 0.6, reason: "raw Qwen candidate hint" },
        { personality_id: "P21", main_line_type: "M1", confidence: 0.5, reason: "raw Qwen candidate hint" },
      ],
    },
  }));
  const summary = await smoke.buildContractSummary(parsed, {
    fileName: "local-candidate-test.jpg",
    contentType: "image/jpeg",
    sizeBytes: syntheticPngBuffer().length,
  }, "stage6f_final_fix_smoke_candidate_consistency", "qwen3-vl-flash");

  assert.ok(summary.personality_id, "smoke contract summary must expose local classifier personality_id");
  assert.ok(Array.isArray(summary.candidate_ids), "smoke contract summary must expose local candidate ids");
  assert.ok(summary.candidate_ids.length > 0, "smoke contract summary must include local candidates");
  assert.equal(summary.personality_id, summary.candidate_ids[0], "smoke summary candidate_ids must be aligned with local contract main result");
  assert.notDeepEqual(summary.candidate_ids.slice(0, 3), ["P12", "P08", "P21"], "smoke summary must not report raw Qwen candidate hints as final candidates");

  return {
    status: "PASS",
    personality_id: summary.personality_id,
    candidate_ids: summary.candidate_ids,
  };
}

function validateStage6FFinalFixPosterMainCandidateMismatchBlocked() {
  const posterPage = require(path.join(root, "scripts", "palmmi-poster.js"));
  const storage = createMemoryStorage();
  const mismatch = completeAnalysisResult({
    extra: {
      personality_id: "P25",
      candidate_results: [
        { personality_id: "P12", personality_name: "节奏规划者", main_line_type: "M4" },
        { personality_id: "P08", personality_name: "观察型稳态人", main_line_type: "M2" },
      ],
      valid_palm: true,
      quality_status: "LOW_CONFIDENCE",
    },
  });
  storage.setItem(STORAGE_KEYS.stableAnalysis, JSON.stringify({
    version: 1,
    analysis_id: "analysis_stage6f_final_fix_candidate_mismatch",
    created_at: "2026-05-22T00:00:00.000Z",
    provider: "qwen",
    analysis_result: mismatch,
  }));

  const posterRead = posterPage.readAnalysisResult({ storage });
  assert.equal(posterRead.ok, false, "poster must not render mismatched main/candidate analysis results");
  assert.equal(posterRead.error_code, "POSTER_MAIN_CANDIDATE_MISMATCH", "poster must expose a specific main/candidate mismatch error code");

  return {
    status: "PASS",
    error_code: posterRead.error_code,
  };
}

async function validateStage6FFinalFixMissingPersonalityDoesNotDefaultP25() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const response = await runAnalyzeApi({
    request_id: "req_stage6f_final_fix_missing_personality",
    anonymous_device_id: "anon_stage6f_final_fix",
    locale: "zh-CN",
    image: {
      file_name: "missing-personality.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async () => {
      fetchCount += 1;
      return qwenChatResponse(fetchCount === 1
        ? {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: null,
          result: null,
        }
        : {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "acceptable",
            reject_reason: "",
          },
          palm_features: {
            visible_features: [],
            confidence: 0.1,
          },
          result: null,
        });
    },
  });

  assert.equal(response.ok, false, "validity pass with insufficient palm_features must fail safely");
  assert.equal(response.error.code, "ANALYSIS_UNRELIABLE");
  assert.doesNotMatch(JSON.stringify(response), /P25|老干部/, "missing personality path must not default to P25");
  assertNoResponseLeaks(response, "stage6f final fix missing personality response");

  return {
    status: "PASS",
    code: response.error.code,
    fetch_count: fetchCount,
  };
}

async function runStage6FCalibrationMockAnalysis(palmFeatures, requestId = "req_stage6f_classifier_calibration") {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const response = await runAnalyzeApi({
    request_id: requestId,
    anonymous_device_id: "anon_stage6f_classifier_calibration",
    locale: "zh-CN",
    image: {
      file_name: `${requestId}.jpg`,
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async () => {
      fetchCount += 1;
      return qwenChatResponse(fetchCount === 1
        ? {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "clear",
            reject_reason: "",
          },
          palm_features: null,
          result: null,
        }
        : {
          validity: {
            is_palm_photo: true,
            is_single_hand: true,
            is_palm_side_visible: true,
            palm_lines_visible: true,
            image_quality: "acceptable",
            reject_reason: "",
          },
          palm_features: {
            confidence: 0.64,
            visible_features: ["HEAD_LINE_DEPTH", "LINE_COMPLEXITY"],
            feature_reasons: ["mock palm feature vector for classifier calibration"],
            ...palmFeatures,
          },
          result: null,
        });
    },
  });

  return { response, fetchCount };
}

async function validateStage6FClassifierCalibrationNoDefaultLiuyishou() {
  const { response, fetchCount } = await runStage6FCalibrationMockAnalysis({
    main_line_type: "unknown",
    line_depth: "unknown",
    line_complexity: "unknown",
    line_continuity: "unknown",
    branch_density: "unknown",
    palm_shape_hint: "unknown",
    visible_features: ["OVERALL_CLARITY"],
    feature_reasons: ["visible palm but classifier features are unknown"],
  }, "req_stage6f_classifier_no_default_liuyishou");

  assert.equal(fetchCount, 2, "valid palm should still run the analysis feature request");
  assert.equal(response.ok, false, "all-unknown palm_features must not be classified");
  assert.ok(
    ["LOW_INFORMATION_FEATURE_SET", "ANALYSIS_UNRELIABLE"].includes(response.error.code),
    "all-unknown palm_features must fail as low-information or unreliable"
  );
  assert.doesNotMatch(JSON.stringify(response), /P31|留一手/, "unknown palm_features must not default to 留一手");
  assertNoResponseLeaks(response, "stage6f classifier no default liuyishou response");

  return {
    status: "PASS",
    code: response.error.code,
    fetch_count: fetchCount,
  };
}

async function validateStage6FFinalClassifierHardFixAllUnknownNoDefaultLiuyishou() {
  const { response, fetchCount } = await runStage6FCalibrationMockAnalysis({
    main_line_type: "unknown",
    line_depth: "unknown",
    line_complexity: "unknown",
    line_continuity: "unknown",
    branch_density: "unknown",
    palm_shape_hint: "unknown",
    visible_features: ["OVERALL_CLARITY"],
    feature_reasons: ["all classifier features are unknown"],
  }, "req_stage6f_hard_fix_all_unknown");

  assert.equal(fetchCount, 2, "valid palm still needs the feature extraction request before classification gate");
  assert.equal(response.ok, false, "all-unknown palm_features must not produce a personality");
  assert.ok(
    ["LOW_INFORMATION_FEATURE_SET", "ANALYSIS_UNRELIABLE"].includes(response.error.code),
    "all-unknown palm_features must fail safely"
  );
  assert.doesNotMatch(JSON.stringify(response), /P31|留一手/, "all-unknown features must not default to P31 留一手");
  assertNoResponseLeaks(response, "stage6f hard fix all unknown response");

  return {
    status: "PASS",
    code: response.error.code,
    fetch_count: fetchCount,
  };
}

async function validateStage6FFinalClassifierHardFixLowInformationFeatureSet() {
  const { response } = await runStage6FCalibrationMockAnalysis({
    main_line_type: "unknown",
    line_depth: "medium",
    line_complexity: "unknown",
    line_continuity: "unknown",
    branch_density: "unknown",
    palm_shape_hint: "unknown",
    visible_features: ["HEAD_LINE_DEPTH"],
    feature_reasons: ["only two classifier fields are usable"],
  }, "req_stage6f_hard_fix_low_information");

  assert.equal(response.ok, false, "1-2 usable classifier fields must not produce a personality");
  assert.equal(response.error.code, "LOW_INFORMATION_FEATURE_SET", "low-information feature set must use a specific error code");
  assert.doesNotMatch(JSON.stringify(response), /P31|留一手/, "low-information feature set must not default to P31 留一手");
  assertNoResponseLeaks(response, "stage6f hard fix low information response");

  return {
    status: "PASS",
    code: response.error.code,
  };
}

function validateStage6FFinalClassifierHardFix2LowInformationDebug() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  const result = smoke.publicResultFromSampleResult({
    duration_ms: 123,
    usage: null,
    status: "FAIL",
    actual_code: "LOW_INFORMATION_FEATURE_SET",
    actual_quality_status: "LOW_INFORMATION_FEATURE_SET",
    diagnostic_code: "LOW_INFORMATION_FEATURE_SET",
    valid_palm: true,
    personality_id: null,
    has_personality_result: false,
    candidate_count: 0,
    candidate_ids: [],
    classifier_debug: {
      classifier_version: "stage6f-hard-fix.v1",
      palm_features: {
        main_line_type: "unknown",
        line_depth: "unknown",
        line_complexity: "unknown",
        line_continuity: "unknown",
        branch_density: "unknown",
        palm_shape_hint: "unknown",
        confidence: 0.46,
      },
      normalized_features: {
        mainLineType: "unknown",
        lineDepth: "unknown",
        lineComplexity: "unknown",
        lineContinuity: "unknown",
        branchDensity: "unknown",
        palmShapeHint: "unknown",
        confidence: 0.46,
      },
      rule_input: null,
      usable_feature_count: 0,
      unknown_feature_count: 6,
      missing_features: ["main_line_type", "line_depth", "line_complexity", "line_continuity", "branch_density", "palm_shape_hint"],
      low_information_reason: "all_classifier_features_unknown",
      score_margin: null,
      top_candidates: [],
      diagnostic_code: "LOW_INFORMATION_FEATURE_SET",
    },
    notes: "Low-information palm feature set.",
  }, { debugClassifier: true });

  assert.ok(result.classifier_debug, "LOW_INFORMATION_FEATURE_SET smoke result must include classifier_debug");
  assert.equal(result.classifier_debug.diagnostic_code, "LOW_INFORMATION_FEATURE_SET");
  assert.equal(result.classifier_debug.usable_feature_count, 0);
  assert.ok(result.classifier_debug.unknown_feature_count >= 5);
  assert.deepEqual(leakFlags(JSON.stringify(result.classifier_debug), RESPONSE_LEAK_MARKERS), [], "classifier debug must stay redacted");

  return {
    status: "PASS",
    diagnostic_code: result.classifier_debug.diagnostic_code,
    usable_feature_count: result.classifier_debug.usable_feature_count,
    unknown_feature_count: result.classifier_debug.unknown_feature_count,
  };
}

function validateStage6FFinalClassifierHardFix2ChineseNormalize() {
  const { normalizeParsedPalmFeatures } = require(path.join(root, "server", "stage5p", "providers", "qwen-response-parser.js"));
  const { normalizeVlmToPalmFeatureSet } = require(path.join(root, "src", "stage5", "normalize-vlm-to-palm-feature-set.js"));
  const { palmFeatureSetToRuleInput } = require(path.join(root, "src", "stage5", "palm-feature-set-to-rule-input.js"));
  const parsed = normalizeParsedPalmFeatures({
    validity: {
      is_palm_photo: true,
      is_single_hand: true,
      is_palm_side_visible: true,
      palm_lines_visible: true,
      image_quality: "acceptable",
    },
    palm_features: {
      main_line_type: "M2",
      line_depth: "浅",
      line_complexity: "复杂",
      line_continuity: "混合",
      branch_density: "密集",
      palm_shape_hint: "方形",
      confidence: 0.52,
    },
  });
  const featureSet = normalizeVlmToPalmFeatureSet({ parsed }, { provider: "qwen", model: "qwen3-vl-flash" });
  const ruleInput = palmFeatureSetToRuleInput(featureSet);
  const signals = featureSet.classificationSignals;

  assert.equal(signals.mainLineType, "M2");
  assert.equal(signals.lineDepth, "faint");
  assert.equal(signals.lineComplexity, "complex");
  assert.equal(signals.lineContinuity, "mixed");
  assert.equal(signals.branchDensity, "high");
  assert.equal(signals.palmShapeHint, "square");
  assert.ok(ruleInput.diagnostics.usableFeatureCount >= 5, "Chinese palm_features should produce usable classifier fields");

  return {
    status: "PASS",
    usable_feature_count: ruleInput.diagnostics.usableFeatureCount,
    normalized: signals,
  };
}

function validateStage6FFinalClassifierHardFix2AliasNormalize() {
  const { normalizeParsedPalmFeatures } = require(path.join(root, "server", "stage5p", "providers", "qwen-response-parser.js"));
  const { normalizeVlmToPalmFeatureSet } = require(path.join(root, "src", "stage5", "normalize-vlm-to-palm-feature-set.js"));
  const { palmFeatureSetToRuleInput } = require(path.join(root, "src", "stage5", "palm-feature-set-to-rule-input.js"));
  const parsed = normalizeParsedPalmFeatures({
    validity: {
      is_palm_photo: true,
      is_single_hand: true,
      is_palm_side_visible: true,
      palm_lines_visible: true,
      image_quality: "acceptable",
    },
    palm_features: {
      mainLineType: "M3",
      depth: "deep",
      complexity: "medium",
      continuity: "broken",
      branches: "low",
      shape: "long",
      feature_confidence: 0.61,
    },
  });
  const featureSet = normalizeVlmToPalmFeatureSet({ parsed }, { provider: "qwen", model: "qwen3-vl-flash" });
  const ruleInput = palmFeatureSetToRuleInput(featureSet);
  const signals = featureSet.classificationSignals;

  assert.equal(signals.mainLineType, "M3");
  assert.equal(signals.lineDepth, "deep");
  assert.equal(signals.lineComplexity, "medium");
  assert.equal(signals.lineContinuity, "broken");
  assert.equal(signals.branchDensity, "low");
  assert.equal(signals.palmShapeHint, "long");
  assert.ok(ruleInput.diagnostics.usableFeatureCount >= 5, "alias palm_features should produce usable classifier fields");

  return {
    status: "PASS",
    usable_feature_count: ruleInput.diagnostics.usableFeatureCount,
    normalized: signals,
  };
}

async function validateStage6FFinalClassifierHardFix2TwoUsableFeaturesNotOverblocked() {
  const { response } = await runStage6FCalibrationMockAnalysis({
    line_complexity: "complex",
    branch_density: "high",
    confidence: 0.4,
    visible_features: ["LINE_COMPLEXITY", "BRANCH_DENSITY"],
    feature_reasons: ["two concrete palm features without main line type"],
  }, "req_stage6f_hard_fix2_two_usable_features");

  assert.equal(response.ok, true, "two usable high-signal palm_features should not be overblocked");
  assert.notEqual(response.analysis_result.quality_status, "LOW_INFORMATION_FEATURE_SET");
  assert.ok(["OK", "LOW_CONFIDENCE"].includes(response.analysis_result.quality_status), "two-feature result should classify as OK or LOW_CONFIDENCE");
  assert.ok(response.analysis_result.personality_id, "two-feature result should produce a personality");

  return {
    status: "PASS",
    quality_status: response.analysis_result.quality_status,
    personality_id: response.analysis_result.personality_id,
  };
}

function validateStage6FFinalClassifierHardFix2AllPalmLowInformationHardFail() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  const samples = [
    {
      name: "not_palm",
      by_model: {
        "qwen3-vl-flash": {
          actual_code: "NOT_PALM",
          valid_palm: false,
          has_personality_result: false,
          personality_id: null,
        },
      },
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      name: `palm_${index + 1}`,
      by_model: {
        "qwen3-vl-flash": {
          status: "FAIL",
          actual_code: "LOW_INFORMATION_FEATURE_SET",
          actual_quality_status: "LOW_INFORMATION_FEATURE_SET",
          diagnostic_code: "LOW_INFORMATION_FEATURE_SET",
          valid_palm: true,
          personality_id: null,
          has_personality_result: false,
          candidate_count: 0,
        },
      },
    })),
  ];
  const analysis = smoke.buildCollapseAnalysis(samples, ["qwen3-vl-flash"], {
    minPalmSamples: 5,
    minUniquePersonalities: 2,
  });
  const modelAnalysis = analysis["qwen3-vl-flash"];
  assert.equal(modelAnalysis.palm_sample_count, 5);
  assert.equal(modelAnalysis.valid_personality_count, 0);
  assert.equal(modelAnalysis.low_information_count, 5);
  assert.equal(modelAnalysis.hard_fail, true);
  assert.equal(modelAnalysis.diagnostic_code, "ALL_PALM_LOW_INFORMATION");
  assert.equal(smoke.smokeSummaryOk(samples, analysis), false);

  return {
    status: "PASS",
    diagnostic_code: modelAnalysis.diagnostic_code,
    palm_sample_count: modelAnalysis.palm_sample_count,
    low_information_count: modelAnalysis.low_information_count,
  };
}

async function validateStage6FFinalClassifierHardFixFiveMockDiversity() {
  const cases = [
    {
      label: "A",
      features: {
        main_line_type: "M3",
        line_depth: "deep",
        line_complexity: "complex",
        line_continuity: "mixed",
        branch_density: "high",
        palm_shape_hint: "long",
        confidence: 0.72,
      },
    },
    {
      label: "B",
      features: {
        main_line_type: "M1",
        line_depth: "faint",
        line_complexity: "simple",
        line_continuity: "continuous",
        branch_density: "low",
        palm_shape_hint: "wide",
        confidence: 0.62,
      },
    },
    {
      label: "C",
      features: {
        main_line_type: "M7",
        line_depth: "medium",
        line_complexity: "medium",
        line_continuity: "broken",
        branch_density: "high",
        palm_shape_hint: "wide",
        confidence: 0.69,
      },
    },
    {
      label: "D",
      features: {
        main_line_type: "M4",
        line_depth: "deep",
        line_complexity: "simple",
        line_continuity: "continuous",
        branch_density: "low",
        palm_shape_hint: "square",
        confidence: 0.7,
      },
    },
    {
      label: "E",
      features: {
        main_line_type: "M8",
        line_depth: "faint",
        line_complexity: "complex",
        line_continuity: "mixed",
        branch_density: "medium",
        palm_shape_hint: "long",
        confidence: 0.66,
      },
    },
  ];

  const results = [];
  for (const item of cases) {
    const { response } = await runStage6FCalibrationMockAnalysis(item.features, `req_stage6f_hard_fix_diversity_${item.label}`);
    assert.equal(response.ok, true, `${item.label} must remain classifiable with enough usable palm_features`);
    results.push({
      label: item.label,
      personality_id: response.analysis_result.personality_id,
      candidate_ids: response.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
    });
  }

  const ids = results.map((item) => item.personality_id);
  const uniqueIds = [...new Set(ids)];
  assert.ok(uniqueIds.length >= 3, "five distinct mock feature groups must produce at least three personality ids");
  assert.ok(!ids.every((id) => id === "P31"), "five mock feature groups must not all collapse to P31");
  assert.ok(!ids.every((id) => id === ids[0]), "five mock feature groups must not all collapse to one personality");

  return {
    status: "PASS",
    unique_personality_count: uniqueIds.length,
    results,
  };
}

function validateStage6FFinalClassifierHardFixP31LegalEvidence() {
  const { buildAnalysisResultContract } = require(path.join(root, "src", "stage5", "analysis-result-contract.js"));
  const p31Recognition = {
    schemaVersion: "recognition-result.v1",
    provider: "stage6f-hard-fix-test",
    model: "local-classifier",
    status: "LOW_CONFIDENCE",
    primary_persona: {
      id: "P31",
      persona_id: "P31",
      name: "留一手",
      score: 0.84,
      confidence: 0.84,
      mother_type: "M1",
      matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "FATE_LINE_CLARITY", "THUMB_LENGTH_RATIO", "FINGER_SPREAD"],
      reason_codes: [
        "HEAD_LINE_LENGTH_GTE_2",
        "HEAD_LINE_DEPTH_GTE_2",
        "FATE_LINE_CLARITY_LTE_1",
        "THUMB_LENGTH_RATIO_BETWEEN_1_2",
        "FINGER_SPREAD_LTE_1",
      ],
    },
    primary_mother: {
      id: "M1",
      name: "M1",
      core_fields_matched: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "FATE_LINE_CLARITY"],
    },
    top3: [
      {
        id: "P31",
        persona_id: "P31",
        name: "留一手",
        score: 0.84,
        mother_type: "M1",
        matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "FATE_LINE_CLARITY", "THUMB_LENGTH_RATIO", "FINGER_SPREAD"],
        reason_codes: ["P31_LEGAL_FEATURE_EVIDENCE"],
      },
      {
        id: "P25",
        persona_id: "P25",
        name: "老干部",
        score: 0.45,
        mother_type: "M1",
        matched_features: ["HEAD_LINE_DEPTH"],
        reason_codes: ["SECONDARY_MATCH"],
      },
    ],
    quality_gate: {
      passed: true,
      confidence: 0.7,
      reasons: [],
    },
    recognition: {
      explanation: {
        persona: {
          matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "FATE_LINE_CLARITY", "THUMB_LENGTH_RATIO", "FINGER_SPREAD"],
        },
        low_confidence: true,
      },
    },
    diagnostics: {
      lowConfidenceFieldCount: 1,
      missingFieldCount: 0,
      unknownFieldCount: 0,
      usableFeatureCount: 6,
      unknownFeatureCount: 0,
      scoreMargin: 0.39,
      collapseRiskHint: false,
      classifierVersion: "stage6f-hard-fix-test",
      adapterWarnings: [],
      providerWarnings: [],
      matcherWarnings: [],
      contractWarnings: [],
    },
  };
  const contract = buildAnalysisResultContract({
    schemaVersion: "analysis-result.v1",
    status: "LOW_CONFIDENCE",
    recognition_result: p31Recognition,
    analysis_input: {
      finalPersona: {
        id: "P31",
        name: "留一手",
        confidence: 0.84,
      },
      diagnostics: p31Recognition.diagnostics,
      sourceImage: "p31-legal-evidence.jpg",
      provider: "stage6f-hard-fix-test",
      model: "local-classifier",
    },
    diagnostics: p31Recognition.diagnostics,
  }, {
    now: () => "2026-05-22T00:00:00.000Z",
  });

  assert.equal(contract.personality_id, "P31", "legal P31 fixture must produce P31");
  assert.equal(contract.candidate_results[0].personality_id, "P31", "legal P31 must be candidate_results[0]");
  assert.ok(contract.candidate_results[0].reason, "legal P31 must have a feature reason");
  assert.ok(Object.keys(contract.candidate_results[0].score_breakdown || {}).length > 0, "legal P31 must have score_breakdown");
  assert.doesNotMatch(contract.candidate_results[0].reason, /fallback/i, "legal P31 reason must not be fallback");

  return {
    status: "PASS",
    personality_id: contract.personality_id,
    candidate_id: contract.candidate_results[0].personality_id,
  };
}

async function validateStage6FFinalClassifierHardFixDeterministic() {
  const features = {
    main_line_type: "M8",
    line_depth: "medium",
    line_complexity: "complex",
    line_continuity: "mixed",
    branch_density: "high",
    palm_shape_hint: "square",
    confidence: 0.71,
  };
  const runs = [];
  for (let index = 0; index < 5; index += 1) {
    const { response } = await runStage6FCalibrationMockAnalysis(features, `req_stage6f_hard_fix_deterministic_${index}`);
    assert.equal(response.ok, true, "same sufficient palm_features should remain classifiable");
    runs.push({
      personality_id: response.analysis_result.personality_id,
      candidate_ids: response.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
      diagnostics: response.analysis_result.diagnostics,
    });
  }
  for (const run of runs.slice(1)) {
    assert.deepEqual(run, runs[0], "same palm_features must produce exactly identical classifier output and diagnostics");
  }

  return {
    status: "PASS",
    personality_id: runs[0].personality_id,
    candidate_ids: runs[0].candidate_ids,
  };
}

function validateStage6FFinalClassifierHardFixPosterRegression() {
  const posterPage = require(path.join(root, "scripts", "palmmi-poster.js"));
  const storage = createMemoryStorage();
  const lowConfidence = completeAnalysisResult({
    status: "degraded",
    extra: {
      valid_palm: true,
      quality_status: "LOW_CONFIDENCE",
      personality_id: "P12",
      personality_name: "低调战略家",
      candidate_results: [
        { personality_id: "P12", personality_name: "低调战略家", main_line_type: "M1", score: 0.72 },
        { personality_id: "P25", personality_name: "老干部", main_line_type: "M1", score: 0.55 },
      ],
      uiConsumable: {
        personaId: "P12",
        personaName: "低调战略家",
        confidence: 0.72,
        status: "degraded",
        qualityStatus: "LOW_CONFIDENCE",
        primaryDisplayText: "低调战略家",
        secondaryDisplayText: "先观察结构，再稳稳推进。",
        warningBadges: ["CONTRACT_DEGRADED"],
      },
    },
  });
  storage.setItem(STORAGE_KEYS.stableAnalysis, JSON.stringify({
    version: 1,
    analysis_id: "analysis_stage6f_hard_fix_low_confidence_poster",
    created_at: "2026-05-22T00:00:00.000Z",
    provider: "qwen",
    analysis_result: lowConfidence,
  }));
  const lowConfidenceRead = posterPage.readAnalysisResult({ storage });
  assert.equal(lowConfidenceRead.ok, true, "LOW_CONFIDENCE legal personality must still generate poster");

  const lowInfoStorage = createMemoryStorage();
  const lowInfo = {
    ...completeAnalysisResult(),
    status: "failed",
    valid_palm: true,
    quality_status: "LOW_INFORMATION_FEATURE_SET",
    personality_id: "",
    personality_name: "",
    candidate_results: [],
    user_message: "当前照片可用信息不足，请换一张更清晰的掌心照片后重试。",
  };
  lowInfoStorage.setItem(STORAGE_KEYS.stableAnalysis, JSON.stringify({
    version: 1,
    analysis_id: "analysis_stage6f_hard_fix_low_info_poster",
    created_at: "2026-05-22T00:00:00.000Z",
    provider: "qwen",
    analysis_result: lowInfo,
  }));
  const lowInfoRead = posterPage.readAnalysisResult({ storage: lowInfoStorage });
  assert.equal(lowInfoRead.ok, false, "LOW_INFORMATION_FEATURE_SET must be blocked from poster generation");

  const notPalmStorage = createMemoryStorage();
  const notPalm = {
    ...completeAnalysisResult(),
    status: "failed",
    valid_palm: false,
    quality_status: "NOT_PALM",
    personality_id: "",
    personality_name: "",
    candidate_results: [],
    user_message: "未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。",
  };
  notPalmStorage.setItem(STORAGE_KEYS.stableAnalysis, JSON.stringify({
    version: 1,
    analysis_id: "analysis_stage6f_hard_fix_not_palm_poster",
    created_at: "2026-05-22T00:00:00.000Z",
    provider: "qwen",
    analysis_result: notPalm,
  }));
  const notPalmRead = posterPage.readAnalysisResult({ storage: notPalmStorage });
  assert.equal(notPalmRead.ok, false, "NOT_PALM must stay blocked from poster generation");

  return {
    status: "PASS",
    low_confidence_poster: "PASS",
    low_information_blocked: "PASS",
    not_palm_blocked: "PASS",
  };
}

async function validateStage6FFinalClassifierHardFixNonPalmRegression() {
  const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));
  const env = {
    PALMMI_VLM_PROVIDER: "qwen",
    PALMMI_VLM_MODE: "real-only",
    PALMMI_QWEN_API_KEY: "stage6f-test-key",
    QWEN_API_KEY: "",
  };
  let fetchCount = 0;
  const response = await runAnalyzeApi({
    request_id: "req_stage6f_hard_fix_not_palm_regression",
    anonymous_device_id: "anon_stage6f_hard_fix",
    locale: "zh-CN",
    image: {
      file_name: "not-palm-beverage.jpg",
      content_type: "image/jpeg",
      size_bytes: syntheticPngBuffer().length,
      buffer: syntheticPngBuffer(),
      side: "unknown",
    },
  }, {
    env,
    fetchImpl: async () => {
      fetchCount += 1;
      return qwenChatResponse({
        validity: {
          is_palm_photo: false,
          is_single_hand: false,
          is_palm_side_visible: false,
          palm_lines_visible: false,
          image_quality: "not_palm",
          reject_reason: "beverage",
        },
        palm_features: null,
        result: null,
      });
    },
  });

  assert.equal(fetchCount, 1, "NOT_PALM must stop after the validity request");
  assert.equal(response.ok, false);
  assert.equal(response.error.code, "NOT_PALM");
  assert.doesNotMatch(JSON.stringify(response), /P31|留一手|P25|老干部/, "NOT_PALM must not contain personality output");
  assertNoResponseLeaks(response, "stage6f hard fix not palm response");

  return {
    status: "PASS",
    code: response.error.code,
    fetch_count: fetchCount,
  };
}

function validateStage6FFinalClassifierHardFixCollapseHardFail() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  const args = smoke.parseArgs([
    "--collapse-check",
    "--debug-classifier",
    "--min-palm-samples",
    "5",
    "--min-unique-personalities",
    "2",
  ]);
  assert.equal(args.debugClassifier, true, "smoke must parse --debug-classifier");
  assert.equal(args.minPalmSamples, 5, "smoke must parse --min-palm-samples");
  assert.equal(args.minUniquePersonalities, 2, "smoke must parse --min-unique-personalities");

  const samples = Array.from({ length: 5 }, (_, index) => ({
    name: `palm_${index + 1}`,
    by_model: {
      "qwen3-vl-flash": {
        valid_palm: true,
        personality_id: "P31",
        has_personality_result: true,
        candidate_ids: ["P31", "P25", "P12"],
      },
    },
  }));
  const analysis = smoke.buildCollapseAnalysis(samples, ["qwen3-vl-flash"], {
    minPalmSamples: args.minPalmSamples,
    minUniquePersonalities: args.minUniquePersonalities,
  });
  const modelAnalysis = analysis["qwen3-vl-flash"];
  assert.equal(modelAnalysis.collapse_risk, true);
  assert.equal(modelAnalysis.hard_fail, true, "5 palm samples with fewer than two unique personalities must hard fail");
  assert.equal(modelAnalysis.diagnostic_code, "P31_COLLAPSE_CONFIRMED");
  assert.match(modelAnalysis.notes, /留一手/, "P31 collapse hard fail must explicitly mention 留一手");
  assert.equal(modelAnalysis.candidate_distribution.P31, 5);

  return {
    status: "PASS",
    diagnostic_code: modelAnalysis.diagnostic_code,
    hard_fail: modelAnalysis.hard_fail,
  };
}

async function validateStage6FClassifierCalibrationDiverseCandidates() {
  const sharedWeakFeatures = {
    line_depth: "faint",
    line_complexity: "simple",
    line_continuity: "continuous",
    branch_density: "low",
    palm_shape_hint: "wide",
    confidence: 0.62,
  };
  const cases = [
    { label: "M1", features: { ...sharedWeakFeatures, main_line_type: "M1" } },
    { label: "M2", features: { ...sharedWeakFeatures, main_line_type: "M2" } },
    { label: "M3", features: { ...sharedWeakFeatures, main_line_type: "M3" } },
    { label: "M4", features: { ...sharedWeakFeatures, main_line_type: "M4" } },
  ];
  const results = [];
  for (const item of cases) {
    const { response } = await runStage6FCalibrationMockAnalysis(item.features, `req_stage6f_classifier_diverse_${item.label}`);
    assert.equal(response.ok, true, `${item.label} calibrated feature vector should stay classifiable`);
    results.push({
      label: item.label,
      personality_id: response.analysis_result.personality_id,
      personality_name: response.analysis_result.personality_name,
      candidate_ids: response.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
    });
  }

  const ids = results.map((item) => item.personality_id);
  const uniqueIds = [...new Set(ids)];
  assert.ok(uniqueIds.length >= 2, "different main_line_type signals must produce at least two distinct personality ids");
  assert.ok(!ids.every((id) => id === "P31"), "classifier must not collapse all weak-but-different palm_features to 留一手");

  return {
    status: "PASS",
    unique_personality_count: uniqueIds.length,
    results,
  };
}

async function validateStage6FClassifierCalibrationDeterministic() {
  const features = {
    main_line_type: "M3",
    line_depth: "medium",
    line_complexity: "complex",
    line_continuity: "broken",
    branch_density: "high",
    palm_shape_hint: "long",
    confidence: 0.66,
  };
  const runs = [];
  for (let index = 0; index < 5; index += 1) {
    const { response } = await runStage6FCalibrationMockAnalysis(features, `req_stage6f_classifier_deterministic_${index}`);
    assert.equal(response.ok, true, "deterministic calibration sample should be classifiable");
    runs.push({
      personality_id: response.analysis_result.personality_id,
      candidate_ids: response.analysis_result.candidate_results.map((candidate) => candidate.personality_id),
    });
  }

  for (const run of runs.slice(1)) {
    assert.equal(run.personality_id, runs[0].personality_id, "same palm_features must produce the same personality_id");
    assert.deepEqual(run.candidate_ids, runs[0].candidate_ids, "same palm_features must produce identical candidate ranking");
  }

  return {
    status: "PASS",
    personality_id: runs[0].personality_id,
    candidate_ids: runs[0].candidate_ids,
  };
}

async function validateStage6FClassifierCalibrationScoreBreakdown() {
  const { response } = await runStage6FCalibrationMockAnalysis({
    main_line_type: "M2",
    line_depth: "deep",
    line_complexity: "medium",
    line_continuity: "continuous",
    branch_density: "medium",
    palm_shape_hint: "square",
    confidence: 0.7,
  }, "req_stage6f_classifier_score_breakdown");

  assert.equal(response.ok, true, "score breakdown sample should be classifiable");
  for (const candidate of response.analysis_result.candidate_results) {
    assert.equal(typeof candidate.score, "number", "candidate must include score");
    assert.equal(typeof candidate.confidence, "number", "candidate must include confidence");
    assert.equal(typeof candidate.reason, "string", "candidate must include reason");
    assert.ok(candidate.reason.length > 0, "candidate reason must not be empty");
    assert.ok(candidate.score_breakdown && typeof candidate.score_breakdown === "object", "candidate must include score_breakdown");
    for (const key of ["main_line_type", "line_depth", "line_complexity", "line_continuity", "branch_density", "palm_shape_hint"]) {
      assert.equal(typeof candidate.score_breakdown[key], "number", `score_breakdown.${key} must be numeric`);
    }
  }

  return {
    status: "PASS",
    candidate_count: response.analysis_result.candidate_results.length,
  };
}

function validateStage6FClassifierCalibrationCollapseDiagnostics() {
  const smoke = require(path.join(root, "scripts", "stage6f", "real-qwen-smoke.cjs"));
  const analysis = smoke.buildCollapseAnalysis([
    {
      by_model: {
        "qwen3-vl-flash": {
          valid_palm: true,
          personality_id: "P31",
          has_personality_result: true,
          candidate_ids: ["P31", "P25", "P12"],
        },
      },
    },
    {
      by_model: {
        "qwen3-vl-flash": {
          valid_palm: true,
          personality_id: "P31",
          has_personality_result: true,
          candidate_ids: ["P31", "P06", "P12"],
        },
      },
    },
    {
      by_model: {
        "qwen3-vl-flash": {
          valid_palm: true,
          personality_id: "P31",
          has_personality_result: true,
          candidate_ids: ["P31", "P04", "P33"],
        },
      },
    },
  ], ["qwen3-vl-flash"]);

  const modelAnalysis = analysis["qwen3-vl-flash"];
  assert.equal(modelAnalysis.collapse_risk, true);
  assert.equal(modelAnalysis.diagnostic_code, "PERSONALITY_COLLAPSE_RISK");
  assert.match(modelAnalysis.notes, /留一手/, "collapse diagnostics must explicitly identify 留一手 collapse");
  assert.equal(modelAnalysis.candidate_distribution.P31, 3, "collapse diagnostics must include candidate_distribution");

  return {
    status: "PASS",
    diagnostic_code: modelAnalysis.diagnostic_code,
    notes: modelAnalysis.notes,
  };
}

async function validateApiEndpoint() {
  const getResponse = await stage6Fetch(API_URL, { method: "GET" });
  const getJson = await getResponse.json();
  assert.equal(getResponse.status, 405, "GET /api/analyze should return a stable method error");
  assert.equal(getJson.ok, false);
  assertNoResponseLeaks(getJson, "GET /api/analyze");

  const emptyResponse = await stage6Fetch(API_URL, {
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
    const response = await stage6Fetch(new URL(assetPath, BASE_URL).href);
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
      try {
        const parsed = await response.json();
        assertNoResponseLeaks(parsed, "normal palm API response");
        apiResponses.push({
          http_status: response.status(),
          ok: parsed.ok,
          provider: parsed.provider || null,
          has_analysis_result: Boolean(parsed.analysis_result),
        });
      } catch (error) {
        apiResponses.push({
          http_status: response.status(),
          ok: false,
          provider: null,
          has_analysis_result: false,
          response_read_error: true,
        });
      }
    }
  });

  await page.goto(new URL("/upload/", BASE_URL).href, { waitUntil: "domcontentloaded" });
  await page.setInputFiles("#palmFile", fixturePath);
  await page.click("#startAnalyze");
  await page.waitForURL(/\/(analyze|result)\/?/, { timeout: 90000 });
  let state;
  if (/\/analyze\/?/.test(page.url())) {
    await page.waitForFunction(() => {
      const root = document.querySelector("#analysisApp");
      return root && ["done", "missing-upload", "invalid-upload", "timeout", "error"].includes(root.dataset.state);
    }, null, { timeout: 90000 });
    state = await page.evaluate((keys) => ({
      analysis_state: document.querySelector("#analysisApp").dataset.state,
      has_upload: Boolean(sessionStorage.getItem(keys.upload)),
      has_analysis_result: Boolean(sessionStorage.getItem(keys.analysis)),
      has_stable_analysis_result: Boolean(sessionStorage.getItem(keys.stableAnalysis)),
      has_analyze_error: Boolean(sessionStorage.getItem(keys.analyzeError)),
    }), STORAGE_KEYS);
    assert.equal(state.analysis_state, "done", "normal palm upload should finish analysis");
    assert.equal(state.has_analysis_result || state.has_stable_analysis_result, true, "normal palm upload should store analysis result");
    await page.click("#viewResult");
  } else {
    state = await page.evaluate((keys) => ({
      analysis_state: "result",
      has_upload: Boolean(sessionStorage.getItem(keys.upload)),
      has_analysis_result: Boolean(sessionStorage.getItem(keys.analysis)),
      has_stable_analysis_result: Boolean(sessionStorage.getItem(keys.stableAnalysis)),
      has_analyze_error: Boolean(sessionStorage.getItem(keys.analyzeError)),
    }), STORAGE_KEYS);
    assert.equal(state.has_stable_analysis_result, true, "inline normal palm upload should store stable analysis result");
  }
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

async function validateNormalPalmUploadWithoutBlockingSuite(context, fixturePath) {
  try {
    return await validateNormalPalmUpload(context, fixturePath);
  } catch (error) {
    return {
      status: "FAIL",
      reason: error && error.message ? error.message : "normal_palm_upload_failed",
    };
  }
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
    stage6f_fix2: {},
    stage6f_fix3: {},
    stage6f_fix4: {},
    stage6f_fix5: {},
    stage6f_final: {},
    stage6f_final_fix: {},
    stage6f_final_classifier_hard_fix: {},
    real_qwen_smoke: null,
    abnormal_inputs: {},
    simulated_qwen_errors: null,
    missing_fixtures: [],
  };

  try {
    summary.production_access.api_endpoint = await validateApiEndpoint();
    summary.stage5_assets = await validateStage5Assets();
    summary.stage6f_fix.storage_contract = await validateStage6FFixStorageContract();
    summary.stage6f_fix3.server_validity_contract = await validateStage6FFix3ServerValidityContract();
    summary.stage6f_fix4.not_palm_no_timeout = await validateStage6FFix4NotPalmGateDoesNotTimeout();
    summary.stage6f_fix4.validity_missing = await validateStage6FFix4ValidityMissingIsUnreliable();
    summary.stage6f_fix4.fetch_timeout = await validateStage6FFix4FetchTimeoutOnlyForRealTimeout();
    summary.stage6f_fix5.valid_palm_personality = await validateStage6FFix5ValidPalmProducesPersonalityResult();
    summary.stage6f_fix5.valid_palm_missing_result = await validateStage6FFix5ValidPalmMissingResultDiagnosed();
    summary.stage6f_fix5.parser_persona_aliases = validateStage6FFix5ParserPersonaAliases();
    summary.stage6f_final.model_config = validateStage6FFinalModelConfig();
    summary.stage6f_final.p25_requires_reason = await validateStage6FFinalP25RequiresReason();
    summary.stage6f_final.smoke_collapse_diagnostics = validateStage6FFinalSmokeCollapseDiagnostics();
    summary.stage6f_final.low_confidence_poster_contract = validateStage6FFinalLowConfidencePosterContract();
    summary.stage6f_final_fix.feature_driven_local_classification = await validateStage6FFinalFixFeatureDrivenLocalClassification();
    summary.stage6f_final_fix.smoke_uses_local_candidates = await validateStage6FFinalFixSmokeUsesLocalCandidates();
    summary.stage6f_final_fix.poster_main_candidate_mismatch_blocked = validateStage6FFinalFixPosterMainCandidateMismatchBlocked();
    summary.stage6f_final_fix.missing_personality_no_p25 = await validateStage6FFinalFixMissingPersonalityDoesNotDefaultP25();
    summary.stage6f_classifier_calibration = {
      no_default_liuyishou: await validateStage6FClassifierCalibrationNoDefaultLiuyishou(),
      diverse_candidates: await validateStage6FClassifierCalibrationDiverseCandidates(),
      deterministic: await validateStage6FClassifierCalibrationDeterministic(),
      score_breakdown: await validateStage6FClassifierCalibrationScoreBreakdown(),
      collapse_diagnostics: validateStage6FClassifierCalibrationCollapseDiagnostics(),
    };
    summary.stage6f_final_classifier_hard_fix = {
      all_unknown_no_default_liuyishou: await validateStage6FFinalClassifierHardFixAllUnknownNoDefaultLiuyishou(),
      low_information_feature_set: await validateStage6FFinalClassifierHardFixLowInformationFeatureSet(),
      five_mock_feature_diversity: await validateStage6FFinalClassifierHardFixFiveMockDiversity(),
      p31_legal_evidence: validateStage6FFinalClassifierHardFixP31LegalEvidence(),
      deterministic: await validateStage6FFinalClassifierHardFixDeterministic(),
      poster_regression: validateStage6FFinalClassifierHardFixPosterRegression(),
      non_palm_regression: await validateStage6FFinalClassifierHardFixNonPalmRegression(),
      collapse_hard_fail: validateStage6FFinalClassifierHardFixCollapseHardFail(),
      smoke_multi_palm_selection: validateStage6FSmokeMultiPalmSelection(),
      smoke_selection_failures: validateStage6FSmokeSelectionFailures(),
      low_information_debug: validateStage6FFinalClassifierHardFix2LowInformationDebug(),
      chinese_feature_normalize: validateStage6FFinalClassifierHardFix2ChineseNormalize(),
      alias_feature_normalize: validateStage6FFinalClassifierHardFix2AliasNormalize(),
      two_usable_features_not_overblocked: await validateStage6FFinalClassifierHardFix2TwoUsableFeaturesNotOverblocked(),
      all_palm_low_information_hard_fail: validateStage6FFinalClassifierHardFix2AllPalmLowInformationHardFail(),
    };
    summary.real_qwen_smoke = validateRealQwenSmokeDryRun();

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
      summary.stage6f_fix2.inline_analyze_flow = await validateStage6FFix2InlineAnalyzeFlow(mobileContext);
      summary.stage6f_fix2.timeout_handling = await validateStage6FFix2TimeoutHandling(mobileContext);
      summary.stage6f_fix3.invalid_image_gate = await validateStage6FFix3InvalidImageGate(mobileContext);
      summary.stage6f_fix3.no_default_persona_fallback = await validateStage6FFix3NoDefaultPersonaFallback(mobileContext);
      summary.stage6f_fix3.repeated_analysis_isolation = await validateStage6FFix3RepeatedAnalysisIsolation(mobileContext);
      summary.stage6f_fix3.poster_contract = await validateStage6FFix3PosterContract(mobileContext);
      summary.stage6f_fix3.invalid_poster_blocked = await validateStage6FFix3InvalidPosterBlocked(mobileContext);
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
        /太大|过大|8MB/
      );
      summary.normal_palm_upload = await validateNormalPalmUploadWithoutBlockingSuite(mobileContext, fixturePath);
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
