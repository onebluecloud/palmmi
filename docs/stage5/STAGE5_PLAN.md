# Palmmi Stage 5 Plan

> Stage 5A planning freeze. This document is a planning artifact only and does not authorize implementation changes in this round.

## Stage 4 Alignment

Stage 5 is based on `docs/stage4/STAGE5_HANDOFF.md`.

The Stage 4 handoff defines Stage 5 as the real VLM / API connection phase. Stage 5 should connect the existing static mock frontend flow to real image recognition, a controlled server/API boundary, normalized model output, and the existing result/poster rendering shape.

Stage 5 must not redo the Stage 4 productized UI, route flow, poster style, storage contracts, screenshot baseline, or 36-persona content.

## Stage 5 Goal

Turn the Stage 4 static frontend shell into a real recognition pipeline:

```text
upload image
-> basic image validation
-> VLM Provider analyzes palm features
-> normalize into RecognitionResult
-> deterministic rules map features to one of 36 personas
-> result page reads stable result shape
-> recoverable error states are shown
-> Stage 6 deployment handoff is prepared
```

The main deliverable is a stable, testable recognition chain that preserves the Stage 4 user experience while replacing mock data with a controlled provider-backed pipeline.

## Stage 5 Non-Goals

Stage 5 does not do the following:

- Redesign UI.
- Change Stage 4 visual layout, poster direction, or mobile-first presentation.
- Rewrite the 36-persona text or the original personality-rule source.
- Add payment.
- Add login.
- Add phone, WeChat, or account binding.
- Add real viral sharing.
- Add SEO work.
- Build a mini program.
- Perform broad project-structure refactors.
- Let the VLM directly decide the final persona.
- Let raw VLM output flow directly into result or poster pages.
- Put API keys in frontend code, committed config, screenshots, docs, or logs.
- Store user images long term without an explicit retention and deletion policy.

If any Stage 5 task cannot be completed without violating these boundaries, work must stop and the conflict must be reported for human confirmation.

## Stage 5 Substages

### 5A: Planning Freeze + Technical Decisions

**Goal:** Freeze the Stage 5 scope, provider strategy, API contract, acceptance criteria, and handoff state before implementation.

**Allowed paths for 5A:**

```text
docs/stage5/**
```

**Acceptance:**

- `docs/stage5/STAGE5_PLAN.md` exists.
- `docs/stage5/STAGE5_DECISIONS.md` exists.
- `docs/stage5/STAGE5_API_CONTRACT.md` exists.
- `docs/stage5/STAGE5_ACCEPTANCE.md` exists.
- `docs/stage5/STAGE5_STATE.md` exists.
- No implementation code is modified.
- Stage 4 UI, route, poster, storage, and persona content boundaries remain untouched.

**Human gate:** Human approves the Stage 5A documents before Stage 5B starts.

### 5B: Upload / Analyze Skeleton + anonymous_device_id + Mock Provider

**Goal:** Add the smallest real pipeline skeleton using a Mock Provider and anonymous device tracking, without changing the Stage 4 visual presentation.

**Recommended allowed paths for 5B:**

```text
docs/stage5/**
upload/index.html
analyze/index.html
scripts/palmmi-analyze.js
scripts/*storage*.js
tests/**
```

If the project uses different existing storage/helper filenames, use those existing files instead of creating parallel helpers.

**Acceptance:**

- `anonymous_device_id` is created once and stored in `localStorage`.
- Upload flow still starts from the existing upload page.
- Analysis can run through a Mock Provider behind the provider abstraction.
- No real API key is required.
- No Stage 4 visual redesign occurs.
- Existing `palmmi:lastUpload` and `palmmi:lastAnalysisResult` boundaries remain compatible.
- Recoverable error states still use the Stage 4 language and flow.

**Human gate:** Human confirms that the skeleton preserves Stage 4 UX before any real model experiment or provider integration.

### 5C: VLM Model Comparison Experiment

**Goal:** Run a small comparison of candidate VLM providers before locking the first real provider.

**Recommended allowed paths for 5C:**

```text
docs/stage5/**
docs/stage5/experiments/**
tests/**
```

Real palm images should not be committed unless the user explicitly approves a privacy-safe fixture set. Prefer local-only or ignored experiment inputs.

**Acceptance:**

