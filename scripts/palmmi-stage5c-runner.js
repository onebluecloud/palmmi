const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const {
  normalizeVlmToPalmFeatureSet,
} = require(path.join(PROJECT_ROOT, "src", "stage5", "normalize-vlm-to-palm-feature-set.js"));
const {
  palmFeatureSetToRuleInput,
} = require(path.join(PROJECT_ROOT, "src", "stage5", "palm-feature-set-to-rule-input.js"));
const {
  runPalmmiRecognitionPipeline,
} = require(path.join(PROJECT_ROOT, "src", "stage5", "palmmi-recognition-pipeline.js"));
const {
  runPalmmiAnalysisBridge,
} = require(path.join(PROJECT_ROOT, "src", "stage5", "palmmi-analysis-bridge.js"));
const {
  buildAnalysisResultContract,
} = require(path.join(PROJECT_ROOT, "src", "stage5", "analysis-result-contract.js"));
const DEFAULT_MANIFEST_PATH = path.join(PROJECT_ROOT, "docs", "stage5", "stage5c-samples.local.json");
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, "docs", "stage5", "stage5c-results.local.json");
const DEFAULT_STAGE5D_FEATURE_SET_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "stage5",
  "stage5d-feature-set-results.local.json"
);
const DEFAULT_STAGE5E_RULE_INPUT_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "stage5",
  "stage5e-rule-input-results.local.json"
);
const DEFAULT_STAGE5F_RECOGNITION_RESULT_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "stage5",
  "stage5f-recognition-results.local.json"
);
const DEFAULT_STAGE5G_ANALYSIS_RESULT_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "stage5",
  "stage5g-analysis-results.local.json"
);
const DEFAULT_STAGE5H_ANALYSIS_CONTRACT_OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "docs",
  "stage5",
  "stage5h-analysis-contract.local.json"
);
const DEFAULT_PROMPT_PATH = path.join(PROJECT_ROOT, "docs", "stage5", "stage5c-vlm-prompt.md");
const DEFAULT_QWEN_MODEL = "qwen3-vl-flash";
const DEFAULT_QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function elapsedMs(start) {
  return Math.max(0, Math.round(nowMs() - start));
}

function toPortablePath(value) {
  return String(value).replace(/\\/g, "/");
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function inferSide(fileName) {
  const lower = fileName.toLowerCase();
  const left = lower.includes("left") || lower.includes("zuo") || fileName.includes("左");
  const right = lower.includes("right") || lower.includes("you") || fileName.includes("右");
  if (left && !right) {
    return "left";
  }
  if (right && !left) {
    return "right";
  }
  return "unknown";
}

function getMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}

function sampleId(index) {
  return `sample-${String(index + 1).padStart(3, "0")}`;
}

function generateLocalManifest({ sampleDir, manifestPath = DEFAULT_MANIFEST_PATH } = {}) {
  if (!sampleDir || !fs.existsSync(sampleDir) || !fs.statSync(sampleDir).isDirectory()) {
    throw new Error(`Sample directory does not exist: ${sampleDir || ""}`);
  }

  const entries = fs.readdirSync(sampleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }));

  const manifest = entries.map((entry, index) => {
    const imagePath = path.join(sampleDir, entry.name);
    return {
      sampleId: sampleId(index),
      imagePath: toPortablePath(imagePath),
      side: inferSide(entry.name),
      handLabel: "real-human-palm",
      expectedValidity: "valid",
      notes: "auto generated from local sample directory",
    };
  });

  writeJson(manifestPath, manifest);
  return manifest;
}

