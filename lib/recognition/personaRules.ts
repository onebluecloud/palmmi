const { PERSONAS, PERSONA_BY_ID } = require("./personaCatalog.ts");
const { normalizeFeatureInput, readField, roundScore, unique } = require("./recognitionTypes.ts");

function c(fields, predicate, reasonCode) {
  return { fields, predicate, reasonCode };
}

function gte(field, value) {
  return c([field], (f) => readField(f, field) >= value, `${field}_GTE_${value}`);
}

function lte(field, value) {
  return c([field], (f) => readField(f, field) <= value, `${field}_LTE_${value}`);
}

function eq(field, value) {
  return c([field], (f) => readField(f, field) === value, `${field}_EQ_${value}`);
}

function between(field, min, max) {
  return c([field], (f) => readField(f, field) >= min && readField(f, field) <= max, `${field}_BETWEEN_${min}_${max}`);
}

function oneOf(field, values) {
  return c([field], (f) => values.includes(readField(f, field)), `${field}_IN_${values.join("_")}`);
}

function either(fields, predicate, reasonCode) {
  return c(fields, predicate, reasonCode);
}

const PERSONA_RULES = {
  P01: [gte("HEAD_LINE_LENGTH", 2), gte("HEAD_LINE_DEPTH", 2), lte("HEART_LINE_DEPTH", 1), gte("FATE_LINE_CLARITY", 2), gte("MOUNT_JUPITER", 1)],
  P12: [gte("HEAD_LINE_DEPTH", 2), gte("HEAD_LINE_LENGTH", 2), gte("HEAD_LIFE_GAP", 2), gte("THUMB_LENGTH_RATIO", 2), gte("OVERALL_CLARITY", 2)],
  P25: [gte("OVERALL_CLARITY", 2), lte("LINE_COMPLEXITY", 1), gte("HEAD_LINE_DEPTH", 2)],
  P06: [gte("OVERALL_CLARITY", 2), lte("LINE_COMPLEXITY", 1), gte("HEAD_LINE_DEPTH", 2), eq("FINGERTIP_SHAPE", 0), gte("MOUNT_SATURN", 1)],
  P31: [gte("HEAD_LINE_LENGTH", 2), gte("HEAD_LINE_DEPTH", 2), lte("FATE_LINE_CLARITY", 1), between("THUMB_LENGTH_RATIO", 1, 2), lte("FINGER_SPREAD", 1)],

  P35: [gte("HEART_LINE_DEPTH", 2), gte("HEART_LINE_LENGTH", 2), gte("MOUNT_VENUS", 1), gte("INDEX_LENGTH_RATIO", 2)],
  P14: [gte("HEART_LINE_LENGTH", 2), gte("HEART_LINE_CURVE", 2), gte("LIFE_LINE_CURVE", 2), gte("LIFE_LINE_DEPTH", 2), gte("MOUNT_VENUS", 1), gte("OVERALL_CLARITY", 2)],
  P27: [gte("HEART_LINE_DEPTH", 2), gte("HEART_LINE_CURVE", 2), eq("SUN_LINE_PRESENCE", 1), gte("MOUNT_APOLLO", 1), gte("INDEX_LENGTH_RATIO", 2)],
  P30: [gte("HEAD_LINE_DEPTH", 2), gte("HEART_LINE_DEPTH", 2), eq("FINGERTIP_SHAPE", 2), gte("MOUNT_VENUS", 1)],

  P02: [gte("HEART_LINE_DEPTH", 2), gte("MOUNT_LUNA", 1), gte("LINE_COMPLEXITY", 2)],
  P22: [gte("HEART_LINE_DEPTH", 3), eq("HEART_LINE_END_FORK", 1), gte("MOUNT_LUNA", 1), gte("MOUNT_MERCURY", 1)],
  P20: [gte("HEART_LINE_DEPTH", 2), gte("HEAD_LINE_DEPTH", 2), gte("HEAD_LINE_LENGTH", 2), gte("LINE_COMPLEXITY", 2)],
  P28: [gte("LINE_COMPLEXITY", 2), gte("MOUNT_LUNA", 1), lte("HEART_LINE_DEPTH", 2)],

  P09: [eq("CHUAN_PALM", 1), gte("HEAD_LIFE_GAP", 2), gte("MOUNT_SATURN", 1), lte("FINGER_SPREAD", 1)],
  P34: [
    either(["CHUAN_PALM", "HEAD_LIFE_GAP"], (f) => readField(f, "CHUAN_PALM") === 1 || readField(f, "HEAD_LIFE_GAP") >= 2, "CHUAN_OR_HEAD_LIFE_GAP"),
    gte("HEART_LINE_DEPTH", 2),
    lte("HEART_LINE_LENGTH", 2),
    lte("LINE_COMPLEXITY", 1),
    gte("LIFE_LINE_DEPTH", 2),
  ],
  P33: [eq("CHUAN_PALM", 1), lte("LINE_COMPLEXITY", 1), gte("OVERALL_CLARITY", 2), lte("HEART_LINE_DEPTH", 1)],
  P15: [
    lte("HEART_LINE_DEPTH", 1),
    lte("LINE_COMPLEXITY", 2),
    either(["CHUAN_PALM", "HEAD_LIFE_GAP"], (f) => readField(f, "CHUAN_PALM") === 1 || readField(f, "HEAD_LIFE_GAP") >= 2, "CHUAN_OR_HEAD_LIFE_GAP"),
  ],
  P17: [gte("HEAD_LINE_DEPTH", 2), gte("INDEX_LENGTH_RATIO", 2), lte("HEART_LINE_DEPTH", 1), gte("HEAD_LIFE_GAP", 2)],

  P05: [eq("SIMIAN_LINE", 1), gte("THUMB_LENGTH_RATIO", 2), gte("FATE_LINE_CLARITY", 2), between("LIFE_LINE_DEPTH", 1, 2)],
  P03: [eq("SIMIAN_LINE", 1), gte("MOUNT_JUPITER", 1), gte("INDEX_LENGTH_RATIO", 2), gte("FATE_LINE_CLARITY", 2)],
  P36: [gte("FATE_LINE_CLARITY", 2), gte("THUMB_LENGTH_RATIO", 2), gte("HEAD_LINE_DEPTH", 2), gte("OVERALL_CLARITY", 2)],
  P07: [gte("LIFE_LINE_DEPTH", 3), eq("SIMIAN_LINE", 1), gte("FATE_LINE_CLARITY", 2), gte("THUMB_LENGTH_RATIO", 2)],

  P13: [gte("FATE_LINE_CLARITY", 2), eq("SUN_LINE_PRESENCE", 1), gte("OVERALL_CLARITY", 2)],
  P26: [gte("THUMB_LENGTH_RATIO", 2), gte("FATE_LINE_CLARITY", 2), gte("LIFE_LINE_LENGTH", 2), gte("LIFE_LINE_DEPTH", 2)],
  P16: [gte("THUMB_LENGTH_RATIO", 2), gte("FATE_LINE_CLARITY", 2), lte("HEART_LINE_DEPTH", 1)],
  P19: [
    lte("HEART_LINE_DEPTH", 1),
    gte("HEAD_LINE_LENGTH", 2),
    either(["SUN_LINE_PRESENCE", "MOUNT_APOLLO"], (f) => readField(f, "SUN_LINE_PRESENCE") === 1 || readField(f, "MOUNT_APOLLO") >= 1, "SUN_OR_APOLLO"),
  ],

  P10: [gte("MOUNT_LUNA", 1), gte("HEAD_LINE_SLOPE", 2), oneOf("FINGERTIP_SHAPE", [2, 3])],
  P29: [gte("HEAD_LINE_LENGTH", 2), gte("LINE_COMPLEXITY", 2), between("THUMB_LENGTH_RATIO", 1, 2)],
  P18: [gte("HEART_LINE_DEPTH", 2), eq("HEART_LINE_END_FORK", 1), gte("HEAD_LINE_DEPTH", 2), gte("MOUNT_LUNA", 1)],
  P04: [gte("LINE_COMPLEXITY", 2), lte("HEART_LINE_DEPTH", 1), lte("FINGER_SPREAD", 1), gte("HEAD_LINE_SLOPE", 1)],

  P11: [
    eq("HEAD_LINE_END_FORK", 1),
    either(["SUN_LINE_PRESENCE", "MOUNT_APOLLO"], (f) => readField(f, "SUN_LINE_PRESENCE") === 1 || readField(f, "MOUNT_APOLLO") >= 1, "SUN_OR_APOLLO"),
    gte("INDEX_LENGTH_RATIO", 2),
  ],
  P21: [gte("HEART_LINE_DEPTH", 2), gte("HEAD_LINE_DEPTH", 2), eq("CHUAN_PALM", 1), gte("THUMB_LENGTH_RATIO", 2)],
  P08: [gte("HEART_LINE_DEPTH", 2), lte("HEART_LINE_LENGTH", 2), gte("THUMB_LENGTH_RATIO", 2), gte("FATE_LINE_CLARITY", 2)],
  P32: [gte("LIFE_LINE_DEPTH", 2), lte("LIFE_LINE_LENGTH", 2), gte("THUMB_LENGTH_RATIO", 2), gte("HEAD_LINE_DEPTH", 2)],
  P23: [
    gte("HEAD_LINE_LENGTH", 2),
    either(["CHUAN_PALM", "HEAD_LIFE_GAP"], (f) => readField(f, "CHUAN_PALM") === 1 || readField(f, "HEAD_LIFE_GAP") >= 2, "CHUAN_OR_HEAD_LIFE_GAP"),
    lte("FATE_LINE_CLARITY", 1),
  ],
  P24: [gte("FATE_LINE_CLARITY", 2), gte("HEAD_LINE_LENGTH", 2), gte("THUMB_LENGTH_RATIO", 2)],
};

