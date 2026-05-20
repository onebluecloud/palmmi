const {
  findMissingFields,
} = require("../../lib/recognition/recognitionTypes.ts");
const {
  matchPersona,
} = require("../../lib/recognition/personaMatcher.ts");
const {
  normalizeVlmToPalmFeatureSet,
} = require("./normalize-vlm-to-palm-feature-set.js");
const {
  palmFeatureSetToRuleInput,
} = require("./palm-feature-set-to-rule-input.js");

const RECOGNITION_RESULT_SCHEMA_VERSION = "recognition-result.v1";
const UNKNOWN = "unknown";

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function stringOrUnknown(value) {
  return typeof value === "string" && value.trim() ? value.trim() : UNKNOWN;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return UNKNOWN;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function providerLabel(options, providerResult, palmFeatureSet) {
  const provider = options.provider;
  return firstString(
    options.providerName,
    providerResult && providerResult.provider,
    palmFeatureSet && palmFeatureSet.rawProvider && palmFeatureSet.rawProvider.provider,
    provider && provider.name
  );
}

function modelLabel(options, providerResult, palmFeatureSet) {
  const provider = options.provider;
  return firstString(
    options.model,
    providerResult && providerResult.model,
    palmFeatureSet && palmFeatureSet.rawProvider && palmFeatureSet.rawProvider.model,
    provider && provider.model
  );
}

function providerWarnings(options, providerResult) {
  if (Array.isArray(options.providerWarnings)) {
    return options.providerWarnings;
  }
  return safeArray(providerResult && providerResult.warnings);
}

function providerFailureMessage(providerResult) {
  const provider = stringOrUnknown(providerResult && providerResult.provider);
  const code = stringOrUnknown(providerResult && providerResult.errorCode);
  const message = typeof providerResult.errorMessage === "string" && providerResult.errorMessage.trim()
    ? providerResult.errorMessage.trim()
    : "Provider failed before PalmFeatureSet normalization.";
  return `Stage 5F provider ${provider} failed (${code}): ${message}`;
}

async function resolveProviderResult(options) {
  if (isPlainObject(options.providerResult)) {
    if (options.providerResult.ok === false) {
      throw new Error(providerFailureMessage(options.providerResult));
    }
    return options.providerResult;
  }

  if (isPlainObject(options.palmFeatureSet)) {
    return null;
  }

  const provider = options.provider;
  if (provider && typeof provider.analyzePalmImage === "function" && isPlainObject(options.providerInput)) {
    const result = await provider.analyzePalmImage(options.providerInput);
    if (!isPlainObject(result)) {
      throw new Error("Stage 5F provider returned an invalid result object.");
    }
    if (result.ok === false) {
      throw new Error(providerFailureMessage(result));
    }
    return result;
  }

  throw new Error("PalmFeatureSet, providerResult, or provider with providerInput is required.");
}

function resolvePalmFeatureSet(options, providerResult) {
  if (isPlainObject(options.palmFeatureSet)) {
    return options.palmFeatureSet;
  }

  if (!isPlainObject(providerResult)) {
    throw new Error("Stage 5F cannot build PalmFeatureSet without a provider result.");
  }

  const normalizer = typeof options.normalizer === "function"
    ? options.normalizer
    : normalizeVlmToPalmFeatureSet;

  const palmFeatureSet = normalizer(providerResult, {
    provider: providerResult.provider || providerLabel(options, providerResult, null),
    model: providerResult.model || modelLabel(options, providerResult, null),
    side: options.side,
  });

  if (!isPlainObject(palmFeatureSet)) {
    throw new Error("Stage 5F normalizer returned an invalid PalmFeatureSet object.");
  }
  return palmFeatureSet;
}

function buildRuleInput(options, palmFeatureSet, provider, model) {
  const adapter = typeof options.adapter === "function"
    ? options.adapter
    : palmFeatureSetToRuleInput;
  const ruleInput = adapter(palmFeatureSet, { provider, model });

  if (!isPlainObject(ruleInput)) {
    throw new Error("Stage 5F adapter returned an invalid RuleInput object.");
  }
  if (!isPlainObject(ruleInput.normalized_33_fields)) {
    throw new Error("Stage 5F RuleInput must include normalized_33_fields.");
  }
  return ruleInput;
}

function runMatcher(options, ruleInput) {
  const matcher = typeof options.matcher === "function" ? options.matcher : matchPersona;
  const match = matcher(ruleInput);
  if (!isPlainObject(match)) {
    throw new Error("Stage 5F matcher returned an invalid persona match object.");
  }
  return match;
}

function extractFinalPersona(match) {
  const persona = isPlainObject(match.primary_persona) ? match.primary_persona : null;
  if (!persona) {
    return {
      id: null,
      name: null,
      confidence: 0,
    };
  }

  const confidence = Number.isFinite(persona.score)
    ? persona.score
    : Number.isFinite(persona.confidence)
      ? persona.confidence
      : 0;

  return {
    id: persona.id || persona.persona_id || null,
    name: persona.name || null,
    confidence,
  };
}

function matcherWarnings(match) {
  const warnings = [];
  if (match.status === "LOW_CONFIDENCE" || match.is_low_confidence === true) {
    warnings.push("MATCH_LOW_CONFIDENCE");
  }
  for (const code of safeArray(match.error_codes)) {
    warnings.push(code);
  }
  return [...new Set(warnings)];
}

function buildDiagnostics({ ruleInput, match, providerResult, options, missingFields }) {
  const adapterDiagnostics = isPlainObject(ruleInput.diagnostics) ? ruleInput.diagnostics : {};
  return {
    lowConfidenceFieldCount: Number.isFinite(adapterDiagnostics.lowConfidenceFieldCount)
      ? adapterDiagnostics.lowConfidenceFieldCount
      : 0,
    missingFieldCount: missingFields.length,
    unknownFieldCount: Number.isFinite(adapterDiagnostics.unknownFieldCount)
      ? adapterDiagnostics.unknownFieldCount
      : 0,
    adapterWarnings: safeArray(adapterDiagnostics.warnings),
    providerWarnings: providerWarnings(options, providerResult),
    matcherWarnings: matcherWarnings(match),
  };
}

async function runPalmmiRecognitionPipeline(options = {}) {
  if (!isPlainObject(options)) {
    throw new Error("Stage 5F options must be an object.");
  }

  const providerResult = await resolveProviderResult(options);
  const palmFeatureSet = resolvePalmFeatureSet(options, providerResult);
  const provider = providerLabel(options, providerResult, palmFeatureSet);
  const model = modelLabel(options, providerResult, palmFeatureSet);
  const ruleInput = buildRuleInput(options, palmFeatureSet, provider, model);
  const missingFields = findMissingFields(ruleInput.normalized_33_fields);
  const personaMatch = runMatcher(options, ruleInput);

  return {
    schemaVersion: RECOGNITION_RESULT_SCHEMA_VERSION,
    sourceImage: options.sourceImage || options.imagePath || null,
    sampleId: options.sampleId || null,
    provider,
    model,
    status: personaMatch.status || UNKNOWN,
    palmFeatureSet,
    ruleInput,
    personaMatch,
    finalPersona: extractFinalPersona(personaMatch),
    qualityGate: isPlainObject(ruleInput.qualityGate) ? ruleInput.qualityGate : null,
    diagnostics: buildDiagnostics({
      ruleInput,
      match: personaMatch,
      providerResult,
      options,
      missingFields,
    }),
  };
}

module.exports = {
  RECOGNITION_RESULT_SCHEMA_VERSION,
  runPalmmiRecognitionPipeline,
};
