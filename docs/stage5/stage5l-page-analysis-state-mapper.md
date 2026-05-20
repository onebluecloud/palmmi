# Stage 5L Page Analysis State Mapper

## Goal

Stage 5L defines the non-visual state mapping layer that future `result` and `poster` page integration must use before rendering.

This stage does not connect real UI, does not modify page DOM or CSS, does not call real APIs, and does not change persona rules, score weights, thresholds, or 36 persona copy.

## File And Entrypoints

File:

```text
src/stage5/page-analysis-state-mapper.js
```

Entrypoints:

```js
mapAnalysisStatusToResultPageState(input)
mapAnalysisStatusToPosterPageState(input)
mapAnalysisStatusToPageState(page, input)
```

The mapper accepts either a Stage 5K page response or a status object/string.

## Output Shape

Stable output:

```js
{
  page: "result",
  analysisStatus: "PAGE_ANALYSIS_RESULT_MISSING",
  pageState: "missing-result",
  canRenderResult: false,
  canRenderPoster: false,
  shouldRedirectToUpload: true,
  shouldShowRetry: true,
  allowsPartialResult: false,
  requiresWarning: false,
  isPosterBlocked: true,
  usesFallback: false,
  severity: "error",
  message: "未找到分析结果，请重新上传手掌图片。"
}
```

The output is control metadata only. It does not include raw analysis payloads, internal fields, provider output, recognition debug data, or Stage 5B internals.

## Result Page Mapping

| Analysis status | Stage 4 result state | Can render result | Can render poster | Upload retry | Notes |
| --- | --- | --- | --- | --- | --- |
| `PAGE_ANALYSIS_RESULT_MISSING` | `missing-result` | no | no | yes | No persona or poster entry allowed. |
| `PAGE_ANALYSIS_RESULT_INVALID` | `invalid-result` | no | no | yes | Corrupt or invalid result must not render. |
| `PAGE_ANALYSIS_RESULT_NOT_READY` | `partial-result` | only if persona exists | no | no | May show simplified result only when persona is already safe. |
| `ANALYSIS_SUCCESS` | `ready` | yes | yes | no | `ready` is the current Stage 4 success state. |
| `ANALYSIS_FAILED` | `error` | no | no | yes | Failed analysis must not show persona. |
| `ANALYSIS_PARTIAL` | `partial-result` | only if persona exists | only if poster payload is complete | optional | Default is no poster unless poster payload is complete. |
| `ANALYSIS_LOW_CONFIDENCE` | `partial-result` | only if persona exists | only if poster payload is complete | optional | Must show a warning. |
| `ANALYSIS_EXPIRED` | `missing-result` | no | no | yes | Expired data requires a fresh upload. |
| unknown | `error` | no | no | yes | Uses safe fallback. |

## Poster Page Mapping

| Analysis status | Stage 4 poster state | Can render poster | Upload retry | Notes |
| --- | --- | --- | --- | --- |
| `PAGE_ANALYSIS_RESULT_MISSING` | `missing-result` | no | yes | No final poster. |
| `PAGE_ANALYSIS_RESULT_INVALID` | `invalid-result` | no | yes | No final poster. |
| `PAGE_ANALYSIS_RESULT_NOT_READY` | `error` | no | no | Explicitly blocks final poster generation. |
| `ANALYSIS_SUCCESS` | `ready` | yes | no | `ready` is the current Stage 4 success state. |
| `ANALYSIS_FAILED` | `error` | no | yes | No final poster. |
| `ANALYSIS_PARTIAL` | `partial-result` | only if persona and poster payload are complete | optional | Default is blocked. |
| `ANALYSIS_LOW_CONFIDENCE` | `partial-result` | only if persona and poster payload are complete | optional | Must show a warning. |
| `ANALYSIS_EXPIRED` | `error` | no | yes | Expired data cannot generate a poster. |
| unknown | `error` | no | yes | Uses safe fallback. |

## Status Normalization

Stage 5K page-reader responses are normalized before mapping:

```text
ok true + data.status "ok" -> ANALYSIS_SUCCESS
ok true + data.status "degraded" -> ANALYSIS_LOW_CONFIDENCE
ok true + data.status "failed" -> ANALYSIS_FAILED
ok false + error.code "PAGE_ANALYSIS_RESULT_MISSING" -> PAGE_ANALYSIS_RESULT_MISSING
ok false + error.code "PAGE_ANALYSIS_RESULT_INVALID" -> PAGE_ANALYSIS_RESULT_INVALID
ok false + error.code "PAGE_ANALYSIS_RESULT_NOT_READY" -> PAGE_ANALYSIS_RESULT_NOT_READY
```

## Boundaries

The mapper must remain pure:

- No direct `localStorage` or `sessionStorage` reads.
- No direct storage JSON parsing.
- No DOM operations.
- No real provider/API imports or calls.
- No mutation of input objects.
- No raw analysis payload returned.

Forbidden output fields:

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

## Stage 5M Notes

Future real UI integration should call Stage 5K to read the safe page payload, then call Stage 5L to choose the Stage 4-compatible state.

The future flow should be:

```text
result/poster page
  -> readResultPageAnalysisData() or readPosterPageAnalysisData()
  -> mapAnalysisStatusToResultPageState() or mapAnalysisStatusToPosterPageState()
  -> existing Stage 4 state renderer
```

Do not let page code invent new mappings locally.
