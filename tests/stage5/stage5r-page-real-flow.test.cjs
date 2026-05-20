const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const { runAnalyzeApi } = require(path.join(root, "server", "stage5p", "analyze-service.js"));

const DEFAULT_IMAGE_DIR = "E:\\其他\\Palmmi\\测试图片 - 副本";
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const STORAGE_KEYS = Object.freeze({
  upload: "palmmi:lastUpload",
  analysis: "palmmi:lastAnalysisResult",
  analyzeError: "palmmi:lastAnalyzeError",
  device: "palmmi:anonymousDeviceId",
});
const FORBIDDEN_RESPONSE_MARKERS = [
  "provider_output",
  "raw_provider",
  "raw_response",
  "rawText",
  "choices",
  "Authorization",
  "PALMMI_QWEN_API_KEY",
  "QWEN_API_KEY",
  "data:image",
  ";base64,",
];
const FORBIDDEN_DOM_MARKERS = [
  "provider_output",
  "raw_provider",
  "raw_response",
  "rawText",
  "choices",
  "Authorization",
  "PALMMI_QWEN_API_KEY",
  "QWEN_API_KEY",
  "PalmFeatureSet",
  "RuleInput",
  "RecognitionResult",
  "AnalysisInput",
];
const CHROMIUM_UNSAFE_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102,
  103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465,
  512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993,
  995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669,
  6697, 10080,
]);

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

function envExists(name) {
  return typeof process.env[name] === "string" && process.env[name].trim() !== "";
}

function listImageFiles(imageDir = DEFAULT_IMAGE_DIR) {
  if (!fs.existsSync(imageDir) || !fs.statSync(imageDir).isDirectory()) {
    return [];
  }
  return fs.readdirSync(imageDir)
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .map((name) => path.join(imageDir, name));
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

function responseLeakFlags(value) {
  const json = JSON.stringify(value);
  return FORBIDDEN_RESPONSE_MARKERS.filter((marker) => json.includes(marker));
}

function bodyLeakFlags(html) {
  return FORBIDDEN_DOM_MARKERS.filter((marker) => html.includes(marker));
}

function publicPathToFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const relativePath = cleanPath || "index.html";
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root)) {
    return null;
  }
  return absolutePath;
}

function contentTypeForStatic(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function stableErrorResponse(code) {
  return {
    ok: false,
    request_id: "req_stage5r_forced_error",
    status: "RETRY_REQUIRED",
    error: {
      code,
      message: "当前分析服务暂不可用，请稍后再试。",
      message_key: "retry_upload",
      retryable: true,
    },
  };
}

async function startServer(options = {}) {
  const stats = {
    apiCalls: 0,
    apiOk: 0,
    apiErrors: [],
    responseLeakFlags: [],
    providers: [],
  };
  const env = {
    ...process.env,
    ...(options.env || {}),
  };
  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === "POST" && request.url.split("?")[0] === "/api/analyze") {
        stats.apiCalls += 1;
        const rawBody = await collectRequestBody(request);
        let payload = {};
        try {
          payload = JSON.parse(rawBody);
        } catch (error) {
          payload = {};
        }

        let apiResponse;
        if (options.forcedErrorCode) {
          apiResponse = stableErrorResponse(options.forcedErrorCode);
        } else {
          apiResponse = await runAnalyzeApi(payload, { env });
        }

        const leakFlags = responseLeakFlags(apiResponse);
        stats.responseLeakFlags.push(...leakFlags);
        if (apiResponse && apiResponse.ok === true) {
          stats.apiOk += 1;
        } else if (apiResponse && apiResponse.error) {
          stats.apiErrors.push(apiResponse.error.code);
        }
        if (apiResponse && apiResponse.provider) {
          stats.providers.push(apiResponse.provider);
        }

        const json = JSON.stringify(apiResponse);
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(json);
        return;
      }

      if (request.method !== "GET") {
        response.writeHead(405);
        response.end("");
        return;
      }

      const filePath = publicPathToFile(request.url);
      if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404);
        response.end("");
        return;
      }
      response.writeHead(200, { "Content-Type": contentTypeForStatic(filePath) });
      response.end(fs.readFileSync(filePath));
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(stableErrorResponse("VLM_API_REQUEST_FAILED")));
    }
  });

  let port;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = server.address().port;
    if (!CHROMIUM_UNSAFE_PORTS.has(port)) {
      break;
    }
    await new Promise((resolve) => server.close(resolve));
    port = null;
  }
  if (!port) {
    throw new Error("Could not allocate a Chromium-safe local test port.");
  }
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stats,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function waitForAnalyzeState(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("#analysisApp");
    return root && ["done", "missing-upload", "invalid-upload", "timeout", "error"].includes(root.dataset.state);
  }, null, { timeout: 90000 });
}

async function waitForPageState(page, selector) {
  await page.waitForFunction((rootSelector) => {
    const root = document.querySelector(rootSelector);
    return root && root.dataset.state && root.dataset.state !== "loading";
  }, selector, { timeout: 30000 });
}

async function browserSignals(page) {
  const signals = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
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
  return signals;
}

