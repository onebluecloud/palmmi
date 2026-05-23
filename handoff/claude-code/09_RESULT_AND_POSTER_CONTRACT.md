# Result And Poster Contract

## Analysis Result Contract

Primary schema:

```text
analysis-result.v1
```

Main builder:

```text
src/stage5/analysis-result-contract.js
```

Stable storage key:

```text
palmmi:last-analysis
```

Legacy fallback key:

```text
palmmi:lastAnalysisResult
```

## Minimum Result Fields

The result/poster path expects:

```text
schemaVersion = analysis-result.v1
status = ok | degraded
personality_id
personality_name
main_line_type
title
summary
description
evidence
candidate_results
valid_palm
quality_status
poster_title
poster_subtitle
poster_quote
```

`candidate_results[0].personality_id` must match the main `personality_id`.

## Storage Format

The stable storage value is an envelope:

```json
{
  "version": 1,
  "analysis_id": "redacted-or-generated",
  "created_at": "ISO timestamp",
  "provider": "qwen",
  "analysis_result": {}
}
```

The envelope must not include base64 image data, raw provider data, Authorization headers, buffers, or internal objects.

## Result Page Read Rules

`result/index.html` uses:

```text
scripts/palmmi-result.js
src/stage5/page-analysis-reader.js
src/stage5/page-analysis-state-mapper.js
```

It renders only when the stored contract is valid and not terminal/unsafe.

## Poster Page Read Rules

`poster/index.html` uses:

```text
scripts/palmmi-poster.js
src/stage5/page-analysis-reader.js
src/stage5/page-analysis-state-mapper.js
```

It blocks poster generation if the result is missing, invalid, terminal, incomplete, or main-candidate inconsistent.

## Poster Allowed

Poster is allowed when:

```text
valid_palm = true
quality_status = OK or LOW_CONFIDENCE
personality_id is a legal P01-P36 id
candidate_results[0] matches the main personality_id
poster_title / poster_quote / description are present or safely filled from frozen display content
```

## Poster Blocked

Poster is blocked for:

```text
NOT_PALM
IMAGE_NOT_CLEAR
LOW_INFORMATION_FEATURE_SET
ANALYSIS_UNRELIABLE
RESULT_READ_FAILED
POSTER_RESULT_READ_FAILED
POSTER_CONTRACT_INVALID
POSTER_NOT_ALLOWED_FOR_INVALID_IMAGE
POSTER_MAIN_CANDIDATE_MISMATCH
RETRY_REQUIRED
REJECTED
```

## Display Copy Fill

`analysis-result-contract.js` uses frozen display content from:

```text
PalmTag_rule_engine_v0/data/display_content.json
```

It may fill display fields from the frozen copy, but it must not invent new 36-persona copy or alter Stage 3 rules.