function scorePersona(input, personaId) {
  const features = normalizeFeatureInput(input);
  const persona = PERSONA_BY_ID[personaId];
  const rules = PERSONA_RULES[personaId] || [];
  const matchedFeatures = [];
  const conflictFeatures = [];
  const reasonCodes = [];
  let matched = 0;

  for (const rule of rules) {
    if (rule.predicate(features)) {
      matched += 1;
      matchedFeatures.push(...rule.fields);
      reasonCodes.push(rule.reasonCode);
    } else {
      conflictFeatures.push(...rule.fields);
    }
  }

  return {
    id: persona.id,
    persona_id: persona.id,
    name: persona.name,
    mother_type: persona.mother_type,
    score: rules.length ? roundScore(matched / rules.length) : 0,
    matched_features: unique(matchedFeatures),
    conflict_features: unique(conflictFeatures),
    reason_codes: reasonCodes,
    matched_rule_count: matched,
    total_rule_count: rules.length,
  };
}

function scorePersonas(input, personas) {
  return personas.map((persona) => scorePersona(input, persona.id)).sort(sortPersonaCandidates);
}

function scoreAllPersonas(input) {
  return scorePersonas(input, PERSONAS);
}

function sortPersonaCandidates(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  return a.id.localeCompare(b.id);
}

module.exports = {
  PERSONA_RULES,
  scoreAllPersonas,
  scorePersona,
  scorePersonas,
  sortPersonaCandidates,
};
