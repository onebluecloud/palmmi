function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeArrayOrObject(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return isPlainObject(value) ? [value] : [];
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

function firstValueByKeys(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return "";
}

function normalizeToken(value) {
  return normalizeText(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeFeatureEnum(value, kind) {
  const raw = normalizeText(value);
  const token = normalizeToken(raw);
  const chinese = raw.replace(/\s+/g, "");
  const mappings = {
    lineDepth: {
      deep: ["deep", "clear", "strong", "obvious", "深", "清晰", "明显", "强"],
      medium: ["medium", "normal", "moderate", "中等", "适中", "一般"],
      faint: ["faint", "shallow", "weak", "blur", "blurry", "unclear", "浅", "淡", "模糊", "不明显"],
    },
    lineComplexity: {
      simple: ["simple", "low", "few", "sparse", "简单", "少", "稀疏"],
      medium: ["medium", "moderate", "normal", "中等", "适中", "一般"],
      complex: ["complex", "high", "many", "dense", "复杂", "多", "密集"],
    },
    lineContinuity: {
      continuous: ["continuous", "connected", "smooth", "连续", "连贯"],
      broken: ["broken", "interrupted", "discontinuous", "断裂", "断续"],
      mixed: ["mixed", "partial", "crossed", "混合", "交错"],
    },
    branchDensity: {
      low: ["low", "few", "sparse", "simple", "少", "稀疏", "简单"],
      medium: ["medium", "moderate", "normal", "中等", "适中", "一般"],
      high: ["high", "many", "dense", "complex", "多", "密集", "复杂"],
    },
    palmShapeHint: {
      long: ["long", "narrow", "长", "长形"],
      square: ["square", "boxy", "方", "方形"],
      wide: ["wide", "broad", "宽", "宽掌"],
    },
  };
  const allowed = Object.keys(mappings[kind] || {});
  if (allowed.includes(token)) {
    return token;
  }
  for (const [canonical, aliases] of Object.entries(mappings[kind] || {})) {
    if (aliases.includes(token) || aliases.includes(chinese)) {
      return canonical;
    }
  }
  return "";
}

let frozenDisplayContent = [];
try {
  frozenDisplayContent = require("../../../PalmTag_rule_engine_v0/data/display_content.json");
} catch (error) {
  frozenDisplayContent = [];
}

const PERSONA_ID_PATTERN = /^P(?:0[1-9]|[12]\d|3[0-6])$/;
const PERSONA_NAME_TO_ID = Array.isArray(frozenDisplayContent)
  ? frozenDisplayContent.reduce((mapping, item) => {
    if (item && typeof item.persona_id === "string" && typeof item.persona_name === "string") {
      const id = item.persona_id.trim();
      const name = item.persona_name.trim();
      if (PERSONA_ID_PATTERN.test(id) && name) {
        mapping.set(name, id);
      }
    }
    return mapping;
  }, new Map())
  : new Map();

function personaIdFromText(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  const upper = text.toUpperCase();
  if (PERSONA_ID_PATTERN.test(upper)) {
    return upper;
  }
  return PERSONA_NAME_TO_ID.get(text) || "";
}

function readPersonaId(value) {
  if (isPlainObject(value)) {
    return personaIdFromText(firstText(
      value.personality_id,
      value.personalityId,
      value.primary_personality_id,
      value.primaryPersonalityId,
      value.persona_id,
      value.personaId,
      value.id,
      value.personality_name,
      value.personalityName,
      value.persona_name,
      value.personaName,
      value.name
    )) || readPersonaId(value.personality) || readPersonaId(value.persona);
  }
  return personaIdFromText(value);
}

function readMainLineType(value) {
  const source = normalizeObject(value);
  return firstText(
    source.main_line_type,
    source.mainLineType,
    source.mother_type,
    source.motherType,
    source.line_type,
    source.lineType
  );
}

function normalizeCandidateResults(...values) {
  return values.flatMap((value) => normalizeArrayOrObject(value))
    .filter((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate))
    .slice(0, 3)
    .map((candidate) => ({
      personality_id: readPersonaId(candidate),
      main_line_type: readMainLineType(candidate),
      confidence: normalizeConfidence(candidate.confidence || candidate.score),
      reason: firstText(candidate.reason, candidate.match_reason),
    }))
    .filter((candidate) => candidate.personality_id);
}

function normalizeCollapseGuard(value) {
  const source = normalizeObject(value);
  return {
    not_default_personality: normalizeBoolean(source.not_default_personality),
    reason_not_p25_if_not_p25: firstText(source.reason_not_p25_if_not_p25, source.reasonNotP25IfNotP25),
    reason_if_p25: firstText(source.reason_if_p25, source.reasonIfP25),
  };
}

function hasCollapseGuardSignal(collapseGuard) {
  return Boolean(
    collapseGuard.not_default_personality ||
    collapseGuard.reason_not_p25_if_not_p25 ||
    collapseGuard.reason_if_p25
  );
}

function collapseRiskHint(topCandidateId, candidateResults, collapseGuard) {
  if (!topCandidateId) {
    return false;
  }
  const candidateIds = candidateResults.map((candidate) => candidate.personality_id).filter(Boolean);
  const allSame = candidateIds.length >= 2 && candidateIds.every((id) => id === topCandidateId);
  return topCandidateId === "P25" && (allSame || !hasCollapseGuardSignal(collapseGuard));
}

function normalizeParsedPalmFeatures(parsed) {
  const source = normalizeObject(parsed);
  const hasValidityObject = isPlainObject(source.validity);
  const hasPalmFeaturesObject = isPlainObject(source.palm_features) || isPlainObject(source.palmFeatures) || isPlainObject(source.features);
  const resultSource = isPlainObject(source.result)
    ? source.result
    : isPlainObject(source.analysis_result)
      ? source.analysis_result
      : isPlainObject(source.personality_result)
        ? source.personality_result
        : {};
  const hasResultObject = isPlainObject(source.result)
    || isPlainObject(source.analysis_result)
    || isPlainObject(source.personality_result)
    || Array.isArray(source.candidate_results)
    || Array.isArray(source.candidates);
  const validity = normalizeObject(source.validity);
  const palmFeatures = normalizeObject(source.palm_features || source.palmFeatures || source.features);
  const result = normalizeObject(resultSource);
  const collapseGuard = normalizeCollapseGuard(result.collapse_guard || result.collapseGuard || source.collapse_guard || source.collapseGuard);
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
    : normalizeArray(palmFeatures.visibleFeatures).length
      ? normalizeArray(palmFeatures.visibleFeatures)
      : normalizeArray(source.visibleFeatures);
  const confidence = normalizeConfidence(
    Number.isFinite(palmFeatures.confidence)
      ? palmFeatures.confidence
      : Number.isFinite(palmFeatures.score)
        ? palmFeatures.score
        : Number.isFinite(palmFeatures.feature_confidence)
          ? palmFeatures.feature_confidence
          : source.confidence
  );

  const candidateResults = normalizeCandidateResults(
    result.candidate_results,
    result.candidateResults,
    result.candidates,
    source.candidate_results,
    source.candidateResults,
    source.candidates
  );
  const personalityId = readPersonaId(result) || readPersonaId(source);
  const topCandidateId = personalityId || (candidateResults[0] && candidateResults[0].personality_id) || "";

  return {
    hasValidity: hasValidityObject || legacyExplicitValid,
    hasPalmFeatures: hasPalmFeaturesObject,
    hasResult: hasResultObject,
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
    mainLineType: firstText(
      firstValueByKeys(palmFeatures, ["main_line_type", "mainLineType", "line_type", "lineType", "primary_line_type", "primaryLineType", "dominant_line_type", "dominantLineType"]),
      source.mainLineType,
      source.main_line_type,
      source.line_type,
      source.lineType
    ),
    palmFeatureSummary: {
      line_depth: normalizeFeatureEnum(firstValueByKeys(palmFeatures, ["line_depth", "lineDepth", "depth", "line_strength", "lineStrength"]), "lineDepth"),
      line_complexity: normalizeFeatureEnum(firstValueByKeys(palmFeatures, ["line_complexity", "lineComplexity", "complexity", "texture_complexity", "textureComplexity"]), "lineComplexity"),
      line_continuity: normalizeFeatureEnum(firstValueByKeys(palmFeatures, ["line_continuity", "lineContinuity", "continuity", "line_pattern", "linePattern"]), "lineContinuity"),
      branch_density: normalizeFeatureEnum(firstValueByKeys(palmFeatures, ["branch_density", "branchDensity", "branches", "branch_level", "branchLevel", "branch_count", "branchCount"]), "branchDensity"),
      palm_shape_hint: normalizeFeatureEnum(firstValueByKeys(palmFeatures, ["palm_shape_hint", "palmShapeHint", "palm_shape", "palmShape", "shape", "hand_shape", "handShape"]), "palmShapeHint"),
    },
    result: {
      personalityId,
      mainLineType: firstText(readMainLineType(result), palmFeatures.main_line_type, source.mainLineType, source.main_line_type),
      candidateResults,
      collapseGuard,
    },
    diagnostics: {
      candidate_count: candidateResults.length,
      top_candidate_id: topCandidateId,
      has_collapse_guard: hasCollapseGuardSignal(collapseGuard),
      low_confidence: confidence > 0 && confidence < 0.55,
      collapse_risk_hint: collapseRiskHint(topCandidateId, candidateResults, collapseGuard),
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
