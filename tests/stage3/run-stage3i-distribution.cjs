const fs = require("node:fs");
const path = require("node:path");

require.extensions[".ts"] = require.extensions[".js"];

const root = path.resolve(__dirname, "..", "..");
const fixtureDir = path.join(__dirname, "fixtures", "distribution");
const reportPath = path.join(root, "docs", "stage3", "STAGE3I_DISTRIBUTION_REPORT.md");

const { matchPersona } = require(path.join(root, "lib", "recognition", "personaMatcher.ts"));
const { FIELD_NAMES, MOTHER_NAMES } = require(path.join(root, "lib", "recognition", "recognitionTypes.ts"));
const { PERSONAS, MOTHER_TO_PERSONAS } = require(path.join(root, "lib", "recognition", "personaCatalog.ts"));
const { ADJACENT_RULES } = require(path.join(root, "lib", "recognition", "adjacentResolver.ts"));

const BASE_FEATURES = Object.freeze({
  PALM_LENGTH_RATIO: 1,
  INDEX_RING_RATIO: 1,
  THUMB_LENGTH_RATIO: 0,
  INDEX_LENGTH_RATIO: 0,
  PINKY_LENGTH_RATIO: 1,
  FINGER_SPREAD: 2,
  HAND_ASPECT_RATIO: 1,
  OVERALL_PROPORTION_FLAG: 1,
  FINGERTIP_SHAPE: 1,
  LIFE_LINE_DEPTH: 0,
  LIFE_LINE_LENGTH: 0,
  LIFE_LINE_CURVE: 0,
  HEAD_LINE_LENGTH: 0,
  HEAD_LINE_DEPTH: 0,
  HEAD_LINE_SLOPE: 0,
  HEAD_LIFE_GAP: 0,
  HEAD_LINE_END_FORK: 0,
  HEART_LINE_DEPTH: 0,
  HEART_LINE_LENGTH: 0,
  HEART_LINE_CURVE: 0,
  HEART_LINE_END_FORK: 0,
  SIMIAN_LINE: 0,
  CHUAN_PALM: 0,
  LINE_COMPLEXITY: 3,
  OVERALL_CLARITY: 0,
  FATE_LINE_CLARITY: 0,
  SUN_LINE_PRESENCE: 0,
  MOUNT_VENUS: 0,
  MOUNT_JUPITER: 0,
  MOUNT_SATURN: 0,
  MOUNT_APOLLO: 0,
  MOUNT_MERCURY: 0,
  MOUNT_LUNA: 0,
});

