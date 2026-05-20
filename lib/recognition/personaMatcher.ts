const { MOTHER_NAMES, RULE_VERSION, SCHEMA_VERSION, findMissingFields, normalizeFeatureInput } = require("./recognitionTypes.ts");
const { MOTHER_TO_PERSONAS, PERSONA_BY_ID } = require("./personaCatalog.ts");
const { motherSummary, selectMotherTypes } = require("./motherScores.ts");
const { scoreAllPersonas, scorePersonas, sortPersonaCandidates } = require("./personaRules.ts");
const { resolveAdjacentInCandidates } = require("./adjacentResolver.ts");
const { applyCrossMotherCorrection } = require("./crossMotherCorrection.ts");

function matchPersona(input) {
  const features = normalizeFeatureInput(input);
  const missingFields = findMissingFields(features || {});
  if (missingFields.length > 0) {
    return retryResult("RULE_FIELD_MISSING", missingFields);
  }

  const motherSelection = selectMotherTypes(features);
  if (!motherSelection.primary_mother) {
    return {
      status: "RETRY_REQUIRED",
      error_codes: ["RULE_NO_ELIGIBLE_PRIMARY_MOTHER"],
      mother_type_scores: motherSelection.mother_type_scores,
      eligible_primary_mothers: motherSelection.eligible_primary_mothers,
      primary_mother: null,
      secondary_mother: null,
      is_dual_mother: false,
      primary_persona: null,
      initial_primary_persona: null,
      top3: [],
      correction: emptyCorrection(),
      is_low_confidence: true,
      debug: debug(["No mother type satisfied the V4.2 core support constraint."]),
    };
  }

  const initialMother = motherSelection.primary_mother;
  const initialPool = MOTHER_TO_PERSONAS[initialMother.id];
  const initialPoolCandidates = scorePersonas(features, initialPool).map((candidate) => ({
    ...candidate,
    reason_codes: [...candidate.reason_codes, `${initialMother.id}_INTERNAL_MATCH`],
  }));

  let currentCandidate = initialPoolCandidates[0];
  const poolAdjacent = resolveAdjacentInCandidates(features, initialPoolCandidates);
  if (poolAdjacent.applied) {
    currentCandidate = addReason(initialPoolCandidates.find((candidate) => candidate.id === poolAdjacent.selected_persona_id), "ADJACENT_RESOLVED");
  }

  const allPersonaCandidates = scoreAllPersonas(features);
  const crossMother = applyCrossMotherCorrection({
    currentCandidate,
    allPersonaCandidates,
    motherScores: motherSelection.mother_type_scores,
  });
  let finalCandidate = crossMother.selectedCandidate;

  const globalAdjacent = resolveAdjacentInCandidates(features, allPersonaCandidates);
  let adjacentDetail = poolAdjacent.detail || null;
  let adjacentApplied = poolAdjacent.applied;
  if (globalAdjacent.applied && globalAdjacent.selected_persona_id === finalCandidate.id) {
    finalCandidate = addReason(finalCandidate, "ADJACENT_RESOLVED");
    adjacentDetail = globalAdjacent.detail;
    adjacentApplied = true;
  }

  const finalMother = motherSummary(finalCandidate.mother_type, motherSelection.mother_type_scores[finalCandidate.mother_type], features);
  const top3 = buildTop3(finalCandidate, allPersonaCandidates, adjacentApplied).slice(0, 3);
  const secondCandidate = top3[1] || null;
  const isLowConfidence = Boolean(secondCandidate && Math.abs(finalCandidate.score - secondCandidate.score) < 0.15);

  return {
    status: isLowConfidence ? "LOW_CONFIDENCE" : "SUCCESS",
    error_codes: [],
    mother_type_scores: motherSelection.mother_type_scores,
    eligible_primary_mothers: motherSelection.eligible_primary_mothers,
    primary_mother: finalMother,
    initial_primary_mother: initialMother,
    secondary_mother: motherSelection.secondary_mother,
    is_dual_mother: motherSelection.is_dual_mother,
    persona_candidate_pool_mother: initialMother.id,
    persona_candidate_pool: initialPool.map((persona) => persona.id),
    initial_primary_persona: presentPersona(currentCandidate),
    primary_persona: presentPersona(finalCandidate),
    top3,
    correction: {
      cross_mother_checked: crossMother.checked,
      cross_mother_applied: crossMother.applied,
      cross_mother_detail: crossMother.detail,
      adjacent_checked: true,
      adjacent_applied: adjacentApplied,
      adjacent_detail: adjacentDetail,
    },
    explanation: {
      mother: {
        selected: finalMother.id,
        reason: crossMother.applied
          ? "Cross-mother correction selected the final mother after the initial primary mother was scored."
          : "Primary mother selected by V4.2 mother score and at least two core supporting fields.",
        core_fields_matched: finalMother.core_fields_matched,
      },
      persona: {
        selected: finalCandidate.id,
        reason: "Persona was scored from the initial primary-mother candidate pool, then checked by cross-mother correction and adjacent resolution.",
        matched_features: finalCandidate.matched_features,
        conflict_features: finalCandidate.conflict_features,
      },
      low_confidence: isLowConfidence,
    },
    is_low_confidence: isLowConfidence,
    debug: debug([], { initial_pool_only: true }),
  };
}

function buildTop3(primaryCandidate, candidates, adjacentApplied) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  byId.set(primaryCandidate.id, primaryCandidate);
  const rest = [...byId.values()].filter((candidate) => candidate.id !== primaryCandidate.id).sort(sortPersonaCandidates);
  return [primaryCandidate, ...rest].map((candidate, index) => {
    const reasonCodes = [...candidate.reason_codes];
    if (index === 0 && adjacentApplied && !reasonCodes.includes("ADJACENT_RESOLVED")) {
      reasonCodes.push("ADJACENT_RESOLVED");
    }
    return {
      id: candidate.id,
      persona_id: candidate.id,
      name: candidate.name,
      mother_type: candidate.mother_type,
      score: candidate.score,
      reason_codes: reasonCodes,
      matched_features: candidate.matched_features,
      conflict_features: candidate.conflict_features,
    };
  });
}

function presentPersona(candidate) {
  if (!candidate) {
    return null;
  }
  return {
    id: candidate.id,
    persona_id: candidate.id,
    name: candidate.name,
    score: candidate.score,
    mother_type: candidate.mother_type,
    matched_features: candidate.matched_features,
    conflict_features: candidate.conflict_features,
    reason_codes: candidate.reason_codes,
  };
}

function addReason(candidate, reasonCode) {
  return {
    ...candidate,
    reason_codes: candidate.reason_codes.includes(reasonCode) ? candidate.reason_codes : [...candidate.reason_codes, reasonCode],
  };
}

function retryResult(errorCode, notes) {
  return {
    status: "RETRY_REQUIRED",
    error_codes: [errorCode],
    primary_mother: null,
    secondary_mother: null,
    is_dual_mother: false,
    primary_persona: null,
    initial_primary_persona: null,
    top3: [],
    correction: emptyCorrection(),
    is_low_confidence: true,
    debug: debug(notes),
  };
}

function emptyCorrection() {
  return {
    cross_mother_checked: false,
    cross_mother_applied: false,
    cross_mother_detail: null,
    adjacent_checked: false,
    adjacent_applied: false,
    adjacent_detail: null,
  };
}

function debug(notes, extra) {
  return {
    rule_version: RULE_VERSION,
    schema_version: SCHEMA_VERSION,
    notes,
    ...(extra || {}),
  };
}

module.exports = {
  matchPersona,
};
