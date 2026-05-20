# Palmmi Stage 3K Stability Acceptance Report

## 1. Goal

- Run Stage 3 regression, stability, failure-path, cache-hit, schema, quality gate, RecognitionResult, and cost diagnostics on the completed mock recognition loop.
- No real API, no real VLM, no Qwen key, no UI change, and no rule tuning.

## 2. Test Scope

- Regression smoke for 3H persona mapping, adjacent threshold, 3I distribution fixture count, and 3J valid pipeline output.
- Failure paths for invalid MIME, non-palm, back of hand, multiple hands, blurry input, low quality, schema retry, enum degradation, null-heavy input, severe invalid schema, mother-core insufficiency, and close Top1/Top2.
- Cache behavior for same file hash, different file hash, rule version isolation, schema version isolation, and prompt version isolation.
- Cost diagnostics count mock VLM calls only; real pricing is intentionally represented as formulas.

## 3. Test Commands

```bash
node tests/stage3/run-stage3h-tests.cjs
node tests/stage3/run-stage3i-distribution.cjs
node tests/stage3/run-stage3j-pipeline.cjs
node tests/stage3/run-stage3k-stability.cjs
```

## 4. 3H/3I/3J Regression Result

- 3H baseline: 9/9 tests passed in this Stage 3K session.
- 3I baseline: 54 deterministic distribution samples completed; known warnings are retained.
- 3J baseline: 14/14 pipeline tests passed in this Stage 3K session.
- 3K smoke regression: 36 personas, 12 adjacent pairs, threshold 0.15, 54 distribution fixtures, and valid pipeline Top3 output are stable.

## 5. 3K Stability Test Result

- Stage 3K tests: 5/5 passed.
- Pipeline executions in 3K: 24.
- Status counts: SUCCESS=11, REJECTED=4, RETRY_REQUIRED=6, LOW_CONFIDENCE=3.

## 6. Failure Path Coverage

| Case | Expected | Status | Reason/Error Codes | Mock VLM Calls | Primary Persona |
| --- | --- | --- | --- | --- | --- |
| non-image mime | REJECTED before mock VLM | REJECTED | UNSUPPORTED_MIME_TYPE, UNSUPPORTED_MIME_TYPE | 0 | null |
| non-palm | REJECTED before mock VLM | REJECTED | NOT_PALM, NOT_PALM | 0 | null |
| back-of-hand | REJECTED before mock VLM | REJECTED | BACK_OF_HAND, BACK_OF_HAND | 0 | null |
| multiple-hands | REJECTED before mock VLM | REJECTED | MULTIPLE_HANDS, MULTIPLE_HANDS | 0 | null |
| blurry | RETRY_REQUIRED before mock VLM | RETRY_REQUIRED | BLURRY_OR_LOW_CLARITY, BLURRY_OR_LOW_CLARITY | 0 | null |
| too-dark-low-quality-score | RETRY_REQUIRED before mock VLM | RETRY_REQUIRED | BLURRY_OR_LOW_CLARITY, BLURRY_OR_LOW_CLARITY | 0 | null |
| low-quality-but-usable | LOW_CONFIDENCE with match output | LOW_CONFIDENCE | LOW_QUALITY_PASS, LOW_QUALITY_PASS | 1 | P35 |
| missing-many-fields | RETRY_REQUIRED before matching | RETRY_REQUIRED | SCHEMA_RETRY_REQUIRED | 1 | null |
| enum-out-of-range | invalid_fields recorded and degraded | LOW_CONFIDENCE | none | 1 | P01 |
| null-heavy | RETRY_REQUIRED for too many null fields | RETRY_REQUIRED | SCHEMA_RETRY_REQUIRED | 1 | null |
| schema-severe-invalid | RETRY_REQUIRED for non-object schema | RETRY_REQUIRED | SCHEMA_RETRY_REQUIRED | 1 | null |
| mother-core-insufficient | RETRY_REQUIRED because no mother has enough core support | RETRY_REQUIRED | RULE_NO_ELIGIBLE_PRIMARY_MOTHER | 1 | null |
| top1-top2-close-gap | LOW_CONFIDENCE for close Top1/Top2 | LOW_CONFIDENCE | none | 1 | P35 |

## 7. Cache Hit Test Result

| Case | First Hit | Second Hit | Same Key | Mock VLM Calls | Second Debug Mock VLM Used | Second Debug Cache Hit |
| --- | --- | --- | --- | --- | --- | --- |
| same file_hash same versions | false | true | true | 1 | false | true |
| rule version change | false | false | false | 2 | true | false |
| schema version change | false | false | false | 2 | true | false |
| prompt version change | false | false | false | 2 | true | false |
| different file_hash | false | false | false | 2 | true | false |

- Same file_hash and same versions hit cache on the second run.
- Different rule_version, schema_version, prompt_version, and file_hash do not reuse the old cache entry.
- Cache hits are visible through both `result.cache.cache_hit` and `result.debug.cache_hit`.
- Cache-hit runs do not reload mock VLM features.

