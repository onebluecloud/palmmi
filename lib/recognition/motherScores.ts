const { MOTHER_NAMES, normalizeFeatureInput, readField } = require("./recognitionTypes.ts");

const MOTHER_FIELD_SUPPORT = {
  M1: {
    core: ["HEAD_LINE_DEPTH", "HEAD_LINE_LENGTH", "OVERALL_CLARITY", "LINE_COMPLEXITY"],
    reverseCore: ["LINE_COMPLEXITY"],
  },
  M2: {
    core: ["HEART_LINE_DEPTH", "HEART_LINE_LENGTH", "HEART_LINE_CURVE"],
    reverseCore: [],
  },
  M3: {
    core: ["LINE_COMPLEXITY", "HEART_LINE_DEPTH"],
    reverseCore: [],
  },
  M4: {
    core: ["CHUAN_PALM", "FINGER_SPREAD"],
    reverseCore: ["FINGER_SPREAD"],
  },
  M5: {
    core: ["SIMIAN_LINE", "THUMB_LENGTH_RATIO", "LIFE_LINE_DEPTH"],
    reverseCore: [],
  },
  M6: {
    core: ["OVERALL_CLARITY", "THUMB_LENGTH_RATIO"],
    reverseCore: [],
  },
  M7: {
    core: ["HEAD_LINE_SLOPE", "HEART_LINE_DEPTH"],
    reverseCore: [],
  },
  M8: {
    core: ["CHUAN_PALM", "HEART_LINE_DEPTH"],
    reverseCore: [],
  },
};

function clamp100(score) {
  return Math.min(score, 100);
}

function scoreMotherTypes(input) {
  const f = normalizeFeatureInput(input);

  const scores = {};
  scores.M1 = clamp100(
    readField(f, "HEAD_LINE_DEPTH") * 12 +
      readField(f, "HEAD_LINE_LENGTH") * 10 +
      readField(f, "OVERALL_CLARITY") * 8 +
      (3 - readField(f, "LINE_COMPLEXITY")) * 5 +
      readField(f, "MOUNT_JUPITER") * 6,
  );
  scores.M2 = clamp100(
    readField(f, "HEART_LINE_DEPTH") * 12 +
      readField(f, "HEART_LINE_LENGTH") * 10 +
      readField(f, "HEART_LINE_CURVE") * 8 +
      readField(f, "MOUNT_VENUS") * 8 +
      readField(f, "HEART_LINE_END_FORK") * 6,
  );
  scores.M3 = clamp100(
    readField(f, "LINE_COMPLEXITY") * 15 +
      readField(f, "MOUNT_LUNA") * 10 +
      readField(f, "HEART_LINE_DEPTH") * 7 +
      readField(f, "MOUNT_MERCURY") * 7,
  );
  scores.M4 = clamp100(
    (readField(f, "CHUAN_PALM") === 1 ? 50 : 0) +
      readField(f, "HEAD_LIFE_GAP") * 10 +
      (3 - readField(f, "FINGER_SPREAD")) * 5 +
      readField(f, "MOUNT_SATURN") * 5,
  );
  scores.M5 = clamp100(
    (readField(f, "SIMIAN_LINE") === 1 ? 50 : 0) +
      readField(f, "THUMB_LENGTH_RATIO") * 8 +
      readField(f, "FATE_LINE_CLARITY") * 7 +
      readField(f, "LIFE_LINE_DEPTH") * 5,
  );
  scores.M6 = clamp100(
    readField(f, "FATE_LINE_CLARITY") * 18 +
      readField(f, "SUN_LINE_PRESENCE") * 15 +
      readField(f, "OVERALL_CLARITY") * 6 +
      readField(f, "THUMB_LENGTH_RATIO") * 4,
  );
  scores.M7 = clamp100(
    readField(f, "MOUNT_LUNA") * 18 +
      readField(f, "HEAD_LINE_SLOPE") * 12 +
      ([2, 3].includes(readField(f, "FINGERTIP_SHAPE")) ? 15 : 0) +
      readField(f, "HEART_LINE_DEPTH") * 4,
  );

  const highCount = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"].filter((mother) => scores[mother] >= 60).length;
  const highMotherBase = highCount >= 2 ? 50 + (highCount - 2) * 15 : 0;
  scores.M8 = clamp100(
    highMotherBase +
      (readField(f, "HEAD_LINE_END_FORK") === 1 ? 15 : 0) +
      (readField(f, "CHUAN_PALM") === 1 && readField(f, "HEART_LINE_DEPTH") >= 2 ? 15 : 0),
  );

  return scores;
}

function coreFieldsMatched(motherType, input) {
  const f = normalizeFeatureInput(input);
  const support = MOTHER_FIELD_SUPPORT[motherType];
  if (!support) {
    return [];
  }

  return support.core.filter((field) => {
    const value = readField(f, field);
    if (value === null) {
      return false;
    }
    if (support.reverseCore.includes(field)) {
      return value < 3;
    }
    if (field === "CHUAN_PALM" || field === "SIMIAN_LINE") {
      return value === 1;
    }
    return value >= 1;
  });
}

function eligiblePrimaryMothers(input) {
  const eligible = {};
  for (const motherType of Object.keys(MOTHER_NAMES)) {
    eligible[motherType] = coreFieldsMatched(motherType, input).length >= 2;
  }
  return eligible;
}

function selectMotherTypes(input) {
  const scores = scoreMotherTypes(input);
  const eligible = eligiblePrimaryMothers(input);
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryEntry = sortedScores.find(([motherType]) => eligible[motherType]);

  if (!primaryEntry) {
    return {
      mother_type_scores: scores,
      eligible_primary_mothers: eligible,
      primary_mother: null,
      secondary_mother: null,
      is_dual_mother: false,
      sorted_scores: sortedScores,
    };
  }

  const secondaryEntry = sortedScores.find(([motherType]) => motherType !== primaryEntry[0]) || null;
  const primaryMother = motherSummary(primaryEntry[0], primaryEntry[1], input);
  const secondaryMother = secondaryEntry ? motherSummary(secondaryEntry[0], secondaryEntry[1], input) : null;

  return {
    mother_type_scores: scores,
    eligible_primary_mothers: eligible,
    primary_mother: primaryMother,
    secondary_mother: secondaryMother,
    is_dual_mother: Boolean(secondaryMother && primaryMother.score - secondaryMother.score < 15),
    sorted_scores: sortedScores,
  };
}

function motherSummary(id, score, input) {
  return {
    id,
    name: MOTHER_NAMES[id],
    score,
    core_fields_matched: coreFieldsMatched(id, input),
  };
}

module.exports = {
  MOTHER_FIELD_SUPPORT,
  coreFieldsMatched,
  eligiblePrimaryMothers,
  motherSummary,
  scoreMotherTypes,
  selectMotherTypes,
};
