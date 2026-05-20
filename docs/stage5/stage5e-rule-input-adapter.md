# Stage 5E Rule Input Adapter

Stage 5E sits here:

```txt
VLM raw result
-> PalmFeatureSet
-> RuleInput
-> deterministic rule engine
-> 36 personality result
```

Stage 5E only implements the `PalmFeatureSet -> RuleInput` adapter. It does not call the VLM provider, does not read images, does not touch UI, and does not generate final user-facing personality output.

## Existing Rule Engine Boundary

The current deterministic rule engine entry is `matchPersona(input)` in:

```txt
lib/recognition/personaMatcher.ts
```

That function accepts the Stage 3 field shape directly, or an object with:

```js
{
  normalized_33_fields: {
    PALM_LENGTH_RATIO: number,
    // ...all Stage 3 FIELD_NAMES
  }
}
```

Stage 5E therefore emits `normalized_33_fields` with all existing Stage 3 field names present. It does not add new rule fields and does not change the existing score weights, thresholds, mother-type selection, adjacent-persona resolution, cross-mother correction, persona rules, or persona copy.

## Why Adapter Exists

`PalmFeatureSet` is a stable visual-feature contract from Stage 5D. It uses readable visual enums such as `long`, `deep`, `high`, and `unknown`.

The deterministic rule engine consumes compact numeric fields from the Stage 3 contract, such as `LIFE_LINE_LENGTH`, `HEAD_LINE_DEPTH`, and `FATE_LINE_CLARITY`.

The adapter is the controlled conversion point between those two shapes. This keeps VLM output separate from deterministic personality rules.

## Degradation Policy

Unknown values are converted to neutral numeric output:

```txt
unknown / missing -> 0
short / shallow / weak / low -> low score
medium / normal / partial -> middle score
long / deep / strong / high -> high score
none -> 0
few / minor / partial -> 0.5 in readable diagnostics, low numeric rule value where needed
many / major / continuous -> high score
```

Confidence values are clamped to `0..1`. Low confidence does not throw and does not block conversion. Instead, the adapter records `diagnostics.lowConfidenceFieldCount` and adds warnings.

## Rule Safety

The adapter never hard-codes final personality IDs, personality names, archetypes, or final analysis text. It only maps visual feature values into deterministic rule-engine input fields.

Stage 5F can decide how to wire the production end-to-end flow:

```txt
provider
-> normalizeVlmToPalmFeatureSet
-> palmFeatureSetToRuleInput
-> matchPersona
-> RecognitionResult
-> UI
```

Stage 5E intentionally stops before that production chain.