## 8. Schema Degradation Test Result

| Case | Expected | Status | Schema Status | Should Retry | Missing | Null | Invalid | Degraded | Primary Persona |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| missing-many-fields | RETRY_REQUIRED before matching | RETRY_REQUIRED | RETRY_REQUIRED | true | 19 | 4 | none | 23 | null |
| enum-out-of-range | invalid_fields recorded and degraded | LOW_CONFIDENCE | DEGRADED | false | 0 | 0 | HEAD_LINE_DEPTH, MOUNT_JUPITER | 2 | P01 |
| null-heavy | RETRY_REQUIRED for too many null fields | RETRY_REQUIRED | RETRY_REQUIRED | true | 0 | 6 | none | 6 | null |
| schema-severe-invalid | RETRY_REQUIRED for non-object schema | RETRY_REQUIRED | RETRY_REQUIRED | true | 33 | 0 | none | 33 | null |
| mother-core-insufficient | Schema valid; matcher returns RETRY_REQUIRED | RETRY_REQUIRED | VALID | false | 0 | 0 | none | 0 | null |
| top1-top2-close-gap | Schema valid; matcher marks low confidence | LOW_CONFIDENCE | VALID | false | 0 | 0 | none | 0 | P35 |

## 9. Quality Gate Test Result

| Case | Expected | Status | Quality Status | Can Continue | Reason Codes | Mock VLM Calls |
| --- | --- | --- | --- | --- | --- | --- |
| non-image mime | REJECTED before mock VLM | REJECTED | REJECTED | false | UNSUPPORTED_MIME_TYPE | 0 |
| non-palm | REJECTED before mock VLM | REJECTED | REJECTED | false | NOT_PALM | 0 |
| back-of-hand | REJECTED before mock VLM | REJECTED | REJECTED | false | BACK_OF_HAND | 0 |
| multiple-hands | REJECTED before mock VLM | REJECTED | REJECTED | false | MULTIPLE_HANDS | 0 |
| blurry | RETRY_REQUIRED before mock VLM | RETRY_REQUIRED | RETRY_REQUIRED | false | BLURRY_OR_LOW_CLARITY | 0 |
| too-dark-low-quality-score | RETRY_REQUIRED before mock VLM | RETRY_REQUIRED | RETRY_REQUIRED | false | BLURRY_OR_LOW_CLARITY | 0 |
| low-quality-but-usable | LOW_CONFIDENCE with match output | LOW_CONFIDENCE | LOW_QUALITY_PASS | true | LOW_QUALITY_PASS | 1 |

## 10. RecognitionResult Status Coverage

| Status | Count |
| --- | --- |
| SUCCESS | 11 |
| REJECTED | 4 |
| RETRY_REQUIRED | 6 |
| LOW_CONFIDENCE | 3 |

- Covered terminal statuses: SUCCESS, LOW_CONFIDENCE, RETRY_REQUIRED, REJECTED.
- Covered cache-hit state through `cache.cache_hit = true` while preserving the cached recognition status.
- Every row keeps status, cache, quality_gate, schema, debug, error_codes, and version metadata.

## 11. Cost Statistics And Estimate

| Metric | Value |
| --- | --- |
| Total 3K pipeline samples | 24 |
| Samples that call mock VLM | 17 |
| Samples blocked by quality gate before VLM | 6 |
| Cache-hit samples | 1 |
| Schema-failed samples not entering match | 3 |
| Samples with match output | 14 |

- `cost_per_vlm_call` is a future configuration parameter. No real pricing or billing API is used.
- No-cache estimate: estimated_cost_no_cache = 18 * cost_per_vlm_call.
- With file_hash cache estimate: estimated_cost_with_cache = 17 * cost_per_vlm_call.
- Quality/preflight savings estimate: avoided_cost_from_quality_gate = 6 * cost_per_vlm_call.
- Cache savings estimate: avoided_cost_from_cache = 1 * cost_per_vlm_call.

## 12. Forbidden Path Check Result

- Git status for forbidden paths: clean.
- Checked paths: app, components, public, package.json.
- Stage 3K tests use mock fixtures only and do not call API or VLM.

## 13. 3I Risks Retained

- M7 mother type remains 2/54, below 5%, marked WARNING.
- Zero-hit final personas remain: P27, P26, P29, P04, P32, P24.
- Top1/Top2 gap < 0.15 remains 33/54 in the 3I distribution simulation.
- Adjacent pairs P05/P07 and P25/P33 remain zero final triggers.
- Cross-mother correction remains 3/54 and is not overactive.
- Stage 3K does not tune weights or rules; these risks should move to a later real-sample calibration phase.

## 14. Stage 3 Acceptance Readiness

- Stage 3K stability tests pass on the mock recognition loop.
- Stage 3 can enter engineering acceptance if the final forbidden-path check is clean.