const PERSONA_TARGETS = {
  P01: { HEAD_LINE_LENGTH: 2, HEAD_LINE_DEPTH: 2, HEART_LINE_DEPTH: 0, FATE_LINE_CLARITY: 2, MOUNT_JUPITER: 1, OVERALL_CLARITY: 2 },
  P02: { HEART_LINE_DEPTH: 2, MOUNT_LUNA: 1, LINE_COMPLEXITY: 2 },
  P03: { SIMIAN_LINE: 1, MOUNT_JUPITER: 1, INDEX_LENGTH_RATIO: 2, FATE_LINE_CLARITY: 2, THUMB_LENGTH_RATIO: 1, LIFE_LINE_DEPTH: 1 },
  P04: { LINE_COMPLEXITY: 2, HEART_LINE_DEPTH: 1, FINGER_SPREAD: 1, HEAD_LINE_SLOPE: 1, FINGERTIP_SHAPE: 2 },
  P05: { SIMIAN_LINE: 1, THUMB_LENGTH_RATIO: 2, FATE_LINE_CLARITY: 2, LIFE_LINE_DEPTH: 2 },
  P06: { OVERALL_CLARITY: 2, LINE_COMPLEXITY: 0, HEAD_LINE_DEPTH: 2, FINGERTIP_SHAPE: 0, MOUNT_SATURN: 1 },
  P07: { LIFE_LINE_DEPTH: 3, SIMIAN_LINE: 1, FATE_LINE_CLARITY: 2, THUMB_LENGTH_RATIO: 2 },
  P08: m8Base({ HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, THUMB_LENGTH_RATIO: 2, FATE_LINE_CLARITY: 2, HEAD_LINE_DEPTH: 0 }),
  P09: { CHUAN_PALM: 1, HEAD_LIFE_GAP: 2, MOUNT_SATURN: 1, FINGER_SPREAD: 1, LINE_COMPLEXITY: 2 },
  P10: { MOUNT_LUNA: 1, HEAD_LINE_SLOPE: 2, FINGERTIP_SHAPE: 2, HEART_LINE_DEPTH: 1 },
  P11: m8Base({ HEAD_LINE_END_FORK: 1, SUN_LINE_PRESENCE: 1, INDEX_LENGTH_RATIO: 2, HEART_LINE_DEPTH: 2, THUMB_LENGTH_RATIO: 0 }),
  P12: { HEAD_LINE_DEPTH: 2, HEAD_LINE_LENGTH: 2, HEAD_LIFE_GAP: 2, THUMB_LENGTH_RATIO: 2, OVERALL_CLARITY: 2, LINE_COMPLEXITY: 2 },
  P13: { FATE_LINE_CLARITY: 2, SUN_LINE_PRESENCE: 1, OVERALL_CLARITY: 2, THUMB_LENGTH_RATIO: 1 },
  P14: { HEART_LINE_DEPTH: 1, HEART_LINE_LENGTH: 2, HEART_LINE_CURVE: 2, LIFE_LINE_CURVE: 2, LIFE_LINE_DEPTH: 2, MOUNT_VENUS: 1, OVERALL_CLARITY: 2 },
  P15: { HEART_LINE_DEPTH: 0, LINE_COMPLEXITY: 2, CHUAN_PALM: 1, FINGER_SPREAD: 2 },
  P16: { THUMB_LENGTH_RATIO: 2, FATE_LINE_CLARITY: 2, HEART_LINE_DEPTH: 0, OVERALL_CLARITY: 1 },
  P17: { CHUAN_PALM: 1, FINGER_SPREAD: 2, HEAD_LINE_DEPTH: 2, INDEX_LENGTH_RATIO: 2, HEART_LINE_DEPTH: 0, HEAD_LIFE_GAP: 2, LINE_COMPLEXITY: 3 },
  P18: { HEART_LINE_DEPTH: 2, HEART_LINE_END_FORK: 1, HEAD_LINE_DEPTH: 2, MOUNT_LUNA: 1, HEAD_LINE_SLOPE: 1, FINGERTIP_SHAPE: 2, LINE_COMPLEXITY: 0 },
  P19: { HEART_LINE_DEPTH: 0, HEAD_LINE_LENGTH: 2, SUN_LINE_PRESENCE: 1, FATE_LINE_CLARITY: 1, THUMB_LENGTH_RATIO: 1, OVERALL_CLARITY: 1 },
  P20: { HEART_LINE_DEPTH: 2, HEAD_LINE_DEPTH: 2, HEAD_LINE_LENGTH: 2, LINE_COMPLEXITY: 3 },
  P21: m8Base({ HEAD_LINE_END_FORK: 1, HEART_LINE_DEPTH: 2, HEAD_LINE_DEPTH: 2, CHUAN_PALM: 1, THUMB_LENGTH_RATIO: 2, INDEX_LENGTH_RATIO: 0, SUN_LINE_PRESENCE: 0, MOUNT_APOLLO: 0 }),
  P22: { HEART_LINE_DEPTH: 3, HEART_LINE_END_FORK: 1, MOUNT_LUNA: 1, MOUNT_MERCURY: 1, LINE_COMPLEXITY: 2 },
  P23: m8Base({ HEAD_LINE_LENGTH: 2, CHUAN_PALM: 1, FATE_LINE_CLARITY: 0, HEART_LINE_DEPTH: 2, HEAD_LINE_END_FORK: 1 }),
  P24: m8Base({ FATE_LINE_CLARITY: 2, HEAD_LINE_LENGTH: 2, THUMB_LENGTH_RATIO: 2, HEART_LINE_DEPTH: 2, HEAD_LINE_END_FORK: 1 }),
  P25: { OVERALL_CLARITY: 2, LINE_COMPLEXITY: 0, HEAD_LINE_DEPTH: 2 },
  P26: { THUMB_LENGTH_RATIO: 2, FATE_LINE_CLARITY: 2, LIFE_LINE_LENGTH: 2, LIFE_LINE_DEPTH: 2, OVERALL_CLARITY: 1 },
  P27: { HEART_LINE_DEPTH: 2, HEART_LINE_CURVE: 2, SUN_LINE_PRESENCE: 1, MOUNT_APOLLO: 1, INDEX_LENGTH_RATIO: 2 },
  P28: { LINE_COMPLEXITY: 2, MOUNT_LUNA: 1, HEART_LINE_DEPTH: 1 },
  P29: { HEAD_LINE_LENGTH: 2, LINE_COMPLEXITY: 2, THUMB_LENGTH_RATIO: 1, HEAD_LINE_SLOPE: 1, HEART_LINE_DEPTH: 1, FINGERTIP_SHAPE: 2 },
  P30: { HEAD_LINE_DEPTH: 2, HEART_LINE_DEPTH: 2, FINGERTIP_SHAPE: 2, MOUNT_VENUS: 1, HEART_LINE_LENGTH: 1, HEART_LINE_CURVE: 1 },
  P31: { HEAD_LINE_LENGTH: 2, HEAD_LINE_DEPTH: 2, FATE_LINE_CLARITY: 0, THUMB_LENGTH_RATIO: 1, FINGER_SPREAD: 1, OVERALL_CLARITY: 1, LINE_COMPLEXITY: 2 },
  P32: m8Base({ LIFE_LINE_DEPTH: 2, LIFE_LINE_LENGTH: 2, THUMB_LENGTH_RATIO: 2, HEAD_LINE_DEPTH: 2, HEAD_LINE_LENGTH: 2, OVERALL_CLARITY: 2, HEART_LINE_DEPTH: 1, FINGER_SPREAD: 0 }),
  P33: { CHUAN_PALM: 1, LINE_COMPLEXITY: 0, OVERALL_CLARITY: 2, HEART_LINE_DEPTH: 0, FINGER_SPREAD: 2 },
  P34: { CHUAN_PALM: 1, FINGER_SPREAD: 2, HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, LINE_COMPLEXITY: 0, LIFE_LINE_DEPTH: 2 },
  P35: { HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, MOUNT_VENUS: 1, INDEX_LENGTH_RATIO: 2 },
  P36: { SIMIAN_LINE: 1, FATE_LINE_CLARITY: 2, THUMB_LENGTH_RATIO: 2, HEAD_LINE_DEPTH: 2, OVERALL_CLARITY: 2 },
};

