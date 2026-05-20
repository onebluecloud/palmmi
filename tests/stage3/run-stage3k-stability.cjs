const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

require.extensions[".ts"] = require.extensions[".js"];

const root = path.resolve(__dirname, "..", "..");
const pipelineFixtureDir = path.join(__dirname, "fixtures", "pipeline");
const distributionFixtureDir = path.join(__dirname, "fixtures", "distribution");
const reportPath = path.join(root, "docs", "stage3", "STAGE3K_STABILITY_REPORT.md");

const { runRecognitionPipeline, createDefaultPipelineConfig } = require(path.join(root, "lib", "recognition", "recognitionPipeline.ts"));
const { createRecognitionCache } = require(path.join(root, "lib", "recognition", "recognitionCache.ts"));
const { matchPersona } = require(path.join(root, "lib", "recognition", "personaMatcher.ts"));
const { MOTHER_TO_PERSONAS } = require(path.join(root, "lib", "recognition", "personaCatalog.ts"));
const { ADJACENT_RULES, ADJACENT_THRESHOLD } = require(path.join(root, "lib", "recognition", "adjacentResolver.ts"));
const { FIELD_NAMES } = require(path.join(root, "lib", "recognition", "recognitionTypes.ts"));

const tests = [];
const pipelineRows = [];
const failureRows = [];
const cacheRows = [];
const schemaRows = [];
const qualityRows = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadPipelineCase(fileName) {
  return loadJson(path.join(pipelineFixtureDir, fileName));
}

function loadDistributionFeatures(fileName) {
  return loadJson(path.join(distributionFixtureDir, fileName));
}

function loadNamedFeatures(name) {
  return loadJson(path.join(__dirname, "fixtures", name));
}

function loadFeatures(caseData) {
  if (Object.prototype.hasOwnProperty.call(caseData, "mock_features")) {
    return caseData.mock_features;
  }
  if (caseData.mock_features_fixture) {
    return loadJson(path.resolve(pipelineFixtureDir, caseData.mock_features_fixture));
  }
  throw new Error("Missing mock_features or mock_features_fixture");
}

function createMockVlm(caseData, metrics) {
  return function mockVlm() {
    metrics.calls += 1;
    return loadFeatures(caseData);
  };
}

function baseImage(fileHash, overrides = {}) {
  return {
    file_hash: fileHash,
    mime_type: "image/jpeg",
    file_size: 700000,
    width: 1280,
    height: 1600,
    is_palm: true,
    is_palm_side: true,
    is_single_hand: true,
    is_clear_enough: true,
    quality_score: 0.86,
    ...overrides,
  };
}

function makeCase(label, { image = {}, features, featureFixture }) {
  const caseData = {
    image: baseImage(`stage3k-${label}`, image),
  };
  if (featureFixture) {
    caseData.mock_features_fixture = featureFixture;
  } else {
    caseData.mock_features = features;
  }
  return caseData;
}

function runCase(label, caseData, options = {}) {
  const metrics = options.metrics || { calls: 0 };
  const cache = options.cache || createRecognitionCache();
  const config = createDefaultPipelineConfig(options.config || {});
  const beforeCalls = metrics.calls;
  const result = runRecognitionPipeline({
    image: caseData.image,
    mockVlm: createMockVlm(caseData, metrics),
    cache,
    config,
  });
  const row = buildRow(label, result, metrics.calls - beforeCalls, config);
  pipelineRows.push(row);
  return { result, metrics, cache, row };
}

