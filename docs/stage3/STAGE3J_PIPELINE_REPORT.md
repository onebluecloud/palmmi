# Palmmi Stage 3J Pipeline Report

## Scope

- Stage 3J wires the end-to-end recognition loop with mock VLM features only.
- No real API, no real VLM call, no UI change, no package change.
- V4.2 33 fields, 3G mother scoring, 3H persona matching, Top3, adjacent rules, and cross-mother correction are reused as-is.

## End-to-End Flow

```text
mock image input
  -> input metadata check
  -> quality gate / rejection
  -> file_hash cache lookup
  -> mock VLM features
  -> 33-field schema validation
  -> degradation/default handling
  -> 8 mother scoring
  -> primary/secondary mother selection
  -> primary-mother persona pool matching
  -> cross-mother correction
  -> adjacent persona resolution
  -> Top3 output
  -> cache write
  -> RecognitionResult
```

## Input Output Structure

- Input: mock image metadata plus a deterministic mock features fixture.
- Output: `RecognitionResult` with `status`, `cache`, `image_input`, `quality_gate`, `schema`, `primary_mother`, `secondary_mother`, `primary_persona`, `top3`, `recognition`, and `debug`.

## Status Definitions

- `SUCCESS`: quality and schema pass, persona match succeeds.
- `LOW_CONFIDENCE`: low-quality pass, degraded schema fields, or close Top1/Top2 output still returns an entertainment result.
- `RETRY_REQUIRED`: blurry/low clarity, schema degradation too high, or rule matching cannot produce a reliable result.
- `REJECTED`: non-image, non-palm, back of hand, multiple hands, or invalid input limits.
- `CACHE_HIT`: represented by `cache.cache_hit = true`; the result status remains the cached recognition status.

## Cache Behavior

- Cache uses only `file_hash` plus version fields.
- Version key fields include `schema_version`, `prompt_version`, `rule_version`, `mock_model_version`, `image_normalization_version`, and `degradation_policy_version`.
- The Stage 3J cache test covers first miss/write, second hit, version change miss, and different file hash miss.
- No `perceptual_hash` is used.

## Schema Degradation Behavior

- The validator keeps exactly the V4.2 33-field schema.
- Missing, null, invalid-type, and enum-out-of-range values are normalized to field defaults and recorded.
- `missing_fields`, `invalid_fields`, `degraded_fields`, `schema_warnings`, and `should_retry` are returned.
- Too many missing/null/degraded core fields or a continuous degraded run triggers `RETRY_REQUIRED` before persona matching.

## Quality Gate Behavior

- Valid palm images continue to cache and mock VLM.
- Non-palm, hand-back, multiple-hand, non-image, and oversized inputs are rejected.
- Blurry or low clarity input returns `RETRY_REQUIRED`.
- Low-quality but usable input returns `LOW_CONFIDENCE` after matching.

## Test Sample Results

| Fixture | Status | Cache Hit | Cache Write | Primary Mother | Primary Persona | Top3 | Mock VLM Calls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| valid-palm-m1.json | SUCCESS | false | true | M1 | P01 | P01, P20, P36 | 1 |
| valid-palm-m2.json | SUCCESS | false | true | M2 | P35 | P35, P02, P28 | 1 |
| non-palm.json | REJECTED | false | false | null | null |  | 0 |
| back-of-hand.json | REJECTED | false | false | null | null |  | 0 |
| multiple-hands.json | REJECTED | false | false | null | null |  | 0 |
| blurry-palm.json | RETRY_REQUIRED | false | false | null | null |  | 0 |
| low-confidence-palm.json | LOW_CONFIDENCE | false | true | M2 | P35 | P35, P14, P02 | 1 |
| oversized-image.json | REJECTED | false | false | null | null |  | 0 |
| non-image-mime.json | REJECTED | false | false | null | null |  | 0 |
| invalid-schema-missing-fields.json | RETRY_REQUIRED | false | false | null | null |  | 1 |
| invalid-schema-enum-out-of-range.json | LOW_CONFIDENCE | false | true | M1 | P01 | P01, P20, P36 | 1 |
| cache-hit-first-run.json | SUCCESS | false | true | M1 | P01 | P01, P20, P36 | 1 |
| cache-hit-second-run.json | SUCCESS | true | false | M1 | P01 | P01, P20, P36 | 1 |

## Known 3I Risks Kept For 3K

- M7 mother share was 2/54, below 5%, marked WARNING.
- Zero-hit final personas in 3I: `P27`, `P26`, `P29`, `P04`, `P32`, `P24`.
- Top1/Top2 gap `< 0.15` appeared in 33/54 samples.
- Adjacent pairs `P05/P07` and `P25/P33` did not trigger in final 3I output.
- Cross-mother correction applied 3/54 times and was not overactive.

## 3K Readiness

Stage 3J can enter Stage 3K after 3H, 3I, and 3J test commands pass.

