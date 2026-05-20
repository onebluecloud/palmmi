function createRecognitionCache(seedEntries) {
  const entries = new Map(seedEntries || []);
  return {
    get(cacheKey) {
      if (!entries.has(cacheKey)) {
        return null;
      }
      return clone(entries.get(cacheKey));
    },
    set(cacheKey, value) {
      entries.set(cacheKey, clone(value));
    },
    has(cacheKey) {
      return entries.has(cacheKey);
    },
    size() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    dump() {
      return [...entries.entries()].map(([key, value]) => [key, clone(value)]);
    },
  };
}

function buildRecognitionCacheKey({ file_hash, config }) {
  const parts = [
    "palmmi",
    "recognition",
    file_hash,
    config.image_normalization_version,
    config.model_provider,
    config.model_name,
    config.mock_model_version || config.model_version,
    config.prompt_version,
    config.schema_version,
    config.degradation_policy_version,
    config.rule_version,
  ];
  return parts.map((part) => encodeURIComponent(String(part || "unknown"))).join(":");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  buildRecognitionCacheKey,
  createRecognitionCache,
};