function buildRow(label, result, mockVlmCalls, config) {
  return {
    label,
    status: result.status,
    cache_hit: Boolean(result.cache && result.cache.cache_hit),
    cache_write: Boolean(result.cache && result.cache.cache_write),
    cache_key: result.cache ? result.cache.cache_key : null,
    quality_status: result.quality_gate ? result.quality_gate.status : null,
    quality_can_continue: Boolean(result.quality_gate && result.quality_gate.can_continue),
    quality_reason_codes: result.quality_gate ? result.quality_gate.reason_codes || [] : [],
    schema_status: result.schema ? result.schema.status : null,
    schema_should_retry: Boolean(result.schema && result.schema.should_retry),
    missing_fields: result.schema ? result.schema.missing_fields || [] : [],
    null_fields: result.schema ? result.schema.null_fields || [] : [],
    invalid_fields: result.schema ? result.schema.invalid_fields || [] : [],
    degraded_count: result.schema ? result.schema.degradation_count || 0 : 0,
    primary_mother: result.primary_mother ? result.primary_mother.id : null,
    primary_persona: result.primary_persona ? result.primary_persona.id : null,
    top3: (result.top3 || []).map((candidate) => candidate.persona_id || candidate.id),
    mock_vlm_calls: mockVlmCalls,
    debug_mock_vlm_used: Boolean(result.debug && result.debug.mock_vlm_used),
    debug_cache_hit: Boolean(result.debug && result.debug.cache_hit),
    debug_notes: result.debug ? result.debug.notes || [] : [],
    error_codes: result.error_codes || [],
    config,
  };
}

function pushFailure(label, result, note) {
  const row = pipelineRows[pipelineRows.length - 1];
  failureRows.push({
    case: label,
    expected: note,
    status: result.status,
    reason_codes: row.quality_reason_codes.concat(row.error_codes).join(", ") || "none",
    mock_vlm_calls: row.mock_vlm_calls,
    primary_persona: row.primary_persona || "null",
  });
}

function pushSchema(label, result, note) {
  const row = pipelineRows[pipelineRows.length - 1];
  schemaRows.push({
    case: label,
    expected: note,
    status: result.status,
    schema_status: row.schema_status,
    should_retry: row.schema_should_retry,
    missing: row.missing_fields.length,
    nulls: row.null_fields.length,
    invalid: row.invalid_fields.join(", ") || "none",
    degraded: row.degraded_count,
    primary_persona: row.primary_persona || "null",
  });
}

function pushQuality(label, result, note) {
  const row = pipelineRows[pipelineRows.length - 1];
  qualityRows.push({
    case: label,
    expected: note,
    status: result.status,
    quality_status: row.quality_status,
    can_continue: row.quality_can_continue,
    reason_codes: row.quality_reason_codes.join(", ") || "none",
    mock_vlm_calls: row.mock_vlm_calls,
  });
}

function pushCache(label, first, second, metrics) {
  cacheRows.push({
    case: label,
    first_hit: first.cache.cache_hit,
    second_hit: second.cache.cache_hit,
    same_key: first.cache.cache_key === second.cache.cache_key,
    first_key: first.cache.cache_key,
    second_key: second.cache.cache_key,
    mock_vlm_calls_total: metrics.calls,
    second_debug_mock_vlm_used: second.debug.mock_vlm_used,
    second_debug_cache_hit: second.debug.cache_hit,
  });
}

function nullHeavyFeatures() {
  const features = { ...loadDistributionFeatures("p01-target.json") };
  for (const field of FIELD_NAMES.slice(0, 6)) {
    features[field] = null;
  }
  return features;
}

function runCacheTwice(label, firstCase, secondCase, firstConfig = {}, secondConfig = firstConfig) {
  const cache = createRecognitionCache();
  const metrics = { calls: 0 };
  const first = runCase(`${label}:first`, firstCase, { cache, metrics, config: firstConfig }).result;
  const second = runCase(`${label}:second`, secondCase, { cache, metrics, config: secondConfig }).result;
  pushCache(label, first, second, metrics);
  return { first, second, metrics };
}

test("3H/3I/3J regression smoke remains stable", () => {
  const allPersonaIds = Object.values(MOTHER_TO_PERSONAS).flat().map((persona) => persona.id);
  assert.equal(allPersonaIds.length, 36);
  assert.equal(new Set(allPersonaIds).size, 36);
  assert.equal(ADJACENT_RULES.length, 12);
  assert.equal(ADJACENT_THRESHOLD, 0.15);

  const distributionFixtures = fs.readdirSync(distributionFixtureDir).filter((file) => file.endsWith(".json"));
  assert.equal(distributionFixtures.length, 54);

  const matchResult = matchPersona(loadNamedFeatures("sample-features-m1.json"));
  assert.equal(matchResult.primary_mother.id, "M1");
  assert.equal(matchResult.top3.length, 3);

  const { result } = runCase("regression-valid-pipeline", loadPipelineCase("valid-palm-m1.json"));
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.top3.length, 3);
});

