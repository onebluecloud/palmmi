# Stage 5H AnalysisResult Contract

## Goal

Stage 5H freezes the long-term `AnalysisResult` contract for later UI, API, and page consumers.

The complete data chain remains:

```txt
provider
-> PalmFeatureSet
-> RuleInput
-> matchPersona
-> RecognitionResult
-> AnalysisInput
-> Stage 5B analysis skeleton
-> AnalysisResultContract
```

This stage does not connect UI, change page CSS, rewrite Stage 4 logic, edit the 36 persona copy, change score weights, change thresholds, or let the VLM decide the final persona.

## Why This Contract Exists

Stage 5B still owns the analysis skeleton and emits the internal `stage5b.v1` recognition envelope. Stage 5G can bridge a deterministic `RecognitionResult` into that skeleton, but later UI should not depend on the internals of `PalmFeatureSet`, `RuleInput`, `RecognitionResult`, `AnalysisInput`, or the Stage 5B envelope.

`analysis-result.v1` is the stable consumer-facing contract. If Stage 5B internals change later, the UI should continue to consume the same Stage 5H contract fields.

## Schema Relationship

`stage5b.v1` is the internal Stage 5B skeleton envelope stored under `recognition_result.schema.version`.

`analysis-result.v1` is the long-term contract emitted by:

```txt
src/stage5/analysis-result-contract.js
buildAnalysisResultContract(stage5bResult)
```

The contract records:

```txt
schemaVersion: analysis-result.v1
sourceSchemaVersion: stage5b.v1
```

The earlier Stage 5G bridge may also mark its top-level wrapper as `analysis-result.v1` for compatibility. Stage 5H is the canonical frozen UI/API contract boundary.

## Contract Fields

```js
{
  schemaVersion: "analysis-result.v1",
  sourceSchemaVersion: "stage5b.v1",
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
        source: "stage5b" | "rule" | "contract"
      }
    ],
    warnings: string[]
  },
  uiConsumable: {
    personaId: string,
    personaName: string,
    confidence: number,
    status: "ok" | "degraded" | "failed",
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
    stage: "5H",
    from: "stage5b.v1",
    contract: "analysis-result.v1",
    sourceImage: string | null,
    provider: string | null,
    model: string | null,
    generatedAt: string
  },
  internal: {
    stage5bResult: object
  }
}
```

## UI Consumption Boundary

UI may consume only:

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

UI must not rely on `internal`. The `internal.stage5bResult` field exists only for debugging, test inspection, and adapter compatibility.

UI must not directly depend on:

```txt
PalmFeatureSet
RuleInput
RecognitionResult
AnalysisInput
stage5b.v1 internal details
provider_output
recognition_result.debug
```

## Field Mapping

```txt
Stage5B recognition_result.schema.version -> sourceSchemaVersion
AnalysisInput.finalPersona -> result.persona
Stage5B primary_persona -> summary, sections, matchScore fallback
Stage5B quality_gate -> qualityScore, qualityStatus, warnings
Stage5G diagnostics -> diagnostics
Stage5B image/provider metadata -> trace
Original Stage5B/5G result -> internal.stage5bResult
```

The adapter preserves `finalPersona.id`, `finalPersona.name`, and `finalPersona.confidence`. It does not create a new persona conclusion and does not use provider personality output.

## Diagnostics Rules

Diagnostics are copied from the Stage 5G wrapper first, then from `analysis_input.diagnostics`, then from `recognition_result.debug.stage5g_diagnostics`.

`contractWarnings` is adapter-owned. Current warnings include:

```txt
CONTRACT_DEGRADED
CONTRACT_FAILED
SOURCE_SCHEMA_UNKNOWN
```

## Status Rules

`ok` means the source is usable, quality did not fail, and no low-confidence or diagnostic warning signal is present.

`degraded` means the result is still consumable but has low confidence, missing fields, unknown fields, adapter/provider/matcher warnings, or a non-pass quality signal.

`failed` means the source analysis result failed or the Stage 5B recognition result reports a failed/retry state.

Missing persona id, name, or numeric confidence is a hard adapter error because UI cannot safely render a final result without those fields.

## Runner Usage

Existing modes remain compatible:

```powershell
node scripts\palmmi-stage5c-runner.js
node scripts\palmmi-stage5c-runner.js --normalize
node scripts\palmmi-stage5c-runner.js --toRuleInput
node scripts\palmmi-stage5c-runner.js --toRecognitionResult
node scripts\palmmi-stage5c-runner.js --toAnalysisResult
```

Stage 5H adds:

```powershell
node scripts\palmmi-stage5c-runner.js --toAnalysisContract
```

The full runner chain is:

```txt
provider
-> PalmFeatureSet
-> RuleInput
-> matchPersona
-> RecognitionResult
-> AnalysisInput
-> Stage 5B analysis skeleton
-> AnalysisResultContract
```

Default local output:

```txt
docs/stage5/stage5h-analysis-contract.local.json
```

That file is ignored by git.

## Not Touched

Stage 5H does not modify:

```txt
UI / CSS / page visual files
Stage 4 main logic
36 persona copy
score weights
persona thresholds
persona rule matching
payment / login / share / poster generation
real image API behavior
```

Mock/contract tests do not prove the real Qwen image path. Real image validation still depends on `PALMMI_QWEN_API_KEY` in the current PowerShell environment.

## Stage 5I Suggestion

Stage 5I should add a thin page/API read adapter that consumes only `analysis-result.v1`, without reading Stage 5B internals. The first UI integration should render from `uiConsumable` and `result`, while keeping debug views behind `internal` only.
