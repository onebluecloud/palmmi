const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

require.extensions[".ts"] = require.extensions[".js"];

const root = path.resolve(__dirname, "..", "..");
const fixtureDir = path.join(__dirname, "fixtures", "pipeline");
const reportPath = path.join(root, "docs", "stage3", "STAGE3J_PIPELINE_REPORT.md");

const { runRecognitionPipeline, createDefaultPipelineConfig } = require(path.join(root, "lib", "recognition", "recognitionPipeline.ts"));
const { createRecognitionCache } = require(path.join(root, "lib", "recognition", "recognitionCache.ts"));

const tests = [];
const reportRows = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function loadPipelineCase(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), "utf8"));
}

function loadFeatures(caseData) {
  if (caseData.mock_features) {
    return caseData.mock_features;
  }
  const fixturePath = path.resolve(fixtureDir, caseData.mock_features_fixture);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function createMockVlm(caseData, metrics) {
  return function mockVlm() {
    metrics.calls += 1;
    return loadFeatures(caseData);
  };
}

function runCase(fileName, options = {}) {
  const caseData = loadPipelineCase(fileName);
  const metrics = options.metrics || { calls: 0 };
  const cache = options.cache || createRecognitionCache();
  const config = createDefaultPipelineConfig(options.config || {});
  const result = runRecognitionPipeline({
    image: caseData.image,
    mockVlm: createMockVlm(caseData, metrics),
    cache,
    config,
  });
  if (!options.skipReport) {
    reportRows.push({ fileName, result, mockVlmCalls: metrics.calls });
  }
  return { result, metrics, cache };
}

test("valid palm image runs full pipeline and returns Top3", () => {
  const { result, metrics } = runCase("valid-palm-m1.json");
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.cache.cache_hit, false);
  assert.equal(result.cache.cache_write, true);
  assert.equal(result.debug.mock_vlm_used, true);
  assert.equal(metrics.calls, 1);
  assert.ok(result.primary_mother);
  assert.ok(result.primary_persona);
  assert.equal(result.top3.length, 3);
});

test("second valid palm image can run through another mother/persona path", () => {
  const { result } = runCase("valid-palm-m2.json");
  assert.match(result.status, /^(SUCCESS|LOW_CONFIDENCE)$/);
  assert.ok(result.primary_mother);
  assert.ok(result.primary_persona);
  assert.equal(result.top3.length, 3);
});

test("non-palm image is rejected before mock VLM", () => {
  const { result, metrics } = runCase("non-palm.json");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.quality_gate.reason_codes.includes("NOT_PALM"), true);
  assert.equal(metrics.calls, 0);
});

test("back-of-hand image is rejected before mock VLM", () => {
  const { result, metrics } = runCase("back-of-hand.json");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.quality_gate.reason_codes.includes("BACK_OF_HAND"), true);
  assert.equal(metrics.calls, 0);
});

test("multiple hands image is rejected before mock VLM", () => {
  const { result, metrics } = runCase("multiple-hands.json");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.quality_gate.reason_codes.includes("MULTIPLE_HANDS"), true);
  assert.equal(metrics.calls, 0);
});

test("blurry palm requires retry before mock VLM", () => {
  const { result, metrics } = runCase("blurry-palm.json");
  assert.equal(result.status, "RETRY_REQUIRED");
  assert.equal(result.quality_gate.reason_codes.includes("BLURRY_OR_LOW_CLARITY"), true);
  assert.equal(metrics.calls, 0);
});

test("low quality but usable palm returns LOW_CONFIDENCE with match output", () => {
  const { result, metrics } = runCase("low-confidence-palm.json");
  assert.equal(result.status, "LOW_CONFIDENCE");
  assert.equal(result.quality_gate.status, "LOW_QUALITY_PASS");
  assert.equal(metrics.calls, 1);
  assert.ok(result.primary_persona);
  assert.equal(result.top3.length, 3);
});

test("oversized image metadata is rejected by input limits", () => {
  const { result, metrics } = runCase("oversized-image.json");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.quality_gate.reason_codes.includes("FILE_TOO_LARGE"), true);
  assert.equal(metrics.calls, 0);
});

test("non-image mime type is rejected", () => {
  const { result, metrics } = runCase("non-image-mime.json");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.quality_gate.reason_codes.includes("UNSUPPORTED_MIME_TYPE"), true);
  assert.equal(metrics.calls, 0);
});

test("missing fields trigger schema retry and do not enter persona matching", () => {
  const { result, metrics } = runCase("invalid-schema-missing-fields.json");
  assert.equal(result.status, "RETRY_REQUIRED");
  assert.equal(metrics.calls, 1);
  assert.ok(result.schema.missing_fields.length >= 5);
  assert.equal(result.schema.should_retry, true);
  assert.equal(result.primary_persona, null);
});