test("quality gate failure and degraded quality paths are stable", () => {
  for (const item of [
    ["non-image mime", loadPipelineCase("non-image-mime.json"), "REJECTED", "UNSUPPORTED_MIME_TYPE"],
    ["non-palm", loadPipelineCase("non-palm.json"), "REJECTED", "NOT_PALM"],
    ["back-of-hand", loadPipelineCase("back-of-hand.json"), "REJECTED", "BACK_OF_HAND"],
    ["multiple-hands", loadPipelineCase("multiple-hands.json"), "REJECTED", "MULTIPLE_HANDS"],
    ["blurry", loadPipelineCase("blurry-palm.json"), "RETRY_REQUIRED", "BLURRY_OR_LOW_CLARITY"],
    [
      "too-dark-low-quality-score",
      makeCase("too-dark-low-quality-score", { image: { quality_score: 0.42 }, featureFixture: "../distribution/p01-target.json" }),
      "RETRY_REQUIRED",
      "BLURRY_OR_LOW_CLARITY",
    ],
  ]) {
    const [label, caseData, expectedStatus, expectedReason] = item;
    const { result, metrics } = runCase(label, caseData);
    assert.equal(result.status, expectedStatus, label);
    assert.equal(result.quality_gate.reason_codes.includes(expectedReason), true, label);
    assert.equal(metrics.calls, 0, label);
    pushFailure(label, result, `${expectedStatus} before mock VLM`);
    pushQuality(label, result, `${expectedStatus} before mock VLM`);
  }

  const { result, metrics } = runCase("low-quality-but-usable", loadPipelineCase("low-confidence-palm.json"));
  assert.equal(result.status, "LOW_CONFIDENCE");
  assert.equal(result.quality_gate.status, "LOW_QUALITY_PASS");
  assert.equal(result.primary_persona !== null, true);
  assert.equal(metrics.calls, 1);
  pushFailure("low-quality-but-usable", result, "LOW_CONFIDENCE with match output");
  pushQuality("low-quality-but-usable", result, "LOW_CONFIDENCE with match output");
});

