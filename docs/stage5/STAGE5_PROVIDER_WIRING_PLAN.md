# Palmmi Stage 5O Provider Wiring Plan

## Scope

Stage 5O is a planning and boundary review stage only.

It does not connect a real API, does not call Qwen/Doubao/GLM/Gemini/OpenAI, does not read or write API keys, and does not change UI/CSS/persona rules.

## 1. Current Mock Provider Chain

Current browser analyze path:

```text
analyze/index.html
  -> scripts/palmmi-analyze.js
  -> getStage5Api()
  -> scripts/palmmi-stage5.js
  -> runAnalyzeSkeleton()
  -> MockVlmProvider
  -> VlmAnalyzeOutput-like mock payload
  -> createStage5BRecognitionResult()
  -> sessionStorage palmmi:lastAnalysisResult
  -> result/poster Stage 5K reader
  -> Stage 5L mapper
  -> Stage 4 renderer
```

Current local experiment path:

```text
scripts/palmmi-stage5c-runner.js
  -> createProvider("mock" | "qwen" | shell providers)
  -> analyzePalmImage()
  -> normalizeVlmToPalmFeatureSet()
  -> palmFeatureSetToRuleInput()
  -> runPalmmiRecognitionPipeline()
  -> runPalmmiAnalysisBridge()
  -> buildAnalysisResultContract()
```

Important current facts:

- Browser flow defaults to `MockVlmProvider`.
- `scripts/palmmi-stage5c-runner.js` has a Qwen experiment provider, but it is a Node/local runner path, not a safe browser path.
- `result` and `poster` do not call providers. They consume only Stage 5K page-readable data.
- The project currently has no `api/`, `server/`, `app/`, `pages/`, or `public/` service boundary and no `package.json`.

## 2. Real Provider Should Connect Here

Real provider integration should connect behind a server-side provider boundary:

```text
server/API route/worker/proxy
  -> provider selection
  -> RealVlmProvider
  -> VlmAnalyzeOutput
  -> provider output validation
  -> PalmFeatureSet normalization
  -> deterministic RecognitionResult pipeline
  -> analysis-result.v1 response/storage handoff
```

Preferred Stage 5P entrypoint:

```text
POST /api/analyze
```

or the platform equivalent:

```text
server/analyze endpoint
Cloudflare Worker route
Vercel/Netlify function
Node HTTP route
```

The provider adapter must run only in that server-side boundary because it needs environment variables and provider secrets.

## 3. Real Provider Must Not Connect Here

Do not connect a real provider in:

```text
index.html
upload/**
analyze/index.html
result/**
poster/**
styles/**
browser-loaded result/poster scripts
browser localStorage/sessionStorage readers
Stage 4 renderer code
persona rule/data files
```

Do not place provider secrets in:

```text
frontend JavaScript
HTML script tags
sessionStorage
localStorage
docs
test fixtures
screenshots
console logs
browser network-visible config
```

## 4. Provider Switch Strategy

### mock

Use for:

- default local development
- CI-style deterministic tests
- browser result/poster verification
- fallback when real provider is disabled

Behavior:

- no API key
- no cost
- deterministic payload
- no real image upload to third-party provider

### real

Use only when:

- a server/API/worker boundary exists
- human has chosen the provider
- API key is configured outside the repo
- timeout, image size, retry, logging, and cost limits are set
- mock fallback remains available

Behavior:

- reads API key only server-side
- returns normalized `VlmAnalyzeOutput`
- never lets raw provider response reach result/poster pages

### fallback

Use when:

- provider mode is disabled
- provider returns timeout/unavailable/schema invalid
- API key is missing in non-production or explicitly configured fallback mode

Recommended modes:

```text
PALMMI_VLM_MODE=mock-only
PALMMI_VLM_MODE=real-only
PALMMI_VLM_MODE=real-with-mock-fallback
```

Production should not silently turn provider failures into fake final results. A mock fallback may be used for developer testing; user-facing production fallback should normally return a stable retry/error state unless a human explicitly approves mock results in production.

## 5. Recommended Environment Variables

Canonical names for Stage 5P:

```text
PALMMI_VLM_PROVIDER=mock | qwen | doubao | glm4v | gemini
PALMMI_VLM_MODE=mock-only | real-only | real-with-mock-fallback
PALMMI_QWEN_API_KEY=<server-side secret only>
PALMMI_QWEN_MODEL=qwen3-vl-flash
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

Compatibility aliases, if the deployment platform or existing tooling requires shorter names:

```text
QWEN_API_KEY
QWEN_MODEL
VLM_TIMEOUT_MS
VLM_MAX_IMAGE_BYTES
```

Preferred project-specific names are the `PALMMI_*` names because they reduce accidental collision with other projects.

## 6. Provider Data Flow After Stage 5P

Target flow:

```text
upload/analyze
  -> image validation
  -> anonymous_device_id
  -> server/API/worker request
  -> provider selection
  -> RealVlmProvider or MockVlmProvider
  -> VlmAnalyzeOutput
  -> normalizeRecognition / PalmFeatureSet normalization
  -> deterministic RecognitionResult
  -> analysis-result.v1 contract
  -> result/poster adapter
```

The VLM provider extracts palm features only. It must not decide final persona identity, rewrite persona copy, or reorder Top3.

## 7. Mock Provider Responsibility

Mock provider owns:

- deterministic provider-shaped output
- no-cost local and regression testing
- no API key path
- known fixture behavior for error and success states

Mock provider must not:

- hide production provider failures from users unless explicitly configured
- become the product result source in production without a human decision
- contain real provider response samples with sensitive content

## 8. Real Provider Responsibility

Real provider owns:

- provider-native request formatting
- provider-native response parsing
- timeout handling
- schema validation before normalization
- mapping provider errors to stable project errors
- avoiding raw response leakage

Real provider must not:

- write directly to `palmmi:lastAnalysisResult`
- expose raw provider JSON to pages
- decide `primary_persona`
- log full images, API keys, prompts with secrets, or raw provider response bodies

## 9. Stage 5P Allowed Paths

Recommended allowed paths for real provider integration:

```text
docs/stage5/**
tests/stage5/**
api/**
server/**
workers/**
functions/**
```

Conditional allowed paths, only if needed and explicitly scoped:

```text
scripts/palmmi-stage5c-runner.js
scripts/palmmi-stage5.js
scripts/palmmi-analyze.js
package.json
package-lock.json
```

Conditions:

- `scripts/palmmi-stage5c-runner.js` may be used for local provider experiments only.
- Browser-loaded scripts may only call the server/API boundary; they must not contain provider keys or provider-native request logic.
- `package.json`/lockfile changes are allowed only if the selected server runtime or test runner needs a justified dependency.

## 10. Stage 5P Forbidden Paths

Forbidden unless a later human-approved stage explicitly changes scope:

```text
styles/**
index.html
upload/index.html visual DOM
analyze/index.html visual DOM
result/**
poster/**
PalmTag_rule_engine_v0/data/display_content.json
PalmTag_rule_engine_v0/data/mother_scoring.json
PalmTag_rule_engine_v0/data/persona_rules.json
PalmTag_rule_engine_v0/data/scoring_constraints.json
.env
.env.local
docs containing real secret values
```

Also forbidden:

- adding real sharing
- adding payment
- adding login
- adding SEO
- adding mini program scope
- changing 36 persona copy
- changing persona rules/weights/thresholds
- putting provider secrets into frontend bundles

## 11. Stage 5P Minimum Acceptance

Stage 5P can be accepted only when:

- one real provider is connected behind a server-side provider boundary
- mock provider remains available
- provider choice is configuration-driven
- API key is read only from server-side env vars
- missing API key produces a stable non-secret error
- timeout and max image size limits exist
- provider raw response is validated before normalization
- raw provider output is not stored in result/poster page-readable data
- result/poster Stage 5N browser tests still pass
- Stage 5B-M regressions still pass
- no UI/CSS/persona/rule/weight/threshold changes are made

## 12. Stage 5P Human Gate

Before Stage 5P implementation, a human must decide:

```text
real provider choice
whether first provider is Qwen only
API key configuration location
deployment runtime
timeout limit
image size limit
retry policy
whether mock fallback is allowed outside development
3-5 local real test images
```