test("enum out-of-range fields degrade to defaults and keep warnings", () => {
  const { result, metrics } = runCase("invalid-schema-enum-out-of-range.json");
  assert.equal(result.status, "LOW_CONFIDENCE");
  assert.equal(metrics.calls, 1);
  assert.deepEqual(result.schema.invalid_fields.sort(), ["HEAD_LINE_DEPTH", "MOUNT_JUPITER"].sort());
  assert.equal(result.schema.degraded_fields.length, 2);
  assert.ok(result.schema.schema_warnings.length >= 2);
  assert.ok(result.primary_persona);
});

test("same file_hash and same versions hit cache on second run", () => {
  const caseData = loadPipelineCase("cache-hit-first-run.json");
  const cache = createRecognitionCache();
  const metrics = { calls: 0 };
  const config = createDefaultPipelineConfig();
  const first = runRecognitionPipeline({
    image: caseData.image,
    mockVlm: createMockVlm(caseData, metrics),
    cache,
    config,
  });
  const second = runRecognitionPipeline({
    image: caseData.image,
    mockVlm: createMockVlm(caseData, metrics),
    cache,
    config,
  });

  assert.equal(first.cache.cache_hit, false);
  assert.equal(first.cache.cache_write, true);
  assert.equal(second.cache.cache_hit, true);
  assert.equal(second.debug.mock_vlm_used, false);
  assert.equal(metrics.calls, 1);
  assert.equal(second.primary_persona.id, first.primary_persona.id);
  reportRows.push({ fileName: "cache-hit-first-run.json", result: first, mockVlmCalls: metrics.calls });
  reportRows.push({ fileName: "cache-hit-second-run.json", result: second, mockVlmCalls: metrics.calls });
});

test("same file_hash with different rule_version does not reuse cache", () => {
  const caseData = loadPipelineCase("cache-version-change.json");
  const cache = createRecognitionCache();
  const metrics = { calls: 0 };
  const firstConfig = createDefaultPipelineConfig({ rule_version: "v4.2" });
  const secondConfig = createDefaultPipelineConfig({ rule_version: "v4.2-test-version" });
  const first = runRecognitionPipeline({
    image: caseData.image,
    mockVlm: createMockVlm(caseData, metrics),
    cache,
    config: firstConfig,
  });
  const second = runRecognitionPipeline({
    image: caseData.image,
    mockVlm: createMockVlm(caseData, metrics),
    cache,
    config: secondConfig,
  });

  assert.equal(first.cache.cache_hit, false);
  assert.equal(second.cache.cache_hit, false);
  assert.notEqual(first.cache.cache_key, second.cache.cache_key);
  assert.equal(metrics.calls, 2);
});

