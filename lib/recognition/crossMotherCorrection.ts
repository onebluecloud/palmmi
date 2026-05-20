const { PERSONA_TO_MOTHER } = require("./personaCatalog.ts");

const CROSS_MOTHER_SCORE_MULTIPLIER = 1.2;
const CROSS_MOTHER_MIN_MOTHER_SCORE = 50;

function applyCrossMotherCorrection({ currentCandidate, allPersonaCandidates, motherScores }) {
  const sorted = [...allPersonaCandidates].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });

  const crossCandidate = sorted.find((candidate) => candidate.id !== currentCandidate.id);
  if (!crossCandidate) {
    return { checked: true, applied: false, selectedCandidate: currentCandidate, detail: null };
  }

  const crossMother = PERSONA_TO_MOTHER[crossCandidate.id];
  const crossMotherScore = motherScores[crossMother] || 0;
  const isDifferentMother = crossMother !== currentCandidate.mother_type;
  const isTwentyPercentHigher = crossCandidate.score > currentCandidate.score * CROSS_MOTHER_SCORE_MULTIPLIER;
  const isMotherScoreQualified = crossMotherScore >= CROSS_MOTHER_MIN_MOTHER_SCORE;

  if (isDifferentMother && isTwentyPercentHigher && isMotherScoreQualified) {
    const selectedCandidate = {
      ...crossCandidate,
      reason_codes: [...crossCandidate.reason_codes, "CROSS_MOTHER_CORRECTED"],
    };
    return {
      checked: true,
      applied: true,
      selectedCandidate,
      detail: {
        original_primary_mother: currentCandidate.mother_type,
        original_primary_persona: currentCandidate.id,
        original_primary_persona_score: currentCandidate.score,
        cross_mother: crossMother,
        cross_persona: crossCandidate.id,
        cross_persona_score: crossCandidate.score,
        cross_mother_score: crossMotherScore,
        reason: "CROSS_PERSONA_SCORE_GT_120_PERCENT_AND_MOTHER_SCORE_GTE_50",
      },
    };
  }

  return {
    checked: true,
    applied: false,
    selectedCandidate: currentCandidate,
    detail: {
      original_primary_mother: currentCandidate.mother_type,
      original_primary_persona: currentCandidate.id,
      original_primary_persona_score: currentCandidate.score,
      cross_mother: crossMother,
      cross_persona: crossCandidate.id,
      cross_persona_score: crossCandidate.score,
      cross_mother_score: crossMotherScore,
      reason: "CROSS_MOTHER_CONDITIONS_NOT_MET",
    },
  };
}

module.exports = {
  CROSS_MOTHER_MIN_MOTHER_SCORE,
  CROSS_MOTHER_SCORE_MULTIPLIER,
  applyCrossMotherCorrection,
};
