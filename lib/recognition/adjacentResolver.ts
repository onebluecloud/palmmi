const { normalizeFeatureInput, readField } = require("./recognitionTypes.ts");
const { sortPersonaCandidates } = require("./personaRules.ts");

const ADJACENT_THRESHOLD = 0.15;

const ADJACENT_RULES = [
  {
    personaA: "P01",
    personaB: "P12",
    resolver_fields: ["MOUNT_JUPITER"],
    resolve: (f) => (readField(f, "MOUNT_JUPITER") >= 1 ? "P01" : "P12"),
  },
  {
    personaA: "P04",
    personaB: "P17",
    resolver_fields: ["INDEX_LENGTH_RATIO"],
    resolve: (f) => (readField(f, "INDEX_LENGTH_RATIO") >= 2 ? "P17" : "P04"),
  },
  {
    personaA: "P05",
    personaB: "P07",
    resolver_fields: ["LIFE_LINE_DEPTH"],
    resolve: (f) => (readField(f, "LIFE_LINE_DEPTH") >= 3 ? "P07" : "P05"),
  },
  {
    personaA: "P02",
    personaB: "P22",
    resolver_fields: ["HEART_LINE_DEPTH"],
    resolve: (f) => (readField(f, "HEART_LINE_DEPTH") >= 3 ? "P22" : "P02"),
  },
  {
    personaA: "P15",
    personaB: "P33",
    resolver_fields: ["LINE_COMPLEXITY", "OVERALL_CLARITY"],
    resolve: (f) => (readField(f, "LINE_COMPLEXITY") <= 1 && readField(f, "OVERALL_CLARITY") >= 2 ? "P33" : "P15"),
  },
  {
    personaA: "P09",
    personaB: "P34",
    resolver_fields: ["HEART_LINE_DEPTH"],
    resolve: (f) => (readField(f, "HEART_LINE_DEPTH") >= 2 ? "P34" : "P09"),
  },
  {
    personaA: "P14",
    personaB: "P35",
    resolver_fields: ["INDEX_LENGTH_RATIO"],
    resolve: (f) => (readField(f, "INDEX_LENGTH_RATIO") >= 2 ? "P35" : "P14"),
  },
  {
    personaA: "P27",
    personaB: "P35",
    resolver_fields: ["HEART_LINE_DEPTH", "INDEX_LENGTH_RATIO"],
    resolve: (f) => (readField(f, "HEART_LINE_DEPTH") >= 3 && readField(f, "INDEX_LENGTH_RATIO") >= 2 ? "P35" : "P27"),
  },
  {
    personaA: "P11",
    personaB: "P21",
    resolver_fields: ["HEAD_LINE_END_FORK"],
    resolve: (f) => (readField(f, "HEAD_LINE_END_FORK") === 1 ? "P11" : "P21"),
  },
  {
    personaA: "P25",
    personaB: "P33",
    resolver_fields: ["CHUAN_PALM"],
    resolve: (f) => (readField(f, "CHUAN_PALM") === 1 ? "P33" : "P25"),
  },
  {
    personaA: "P10",
    personaB: "P29",
    resolver_fields: ["MOUNT_LUNA", "HEAD_LINE_SLOPE"],
    resolve: (f) => (readField(f, "MOUNT_LUNA") >= 1 && readField(f, "HEAD_LINE_SLOPE") >= 2 ? "P10" : "P29"),
  },
  {
    personaA: "P03",
    personaB: "P36",
    resolver_fields: ["MOUNT_JUPITER", "INDEX_LENGTH_RATIO"],
    resolve: (f) => (readField(f, "MOUNT_JUPITER") >= 1 && readField(f, "INDEX_LENGTH_RATIO") >= 2 ? "P03" : "P36"),
  },
];

function resolveAdjacentPersona(input, candidateA, candidateB) {
  const features = normalizeFeatureInput(input);
  const rule = ADJACENT_RULES.find(
    (item) =>
      (item.personaA === candidateA.id && item.personaB === candidateB.id) ||
      (item.personaA === candidateB.id && item.personaB === candidateA.id),
  );
  const higherCandidate = sortPersonaCandidates(candidateA, candidateB) <= 0 ? candidateA : candidateB;

  if (!rule) {
    return adjacentResult(false, false, higherCandidate.id, null, null, Math.abs(candidateA.score - candidateB.score));
  }

  const scoreGap = Number(Math.abs(candidateA.score - candidateB.score).toFixed(6));
  if (scoreGap >= ADJACENT_THRESHOLD) {
    return adjacentResult(true, false, higherCandidate.id, rule, null, scoreGap);
  }

  const selectedPersonaId = rule.resolve(features);
  return adjacentResult(true, true, selectedPersonaId, rule, selectedPersonaId === candidateA.id ? candidateB.id : candidateA.id, scoreGap);
}

function resolveAdjacentInCandidates(input, candidates) {
  const sorted = [...candidates].sort(sortPersonaCandidates);
  const topCandidate = sorted[0];
  const candidateById = new Map(sorted.map((candidate) => [candidate.id, candidate]));
  const possiblePairs = [];

  if (!topCandidate) {
    return {
      applied: false,
      selected_persona_id: null,
      detail: null,
    };
  }

  for (const rule of ADJACENT_RULES) {
    if (rule.personaA !== topCandidate.id && rule.personaB !== topCandidate.id) {
      continue;
    }
    const candidateA = candidateById.get(rule.personaA);
    const candidateB = candidateById.get(rule.personaB);
    if (!candidateA || !candidateB) {
      continue;
    }
    const scoreGap = Number(Math.abs(candidateA.score - candidateB.score).toFixed(6));
    if (scoreGap < ADJACENT_THRESHOLD) {
      possiblePairs.push({ rule, candidateA, candidateB, scoreGap, bestScore: Math.max(candidateA.score, candidateB.score) });
    }
  }

  possiblePairs.sort((a, b) => b.bestScore - a.bestScore || a.scoreGap - b.scoreGap);
  if (possiblePairs.length === 0) {
    return {
      applied: false,
      selected_persona_id: sorted[0] ? sorted[0].id : null,
      detail: null,
    };
  }

  const pair = possiblePairs[0];
  const result = resolveAdjacentPersona(input, pair.candidateA, pair.candidateB);
  return {
    applied: result.applied,
    selected_persona_id: result.selected_persona_id,
    detail: result,
  };
}

function adjacentResult(checked, applied, selectedPersonaId, rule, losingPersonaId, scoreGap) {
  return {
    checked,
    applied,
    selected_persona_id: selectedPersonaId,
    losing_persona_id: losingPersonaId,
    pair: rule ? [rule.personaA, rule.personaB] : null,
    resolver_fields: rule ? rule.resolver_fields : [],
    threshold: ADJACENT_THRESHOLD,
    score_gap: scoreGap,
    reason_code: applied ? "ADJACENT_RESOLVED" : "ADJACENT_NOT_APPLIED",
  };
}

module.exports = {
  ADJACENT_RULES,
  ADJACENT_THRESHOLD,
  resolveAdjacentInCandidates,
  resolveAdjacentPersona,
};
