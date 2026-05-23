# Stage 3 Rules And Personality Engine

## Rule Locations

Stage 3 engineering docs:

```text
docs/stage3/**
docs/stage3/rule-engine/**
```

Runtime classifier code:

```text
lib/recognition/motherScores.ts
lib/recognition/personaCatalog.ts
lib/recognition/personaRules.ts
lib/recognition/personaMatcher.ts
lib/recognition/adjacentResolver.ts
lib/recognition/crossMotherCorrection.ts
```

Original/legacy rule data:

```text
PalmTag_rule_engine_v0/data/field_schema_33.json
PalmTag_rule_engine_v0/data/mother_scoring.json
PalmTag_rule_engine_v0/data/persona_rules.json
PalmTag_rule_engine_v0/data/adjacent_resolver.json
PalmTag_rule_engine_v0/data/display_content.json
PalmTag_rule_engine_v0/data/scoring_constraints.json
```

## 36-Persona Copy

Main display copy is in:

```text
PalmTag_rule_engine_v0/data/display_content.json
```

It contains persona IDs, names, hooks, quotes, final judgement text, poster title/subtitle, keywords, and share copy.

## Frozen Boundary

Frozen items:

```text
33 fields
8 mother types
36 personalities
weights
thresholds
mother/persona mapping
adjacent rules
cross-mother correction
persona copy
```

Do not modify these as part of Stage 6F validation or handoff work.

## Local Classifier Path

```text
Qwen palm_features
-> src/stage5/normalize-vlm-to-palm-feature-set.js
-> src/stage5/palm-feature-set-to-rule-input.js
-> src/stage5/palmmi-recognition-pipeline.js
-> lib/recognition/personaMatcher.ts
```

`palm-feature-set-to-rule-input.js` converts high-level features such as `main_line_type`, line depth, complexity, continuity, branch density, and palm shape into normalized 33-field rule input. It also records diagnostics such as usable feature count, unknown feature count, low-information state, score margin, and classifier version.

## Candidate Results

`candidate_results` are generated from the local Stage 3/5 match result, not from Qwen candidate hints. Each candidate should include:

```text
personality_id
personality_name
main_line_type
score
confidence
reason
score_breakdown
```

The main result must equal the first candidate:

```text
analysis_result.personality_id === analysis_result.candidate_results[0].personality_id
```

## Explicitly Forbidden

Do not:

- default to `P25` or `P31`;
- randomly shuffle personality output;
- hard-code rotation across personalities;
- exclude P25/P31 artificially to hide collapse;
- let Qwen decide final personality;
- mutate Stage 3 rules, scores, weights, thresholds, or persona text to pass Stage 6F.