async function readFlowState(page) {
  return page.evaluate((keys) => {
    const resultRoot = document.querySelector("#resultApp");
    const resultReady = document.querySelector("#resultReady");
    const posterRoot = document.querySelector("#posterApp");
    const posterReady = document.querySelector("#posterReady");
    const analysisRoot = document.querySelector("#analysisApp");
    const analysisResultRaw = sessionStorage.getItem(keys.analysis);
    const uploadRaw = sessionStorage.getItem(keys.upload);
    const errorRaw = sessionStorage.getItem(keys.analyzeError);
    const device = localStorage.getItem(keys.device);
    return {
      url: location.href,
      analysisState: analysisRoot ? analysisRoot.dataset.state : null,
      resultState: resultRoot ? resultRoot.dataset.state : null,
      resultReadyVisible: resultReady ? !resultReady.hidden : null,
      posterState: posterRoot ? posterRoot.dataset.state : null,
      posterReadyVisible: posterReady ? !posterReady.hidden : null,
      hasUpload: typeof uploadRaw === "string" && uploadRaw.length > 0,
      hasAnalysisResult: typeof analysisResultRaw === "string" && analysisResultRaw.length > 0,
      hasAnalyzeError: typeof errorRaw === "string" && errorRaw.length > 0,
      hasDevice: typeof device === "string" && device.length > 0,
      analysisResultSchema: (() => {
        try {
          return analysisResultRaw ? JSON.parse(analysisResultRaw).schemaVersion || null : null;
        } catch (error) {
          return "invalid-json";
        }
      })(),
      body: document.body.outerHTML,
    };
  }, STORAGE_KEYS);
}

async function runUploadAnalyze(browser, serverInfo, input) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const signals = await browserSignals(page);
  await page.goto(`${serverInfo.baseUrl}/upload/index.html`, { waitUntil: "domcontentloaded" });
  await page.setInputFiles("#palmFile", input);
  await page.click("#startAnalyze");
  await page.waitForURL(/\/analyze\/index\.html$/);
  await waitForAnalyzeState(page);
  const state = await readFlowState(page);
  return { page, signals, state };
}

async function assertBrowserClean(signals) {
  assert.deepEqual(signals.consoleErrors, [], "browser console must not contain console.error entries");
  assert.deepEqual(signals.pageErrors, [], "page must not throw runtime errors");
  assert.deepEqual(signals.requestFailures, [], "page must not have unexpected request failures");
}

async function assertNoDomLeaks(page) {
  const html = await page.evaluate(() => document.body.outerHTML);
  assert.deepEqual(bodyLeakFlags(html), [], "page DOM must not expose provider internals or secrets");
}

async function runFullPageFlow(browser, serverInfo, imagePath) {
  const { page, signals, state: analyzeState } = await runUploadAnalyze(browser, serverInfo, imagePath);
  try {
    assert.equal(analyzeState.analysisState, "done");
    assert.equal(analyzeState.hasUpload, true);
    assert.equal(analyzeState.hasAnalysisResult, true);
    assert.equal(analyzeState.hasAnalyzeError, false);
    assert.equal(analyzeState.hasDevice, true);
    assert.equal(analyzeState.analysisResultSchema, "analysis-result.v1");
    assert.equal(serverInfo.stats.apiCalls, 1, "analyze page must call the server/API boundary exactly once");
    assert.equal(serverInfo.stats.apiOk, 1, "server/API boundary must return ok for real palm flow");
    assert.deepEqual(serverInfo.stats.responseLeakFlags, []);
    await assertBrowserClean(signals);

    await page.click("#viewResult");
    await waitForPageState(page, "#resultApp");
    const resultState = await readFlowState(page);
    assert.equal(resultState.resultReadyVisible, true, "result page must render a user-visible result panel");
    assert.ok(["ready", "partial-result"].includes(resultState.resultState), `unexpected result state ${resultState.resultState}`);
    assert.equal(resultState.hasAnalysisResult, true);
    await assertNoDomLeaks(page);

    await page.click("#resultPosterLink");
    await waitForPageState(page, "#posterApp");
    const posterState = await readFlowState(page);
    assert.equal(posterState.posterReadyVisible, true, "poster page must render a user-visible poster panel");
    assert.ok(["ready", "partial-result"].includes(posterState.posterState), `unexpected poster state ${posterState.posterState}`);
    assert.equal(posterState.hasAnalysisResult, true);
    await assertNoDomLeaks(page);

    return {
      file_name: path.basename(imagePath),
      analysis_state: analyzeState.analysisState,
      result_state: resultState.resultState,
      poster_state: posterState.posterState,
      api_calls: serverInfo.stats.apiCalls,
      provider: serverInfo.stats.providers[0] || null,
    };
  } finally {
    await page.close();
  }
}

