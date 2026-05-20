# Stage 5G Analysis Bridge

## Goal

Stage 5G connects `recognition-result.v1` from Stage 5F into the existing Stage 5B analysis skeleton through a controlled adapter boundary.

The complete chain is:

```txt
provider
-> PalmFeatureSet
-> RuleInput
-> matchPersona
-> RecognitionResult
-> AnalysisInput
-> Stage 5B analysis skeleton
-> AnalysisResult
```

This stage does not build UI display, final copywriting, payment, login, sharing, poster generation, or production launch behavior.

## Stage 5B Skeleton Boundary

The real Stage 5B skeleton entry is:

```txt
scripts/palmmi-stage5.js
runAnalyzeSkeleton(options)
```

`scripts/palmmi-analyze.js` exposes `runStage5BAnalysis(upload, options)`, but that function is a page-side wrapper that delegates to `runAnalyzeSkeleton()` when the Stage 5 API is available.

Stage 5G keeps that skeleton boundary. The bridge supplies a controlled provider whose output contains `analysis-input.v1`. The skeleton then writes the same `stage5b.v1` result envelope, with deterministic recognition fields filled from the Stage 5F result.

## RecognitionResult To AnalysisInput Mapping

`src/stage5/recognition-result-to-analysis-input.js` maps:

```txt
RecognitionResult.schemaVersion -> sourceRecognitionResultSchemaVersion
RecognitionResult.sourceImage -> sourceImage
RecognitionResult.sampleId -> sampleId
RecognitionResult.provider -> provider
RecognitionResult.model -> model
RecognitionResult.status -> status
RecognitionResult.finalPersona -> finalPersona
RecognitionResult.personaMatch -> personaMatch
RecognitionResult.qualityGate -> qualityGate
RecognitionResult.diagnostics -> diagnostics
```

The adapter emits:

```js
{
  schemaVersion: "analysis-input.v1",
  sourceRecognitionResultSchemaVersion: "recognition-result.v1",
  sourceImage: "...",
  sampleId: "...",
  provider: "...",
  model: "...",
  status: "...",
  finalPersona: {
    id: "...",
    name: "...",
    confidence: 0
  },
  personaMatch: {},
  qualityGate: {},
  diagnostics: {},
  trace: {
    from: "recognition-result.v1",
    adapter: "recognition-result-to-analysis-input",
    stage: "5G"
  }
}
```

Missing `finalPersona`, missing `personaMatch`, or the wrong source schema throws a clear error. Low confidence, unknown fields, and adapter/provider/matcher warnings are passed through in diagnostics.

## Analysis Bridge

`src/stage5/palmmi-analysis-bridge.js` provides:

```js
runPalmmiAnalysisBridge({ recognitionResult, upload, stage5Api })
```

It performs:

```txt
RecognitionResult
-> recognitionResultToAnalysisInput()
-> runAnalyzeSkeleton()
-> analysis-result.v1 wrapper
```

The returned result includes:

```txt
schemaVersion: analysis-result.v1
analysis_input
recognition_result
diagnostics
trace
```

The `recognition_result` still uses the Stage 5B `stage5b.v1` envelope so later UI consumers can remain behind the existing storage/result boundary.

## Why UI Is Still Not Connected

Stage 5G is only a structural handoff from recognition to analysis. UI pages and CSS remain frozen so this stage can prove the data boundary first. Display behavior, final copy selection, and result-page rendering should be handled after the contract is stable.

## Why VLM Still Cannot Decide Persona

The VLM remains limited to observable palm features. Persona selection is already completed by `matchPersona()` before Stage 5G receives the result.

Stage 5G does not call the VLM for persona text, does not generate a personality conclusion, and does not override `finalPersona`.

## Runner Usage

Existing modes remain compatible:

```powershell
node scripts\palmmi-stage5c-runner.js
node scripts\palmmi-stage5c-runner.js --normalize
node scripts\palmmi-stage5c-runner.js --toRuleInput
node scripts\palmmi-stage5c-runner.js --toRecognitionResult
```

Stage 5G adds:

```powershell
node scripts\palmmi-stage5c-runner.js --toAnalysisResult
```

Default local output:

```txt
docs/stage5/stage5g-analysis-results.local.json
```

That file is ignored by git.

For local images:

```powershell
node scripts\palmmi-stage5c-runner.js --provider qwen --sampleDir "E:\其他\Palmmi\测试图片 - 副本" --toAnalysisResult
```

## Provider Environment Variables

The Qwen provider reads:

```txt
PALMMI_QWEN_API_KEY
PALMMI_QWEN_MODEL
```

`PALMMI_QWEN_MODEL` is optional and defaults to `qwen3-vl-flash`.

Safe shell providers still read:

```txt
PALMMI_DOUBAO_API_KEY
PALMMI_GLM_API_KEY
PALMMI_GEMINI_API_KEY
PALMMI_OPENAI_API_KEY
```

Those providers remain safe shells. Missing API keys are surfaced as clear provider failures in runner output.

## Files And Logic Not Touched

Stage 5G does not modify:

```txt
UI / CSS / page visual files
Stage 4 page logic
36 persona copy
score weights
rule thresholds
persona rule matching
payment / login / share / poster generation
```

The deterministic owner remains:

```txt
lib/recognition/personaMatcher.ts
```

## Tests

Stage 5G adds:

```powershell
node tests\stage5\stage5g-analysis-bridge.test.cjs
```

The test verifies adapter mapping, skeleton invocation, final persona preservation, diagnostics passthrough, missing final persona errors, runner `--toAnalysisResult`, and no runtime mutation of rule/persona files.

## Stage 5H Suggestion

Stage 5H should define the stable `AnalysisResult` contract expected by later UI consumers and decide how much of the Stage 5B `stage5b.v1` envelope remains as the long-term public result shape. It should still avoid UI redesign until the contract is frozen.
