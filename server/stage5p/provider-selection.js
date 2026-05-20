const {
  ERROR_CODES,
  createProviderError,
} = require("./errors.js");
const {
  resolveProviderConfig,
} = require("./env.js");
const {
  MockVlmProvider,
} = require("./providers/mock-vlm-provider.js");
const {
  QwenVlmProvider,
} = require("./providers/qwen-vlm-provider.js");

class UnavailableVlmProvider {
  constructor(name) {
    this.name = name || "unknown";
    this.model = "unavailable";
  }

  async analyze(input = {}) {
    return createProviderError(
      ERROR_CODES.VLM_PROVIDER_NOT_CONFIGURED,
      input.request_id || null,
      this.name,
      this.model
    );
  }
}

function createVlmProvider(options = {}) {
  const env = options.env || process.env;
  const config = options.config || resolveProviderConfig(env, options);

  if (config.provider === "mock") {
    return new MockVlmProvider({
      model: options.mockModel,
    });
  }

  if (config.provider === "qwen") {
    return new QwenVlmProvider({
      env,
      model: options.model,
      endpoint: options.endpoint,
      timeoutMs: config.timeoutMs,
      fetchImpl: options.fetchImpl,
    });
  }

  return new UnavailableVlmProvider(config.provider);
}

module.exports = {
  UnavailableVlmProvider,
  createVlmProvider,
  resolveProviderConfig,
};