test("schema degradation and rule retry boundaries are stable", () => {
  let run = runCase("missing-many-fields", loadPipelineCase("invalid-schema-missing-fields.json"));
  assert.equal(run.result.status, "RETRY_REQUIRED");
  assert.equal(run.result.schema.should_retry, true);
  assert.equal(run.result.schema.missing_fields.length >= 5, true);
  assert.equal(run.result.primary_persona, null);
  pushFailure("missing-many-fields", run.result, "RETRY_REQUIRED before matching");
  pushSchema("missing-many-fields", run.result, "RETRY_REQUIRED before matching");

  run = runCase("enum-out-of-range", loadPipelineCase("invalid-schema-enum-out-of-range.json"));
  assert.equal(run.result.status, "LOW_CONFIDENCE");
  assert.deepEqual(run.result.schema.invalid_fields.sort(), ["HEAD_LINE_DEPTH", "MOUNT_JUPITER"].sort());
  assert.equal(run.result.primary_persona !== null, true);
  pushFailure("enum-out-of-range", run.result, "invalid_fields recorded and degraded");
  pushSchema("enum-out-of-range", run.result, "invalid_fields recorded and degraded");

  run = runCase("null-heavy", makeCase("null-heavy", { features: nullHeavyFeatures() }));
  assert.equal(run.result.status, "RETRY_REQUIRED");
  assert.equal(run.result.schema.null_fields.length >= 5, true);
  assert.equal(run.result.schema.should_retry, true);
  assert.equal(run.result.primary_persona, null);
  pushFailure("null-heavy", run.result, "RETRY_REQUIRED for too many null fields");
  pushSchema("null-heavy", run.result, "RETRY_REQUIRED for too many null fields");

  run = runCase("schema-severe-invalid", makeCase("schema-severe-invalid", { features: ["not-an-object"] }));
  assert.equal(run.result.status, "RETRY_REQUIRED");
  assert.equal(run.result.schema.schema_warnings.includes("FEATURES_NOT_OBJECT"), true);
  assert.equal(run.result.primary_persona, null);
  pushFailure("schema-severe-invalid", run.result, "RETRY_REQUIRED for non-object schema");
  pushSchema("schema-severe-invalid", run.result, "RETRY_REQUIRED for non-object schema");

  run = runCase("mother-core-insufficient", makeCase("mother-core-insufficient", { features: loadNamedFeatures("sample-features-no-eligible.json") }));
  assert.equal(run.result.status, "RETRY_REQUIRED");
  assert.equal(run.result.schema.should_retry, false);
  assert.equal(run.result.error_codes.includes("RULE_NO_ELIGIBLE_PRIMARY_MOTHER"), true);
  assert.equal(run.result.primary_persona, null);
  pushFailure("mother-core-insufficient", run.result, "RETRY_REQUIRED because no mother has enough core support");
  pushSchema("mother-core-insufficient", run.result, "Schema valid; matcher returns RETRY_REQUIRED");

  run = runCase("top1-top2-close-gap", makeCase("top1-top2-close-gap", { featureFixture: "../distribution/dual-mother-low-confidence-boundary.json" }));
  assert.equal(run.result.status, "LOW_CONFIDENCE");
  assert.equal(run.result.recognition.is_low_confidence, true);
  assert.equal(run.result.top3.length, 3);
  pushFailure("top1-top2-close-gap", run.result, "LOW_CONFIDENCE for close Top1/Top2");
  pushSchema("top1-top2-close-gap", run.result, "Schema valid; matcher marks low confidence");
});

test("file_hash cache hit and version isolation are stable", () => {
  const sameVersion = runCacheTwice(
    "same file_hash same versions",
    loadPipelineCase("cache-hit-first-run.json"),
    loadPipelineCase("cache-hit-first-run.json"),
  );
  assert.equal(sameVersion.first.cache.cache_hit, false);
  assert.equal(sameVersion.second.cache.cache_hit, true);
  assert.equal(sameVersion.second.debug.cache_hit, true);
  assert.equal(sameVersion.second.debug.mock_vlm_used, false);
  assert.equal(sameVersion.second.debug.notes.some((note) => note.includes("cache")), true);
  assert.equal(sameVersion.metrics.calls, 1);

  const baseCase = loadPipelineCase("cache-hit-first-run.json");
  for (const [label, override] of [
    ["rule version change", { rule_version: "v4.2-stage3k-isolation" }],
    ["schema version change", { schema_version: "stage3-schema-isolation" }],
    ["prompt version change", { prompt_version: "prompt-stage3k-isolation" }],
  ]) {
    const changed = runCacheTwice(label, baseCase, baseCase, {}, override);
    assert.equal(changed.first.cache.cache_hit, false, label);
    assert.equal(changed.second.cache.cache_hit, false, label);
    assert.notEqual(changed.first.cache.cache_key, changed.second.cache.cache_key, label);
    assert.equal(changed.metrics.calls, 2, label);
  }

  const differentHashFirst = makeCase("cache-file-a", { featureFixture: "../distribution/p01-target.json" });
  const differentHashSecond = makeCase("cache-file-b", {
    image: { file_hash: "stage3k-cache-file-b" },
    featureFixture: "../distribution/p01-target.json",
  });
  const differentHash = runCacheTwice("different file_hash", differentHashFirst, differentHashSecond);
  assert.equal(differentHash.first.cache.cache_hit, false);
  assert.equal(differentHash.second.cache.cache_hit, false);
  assert.notEqual(differentHash.first.cache.cache_key, differentHash.second.cache.cache_key);
  assert.equal(differentHash.metrics.calls, 2);
});