const ADJACENT_SAMPLES = {
  "adjacent-p01-p12.json": { HEAD_LINE_LENGTH: 2, HEAD_LINE_DEPTH: 2, HEART_LINE_DEPTH: 0, FATE_LINE_CLARITY: 2, MOUNT_JUPITER: 1, HEAD_LIFE_GAP: 2, THUMB_LENGTH_RATIO: 2, OVERALL_CLARITY: 2 },
  "adjacent-p04-p17.json": { LINE_COMPLEXITY: 3, HEART_LINE_DEPTH: 0, FINGER_SPREAD: 1, HEAD_LINE_SLOPE: 1, HEAD_LINE_DEPTH: 2, INDEX_LENGTH_RATIO: 2, HEAD_LIFE_GAP: 2, CHUAN_PALM: 1, FINGERTIP_SHAPE: 2 },
  "adjacent-p05-p07.json": { LIFE_LINE_DEPTH: 3, SIMIAN_LINE: 1, FATE_LINE_CLARITY: 2, THUMB_LENGTH_RATIO: 2 },
  "adjacent-p02-p22.json": { HEART_LINE_DEPTH: 3, MOUNT_LUNA: 1, LINE_COMPLEXITY: 2, HEART_LINE_END_FORK: 1, MOUNT_MERCURY: 1 },
  "adjacent-p15-p33.json": { HEART_LINE_DEPTH: 0, LINE_COMPLEXITY: 0, CHUAN_PALM: 1, OVERALL_CLARITY: 2, FINGER_SPREAD: 2 },
  "adjacent-p09-p34.json": { CHUAN_PALM: 1, HEAD_LIFE_GAP: 2, MOUNT_SATURN: 1, FINGER_SPREAD: 1, HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, LINE_COMPLEXITY: 0, LIFE_LINE_DEPTH: 2 },
  "adjacent-p14-p35.json": { HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, HEART_LINE_CURVE: 2, LIFE_LINE_CURVE: 2, LIFE_LINE_DEPTH: 2, MOUNT_VENUS: 1, OVERALL_CLARITY: 2, INDEX_LENGTH_RATIO: 2 },
  "adjacent-p27-p35.json": { HEART_LINE_DEPTH: 3, HEART_LINE_LENGTH: 2, HEART_LINE_CURVE: 2, MOUNT_VENUS: 1, INDEX_LENGTH_RATIO: 2, SUN_LINE_PRESENCE: 1, MOUNT_APOLLO: 1 },
  "adjacent-p11-p21.json": m8Base({ HEAD_LINE_END_FORK: 1, SUN_LINE_PRESENCE: 1, INDEX_LENGTH_RATIO: 2, HEART_LINE_DEPTH: 2, HEAD_LINE_DEPTH: 2, CHUAN_PALM: 1, THUMB_LENGTH_RATIO: 2 }),
  "adjacent-p25-p33.json": { OVERALL_CLARITY: 2, LINE_COMPLEXITY: 0, HEAD_LINE_DEPTH: 2, CHUAN_PALM: 1, HEART_LINE_DEPTH: 0, FINGER_SPREAD: 2 },
  "adjacent-p10-p29.json": { MOUNT_LUNA: 1, HEAD_LINE_SLOPE: 2, FINGERTIP_SHAPE: 2, HEAD_LINE_LENGTH: 2, LINE_COMPLEXITY: 2, THUMB_LENGTH_RATIO: 1, HEART_LINE_DEPTH: 1 },
  "adjacent-p03-p36.json": { SIMIAN_LINE: 1, MOUNT_JUPITER: 1, INDEX_LENGTH_RATIO: 2, FATE_LINE_CLARITY: 2, THUMB_LENGTH_RATIO: 2, HEAD_LINE_DEPTH: 2, OVERALL_CLARITY: 2 },
};

