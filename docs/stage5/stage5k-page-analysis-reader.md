# Stage 5K Page Analysis Reader

## Goal

Stage 5K adds a non-visual page-level read wrapper for future `result` and `poster` pages.

The new wrapper does not modify UI, CSS, DOM, page files, real providers, API keys, persona copy, score weights, thresholds, or persona matching.

## Why Pages Cannot Read Storage Directly

`palmmi:lastAnalysisResult` may contain the full `analysis-result.v1` object, including internal fields retained for pipeline compatibility and diagnostics.

Future page code must not read storage directly because the raw value can include:

```text
internal
internal.stage5bResult
provider_output
recognition_result.debug
PalmFeatureSet
RuleInput
RecognitionResult
AnalysisInput
stage5b.v1 internal details
```

Those fields are not render-safe and must stay behind the Stage 5I/5J read boundary.

## Why readLastAnalysisResultFromStorage Is Required

`readLastAnalysisResultFromStorage()` is the only Stage 5K gateway from storage to page-consumable data.

It already handles:

```text
storage.getItem()
JSON parsing
readAnalysisResultForUI()
stable storage/schema/contract errors
UI-safe field filtering
```

Stage 5K does not repeat that logic. The page wrapper only calls the storage reader, maps stable reader errors to stable page errors, and reshapes the already UI-safe data for future page consumers.

## File And Entrypoints

File:

```text
src/stage5/page-analysis-reader.js
```

Entrypoints:

```js
readResultPageAnalysisData(options)
readPosterPageAnalysisData(options)
readPageAnalysisData(page, options)
```

`options` is passed through to `readLastAnalysisResultFromStorage(options)`, so tests and future integration can supply `storage` or `key` without exposing raw storage parsing in page code.

## Result Page Safe Structure

`readResultPageAnalysisData()` returns:

```js
{
  ok: true,
  page: "result",
  data: {
    schemaVersion: "analysis-result.v1",
    status: "ok",
    persona: {},
    summary: {},
    scores: {},
    sections: [],
    warnings: [],
    uiConsumable: {},
    diagnostics: {},
    trace: {}
  }
}
```

The fields are copied from the Stage 5I UI-safe model returned by `readAnalysisResultForUI()`.

## Poster Page Safe Structure

`readPosterPageAnalysisData()` returns:

```js
{
  ok: true,
  page: "poster",
  data: {
    schemaVersion: "analysis-result.v1",
    status: "ok",
    summary: {},
    poster: {},
    warnings: [],
    uiConsumable: {},
    diagnostics: {},
    trace: {}
  }
}
```

`analysis-result.v1` does not currently define a dedicated poster field. Stage 5K therefore returns `poster: {}` as a safe placeholder and keeps all real poster-renderable text in `summary` and `uiConsumable`.

Future real poster integration should either consume existing UI-safe fields or add poster-safe fields to the Stage 5I adapter first. It should not read raw `internal` data.

## Forbidden Output Fields

The page reader must not return:

```text
internal
internal.stage5bResult
provider_output
recognition_result.debug
PalmFeatureSet
RuleInput
RecognitionResult
AnalysisInput
stage5b.v1 internal details
```

## Error Codes

Stable page error shape:

```js
{
  ok: false,
  page: "result",
  error: {
    code: "PAGE_ANALYSIS_RESULT_MISSING",
    message: "No analysis result is available for this page."
  }
}
```

Stage 5K page errors:

```text
PAGE_ANALYSIS_STORAGE_READ_FAILED
PAGE_ANALYSIS_RESULT_MISSING
PAGE_ANALYSIS_RESULT_INVALID
PAGE_ANALYSIS_RESULT_NOT_READY
PAGE_ANALYSIS_UNSUPPORTED_PAGE
UNKNOWN_ERROR
```

Reader error mapping:

```text
ANALYSIS_STORAGE_UNAVAILABLE -> PAGE_ANALYSIS_STORAGE_READ_FAILED
ANALYSIS_STORAGE_KEY_MISSING -> PAGE_ANALYSIS_STORAGE_READ_FAILED
ANALYSIS_STORAGE_VALUE_MISSING -> PAGE_ANALYSIS_RESULT_MISSING
ANALYSIS_STORAGE_JSON_INVALID -> PAGE_ANALYSIS_RESULT_INVALID
ANALYSIS_RESULT_MISSING -> PAGE_ANALYSIS_RESULT_MISSING
ANALYSIS_RESULT_SCHEMA_UNSUPPORTED -> PAGE_ANALYSIS_RESULT_INVALID
ANALYSIS_RESULT_STATUS_INVALID -> PAGE_ANALYSIS_RESULT_INVALID
ANALYSIS_RESULT_MALFORMED -> PAGE_ANALYSIS_RESULT_INVALID
ANALYSIS_RESULT_UI_FIELD_MISSING -> PAGE_ANALYSIS_RESULT_INVALID
```

A valid UI-safe result with status `failed` is now passed through to Stage 5L so the page state mapper can produce the existing Stage 4 `error` state:

```text
data.status "failed" -> ANALYSIS_FAILED -> error
```

## Stage 5L / Real UI Integration Notes

Future `result` and `poster` page code should call only:

```js
readResultPageAnalysisData()
readPosterPageAnalysisData()
```

The future UI integration must still keep these boundaries:

- Do not read `palmmi:lastAnalysisResult` directly in page code.
- Do not parse the stored value in page code.
- Do not render `internal`, provider output, recognition debug data, or Stage 5B internal objects.
- Do not add poster-specific fields by reading raw storage; add them through the UI-safe adapter first.
- Keep persona matching, score weights, thresholds, and 36 persona copy outside the page read wrapper.
