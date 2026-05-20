# Stage 5I AnalysisResult Read Adapter

## Goal

Stage 5I adds a read-only adapter for later page/API consumers. The adapter accepts the frozen `analysis-result.v1` contract from Stage 5H and returns only fields that UI is allowed to read.

This stage does not connect UI, change CSS, call real providers, read API keys, change persona copy, change score weights, change thresholds, or alter persona matching.

## Why UI Only Reads analysis-result.v1

`stage5b.v1` is an internal Stage 5B skeleton envelope. It may contain provider output, Stage 5G bridge internals, `recognition_result.debug`, and other fields that are useful for debugging but unstable for page code.

`analysis-result.v1` is the stable long-term contract. UI should render from this contract and should not know how `PalmFeatureSet`, `RuleInput`, `RecognitionResult`, `AnalysisInput`, or Stage 5B internals are shaped.

## Adapter Entry

File:

```txt
src/stage5/analysis-result-read-adapter.js
```

Function:

```js
readAnalysisResultForUI(analysisResult)
```

Successful output contains only:

```js
{
  schemaVersion: "analysis-result.v1",
  status: "ok" | "degraded" | "failed",
  result: {
    persona: {
      id: string,
      name: string,
      confidence: number
    },
    summary: {
      title: string,
      subtitle: string,
      shortText: string,
      keywords: string[]
    },
    scores: {
      overallConfidence: number,
      qualityScore: number | null,
      matchScore: number | null
    },
    sections: [
      {
        key: string,
        title: string,
        content: string,
        source: string
      }
    ],
    warnings: string[]
  },
  uiConsumable: {
    personaId: string,
    personaName: string,
    confidence: number,
    status: string,
    qualityStatus: string,
    primaryDisplayText: string,
    secondaryDisplayText: string,
    warningBadges: string[]
  },
  diagnostics: {
    lowConfidenceFieldCount: number,
    missingFieldCount: number,
    unknownFieldCount: number,
    adapterWarnings: string[],
    providerWarnings: string[],
    matcherWarnings: string[],
    contractWarnings: string[]
  },
  trace: {
    stage: string,
    from: string,
    contract: string,
    sourceImage: string | null,
    provider: string | null,
    model: string | null,
    generatedAt: string
  }
}
```

The adapter keeps the contract status values from Stage 5H: `ok`, `degraded`, and `failed`. It does not rename them to UI page state names.

## UI Allowed Fields

UI may read:

```txt
schemaVersion
status
result.persona
result.summary
result.scores
result.sections
result.warnings
uiConsumable
diagnostics
trace
```

## UI Forbidden Fields

UI must not read or depend on:

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

The read adapter uses an explicit whitelist. Even if forbidden fields are present in the source object, they are not copied to the UI read model.

## Error Output

Errors use stable objects:

```js
{
  ok: false,
  error: {
    code: "ANALYSIS_RESULT_SCHEMA_UNSUPPORTED",
    message: "Unsupported analysis result schema."
  }
}
```

Error codes:

```txt
ANALYSIS_RESULT_MISSING
ANALYSIS_RESULT_SCHEMA_UNSUPPORTED
ANALYSIS_RESULT_STATUS_INVALID
ANALYSIS_RESULT_MALFORMED
ANALYSIS_RESULT_UI_FIELD_MISSING
```

Rules:

- Missing or non-object input returns `ANALYSIS_RESULT_MISSING`.
- Wrong `schemaVersion` returns `ANALYSIS_RESULT_SCHEMA_UNSUPPORTED`.
- Status outside `ok`, `degraded`, or `failed` returns `ANALYSIS_RESULT_STATUS_INVALID`.
- Missing or malformed `result`, `diagnostics`, or `trace` returns `ANALYSIS_RESULT_MALFORMED`.
- Missing or malformed `uiConsumable` returns `ANALYSIS_RESULT_UI_FIELD_MISSING`.

## Stage 5J / UI Notes

The first UI integration should read from `readAnalysisResultForUI()` and render only the returned object. UI page state names can be mapped later, but that mapping should happen outside the Stage 5H contract.

Debug or QA tooling can inspect `internal.stage5bResult`, but production UI must stay behind the read adapter.