const SPECIAL_SAMPLES = {
  "cross-mother-should-apply.json": { HEAD_LINE_LENGTH: 1, HEAD_LINE_DEPTH: 3, HEART_LINE_DEPTH: 3, HEART_LINE_LENGTH: 3, INDEX_LENGTH_RATIO: 2, OVERALL_CLARITY: 3, MOUNT_VENUS: 2, MOUNT_JUPITER: 2, LINE_COMPLEXITY: 2 },
  "cross-mother-no-20-percent.json": { HEAD_LINE_LENGTH: 2, HEAD_LINE_DEPTH: 2, HEAD_LIFE_GAP: 2, THUMB_LENGTH_RATIO: 2, HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, INDEX_LENGTH_RATIO: 2, MOUNT_VENUS: 1, OVERALL_CLARITY: 2, LINE_COMPLEXITY: 3 },
  "cross-mother-mother-score-too-low.json": { HEAD_LINE_LENGTH: 2, HEAD_LINE_DEPTH: 2, OVERALL_CLARITY: 2, LINE_COMPLEXITY: 2, HEAD_LINE_END_FORK: 1, SUN_LINE_PRESENCE: 1, INDEX_LENGTH_RATIO: 2 },
  "dual-mother-under-15.json": { HEAD_LINE_LENGTH: 2, HEAD_LINE_DEPTH: 2, OVERALL_CLARITY: 2, LINE_COMPLEXITY: 1, HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, HEART_LINE_CURVE: 2, MOUNT_JUPITER: 1, MOUNT_VENUS: 1 },
  "dual-mother-over-15.json": { HEAD_LINE_LENGTH: 3, HEAD_LINE_DEPTH: 3, OVERALL_CLARITY: 3, LINE_COMPLEXITY: 0, MOUNT_JUPITER: 2, HEART_LINE_DEPTH: 1, HEART_LINE_LENGTH: 1, HEART_LINE_CURVE: 1 },
  "dual-mother-low-confidence-boundary.json": { HEART_LINE_DEPTH: 2, HEART_LINE_LENGTH: 2, HEART_LINE_CURVE: 2, LIFE_LINE_CURVE: 2, LIFE_LINE_DEPTH: 2, MOUNT_VENUS: 1, OVERALL_CLARITY: 2, INDEX_LENGTH_RATIO: 2 },
};