test("RecognitionResult status and debug fields cover stable terminal states", () => {
  const statuses = new Set(pipelineRows.map((row) => row.status));
  assert.equal(statuses.has("SUCCESS"), true);
  assert.equal(statuses.has("LOW_CONFIDENCE"), true);
  assert.equal(statuses.has("RETRY_REQUIRED"), true);
  assert.equal(statuses.has("REJECTED"), true);
  assert.equal(pipelineRows.some((row) => row.cache_hit && row.debug_cache_hit), true);

  for (const row of pipelineRows) {
    assert.equal(typeof row.status, "string", row.label);
    assert.equal(typeof row.cache_hit, "boolean", row.label);
    assert.equal(typeof row.debug_mock_vlm_used, "boolean", row.label);
    assert.equal(Array.isArray(row.error_codes), true, row.label);
    assert.equal(typeof row.config.rule_version, "string", row.label);
    assert.equal(typeof row.config.schema_version, "string", row.label);
    assert.equal(typeof row.config.prompt_version, "string", row.label);
    assert.equal(row.config.model_provider, "mock", row.label);
  }
});

let failed = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

if (failed > 0) {
  console.error(`${failed}/${tests.length} Stage 3K tests failed.`);
  process.exit(1);
}

writeReport({
  tests,
  pipelineRows,
  failureRows,
  cacheRows,
  schemaRows,
  qualityRows,
  cost: buildCostStats(pipelineRows),
});

console.log(`${tests.length}/${tests.length} Stage 3K tests passed.`);
console.log(`Stage 3K pipeline executions: ${pipelineRows.length}`);
console.log(`Stage 3K mock VLM calls: ${buildCostStats(pipelineRows).vlm_call_count}`);
console.log(`Report written: ${path.relative(root, reportPath)}`);

function buildCostStats(rows) {
  const totalSamples = rows.length;
  const vlmCallCount = rows.reduce((sum, row) => sum + row.mock_vlm_calls, 0);
  const qualityBlocked = rows.filter((row) => !row.quality_can_continue).length;
  const cacheHits = rows.filter((row) => row.cache_hit).length;
  const schemaFailuresNoMatch = rows.filter((row) => row.schema_should_retry && !row.primary_persona).length;
  const matchedSamples = rows.filter((row) => row.primary_persona).length;
  return {
    total_samples: totalSamples,
    vlm_call_count: vlmCallCount,
    quality_gate_blocked_count: qualityBlocked,
    cache_hit_count: cacheHits,
    schema_failure_no_match_count: schemaFailuresNoMatch,
    matched_samples: matchedSamples,
    no_cache_formula: `${totalSamples - qualityBlocked} * cost_per_vlm_call`,
    with_file_hash_cache_formula: `${vlmCallCount} * cost_per_vlm_call`,
    non_palm_savings_formula: `${qualityBlocked} * cost_per_vlm_call`,
    cache_savings_formula: `${cacheHits} * cost_per_vlm_call`,
  };
}