function loadManifest(manifestPath) {
  const manifest = readJson(manifestPath);
  if (!Array.isArray(manifest)) {
    throw new Error(`Manifest must be a JSON array: ${manifestPath}`);
  }
  return manifest;
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.min(1, Math.max(0, number));
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeParsedPalmFeatures(parsed) {
  const source = normalizeObject(parsed);
  return {
    isValidPalmImage: source.isValidPalmImage === false ? false : true,
    majorLines: normalizeObject(source.majorLines),
    minorLines: normalizeObject(source.minorLines),
    palmShape: normalizeObject(source.palmShape),
    visibleFeatures: normalizeArray(source.visibleFeatures),
    uncertainty: normalizeArray(source.uncertainty),
    confidence: normalizeConfidence(source.confidence),
  };
}

function createFailure({ provider, model, errorCode, errorMessage, start }) {
  return {
    provider,
    model,
    ok: false,
    errorCode,
    errorMessage,
    latencyMs: elapsedMs(start),
  };
}

function stripJsonFences(text) {
  const trimmed = String(text || "").trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) {
    return fence[1].trim();
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

function parseJsonObject(text) {
  const parsed = JSON.parse(stripJsonFences(text));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Provider output JSON is not an object.");
  }
  return parsed;
}

function readPrompt(promptPath = DEFAULT_PROMPT_PATH) {
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, "utf8");
  }
  return [
    "Extract observable palm image features only.",
    "Return one JSON object only.",
    "Do not infer personality, medical status, wealth, lifespan, marriage, fate, or fortune.",
  ].join("\n");
}

class MockStage5CProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.model = options.model || "stage5c-mock-vlm";
  }

  async analyzePalmImage(input = {}) {
    const start = nowMs();
    if (!Buffer.isBuffer(input.imageBuffer) || input.imageBuffer.length === 0) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "INVALID_IMAGE",
        errorMessage: "Image buffer is missing or empty.",
        start,
      });
    }

    const parsed = normalizeParsedPalmFeatures({
      isValidPalmImage: true,
      majorLines: {
        lifeLine: {
          visibility: "clear",
          length: "long",
          depth: "medium",
          trend: "curved around thumb base",
          breaks: "none",
          branches: "few",
          islands: "none",
          chained: false,
          confidence: 0.86,
        },
        headLine: {
          visibility: "clear",
          length: "long",
          depth: "medium",
          trend: "slightly downward",
          breaks: "none",
          branches: "few",
          islands: "none",
          chained: false,
          confidence: 0.84,
        },
        heartLine: {
          visibility: "clear",
          length: "medium",
          depth: "medium",
          trend: "curved",
          breaks: "none",
          branches: "few",
          islands: "none",
          chained: false,
          confidence: 0.82,
        },
      },
      minorLines: {
        fateLine: {
          visibility: "faint",
          length: "medium",
          depth: "shallow",
          trend: "vertical",
          confidence: 0.62,
        },
        sunLine: {
          visibility: "not_visible",
          confidence: 0.4,
        },
        marriageLine: {
          visibility: "not_visible",
          confidence: 0.35,
        },
      },
      palmShape: {
        shapeHint: "rectangular",
        palmWidth: "medium",
        fingerProportion: "medium",
        confidence: 0.8,
      },
      visibleFeatures: ["life line", "head line", "heart line", "faint fate line"],
      uncertainty: [],
      confidence: 0.86,
    });

    const rawText = JSON.stringify(parsed);
    return {
      provider: this.name,
      model: this.model,
      ok: true,
      rawText,
      parsed,
      warnings: ["MOCK_PROVIDER_ONLY"],
      latencyMs: elapsedMs(start),
      costHint: null,
    };
  }
}

class QwenStage5CProvider {
  constructor(options = {}) {
    const env = options.env || process.env;
    this.name = "qwen";
    this.model = options.model || env.PALMMI_QWEN_MODEL || DEFAULT_QWEN_MODEL;
    this.apiKey = options.apiKey || env.PALMMI_QWEN_API_KEY || "";
    this.endpoint = options.endpoint || DEFAULT_QWEN_ENDPOINT;
    this.fetch = options.fetch || globalThis.fetch;
    this.timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 60000;
    this.promptPath = options.promptPath || DEFAULT_PROMPT_PATH;
  }