function main() {
  const samples = buildSamples();
  writeFixtures(samples);
  const rows = samples.map((sample) => runSample(sample));
  const summary = buildSummary(rows);
  writeReport(rows, summary);
  validateStage3IRequirements(samples, rows);

  console.log(`Stage 3I distribution samples: ${summary.total_samples}`);
  console.log(`Persona zero-hit count: ${summary.zero_hit_personas.length}`);
  console.log(`Adjacent applied count: ${summary.adjacent_applied_count}`);
  console.log(`Cross-mother applied count: ${summary.cross_mother_applied_count}`);
  console.log(`Report written: ${path.relative(root, reportPath)}`);
}

function buildSamples() {
  const samples = [];
  for (const persona of PERSONAS) {
    const overlay = PERSONA_TARGETS[persona.id];
    if (!overlay) {
      throw new Error(`Missing persona target overlay for ${persona.id}`);
    }
    samples.push(makeSample(`${persona.id.toLowerCase()}-target.json`, ["persona-target", `target:${persona.id}`, `mother-typical:${persona.mother_type}`], overlay));
  }

  for (const [fileName, overlay] of Object.entries(ADJACENT_SAMPLES)) {
    const pair = fileName.replace("adjacent-", "").replace(".json", "").toUpperCase().replace("-", "/");
    samples.push(makeSample(fileName, ["adjacent-boundary", `adjacent:${pair}`], overlay));
  }

  for (const [fileName, overlay] of Object.entries(SPECIAL_SAMPLES)) {
    const category = fileName.startsWith("cross-mother") ? "cross-mother" : "dual-mother";
    samples.push(makeSample(fileName, [category], overlay));
  }

  return samples;
}

function makeSample(fileName, categories, overlay) {
  const features = { ...BASE_FEATURES, ...overlay };
  const missingFields = FIELD_NAMES.filter((field) => !(field in features));
  if (missingFields.length > 0) {
    throw new Error(`${fileName} is missing fields: ${missingFields.join(", ")}`);
  }
  return {
    id: fileName.replace(".json", ""),
    fileName,
    categories,
    features,
  };
}

function m8Base(overlay) {
  return {
    CHUAN_PALM: 1,
    HEART_LINE_DEPTH: 2,
    HEAD_LINE_END_FORK: 1,
    LINE_COMPLEXITY: 2,
    MOUNT_LUNA: 1,
    MOUNT_MERCURY: 1,
    HEAD_LINE_SLOPE: 2,
    FINGERTIP_SHAPE: 2,
    ...overlay,
  };
}

function writeFixtures(samples) {
  fs.mkdirSync(fixtureDir, { recursive: true });
  for (const sample of samples) {
    fs.writeFileSync(path.join(fixtureDir, sample.fileName), `${JSON.stringify(sample.features, null, 2)}\n`, "utf8");
  }
}

function runSample(sample) {
  const result = matchPersona(sample.features);
  const gap = result.top3 && result.top3.length >= 2 ? Number(Math.abs(result.top3[0].score - result.top3[1].score).toFixed(4)) : null;
  return {
    sample_id: sample.id,
    file_name: sample.fileName,
    categories: sample.categories,
    result,
    final_mother: result.primary_mother ? result.primary_mother.id : null,
    final_persona: result.primary_persona ? result.primary_persona.id : null,
    top3: result.top3 || [],
    top1_top2_gap: gap,
    adjacent_pair: result.correction && result.correction.adjacent_detail && result.correction.adjacent_detail.pair
      ? result.correction.adjacent_detail.pair.join("/")
      : null,
    adjacent_applied: Boolean(result.correction && result.correction.adjacent_applied),
    cross_mother_checked: Boolean(result.correction && result.correction.cross_mother_checked),
    cross_mother_applied: Boolean(result.correction && result.correction.cross_mother_applied),
  };
}