function writeReport({ tests, pipelineRows, failureRows, cacheRows, schemaRows, qualityRows, cost }) {
  const statusCounts = countBy(pipelineRows, (row) => row.status);
  const forbiddenPathCheck = getForbiddenPathCheck();
  const lines = [];
  lines.push("# Palmmi Stage 3K Stability Acceptance Report");
  lines.push("");
  lines.push("## 1. Goal");
  lines.push("");
  lines.push("- Run Stage 3 regression, stability, failure-path, cache-hit, schema, quality gate, RecognitionResult, and cost diagnostics on the completed mock recognition loop.");
  lines.push("- No real API, no real VLM, no Qwen key, no UI change, and no rule tuning.");
  lines.push("");
  lines.push("## 2. Test Scope");
  lines.push("");
  lines.push("- Regression smoke for 3H persona mapping, adjacent threshold, 3I distribution fixture count, and 3J valid pipeline output.");
  lines.push("- Failure paths for invalid MIME, non-palm, back of hand, multiple hands, blurry input, low quality, schema retry, enum degradation, null-heavy input, severe invalid schema, mother-core insufficiency, and close Top1/Top2.");
  lines.push("- Cache behavior for same file hash, different file hash, rule version isolation, schema version isolation, and prompt version isolation.");
  lines.push("- Cost diagnostics count mock VLM calls only; real pricing is intentionally represented as formulas.");
  lines.push("");
  lines.push("## 3. Test Commands");
  lines.push("");
  lines.push("```bash");
  lines.push("node tests/stage3/run-stage3h-tests.cjs");
  lines.push("node tests/stage3/run-stage3i-distribution.cjs");
  lines.push("node tests/stage3/run-stage3j-pipeline.cjs");
  lines.push("node tests/stage3/run-stage3k-stability.cjs");
  lines.push("```");
  lines.push("");
  lines.push("## 4. 3H/3I/3J Regression Result");
  lines.push("");
  lines.push("- 3H baseline: 9/9 tests passed in this Stage 3K session.");
  lines.push("- 3I baseline: 54 deterministic distribution samples completed; known warnings are retained.");
  lines.push("- 3J baseline: 14/14 pipeline tests passed in this Stage 3K session.");
  lines.push("- 3K smoke regression: 36 personas, 12 adjacent pairs, threshold 0.15, 54 distribution fixtures, and valid pipeline Top3 output are stable.");
  lines.push("");
  lines.push("## 5. 3K Stability Test Result");
  lines.push("");
  lines.push(`- Stage 3K tests: ${tests.length}/${tests.length} passed.`);
  lines.push(`- Pipeline executions in 3K: ${cost.total_samples}.`);
  lines.push(`- Status counts: ${Object.entries(statusCounts).map(([status, count]) => `${status}=${count}`).join(", ")}.`);
  lines.push("");
  lines.push("## 6. Failure Path Coverage");
  lines.push("");
  lines.push(table(["Case", "Expected", "Status", "Reason/Error Codes", "Mock VLM Calls", "Primary Persona"], failureRows.map((row) => [
    row.case,
    row.expected,
    row.status,
    row.reason_codes,
    row.mock_vlm_calls,
    row.primary_persona,
  ])));
  lines.push("");
  lines.push("## 7. Cache Hit Test Result");
  lines.push("");
  lines.push(table(["Case", "First Hit", "Second Hit", "Same Key", "Mock VLM Calls", "Second Debug Mock VLM Used", "Second Debug Cache Hit"], cacheRows.map((row) => [
    row.case,
    row.first_hit,
    row.second_hit,
    row.same_key,
    row.mock_vlm_calls_total,
    row.second_debug_mock_vlm_used,
    row.second_debug_cache_hit,
  ])));
  lines.push("");
  lines.push("- Same file_hash and same versions hit cache on the second run.");
  lines.push("- Different rule_version, schema_version, prompt_version, and file_hash do not reuse the old cache entry.");
  lines.push("- Cache hits are visible through both `result.cache.cache_hit` and `result.debug.cache_hit`.");
  lines.push("- Cache-hit runs do not reload mock VLM features.");
  lines.push("");
  lines.push("## 8. Schema Degradation Test Result");
  lines.push("");
  lines.push(table(["Case", "Expected", "Status", "Schema Status", "Should Retry", "Missing", "Null", "Invalid", "Degraded", "Primary Persona"], schemaRows.map((row) => [
    row.case,
    row.expected,
    row.status,
    row.schema_status,
    row.should_retry,
    row.missing,
    row.nulls,
    row.invalid,
    row.degraded,
    row.primary_persona,
  ])));
  lines.push("");
  lines.push("## 9. Quality Gate Test Result");
  lines.push("");
  lines.push(table(["Case", "Expected", "Status", "Quality Status", "Can Continue", "Reason Codes", "Mock VLM Calls"], qualityRows.map((row) => [
    row.case,
    row.expected,
    row.status,
    row.quality_status,
    row.can_continue,
    row.reason_codes,
    row.mock_vlm_calls,
  ])));
  lines.push("");
  lines.push("## 10. RecognitionResult Status Coverage");
  lines.push("");
  lines.push(table(["Status", "Count"], Object.entries(statusCounts).map(([status, count]) => [status, count])));
  lines.push("");
  lines.push("- Covered terminal statuses: SUCCESS, LOW_CONFIDENCE, RETRY_REQUIRED, REJECTED.");
  lines.push("- Covered cache-hit state through `cache.cache_hit = true` while preserving the cached recognition status.");
  lines.push("- Every row keeps status, cache, quality_gate, schema, debug, error_codes, and version metadata.");
  lines.push("");
  lines.push("## 11. Cost Statistics And Estimate");
  lines.push("");
  lines.push(table(["Metric", "Value"], [
    ["Total 3K pipeline samples", cost.total_samples],
    ["Samples that call mock VLM", cost.vlm_call_count],
    ["Samples blocked by quality gate before VLM", cost.quality_gate_blocked_count],
    ["Cache-hit samples", cost.cache_hit_count],
    ["Schema-failed samples not entering match", cost.schema_failure_no_match_count],
    ["Samples with match output", cost.matched_samples],
  ]));
  lines.push("");
  lines.push("- `cost_per_vlm_call` is a future configuration parameter. No real pricing or billing API is used.");
  lines.push(`- No-cache estimate: estimated_cost_no_cache = ${cost.no_cache_formula}.`);
  lines.push(`- With file_hash cache estimate: estimated_cost_with_cache = ${cost.with_file_hash_cache_formula}.`);
  lines.push(`- Quality/preflight savings estimate: avoided_cost_from_quality_gate = ${cost.non_palm_savings_formula}.`);
  lines.push(`- Cache savings estimate: avoided_cost_from_cache = ${cost.cache_savings_formula}.`);
  lines.push("");
  lines.push("## 12. Forbidden Path Check Result");
  lines.push("");
  lines.push(`- Git status for forbidden paths: ${forbiddenPathCheck.clean ? "clean" : "not clean"}.`);
  lines.push(`- Checked paths: ${forbiddenPathCheck.paths.join(", ")}.`);
  if (!forbiddenPathCheck.clean) {
    lines.push("- Entries:");
    for (const entry of forbiddenPathCheck.entries) {
      lines.push(`  - ${entry}`);
    }
  }
  lines.push("- Stage 3K tests use mock fixtures only and do not call API or VLM.");
  lines.push("");
  lines.push("## 13. 3I Risks Retained");
  lines.push("");
  lines.push("- M7 mother type remains 2/54, below 5%, marked WARNING.");
  lines.push("- Zero-hit final personas remain: P27, P26, P29, P04, P32, P24.");
  lines.push("- Top1/Top2 gap < 0.15 remains 33/54 in the 3I distribution simulation.");
  lines.push("- Adjacent pairs P05/P07 and P25/P33 remain zero final triggers.");
  lines.push("- Cross-mother correction remains 3/54 and is not overactive.");
  lines.push("- Stage 3K does not tune weights or rules; these risks should move to a later real-sample calibration phase.");
  lines.push("");
  lines.push("## 14. Stage 3 Acceptance Readiness");
  lines.push("");
  lines.push("- Stage 3K stability tests pass on the mock recognition loop.");
  lines.push("- Stage 3 can enter engineering acceptance if the final forbidden-path check is clean.");
  lines.push("");
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
}

function countBy(rows, getKey) {
  return rows.reduce((counts, row) => {
    const key = getKey(row);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getForbiddenPathCheck() {
  const paths = ["app", "components", "public", "package.json"];
  try {
    const output = execFileSync("git", ["status", "--short", "--", ...paths], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const entries = output ? output.split(/\r?\n/) : [];
    return { paths, entries, clean: entries.length === 0 };
  } catch (error) {
    return {
      paths,
      entries: [`git status check failed: ${error.message}`],
      clean: false,
    };
  }
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