- 10-20 real palm images are tested.
- Each candidate is scored for structured-output stability, refusal rate, cost, latency, and operational availability.
- Raw provider responses are stored only in a safe local experiment artifact or summarized without secrets/personal data.
- The experiment produces a recommendation for Stage 5D.
- Mock Provider remains available for deterministic tests.

**Human gate:** Human chooses or approves the first real provider for Stage 5D.

### 5D: Real Provider Integration

**Goal:** Connect one real VLM provider through the provider abstraction and controlled API boundary.

**Recommended allowed paths for 5D:**

```text
docs/stage5/**
api/**
server/**
scripts/palmmi-analyze.js
scripts/*storage*.js
tests/**
package.json
package-lock.json
```

Only use `package.json` or lockfile changes if the selected runtime requires a dependency and the dependency is explicitly justified.

**Acceptance:**

- The first real provider is selected through configuration, not hard-coded into the product model.
- API keys are read only from environment variables.
- Provider timeout, schema validation, retry limit, and error mapping exist.
- Frontend code never receives or logs provider secrets.
- Raw VLM output is not written directly to result/poster storage.
- Provider failures map to recoverable user-facing states.

**Human gate:** Human confirms provider choice, environment variable names, and cost/timeout limits before Stage 5E.

### 5E: RecognitionResult Standardization + Deterministic Persona Mapping

**Goal:** Normalize provider output into `RecognitionResult`, then map palm features to the 36 personas through deterministic rules.

**Recommended allowed paths for 5E:**

```text
docs/stage5/**
scripts/palmmi-analyze.js
scripts/*rules*.js
scripts/*recognition*.js
tests/**
```

If the original 36-persona or Stage 3 rule files live elsewhere, they may be read and referenced, but their original text and rule source must not be rewritten in this stage.

**Acceptance:**

- `PalmFeatureSet` is validated before persona mapping.
- `RecognitionResult` is the only result shape written for result/poster consumption.
- Deterministic mapping decides the final persona.
- VLM output never directly decides `primary_persona`.
- LLM second-pass reasoning is not used to choose persona.
- Tests cover success, low confidence, retry required, rejected, and provider-error cases.

**Human gate:** Human reviews sample normalized outputs and persona mapping behavior before page-level integration.

### 5F: Page Integration + Full-Chain Test + Stage 6 Handoff

**Goal:** Connect the preserved Stage 4 pages to the real Stage 5 pipeline, verify the full flow, and prepare deployment handoff.

**Recommended allowed paths for 5F:**

```text
docs/stage5/**
docs/stage6/**
upload/index.html
analyze/index.html
result/index.html
poster/index.html
scripts/**
styles/**
tests/**
```

Visual or layout changes must be limited to wiring states that are impossible to support with existing UI. Any visual change requires explicit review.

**Acceptance:**

- Full flow works: `index.html -> upload -> analyze -> result -> poster -> upload`.
- Error states remain recoverable and do not expose technical/provider details.
- Result and poster pages continue to read stable `RecognitionResult` data.
- 390px and 430px mobile screenshots remain aligned with Stage 4 visual baseline.
- Stage 4 storage, route, screenshot, and error-state tests pass or have documented equivalent replacements.
- Stage 6 handoff documents deployment needs, environment variables, provider limits, image retention, and rollback plan.

**Human gate:** Human approves Stage 5 completion and Stage 6 readiness.

## Cross-Stage Acceptance Rules

- Every substage must preserve Stage 4 UI unless an explicit human decision allows a bounded visual change.
- Every implementation substage must include tests or a documented manual verification path.
- Provider-specific behavior must stay behind the provider abstraction.
- User-facing pages must consume normalized project data, not provider-native output.
- Secrets must never be committed or copied into documentation.
- Real user images must be temporary unless a later human-approved policy says otherwise.

## Manual Gates

1. **After 5A:** Approve scope, decisions, API contract, and acceptance.
2. **Before 5C:** Approve use of real palm images and experiment handling.
3. **Before 5D:** Approve first real provider, env var names, timeout, retry, and cost limits.
4. **Before 5E:** Approve sample `PalmFeatureSet` and deterministic mapping behavior.
5. **Before 5F:** Approve page integration path and visual non-regression expectations.
6. **Before Stage 6:** Approve deployment handoff, rollback plan, and production-risk checklist.
