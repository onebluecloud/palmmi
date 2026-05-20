# Stage 5M Result/Poster UI Integration

## Goal

Stage 5M wires the real `result` and `poster` page scripts into the Stage 5 read and state mapping path without changing UI, CSS, DOM structure, persona rules, score weights, thresholds, real APIs, API keys, payment, login, or sharing.

## Result Page Chain

```text
scripts/palmmi-result.js
  -> readResultPageAnalysisData()
  -> mapAnalysisStatusToResultPageState()
  -> existing Stage 4 renderProblem()/renderResult()
```

The result page script no longer reads storage directly and no longer parses the stored value.

## Poster Page Chain

```text
scripts/palmmi-poster.js
  -> readPosterPageAnalysisData()
  -> mapAnalysisStatusToPosterPageState()
  -> existing Stage 4 renderProblem()/renderPoster()
```

The poster page script no longer reads storage directly and no longer parses the stored value.

## Script Loading

Because the project has no bundler in this stage, `result/index.html` and `poster/index.html` now load the Stage 5 read/mapping scripts before the existing page script:

```text
src/stage5/analysis-result-read-adapter.js
src/stage5/analysis-result-storage-reader.js
src/stage5/page-analysis-reader.js
src/stage5/page-analysis-state-mapper.js
scripts/palmmi-result.js or scripts/palmmi-poster.js
```

This is a script-reference-only change. No DOM layout or CSS was changed.

## Renderer Reuse

Stage 5M keeps the existing Stage 4 renderers:

```text
renderProblem()
renderResult()
renderPoster()
createResultViewModel()
createPosterViewModel()
```

Stage 5 page-consumable data is adapted into the existing renderer input shape, then the Stage 5L `pageState` is applied. No new renderer or `success` state was added.

## State Rules

`ANALYSIS_SUCCESS` maps to the existing Stage 4 `ready` state.

Missing, invalid, not-ready, failed, partial, low-confidence, expired, and unknown states are delegated to the Stage 5L mapper. Page scripts do not define their own state mapping table.

## Legacy Stage 4 Compatibility

Some Stage 4 tests still write legacy `RecognitionResult` objects into `palmmi:lastAnalysisResult`.

To keep the page scripts from parsing storage directly, legacy compatibility is handled inside:

```text
src/stage5/analysis-result-storage-reader.js
```

The legacy object is converted into `analysis-result.v1` and still passes through `readAnalysisResultForUI()` before page code sees it.

## Forbidden Page Output

Page output must not include:

```text
internal
internal.stage5bResult
provider_output
recognition_result.debug
PalmFeatureSet
RuleInput
RecognitionResult
AnalysisInput
```

## Boundaries

Stage 5M did not:

- Add a `success` page state.
- Modify UI or CSS.
- Change result/poster DOM structure beyond required script references.
- Call a real API.
- Read or write API keys.
- Change persona rules, score weights, thresholds, or 36 persona copy.
- Implement payment, login, export, or real sharing.