function buildSummary(rows) {
  const total = rows.length;
  const motherCounts = Object.fromEntries(Object.keys(MOTHER_NAMES).map((id) => [id, 0]));
  const personaCounts = Object.fromEntries(PERSONAS.map((persona) => [persona.id, 0]));
  const top3Coverage = Object.fromEntries(PERSONAS.map((persona) => [persona.id, 0]));
  const adjacentPairCounts = Object.fromEntries(ADJACENT_RULES.map((rule) => [`${rule.personaA}/${rule.personaB}`, 0]));

  let adjacentAppliedCount = 0;
  let crossCheckedCount = 0;
  let crossAppliedCount = 0;
  const gaps = [];

  for (const row of rows) {
    if (row.final_mother) {
      motherCounts[row.final_mother] += 1;
    }
    if (row.final_persona) {
      personaCounts[row.final_persona] += 1;
    }
    for (const candidate of row.top3) {
      if (candidate.persona_id in top3Coverage) {
        top3Coverage[candidate.persona_id] += 1;
      }
    }
    if (row.top1_top2_gap !== null) {
      gaps.push(row.top1_top2_gap);
    }
    if (row.adjacent_applied) {
      adjacentAppliedCount += 1;
      if (row.adjacent_pair && row.adjacent_pair in adjacentPairCounts) {
        adjacentPairCounts[row.adjacent_pair] += 1;
      }
    }
    if (row.cross_mother_checked) {
      crossCheckedCount += 1;
    }
    if (row.cross_mother_applied) {
      crossAppliedCount += 1;
    }
  }

  const personaEntries = Object.entries(personaCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top10PersonaShare = personaEntries.slice(0, 10).reduce((sum, [, count]) => sum + count, 0) / total;
  const closeGapCount = gaps.filter((gap) => gap < 0.15).length;

  const summary = {
    total_samples: total,
    mother_distribution: distribution(motherCounts, total),
    persona_distribution: distribution(personaCounts, total),
    top3_coverage: distribution(top3Coverage, total),
    zero_hit_personas: Object.entries(personaCounts).filter(([, count]) => count === 0).map(([id]) => id),
    high_frequency_personas_top10: personaEntries.slice(0, 10).map(([id, count]) => ({ id, count, percent: percent(count, total) })),
    high_frequency_mothers_top8: Object.entries(motherCounts).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count, percent: percent(count, total) })),
    top1_top2_average_gap: gaps.length ? Number((gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length).toFixed(4)) : null,
    top1_top2_min_gap: gaps.length ? Math.min(...gaps) : null,
    top1_top2_gap_lt_015_count: closeGapCount,
    adjacent_applied_count: adjacentAppliedCount,
    adjacent_pair_counts: adjacentPairCounts,
    cross_mother_checked_count: crossCheckedCount,
    cross_mother_applied_count: crossAppliedCount,
    risks: [],
  };
  summary.risks = buildRisks(summary, total, top10PersonaShare);
  return summary;
}

function buildRisks(summary, total, top10PersonaShare) {
  const risks = [];
  for (const item of summary.mother_distribution) {
    if (item.percent_value > 35) {
      risks.push({ level: "RED", code: "MOTHER_OVER_35_PERCENT", message: `${item.id} mother share is ${item.percent}%.` });
    } else if (item.percent_value > 25) {
      risks.push({ level: "WARNING", code: "MOTHER_OVER_25_PERCENT", message: `${item.id} mother share is ${item.percent}%.` });
    }
    if (item.percent_value < 5) {
      risks.push({ level: "WARNING", code: "MOTHER_UNDER_5_PERCENT", message: `${item.id} mother share is ${item.percent}%.` });
    }
  }

  for (const item of summary.persona_distribution) {
    if (item.count === 0) {
      risks.push({ level: "WARNING", code: "PERSONA_ZERO_HIT", message: `${item.id} has zero final hits.` });
    } else if (item.percent_value > 15) {
      risks.push({ level: "RED", code: "PERSONA_OVER_15_PERCENT", message: `${item.id} persona share is ${item.percent}%.` });
    } else if (item.percent_value > 10) {
      risks.push({ level: "WARNING", code: "PERSONA_OVER_10_PERCENT", message: `${item.id} persona share is ${item.percent}%.` });
    }
  }

  if (top10PersonaShare > 0.8) {
    risks.push({ level: "RED", code: "TOP10_PERSONAS_OVER_80_PERCENT", message: `Top 10 personas cover ${percent(top10PersonaShare * total, total)}% of samples.` });
  }
  if (summary.top1_top2_gap_lt_015_count / total > 0.3) {
    risks.push({ level: "WARNING", code: "MANY_CLOSE_TOP1_TOP2", message: `${summary.top1_top2_gap_lt_015_count} samples have Top1/Top2 gap < 0.15.` });
  }
  if (summary.top1_top2_average_gap !== null && summary.top1_top2_average_gap > 0.5) {
    risks.push({ level: "WARNING", code: "TOP3_GAP_TOO_LARGE", message: `Average Top1/Top2 gap is ${summary.top1_top2_average_gap}.` });
  }

  for (const [pair, count] of Object.entries(summary.adjacent_pair_counts)) {
    if (count / total > 0.1) {
      risks.push({ level: "WARNING", code: "ADJACENT_PAIR_FREQUENT", message: `${pair} triggered ${count} times.` });
    }
    if (count === 0) {
      risks.push({ level: "WARNING", code: "ADJACENT_PAIR_ZERO_TRIGGER", message: `${pair} did not trigger in final match output; check sample coverage before treating this as a rule issue.` });
    }
  }

  if (summary.cross_mother_applied_count / total > 0.2) {
    risks.push({ level: "WARNING", code: "CROSS_MOTHER_HIGH_RATE", message: `Cross-mother correction applied ${summary.cross_mother_applied_count} times.` });
  }
  if (summary.cross_mother_applied_count === 0) {
    risks.push({ level: "INFO", code: "CROSS_MOTHER_ZERO_APPLIED", message: "Cross-mother correction did not apply in this sample set." });
  }

  return risks;
}