  async analyzePalmImage(input = {}) {
    const start = nowMs();
    if (!this.apiKey) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "API_KEY_MISSING",
        errorMessage: "PALMMI_QWEN_API_KEY is not available in process.env.",
        start,
      });
    }

    if (typeof this.fetch !== "function") {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "REQUEST_FAILED",
        errorMessage: "Global fetch is not available in this Node runtime.",
        start,
      });
    }

    if (!Buffer.isBuffer(input.imageBuffer) || input.imageBuffer.length === 0 || !input.mimeType.startsWith("image/")) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "INVALID_IMAGE",
        errorMessage: "Image buffer or MIME type is invalid.",
        start,
      });
    }

    const prompt = readPrompt(this.promptPath);
    const dataUrl = `data:${input.mimeType};base64,${input.imageBuffer.toString("base64")}`;
    const body = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                prompt,
                "",
                `Sample id: ${input.sampleId || "unknown"}`,
                `Known side label from filename: ${input.side || "unknown"}`,
                `Hand label: ${input.handLabel || "unknown"}`,
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0,
    };

    let responseText = "";
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), this.timeoutMs)
        : null;
      const response = await this.fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
      });
      if (timeout) {
        clearTimeout(timeout);
      }
      responseText = await response.text();
      if (!response.ok) {
        return createFailure({
          provider: this.name,
          model: this.model,
          errorCode: "REQUEST_FAILED",
          errorMessage: `Qwen request failed with HTTP ${response.status}: ${responseText.slice(0, 500)}`,
          start,
        });
      }
    } catch (error) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "REQUEST_FAILED",
        errorMessage: error && error.message ? error.message : "Qwen request failed.",
        start,
      });
    }

    let rawText = "";
    try {
      const responseJson = JSON.parse(responseText);
      rawText = extractQwenMessageContent(responseJson);
    } catch (error) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "REQUEST_FAILED",
        errorMessage: `Qwen response was not readable JSON: ${error.message}`,
        start,
      });
    }

    try {
      const parsed = normalizeParsedPalmFeatures(parseJsonObject(rawText));
      if (!parsed.isValidPalmImage) {
        return createFailure({
          provider: this.name,
          model: this.model,
          errorCode: "INVALID_IMAGE",
          errorMessage: "Qwen reported that the image is not a valid palm image.",
          start,
        });
      }
      return {
        provider: this.name,
        model: this.model,
        ok: true,
        rawText,
        parsed,
        warnings: parsed.uncertainty.length > 0 ? ["UNCERTAINTY_REPORTED"] : [],
        latencyMs: elapsedMs(start),
        costHint: null,
      };
    } catch (error) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "PARSE_FAILED",
        errorMessage: `Qwen output was not valid Stage 5C JSON: ${error.message}`,
        start,
      });
    }
  }
}

function extractQwenMessageContent(responseJson) {
  const message = responseJson
    && Array.isArray(responseJson.choices)
    && responseJson.choices[0]
    && responseJson.choices[0].message;
  const content = message && message.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part && typeof part === "object" && typeof part.text === "string") {
        return part.text;
      }
      return typeof part === "string" ? part : "";
    }).join("");
  }
  throw new Error("choices[0].message.content is missing.");
}

class ShellProvider {
  constructor(name, options = {}) {
    this.name = name;
    this.envName = options.envName;
    this.model = options.model || options.defaultModel || `${name}-stage5c-shell`;
    const env = options.env || process.env;
    this.apiKey = options.apiKey || env[this.envName] || "";
  }

  async analyzePalmImage() {
    const start = nowMs();
    if (!this.apiKey) {
      return createFailure({
        provider: this.name,
        model: this.model,
        errorCode: "API_KEY_MISSING",
        errorMessage: `${this.envName} is not available in process.env.`,
        start,
      });
    }
    return createFailure({
      provider: this.name,
      model: this.model,
      errorCode: "NOT_IMPLEMENTED",
      errorMessage: `${this.name} provider is registered as a Stage 5C safe shell and is not implemented yet.`,
      start,
    });
  }
}

class UnknownProvider {
  constructor(name) {
    this.name = name;
    this.model = "unknown-provider";
  }

  async analyzePalmImage() {
    const start = nowMs();
    return createFailure({
      provider: this.name,
      model: this.model,
      errorCode: "NOT_IMPLEMENTED",
      errorMessage: `Unknown provider: ${this.name}`,
      start,
    });
  }
}

const PROVIDER_REGISTRY = Object.freeze({
  mock: (options) => new MockStage5CProvider(options),
  qwen: (options) => new QwenStage5CProvider(options),
  doubao: (options = {}) => new ShellProvider("doubao", {
    envName: "PALMMI_DOUBAO_API_KEY",
    defaultModel: "doubao-stage5c-shell",
    ...options,
  }),
  glm: (options = {}) => new ShellProvider("glm", {
    envName: "PALMMI_GLM_API_KEY",
    defaultModel: "glm-stage5c-shell",
    ...options,
  }),
  gemini: (options = {}) => new ShellProvider("gemini", {
    envName: "PALMMI_GEMINI_API_KEY",
    defaultModel: "gemini-stage5c-shell",
    ...options,
  }),
  openai: (options = {}) => new ShellProvider("openai", {
    envName: "PALMMI_OPENAI_API_KEY",
    defaultModel: "openai-stage5c-shell",
    ...options,
  }),
});

