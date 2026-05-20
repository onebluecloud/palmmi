const DEFAULT_PROVIDER = "mock";
const DEFAULT_MODE = "mock-only";
const DEFAULT_QWEN_MODEL = "qwen3-vl-flash";
const DEFAULT_QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function readEnvValue(env, names, fallback = "") {
  const source = env || {};
  for (const name of names) {
    const value = source[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function parsePositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return number;
}

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (!provider || provider === "auto") {
    return DEFAULT_PROVIDER;
  }
  if (provider === "qwen" || provider === "mock") {
    return provider;
  }
  return provider;
}

function normalizeMode(value, provider) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "mock-only" || mode === "real-only" || mode === "real-with-mock-fallback") {
    return mode;
  }
  return provider === "mock" ? DEFAULT_MODE : "real-only";
}

function resolveProviderConfig(env = process.env, options = {}) {
  const provider = normalizeProvider(
    options.provider || readEnvValue(env, ["PALMMI_VLM_PROVIDER", "VLM_PROVIDER"], DEFAULT_PROVIDER)
  );
  const mode = normalizeMode(
    options.mode || readEnvValue(env, ["PALMMI_VLM_MODE", "VLM_MODE"], ""),
    provider
  );
  const timeoutMs = parsePositiveInt(
    options.timeoutMs || readEnvValue(env, ["PALMMI_VLM_TIMEOUT_MS", "VLM_TIMEOUT_MS"], ""),
    DEFAULT_TIMEOUT_MS
  );
  const maxImageBytes = parsePositiveInt(
    options.maxImageBytes || readEnvValue(env, ["PALMMI_VLM_MAX_IMAGE_BYTES", "VLM_MAX_IMAGE_BYTES"], ""),
    DEFAULT_MAX_IMAGE_BYTES
  );

  return {
    provider,
    mode,
    timeoutMs,
    maxImageBytes,
  };
}

function resolveQwenConfig(env = process.env, options = {}) {
  return {
    apiKey: readEnvValue(env, ["PALMMI_QWEN_API_KEY", "QWEN_API_KEY"], ""),
    model: options.model || readEnvValue(env, ["PALMMI_QWEN_MODEL", "QWEN_MODEL"], DEFAULT_QWEN_MODEL),
    endpoint: options.endpoint || readEnvValue(env, ["PALMMI_QWEN_ENDPOINT", "QWEN_ENDPOINT"], DEFAULT_QWEN_ENDPOINT),
    timeoutMs: parsePositiveInt(
      options.timeoutMs || readEnvValue(env, ["PALMMI_VLM_TIMEOUT_MS", "VLM_TIMEOUT_MS"], ""),
      DEFAULT_TIMEOUT_MS
    ),
  };
}

module.exports = {
  DEFAULT_MAX_IMAGE_BYTES,
  DEFAULT_MODE,
  DEFAULT_PROVIDER,
  DEFAULT_QWEN_ENDPOINT,
  DEFAULT_QWEN_MODEL,
  DEFAULT_TIMEOUT_MS,
  normalizeMode,
  normalizeProvider,
  resolveProviderConfig,
  resolveQwenConfig,
};
