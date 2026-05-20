# Stage 5J AnalysisResult Storage Reader

## Goal

Stage 5J adds a non-visual storage reader for future page/API integration. It reads `analysis-result.v1` from the existing analysis result storage key, parses JSON, then passes the parsed object through `readAnalysisResultForUI()`.

This stage does not modify UI, CSS, DOM, page files, real providers, API keys, persona copy, score weights, thresholds, or persona matching.

## Why Pages Cannot Read Storage Directly

`palmmi:lastAnalysisResult` can contain internal analysis data. After Stage 5H, a valid long-term result may include `internal.stage5bResult` for debugging and compatibility. That internal data can contain provider output, Stage 5B envelope details, `recognition_result.debug`, `PalmFeatureSet`, `RuleInput`, `RecognitionResult`, and `AnalysisInput`.

Future pages must not read that object directly. They should read storage through the Stage 5J storage reader, which delegates to the Stage 5I whitelist adapter.

## Why readAnalysisResultForUI Is Required

`readAnalysisResultForUI()` is the single UI-safe contract boundary. The storage reader does not define a second UI result shape. It only handles:

```txt
storage.getItem()
JSON.parse()
readAnalysisResultForUI()
stable success/error wrapping
```

## Storage Key

Default key:

```txt
palmmi:lastAnalysisResult
```

Stage 4 currently stores this key in browser `sessionStorage`. The Stage 5J reader accepts any storage-like object with `getItem(key)` so tests, future APIs, or future page wrappers can pass the right storage explicitly.

## Adapter Entry

File:

```txt
src/stage5/analysis-result-storage-reader.js
```

Function:

```js
readLastAnalysisResultFromStorage({ storage, key })
```

`storage` is optional. If omitted, the reader attempts `globalThis.sessionStorage`.

`key` is optional. If omitted, the reader uses `palmmi:lastAnalysisResult`.

## Success Output

```js
{
  ok: true,
  data: {
    schemaVersion: "analysis-result.v1",
    status: "ok" | "degraded" | "failed",
    result: {},
    uiConsumable: {},
    diagnostics: {},
    trace: {}
  }
}
```

The `data` object is exactly the Stage 5I UI-safe read model. It does not include `internal`, `provider_output`, or Stage 5B internals.

## Error Codes

Storage reader errors:

```txt
ANALYSIS_STORAGE_UNAVAILABLE
ANALYSIS_STORAGE_KEY_MISSING
ANALYSIS_STORAGE_VALUE_MISSING
ANALYSIS_STORAGE_JSON_INVALID
UNKNOWN_ERROR
```

Errors delegated from Stage 5I:

```txt
ANALYSIS_RESULT_MISSING
ANALYSIS_RESULT_SCHEMA_UNSUPPORTED
ANALYSIS_RESULT_STATUS_INVALID
ANALYSIS_RESULT_MALFORMED
ANALYSIS_RESULT_UI_FIELD_MISSING
```

Stable error shape:

```js
{
  ok: false,
  error: {
    code: "ANALYSIS_STORAGE_VALUE_MISSING",
    message: "No analysis result found in storage."
  }
}
```

## UI Forbidden Fields

The reader must never return:

```txt
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

## Stage 5K / UI Notes

Future UI integration should use this reader as the only path from `palmmi:lastAnalysisResult` to renderable data.

Stage 5K can add a narrow page-side wrapper around `readLastAnalysisResultFromStorage()`, but it should still avoid visual redesign and should not inspect `internal` directly.
