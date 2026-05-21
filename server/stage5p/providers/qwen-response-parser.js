function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeConfidence(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeBoolean(value) {
  return value === true;
}

function firstText(...values) {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function normalizeCandidateResults(value) {
  return normalizeArray(value)
    .filter((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate))
    .slice(0, 3)
    .map((candidate) => ({
      personality_id: firstText(candidate.personality_id, candidate.persona_id, candidate.id),
      main_line_type: firstText(candidate.main_line_type, candidate.mother_type),
      confidence: normalizeConfidence(candidate.confidence || candidate.score),
      reason: firstText(candidate.reason, candidate.match_reason),
    }))
    .filter((candidate) => candidate.personality_id);
}

function normalizeParsedPalmFeatures(parsed) {
  const source = normalizeObject(parsed);
  const validity = normalizeObject(source.validity);
  const palmFeatures = normalizeObject(source.palm_features);
  const result = normalizeObject(source.result);
  const legacyExplicitValid = source.isValidPalmImage === true;
  const normalizedValidity = {
    is_palm_photo: normalizeBoolean(validity.is_palm_photo) || legacyExplicitValid,
    is_single_hand: normalizeBoolean(validity.is_single_hand) || legacyExplicitValid,
    is_palm_side_visible: normalizeBoolean(validity.is_palm_side_visible) || legacyExplicitValid,
    palm_lines_visible: normalizeBoolean(validity.palm_lines_visible) || legacyExplicitValid,
    image_quality: firstText(validity.image_quality, source.image_quality, "unknown"),
    reject_reason: firstText(validity.reject_reason, source.reject_reason),
  };
  const isValidPalmImage = normalizedValidity.is_palm_photo
    && normalizedValidity.is_single_hand
    && normalizedValidity.is_palm_side_visible
    && normalizedValidity.palm_lines_visible;
  const visibleFeatures = normalizeArray(palmFeatures.visible_features).length
    ? normalizeArray(palmFeatures.visible_features)
    : normalizeArray(source.visibleFeatures);
  const confidence = normalizeConfidence(
    Number.isFinite(palmFeatures.confidence) ? palmFeatures.confidence : source.confidence
  );

  return {
    validity: normalizedValidity,
    isValidPalmImage,
    isSingleHand: normalizedValidity.is_single_hand,
    isPalmSideVisible: normalizedValidity.is_palm_side_visible,
    palmLinesVisible: normalizedValidity.palm_lines_visible,
    imageQuality: normalizedValidity.image_quality,
    rejectReason: normalizedValidity.reject_reason,
    majorLines: normalizeObject(source.majorLines),
    minorLines: normalizeObject(source.minorLines),
    palmShape: normalizeObject(source.palmShape),
    visibleFeatures,
    uncertainty: normalizeArray(source.uncertainty),
    confidence,
    mainLineType: firstText(palmFeatures.main_line_type, source.mainLineType, source.main_line_type),
    result: {
      personalityId: firstText(result.personality_id, source.personality_id),
      mainLineType: firstText(result.main_line_type, palmFeatures.main_line_type, source.main_line_type),
      candidateResults: normalizeCandidateResults(result.candidate_results || source.candidate_results),
    },
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