function listProviderNames() {
  return Object.keys(PROVIDER_REGISTRY);
}

function createProvider(name = "mock", options = {}) {
  const normalized = String(name || "mock").toLowerCase();
  const factory = PROVIDER_REGISTRY[normalized];
  if (!factory) {
    return new UnknownProvider(normalized);
  }
  return factory(options);
}

function resolveImagePath(imagePath) {
  const normalized = String(imagePath || "");
  if (path.isAbsolute(normalized)) {
    return normalized;
  }
  return path.resolve(PROJECT_ROOT, normalized);
}

function createInvalidImageResult(sample, provider) {
  return {
    sampleId: sample.sampleId || null,
    imagePath: sample.imagePath || null,
    provider: provider.name,
    model: provider.model,
    ok: false,
    expectedValidity: sample.expectedValidity || null,
    parsedValidity: null,
    confidence: null,
    warnings: [],
    errorCode: "INVALID_IMAGE",
    errorMessage: "Image file does not exist, is not a file, or has an unsupported extension.",
    latencyMs: 0,
  };
}

function uploadFromSample(sample) {
  const imagePath = resolveImagePath(sample.imagePath);
  const stat = fs.statSync(imagePath);
  return {
    schemaVersion: "stage5g_runner_upload_v1",
    fileName: path.basename(imagePath),
    fileType: getMimeType(imagePath),
    fileSize: stat.size,
    fileSizeLabel: `${stat.size} B`,
    previewDataUrl: "",
    uploadedAt: null,
    handSide: sample.side || null,
  };
}

async function toRunnerResult(sample, providerResult, options = {}) {
  const parsed = providerResult && providerResult.parsed ? providerResult.parsed : null;
  const result = {
    sampleId: sample.sampleId || null,
    imagePath: sample.imagePath || null,
    provider: providerResult.provider || null,
    model: providerResult.model || null,
    ok: Boolean(providerResult.ok),
    expectedValidity: sample.expectedValidity || null,
    parsedValidity: parsed ? parsed.isValidPalmImage : null,
    confidence: parsed ? parsed.confidence : null,
    warnings: Array.isArray(providerResult.warnings) ? providerResult.warnings : [],
    errorCode: providerResult.ok ? null : providerResult.errorCode || "REQUEST_FAILED",
    errorMessage: providerResult.ok ? null : providerResult.errorMessage || "Provider failed.",
    latencyMs: Number.isFinite(providerResult.latencyMs) ? providerResult.latencyMs : null,
  };
  if (options.toAnalysisContract && result.ok) {
    result.recognitionResult = await runPalmmiRecognitionPipeline({
      sourceImage: sample.imagePath || null,
      sampleId: sample.sampleId || null,
      providerResult,
      providerWarnings: result.warnings,
    });
    result.featureSet = result.recognitionResult.palmFeatureSet;
    result.ruleInput = result.recognitionResult.ruleInput;
    result.analysisResult = await runPalmmiAnalysisBridge({
      recognitionResult: result.recognitionResult,
      upload: uploadFromSample(sample),
    });
    result.analysisContract = buildAnalysisResultContract(result.analysisResult);
  } else if (options.toAnalysisResult && result.ok) {
    result.recognitionResult = await runPalmmiRecognitionPipeline({
      sourceImage: sample.imagePath || null,
      sampleId: sample.sampleId || null,
      providerResult,
      providerWarnings: result.warnings,
    });
    result.featureSet = result.recognitionResult.palmFeatureSet;
    result.ruleInput = result.recognitionResult.ruleInput;
    result.analysisResult = await runPalmmiAnalysisBridge({
      recognitionResult: result.recognitionResult,
      upload: uploadFromSample(sample),
    });
  } else if (options.toRecognitionResult && result.ok) {
    result.recognitionResult = await runPalmmiRecognitionPipeline({
      sourceImage: sample.imagePath || null,
      sampleId: sample.sampleId || null,
      providerResult,
      providerWarnings: result.warnings,
    });
    result.featureSet = result.recognitionResult.palmFeatureSet;
    result.ruleInput = result.recognitionResult.ruleInput;
  } else if (options.normalize) {
    result.featureSet = normalizeVlmToPalmFeatureSet(providerResult, {
      provider: providerResult.provider || null,
      model: providerResult.model || null,
    });
    if (options.toRuleInput) {
      result.ruleInput = palmFeatureSetToRuleInput(result.featureSet, {
        provider: providerResult.provider || null,
        model: providerResult.model || null,
      });
    }
  }
  return result;
}