function distribution(counts, total) {
  return Object.entries(counts).map(([id, count]) => ({
    id,
    count,
    percent: percent(count, total),
    percent_value: Number(percent(count, total)),
  }));
}

function percent(count, total) {
  return total === 0 ? "0.00" : ((count / total) * 100).toFixed(2);
}

function writeReport(rows, summary) {
  const lines = [];
  lines.push("# Palmmi Stage 3I Distribution Simulation Report");
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("- Deterministic 33-field JSON fixtures only.");
  lines.push("- No VLM call, no API call, no UI change.");
  lines.push("- 3H `matchPersona` / Top3 output is used as-is.");
  lines.push("- 3I is diagnostic only; it does not tune weights or force distribution balance.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total samples: ${summary.total_samples}`);
  lines.push(`- Zero-hit personas: ${summary.zero_hit_personas.length ? summary.zero_hit_personas.join(", ") : "none"}`);
  lines.push(`- Top1/Top2 average gap: ${summary.top1_top2_average_gap}`);
  lines.push(`- Top1/Top2 min gap: ${summary.top1_top2_min_gap}`);
  lines.push(`- Top1/Top2 gap < 0.15 count: ${summary.top1_top2_gap_lt_015_count}`);
  lines.push(`- Adjacent applied count: ${summary.adjacent_applied_count}`);
  lines.push(`- Cross-mother checked count: ${summary.cross_mother_checked_count}`);
  lines.push(`- Cross-mother applied count: ${summary.cross_mother_applied_count}`);
  lines.push("");
  lines.push("## Mother Distribution");
  lines.push("");
  lines.push(table(["Mother", "Name", "Count", "Percent"], summary.mother_distribution.map((item) => [item.id, MOTHER_NAMES[item.id], item.count, `${item.percent}%`])));
  lines.push("");
  lines.push("## Persona Distribution");
  lines.push("");
  lines.push(table(["Persona", "Name", "Count", "Percent"], summary.persona_distribution.map((item) => {
    const persona = PERSONAS.find((entry) => entry.id === item.id);
    return [item.id, persona.name, item.count, `${item.percent}%`];
  })));
  lines.push("");
  lines.push("## High Frequency Personas Top 10");
  lines.push("");
  lines.push(table(["Persona", "Count", "Percent"], summary.high_frequency_personas_top10.map((item) => [item.id, item.count, `${item.percent}%`])));
  lines.push("");
  lines.push("## High Frequency Mothers Top 8");
  lines.push("");
  lines.push(table(["Mother", "Count", "Percent"], summary.high_frequency_mothers_top8.map((item) => [item.id, item.count, `${item.percent}%`])));
  lines.push("");
  lines.push("## Top3 Coverage");
  lines.push("");
  lines.push(table(["Persona", "Top3 Count", "Percent of Samples"], summary.top3_coverage.map((item) => [item.id, item.count, `${item.percent}%`])));
  lines.push("");
  lines.push("## Adjacent Pair Trigger Counts");
  lines.push("");
  lines.push(table(["Pair", "Applied Count"], Object.entries(summary.adjacent_pair_counts).map(([pair, count]) => [pair, count])));
  lines.push("");
  lines.push("## Per Sample Output");
  lines.push("");
  lines.push(table(
    ["Sample", "Categories", "Mother", "Persona", "Top3", "Gap", "Adjacent", "Cross"],
    rows.map((row) => [
      row.file_name,
      row.categories.join("; "),
      row.final_mother || "null",
      row.final_persona || "null",
      row.top3.map((candidate) => `${candidate.persona_id}:${candidate.score}`).join(", "),
      row.top1_top2_gap === null ? "null" : row.top1_top2_gap,
      row.adjacent_pair || "no",
      row.cross_mother_applied ? "applied" : "not_applied",
    ]),
  ));
  lines.push("");
  lines.push("## Risk List");
  lines.push("");
  if (summary.risks.length === 0) {
    lines.push("- No risk markers.");
  } else {
    for (const risk of summary.risks) {
      lines.push(`- ${risk.level} ${risk.code}: ${risk.message}`);
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- A zero-hit adjacent pair can mean the fixture set does not produce a close score under current discrete rule granularity; it is not automatically a rule bug.");
  lines.push("- Warnings are inputs for Stage 3J/3K review. Stage 3I does not change V4.2 scoring or adjacent thresholds.");
  lines.push("");

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
}

function table(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((cell) => String(cell).replace(/\|/g, "/")).join(" | ")} |`);
  }
  return lines.join("\n");
}

function validateStage3IRequirements(samples, rows) {
  const personaTargetCount = samples.filter((sample) => sample.categories.includes("persona-target")).length;
  if (personaTargetCount !== 36) {
    throw new Error(`Expected 36 persona target samples, got ${personaTargetCount}`);
  }

  for (const [mother, personas] of Object.entries(MOTHER_TO_PERSONAS)) {
    const count = samples.filter((sample) => sample.categories.includes(`mother-typical:${mother}`)).length;
    if (count < personas.length) {
      throw new Error(`Mother typical coverage for ${mother} is too low: ${count}`);
    }
  }

  const adjacentCoverage = new Set(samples.flatMap((sample) => sample.categories.filter((category) => category.startsWith("adjacent:"))));
  if (adjacentCoverage.size !== 12) {
    throw new Error(`Expected 12 adjacent boundary samples, got ${adjacentCoverage.size}`);
  }

  const crossSamples = samples.filter((sample) => sample.categories.includes("cross-mother")).length;
  if (crossSamples < 3) {
    throw new Error(`Expected at least 3 cross-mother samples, got ${crossSamples}`);
  }

  const dualSamples = samples.filter((sample) => sample.categories.includes("dual-mother")).length;
  if (dualSamples < 3) {
    throw new Error(`Expected at least 3 dual-mother samples, got ${dualSamples}`);
  }

  const failedRows = rows.filter((row) => !row.result || row.result.status === "RETRY_REQUIRED");
  if (failedRows.length > 0) {
    throw new Error(`Distribution samples must produce match output. Failed: ${failedRows.map((row) => row.file_name).join(", ")}`);
  }

  const byFile = new Map(rows.map((row) => [row.file_name, row]));
  if (!byFile.get("cross-mother-should-apply.json").cross_mother_applied) {
    throw new Error("cross-mother-should-apply.json must apply cross-mother correction");
  }
  if (byFile.get("cross-mother-no-20-percent.json").cross_mother_applied) {
    throw new Error("cross-mother-no-20-percent.json must not apply cross-mother correction");
  }
  if (byFile.get("cross-mother-mother-score-too-low.json").cross_mother_applied) {
    throw new Error("cross-mother-mother-score-too-low.json must not apply cross-mother correction");
  }
  if (!byFile.get("dual-mother-under-15.json").result.is_dual_mother) {
    throw new Error("dual-mother-under-15.json must be marked as dual mother");
  }
  if (byFile.get("dual-mother-over-15.json").result.is_dual_mother) {
    throw new Error("dual-mother-over-15.json must not be marked as dual mother");
  }
  if (byFile.get("dual-mother-low-confidence-boundary.json").result.status !== "LOW_CONFIDENCE") {
    throw new Error("dual-mother-low-confidence-boundary.json must be LOW_CONFIDENCE");
  }
}

main();