test("different file_hash does not reuse cache", () => {
  const firstCase = loadPipelineCase("cache-hit-first-run.json");
  const secondCase = loadPipelineCase("cache-different-file-hash.json");
  const cache = createRecognitionCache();
  const metrics = { calls: 0 };
  const config = createDefaultPipelineConfig();
  const first = runRecognitionPipeline({
    image: firstCase.image,
    mockVlm: createMockVlm(firstCase, metrics),
    cache,
    config,
  });
  const second = runRecognitionPipeline({
    image: secondCase.image,
    mockVlm: createMockVlm(secondCase, metrics),
    cache,
    config,
  });

  assert.equal(first.cache.cache_hit, false);
  assert.equal(second.cache.cache_hit, false);
  assert.notEqual(first.cache.cache_key, second.cache.cache_key);
  assert.equal(metrics.calls, 2);
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
  console.error(`${failed}/${tests.length} Stage 3J tests failed.`);
  process.exit(1);
}

writeReport(reportRows);
console.log(`${tests.length}/${tests.length} Stage 3J tests passed.`);
console.log(`Report written: ${path.relative(root, reportPath)}`);

function writeReport(rows) {
  const lines = [];
  lines.push("# Palmmi Stage 3J Pipeline Report");
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("- Stage 3J wires the end-to-end recognition loop with mock VLM features only.");
  lines.push("- No real API, no real VLM call, no UI change, no package change.");
  lines.push("- V4.2 33 fields, 3G mother scoring, 3H persona matching, Top3, adjacent rules, and cross-mother correction are reused as-is.");
  lines.push("");
  lines.push("## End-to-End Flow");
  lines.push("");
  lines.push("```text");
  lines.push("mock image input");
  lines.push("  -> input metadata check");
  lines.push("  -> quality gate / rejection");
  lines.push("  -> file_hash cache lookup");
  lines.push("  -> mock VLM features");
  lines.push("  -> 33-field schema validation");
  lines.push("  -> degradation/default handling");
  lines.push("  -> 8 mother scoring");
  lines.push("  -> primary/secondary mother selection");
  lines.push("  -> primary-mother persona pool matching");
  lines.push("  -> cross-mother correction");
  lines.push("  -> adjacent persona resolution");
  lines.push("  -> Top3 output");
  lines.push("  -> cache write");
  lines.push("  -> RecognitionResult");
  lines.push("```");
  lines.push("");
  lines.push("## Input Output Structure");
  lines.push("");
  lines.push("- Input: mock image metadata plus a deterministic mock features fixture.");
  lines.push("- Output: `RecognitionResult` with `status`, `cache`, `image_input`, `quality_gate`, `schema`, `primary_mother`, `secondary_mother`, `primary_persona`, `top3`, `recognition`, and `debug`.");
  lines.push("");
  lines.push("## Status Definitions");
  lines.push("");
  lines.push("- `SUCCESS`: quality and schema pass, persona match succeeds.");
  lines.push("- `LOW_CONFIDENCE`: low-quality pass, degraded schema fields, or close Top1/Top2 output still returns an entertainment result.");
  lines.push("- `RETRY_REQUIRED`: blurry/low clarity, schema degradation too high, or rule matching cannot produce a reliable result.");
  lines.push("- `REJECTED`: non-image, non-palm, back of hand, multiple hands, or invalid input limits.");
  lines.push("- `CACHE_HIT`: represented by `cache.cache_hit = true`; the result status remains the cached recognition status.");
  lines.push("");
  lines.push("## Cache Behavior");
  lines.push("");
  lines.push("- Cache uses only `file_hash` plus version fields.");
  lines.push("- Version key fields include `schema_version`, `prompt_version`, `rule_version`, `mock_model_version`, `image_normalization_version`, and `degradation_policy_version`.");
  lines.push("- The Stage 3J cache test covers first miss/write, second hit, version change miss, and different file hash miss.");
  lines.push("- No `perceptual_hash` is used.");
  lines.push("");
  lines.push("## Schema Degradation Behavior");
  lines.push("");
  lines.push("- The validator keeps exactly the V4.2 33-field schema.");
  lines.push("- Missing, null, invalid-type, and enum-out-of-range values are normalized to field defaults and recorded.");
  lines.push("- `missing_fields`, `invalid_fields`, `degraded_fields`, `schema_warnings`, and `should_retry` are returned.");
  lines.push("- Too many missing/null/degraded core fields or a continuous degraded run triggers `RETRY_REQUIRED` before persona matching.");
  lines.push("");
  lines.push("## Quality Gate Behavior");
  lines.push("");
  lines.push("- Valid palm images continue to cache and mock VLM.");
  lines.push("- Non-palm, hand-back, multiple-hand, non-image, and oversized inputs are rejected.");
  lines.push("- Blurry or low clarity input returns `RETRY_REQUIRED`.");
  lines.push("- Low-quality but usable input returns `LOW_CONFIDENCE` after matching.");
  lines.push("");
  lines.push("## Test Sample Results");
  lines.push("");
  lines.push(table(["Fixture", "Status", "Cache Hit", "Cache Write", "Primary Mother", "Primary Persona", "Top3", "Mock VLM Calls"], rows.map((row) => {
    const result = row.result;
    return [
      row.fileName,
      result.status,
      result.cache.cache_hit,
      result.cache.cache_write,
      result.primary_mother ? result.primary_mother.id : "null",
      result.primary_persona ? result.primary_persona.id : "null",
      (result.top3 || []).map((candidate) => candidate.id || candidate.persona_id).join(", "),
      row.mockVlmCalls,
    ];
  })));
  lines.push("");
  lines.push("## Known 3I Risks Kept For 3K");
  lines.push("");
  lines.push("- M7 mother share was 2/54, below 5%, marked WARNING.");
  lines.push("- Zero-hit final personas in 3I: `P27`, `P26`, `P29`, `P04`, `P32`, `P24`.");
  lines.push("- Top1/Top2 gap `< 0.15` appeared in 33/54 samples.");
  lines.push("- Adjacent pairs `P05/P07` and `P25/P33` did not trigger in final 3I output.");
  lines.push("- Cross-mother correction applied 3/54 times and was not overactive.");
  lines.push("");
  lines.push("## 3K Readiness");
  lines.push("");
  lines.push("Stage 3J can enter Stage 3K after 3H, 3I, and 3J test commands pass.");
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
