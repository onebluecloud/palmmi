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
    abnormal_inputs: {},
    simulated_qwen_errors: null,
    missing_fixtures: [],
  };

  try {
    summary.production_access.api_endpoint = await validateApiEndpoint();
    summary.stage5_assets = await validateStage5Assets();
    summary.stage6f_fix.storage_contract = await validateStage6FFixStorageContract();
    summary.stage6f_fix3.server_validity_contract = await validateStage6FFix3ServerValidityContract();

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