async function runErrorPageFlow(browser, serverInfo, input, expectedAnalysisState) {
  const { page, signals, state } = await runUploadAnalyze(browser, serverInfo, input);
  try {
    assert.equal(state.analysisState, expectedAnalysisState);
    assert.equal(state.hasAnalysisResult, false);
    await assertBrowserClean(signals);
    return {
      analysis_state: state.analysisState,
      api_calls: serverInfo.stats.apiCalls,
      api_errors: serverInfo.stats.apiErrors.slice(),
      has_analyze_error: state.hasAnalyzeError,
    };
  } finally {
    await page.close();
  }
}

async function runUploadBlockedFlow(browser, serverInfo, input) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const signals = await browserSignals(page);
  try {
    await page.goto(`${serverInfo.baseUrl}/upload/index.html`, { waitUntil: "domcontentloaded" });
    await page.setInputFiles("#palmFile", input);
    await page.click("#startAnalyze");
    const state = await page.evaluate((keys) => ({
      url: location.href,
      statusText: (document.querySelector("#uploadStatus") || {}).textContent || "",
      statusIsError: Boolean((document.querySelector("#uploadStatus") || {}).classList && document.querySelector("#uploadStatus").classList.contains("is-error")),
      hasUpload: Boolean(sessionStorage.getItem(keys.upload)),
      hasAnalysisResult: Boolean(sessionStorage.getItem(keys.analysis)),
      body: document.body.outerHTML,
    }), STORAGE_KEYS);
    assert.match(state.url, /\/upload\/index\.html$/);
    assert.equal(state.statusIsError, true);
    assert.equal(state.hasUpload, false);
    assert.equal(state.hasAnalysisResult, false);
    assert.equal(serverInfo.stats.apiCalls, 0);
    assert.deepEqual(bodyLeakFlags(state.body), []);
    await assertBrowserClean(signals);
    return {
      upload_blocked: true,
      status_text_present: state.statusText.length > 0,
      api_calls: serverInfo.stats.apiCalls,
    };
  } finally {
    await page.close();
  }
}

async function withServer(options, callback) {
  const serverInfo = await startServer(options);
  try {
    return await callback(serverInfo);
  } finally {
    await serverInfo.close();
  }
}

async function main() {
  const images = listImageFiles();
  if (images.length < 5) {
    throw new Error("Stage 5R requires at least five local palm images in the configured image directory.");
  }

  const envStatus = {
    PALMMI_QWEN_API_KEY: envExists("PALMMI_QWEN_API_KEY"),
    QWEN_API_KEY: envExists("QWEN_API_KEY"),
    PALMMI_QWEN_MODEL: envExists("PALMMI_QWEN_MODEL"),
    QWEN_MODEL: envExists("QWEN_MODEL"),
  };
  if (!envStatus.PALMMI_QWEN_API_KEY && !envStatus.QWEN_API_KEY) {
    throw new Error("Stage 5R real page flow is blocked because no Qwen API key env var is present.");
  }

  const { chromium } = loadPlaywright();
  const executablePath = findCachedChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const realResults = [];
    for (const imagePath of images.slice(0, 5)) {
      const result = await withServer({
        env: {
          PALMMI_VLM_PROVIDER: "qwen",
          PALMMI_VLM_MODE: "real-only",
        },
      }, (serverInfo) => runFullPageFlow(browser, serverInfo, imagePath));
      realResults.push(result);
    }

    const mockResult = await withServer({
      env: {
        PALMMI_VLM_PROVIDER: "mock",
        PALMMI_VLM_MODE: "mock-only",
        PALMMI_QWEN_API_KEY: "",
        QWEN_API_KEY: "",
      },
    }, (serverInfo) => runFullPageFlow(browser, serverInfo, images[0]));

    const unsupportedResult = await withServer({
      env: {
        PALMMI_VLM_PROVIDER: "qwen",
        PALMMI_VLM_MODE: "real-only",
      },
    }, (serverInfo) => runUploadBlockedFlow(browser, serverInfo, {
      name: "not-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    }));

    const missingKeyResult = await withServer({
      env: {
        PALMMI_VLM_PROVIDER: "qwen",
        PALMMI_VLM_MODE: "real-only",
        PALMMI_QWEN_API_KEY: "",
        QWEN_API_KEY: "",
      },
    }, (serverInfo) => runErrorPageFlow(browser, serverInfo, images[0], "error"));
    assert.deepEqual(missingKeyResult.api_errors, ["VLM_API_KEY_MISSING"]);

    const providerInvalidResult = await withServer({
      forcedErrorCode: "VLM_API_INVALID_RESPONSE",
    }, (serverInfo) => runErrorPageFlow(browser, serverInfo, images[0], "error"));
    assert.deepEqual(providerInvalidResult.api_errors, ["VLM_API_INVALID_RESPONSE"]);

    console.log(JSON.stringify({
      stage: "5R",
      env_status: envStatus,
      image_dir_checked: DEFAULT_IMAGE_DIR,
      real_palm_tested_count: realResults.length,
      real_page_success_count: realResults.length,
      mock_page_flow: mockResult,
      unsupported_sample: unsupportedResult,
      missing_key_sample: missingKeyResult,
      provider_invalid_sample: providerInvalidResult,
      real_results: realResults,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : (error && error.message ? error.message : "Stage5RPageFlowError"));
  process.exit(1);
});
