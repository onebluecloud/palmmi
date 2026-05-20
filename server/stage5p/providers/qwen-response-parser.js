function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeConfidence(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
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

module.exports = {
  normalizeParsedPalmFeatures,
  parseJsonObject,
};
