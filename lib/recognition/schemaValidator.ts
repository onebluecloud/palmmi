const { FIELD_NAMES, normalizeFeatureInput } = require("./recognitionTypes.ts");
const { MOTHER_FIELD_SUPPORT } = require("./motherScores.ts");

const BINARY_FIELDS = new Set([
  "OVERALL_PROPORTION_FLAG",
  "HEAD_LINE_END_FORK",
  "HEART_LINE_END_FORK",
  "SIMIAN_LINE",
  "CHUAN_PALM",
  "SUN_LINE_PRESENCE",
]);

const ZERO_TO_TWO_FIELDS = new Set([
  "MOUNT_VENUS",
  "MOUNT_JUPITER",
  "MOUNT_SATURN",
  "MOUNT_APOLLO",
  "MOUNT_MERCURY",
  "MOUNT_LUNA",
]);

const CORE_FIELDS = new Set(
  Object.values(MOTHER_FIELD_SUPPORT)
    .flatMap((support) => support.core)
    .filter(Boolean),
);

const DEFAULTS = Object.freeze({
  binary: 1,
  zero_to_two: 1,
  zero_to_three: 2,
});

function validateAndNormalizeFeatures(input) {
  const raw = normalizeFeatureInput(input);
  const normalized = {};
  const degradedFields = [];
  const missingFields = [];
  const nullFields = [];
  const invalidFields = [];
  const schemaWarnings = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    for (const field of FIELD_NAMES) {
      normalized[field] = defaultValueForField(field);
      missingFields.push(field);
      degradedFields.push(degraded(field, "MISSING_FIELD", undefined, normalized[field]));
    }
    return finishValidation(normalized, degradedFields, missingFields, nullFields, invalidFields, ["FEATURES_NOT_OBJECT"], true);
  }

  for (const field of FIELD_NAMES) {
    if (!(field in raw)) {
      normalized[field] = defaultValueForField(field);
      missingFields.push(field);
      degradedFields.push(degraded(field, "MISSING_FIELD", undefined, normalized[field]));
      schemaWarnings.push(`${field} missing; defaulted to ${normalized[field]}.`);
      continue;
    }

    const value = raw[field];
    if (value === null || value === undefined) {
      normalized[field] = defaultValueForField(field);
      nullFields.push(field);
      degradedFields.push(degraded(field, "NULL_FIELD", value, normalized[field]));
      schemaWarnings.push(`${field} null; defaulted to ${normalized[field]}.`);
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
      normalized[field] = defaultValueForField(field);
      invalidFields.push(field);
      degradedFields.push(degraded(field, "INVALID_TYPE", value, normalized[field]));
      schemaWarnings.push(`${field} invalid type; defaulted to ${normalized[field]}.`);
      continue;
    }

    if (!isAllowedValue(field, value)) {
      normalized[field] = defaultValueForField(field);
      invalidFields.push(field);
      degradedFields.push(degraded(field, "ENUM_OUT_OF_RANGE", value, normalized[field]));
      schemaWarnings.push(`${field} out of range; defaulted to ${normalized[field]}.`);
      continue;
    }

    normalized[field] = value;
  }

  const retryReasons = retryReasonsFor({
    degradedFields,
    missingFields,
    nullFields,
  });
  const shouldRetry = retryReasons.length > 0;
  const warnings = schemaWarnings.concat(retryReasons.map((reason) => `retry_required:${reason}`));
  return finishValidation(normalized, degradedFields, missingFields, nullFields, invalidFields, warnings, shouldRetry);
}

function finishValidation(normalized, degradedFields, missingFields, nullFields, invalidFields, schemaWarnings, shouldRetry) {
  return {
    status: shouldRetry ? "RETRY_REQUIRED" : degradedFields.length > 0 ? "DEGRADED" : "VALID",
    normalized_features: normalized,
    degraded_fields: degradedFields,
    missing_fields: missingFields,
    null_fields: nullFields,
    invalid_fields: invalidFields,
    schema_warnings: schemaWarnings,
    should_retry: shouldRetry,
    degradation_count: degradedFields.length,
    missing_or_null_count: missingFields.length + nullFields.length,
    core_missing_or_null_count: missingFields.concat(nullFields).filter((field) => CORE_FIELDS.has(field)).length,
    max_continuous_degraded_fields: maxContinuousDegradedFields(degradedFields),
  };
}

function retryReasonsFor({ degradedFields, missingFields, nullFields }) {
  const reasons = [];
  const missingOrNull = missingFields.concat(nullFields);
  const coreMissingOrNull = missingOrNull.filter((field) => CORE_FIELDS.has(field));
  const continuous = maxContinuousDegradedFields(degradedFields);

  if (missingOrNull.length >= 5) {
    reasons.push("TOO_MANY_MISSING_OR_NULL_FIELDS");
  }
  if (coreMissingOrNull.length >= 3) {
    reasons.push("TOO_MANY_CORE_FIELDS_MISSING_OR_NULL");
  }
  if (continuous >= 5) {
    reasons.push("CONTINUOUS_DEGRADED_FIELDS_TOO_MANY");
  }
  return reasons;
}

function maxContinuousDegradedFields(degradedFields) {
  const degradedSet = new Set(degradedFields.map((entry) => entry.field));
  let max = 0;
  let current = 0;
  for (const field of FIELD_NAMES) {
    if (degradedSet.has(field)) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

function degraded(field, reason, originalValue, defaultValue) {
  return {
    field,
    reason,
    original_value: originalValue,
    default_value: defaultValue,
  };
}

function defaultValueForField(field) {
  if (BINARY_FIELDS.has(field)) {
    return DEFAULTS.binary;
  }
  if (ZERO_TO_TWO_FIELDS.has(field)) {
    return DEFAULTS.zero_to_two;
  }
  return DEFAULTS.zero_to_three;
}

function isAllowedValue(field, value) {
  if (BINARY_FIELDS.has(field)) {
    return value === 0 || value === 1;
  }
  if (ZERO_TO_TWO_FIELDS.has(field)) {
    return value >= 0 && value <= 2;
  }
  return value >= 0 && value <= 3;
}

module.exports = {
  BINARY_FIELDS,
  ZERO_TO_TWO_FIELDS,
  CORE_FIELDS,
  defaultValueForField,
  validateAndNormalizeFeatures,
};