async function analyzeSample(sample, provider, options = {}) {
  const imagePath = resolveImagePath(sample.imagePath);
  if (!sample.imagePath || !fs.existsSync(imagePath) || !fs.statSync(imagePath).isFile() || !isImageFile(imagePath)) {
    return createInvalidImageResult(sample, provider);
  }

  let imageBuffer;
  try {
    imageBuffer = fs.readFileSync(imagePath);
  } catch (error) {
    return {
      ...createInvalidImageResult(sample, provider),
      errorMessage: error && error.message ? error.message : "Image file could not be read.",
    };
  }

  try {
    const providerResult = await provider.analyzePalmImage({
      imagePath: toPortablePath(imagePath),
      imageBuffer,
      mimeType: getMimeType(imagePath),
      side: sample.side || "unknown",
      handLabel: sample.handLabel || "unknown",
      sampleId: sample.sampleId || null,
      metadata: {
        expectedValidity: sample.expectedValidity || null,
        notes: sample.notes || null,
      },
    });
    return await toRunnerResult(sample, providerResult, {
      normalize: options.normalize,
      toRuleInput: options.toRuleInput,
      toRecognitionResult: options.toRecognitionResult,
      toAnalysisResult: options.toAnalysisResult,
      toAnalysisContract: options.toAnalysisContract,
    });
  } catch (error) {
    return {
      sampleId: sample.sampleId || null,
      imagePath: sample.imagePath || null,
      provider: provider.name,
      model: provider.model,
      ok: false,
      expectedValidity: sample.expectedValidity || null,
      parsedValidity: null,
      confidence: null,
      warnings: [],
      errorCode: "REQUEST_FAILED",
      errorMessage: error && error.message ? error.message : "Provider threw an unexpected error.",
      latencyMs: null,
    };
  }
}

async function runStage5C(options = {}) {
  const providerName = options.provider || "mock";
  const manifestPath = path.resolve(PROJECT_ROOT, options.manifest || DEFAULT_MANIFEST_PATH);
  const toAnalysisContract = options.toAnalysisContract === true;
  const toAnalysisResult = options.toAnalysisResult === true || toAnalysisContract;
  const toRecognitionResult = options.toRecognitionResult === true || toAnalysisResult;
  const toRuleInput = options.toRuleInput === true || toRecognitionResult;
  const normalize = options.normalize === true || toRuleInput;
  const outputPath = path.resolve(
    PROJECT_ROOT,
    options.output || (toAnalysisContract
      ? DEFAULT_STAGE5H_ANALYSIS_CONTRACT_OUTPUT_PATH
      : toAnalysisResult
        ? DEFAULT_STAGE5G_ANALYSIS_RESULT_OUTPUT_PATH
        : toRecognitionResult
        ? DEFAULT_STAGE5F_RECOGNITION_RESULT_OUTPUT_PATH
        : toRuleInput
          ? DEFAULT_STAGE5E_RULE_INPUT_OUTPUT_PATH
          : normalize
            ? DEFAULT_STAGE5D_FEATURE_SET_OUTPUT_PATH
            : DEFAULT_OUTPUT_PATH)
  );
  const sampleDir = options.sampleDir;

  if (!fs.existsSync(manifestPath)) {
    if (sampleDir && fs.existsSync(sampleDir)) {
      generateLocalManifest({ sampleDir, manifestPath });
    } else {
      throw new Error(`Manifest does not exist: ${manifestPath}`);
    }
  }

  const manifest = loadManifest(manifestPath);
  const provider = options.providerInstance || createProvider(providerName, options.providerOptions || {});
  const results = [];

  for (const sample of manifest) {
    results.push(await analyzeSample(sample, provider, {
      normalize,
      toRuleInput,
      toRecognitionResult,
      toAnalysisResult,
      toAnalysisContract,
    }));
  }

  const okCount = results.filter((item) => item.ok).length;
  const failedCount = results.length - okCount;
  const output = {
    schema: toAnalysisContract
      ? "palmmi.stage5h.analysis-contract.local.v1"
      : toAnalysisResult
        ? "palmmi.stage5g.analysis-results.local.v1"
        : toRecognitionResult
        ? "palmmi.stage5f.recognition-results.local.v1"
      : "palmmi.stage5c.results.local.v1",
    createdAt: new Date().toISOString(),
    provider: provider.name,
    model: provider.model,
    normalized: normalize,
    toRuleInput,
    toRecognitionResult,
    toAnalysisResult,
    toAnalysisContract,
    manifestPath: toPortablePath(manifestPath),
    total: results.length,
    okCount,
    failedCount,
    results,
  };

  writeJson(outputPath, output);
  return output;
}

function parseCliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const withoutPrefix = token.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex >= 0) {
      args[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[withoutPrefix] = next;
      index += 1;
    } else {
      args[withoutPrefix] = true;
    }
  }
  return args;
}

function booleanCliFlag(value) {
  return value === true || value === "true" || value === "1";
}

async function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  const toAnalysisContract = booleanCliFlag(args.toAnalysisContract);
  const toAnalysisResult = booleanCliFlag(args.toAnalysisResult) || toAnalysisContract;
  const toRecognitionResult = booleanCliFlag(args.toRecognitionResult) || toAnalysisResult;
  const toRuleInput = booleanCliFlag(args.toRuleInput) || toRecognitionResult;
  const normalize = booleanCliFlag(args.normalize) || toRuleInput;
  const output = await runStage5C({
    provider: args.provider || "mock",
    sampleDir: args.sampleDir,
    manifest: args.manifest,
    output: args.output,
    normalize,
    toRuleInput,
    toRecognitionResult,
    toAnalysisResult,
    toAnalysisContract,
  });
  console.log("Stage 5C runner completed.");
  console.log(`Provider: ${output.provider}`);
  console.log(`Model: ${output.model}`);
  console.log(`Total: ${output.total}`);
  console.log(`OK: ${output.okCount}`);
  console.log(`Failed: ${output.failedCount}`);
  if (output.failedCount > 0) {
    const firstFailure = output.results.find((item) => !item.ok);
    if (firstFailure) {
      console.log(`First error: ${firstFailure.errorCode}: ${firstFailure.errorMessage}`);
    }
  }
  console.log(`Manifest: ${output.manifestPath}`);
  console.log(`Output: ${toPortablePath(path.resolve(
    PROJECT_ROOT,
    args.output || (toAnalysisContract
      ? DEFAULT_STAGE5H_ANALYSIS_CONTRACT_OUTPUT_PATH
      : toAnalysisResult
        ? DEFAULT_STAGE5G_ANALYSIS_RESULT_OUTPUT_PATH
        : toRecognitionResult
        ? DEFAULT_STAGE5F_RECOGNITION_RESULT_OUTPUT_PATH
        : toRuleInput
          ? DEFAULT_STAGE5E_RULE_INPUT_OUTPUT_PATH
          : normalize
            ? DEFAULT_STAGE5D_FEATURE_SET_OUTPUT_PATH
            : DEFAULT_OUTPUT_PATH)
  ))}`);
  return output;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  DEFAULT_OUTPUT_PATH,
  DEFAULT_STAGE5D_FEATURE_SET_OUTPUT_PATH,
  DEFAULT_STAGE5E_RULE_INPUT_OUTPUT_PATH,
  DEFAULT_STAGE5F_RECOGNITION_RESULT_OUTPUT_PATH,
  DEFAULT_STAGE5G_ANALYSIS_RESULT_OUTPUT_PATH,
  DEFAULT_STAGE5H_ANALYSIS_CONTRACT_OUTPUT_PATH,
  DEFAULT_PROMPT_PATH,
  DEFAULT_QWEN_ENDPOINT,
  DEFAULT_QWEN_MODEL,
  IMAGE_EXTENSIONS,
  MockStage5CProvider,
  QwenStage5CProvider,
  ShellProvider,
  UnknownProvider,
  createProvider,
  generateLocalManifest,
  getMimeType,
  inferSide,
  listProviderNames,
  loadManifest,
  normalizeParsedPalmFeatures,
  parseCliArgs,
  parseJsonObject,
  runStage5C,
};
