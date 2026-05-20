# Stage 5F Recognition Pipeline

## Goal

Stage 5F wires the end-to-end recognition path without changing UI, Stage 4 flow, persona copy, score weights, thresholds, or deterministic rules.

The production chain is:

```txt
provider
-> PalmFeatureSet
-> RuleInput
-> matchPersona
-> RecognitionResult
```

## Layer Boundaries

### Provider

The provider reads the image and returns Stage 5C observable palm features. It may report warnings or failures such as a missing API key, invalid image, request failure, or parse failure.

The provider must not output, choose, or override the final persona.

### PalmFeatureSet

`normalizeVlmToPalmFeatureSet()` converts provider output into the Stage 5D `palm-feature-set.v1` contract. This layer contains only observable palm-image features, quality values, confidence values, and raw provider metadata.

### RuleInput

`palmFeatureSetToRuleInput()` converts `PalmFeatureSet` into `rule-input.v1`. It emits the existing `normalized_33_fields` object used by the deterministic rule engine.

Unknown and low-confidence values follow the Stage 5E policy:

```txt
unknown / missing -> neutral rule value
low confidence -> diagnostics and warnings
```

The adapter does not decide the persona and does not alter rule weights or thresholds.

### Deterministic Matcher

`matchPersona(input)` from `lib/recognition/personaMatcher.ts` consumes `ruleInput` or `ruleInput.normalized_33_fields` and returns the existing deterministic persona match structure.

Stage 5F passes the `ruleInput` object into `matchPersona()`. The final persona is extracted from `personaMatch.primary_persona`.

### RecognitionResult

`runPalmmiRecognitionPipeline()` in `src/stage5/palmmi-recognition-pipeline.js` wraps the chain into `recognition-result.v1`.

The result includes:

```js
{
  schemaVersion: "recognition-result.v1",
  sourceImage: "...",
  sampleId: "...",
  provider: "...",
  model: "...",
  status: "...",
  palmFeatureSet: {},
  ruleInput: {},
  personaMatch: {},
  finalPersona: {
    id: "...",
    name: "...",
    confidence: 0
  },
  qualityGate: {},
  diagnostics: {
    lowConfidenceFieldCount: 0,
    missingFieldCount: 0,
    unknownFieldCount: 0,
    adapterWarnings: [],
    providerWarnings: [],
    matcherWarnings: []
  }
}
```

## Why VLM Does Not Decide Persona

The VLM layer is not stable enough to own product rules. It can describe observable palm features, but persona selection must remain reproducible, testable, and controlled by the deterministic rule engine.

Keeping the VLM limited to `PalmFeatureSet` prevents prompt drift from changing the 36-persona decision logic.

## Runner Usage

Existing Stage 5C, Stage 5D, and Stage 5E modes remain unchanged.

Stage 5F adds:

```powershell
node scripts\palmmi-stage5c-runner.js --toRecognitionResult
```

Default local output:

```txt
docs/stage5/stage5f-recognition-results.local.json
```

That file is ignored by git.

To run against a local sample directory:

```powershell
node scripts\palmmi-stage5c-runner.js --provider qwen --sampleDir "E:\其他\Palmmi\测试图片 - 副本" --toRecognitionResult
```

If a manifest is already present, the runner uses it. If `--sampleDir` is passed and the manifest is missing, the runner creates `docs/stage5/stage5c-samples.local.json`.

## Provider Environment Variables

The Qwen provider reads:

```txt
PALMMI_QWEN_API_KEY
PALMMI_QWEN_MODEL
```

`PALMMI_QWEN_MODEL` is optional and defaults to `qwen3-vl-flash`.

The safe shell providers read:

```txt
PALMMI_DOUBAO_API_KEY
PALMMI_GLM_API_KEY
PALMMI_GEMINI_API_KEY
PALMMI_OPENAI_API_KEY
```

Those shell providers are still not implemented. If the required API key is missing, the runner records a clear failure message in the output instead of hiding it behind a stack trace.

## Files And Logic Not Touched

Stage 5F does not modify:

```txt
index.html
upload/
analyze/
result/
poster/
styles/
lib/recognition/personaCatalog.ts
lib/recognition/personaRules.ts
lib/recognition/motherScores.ts
lib/recognition/adjacentResolver.ts
lib/recognition/crossMotherCorrection.ts
```

It does not change:

```txt
UI / CSS
Stage 4 page logic
36 persona copy
score weights
rule thresholds
mother-type selection
adjacent-persona resolution
cross-mother correction
payment / login / share / poster generation
```

## Tests

Stage 5F adds:

```powershell
node tests\stage5\stage5f-recognition-pipeline.test.cjs
```

The test verifies:

```txt
PalmFeatureSet -> RuleInput -> matchPersona -> RecognitionResult
adapter invocation
deterministic matcher invocation
finalPersona extraction from matcher output
low-confidence and unknown diagnostics
clear missing-input errors
runner --toRecognitionResult support
no runtime mutation of persona rule files
```

## Stage 5G Suggestion

Stage 5G should connect this `recognition-result.v1` shape to the existing Stage 5B analysis skeleton behind a controlled boundary. The next step should still avoid UI redesign and should keep the deterministic matcher as the only persona decision owner.
