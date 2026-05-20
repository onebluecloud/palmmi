# Palmmi Stage 5 Acceptance Criteria

> Acceptance standards for Stage 5A through Stage 5F. These criteria preserve Stage 4 boundaries while adding the real recognition chain.

## Stage 5A Acceptance

Stage 5A is accepted when:

- `docs/stage5/STAGE5_PLAN.md` exists.
- `docs/stage5/STAGE5_DECISIONS.md` exists.
- `docs/stage5/STAGE5_API_CONTRACT.md` exists.
- `docs/stage5/STAGE5_ACCEPTANCE.md` exists.
- `docs/stage5/STAGE5_STATE.md` exists.
- The documents align with `docs/stage4/STAGE5_HANDOFF.md`.
- No implementation code is modified.
- No dependencies are installed.
- No unrelated tests are run.
- Stage 5 scope does not expand into payment, login, real sharing, SEO, mini program, or UI redesign.

## Stage 5B Acceptance

Stage 5B is accepted when:

- `anonymous_device_id` is created and stored under `palmmi:anonymousDeviceId` in `localStorage`.
- `anonymous_device_id` contains no personal information and is not treated as login.
- Upload/analyze skeleton uses the provider abstraction.
- Mock Provider can complete the flow without real API keys.
- Existing Stage 4 route flow remains intact.
- Existing Stage 4 visual layout and poster style are unchanged.
- Existing storage boundaries remain compatible:
  - `palmmi:lastUpload`
  - `palmmi:lastAnalysisResult`
- Browser storage does not keep real uploaded images long term.
- Recoverable upload/analyze/result errors map to Stage 4-compatible states.
- Tests or manual verification cover successful mock analysis and at least one recoverable error.

## Stage 5C Acceptance

Stage 5C is accepted when:

- A VLM comparison plan exists under `docs/stage5/experiments/`.
- 10-20 real palm images are evaluated without committing private raw images by default.
- Candidate providers are compared on:
  - structured-output stability
  - refusal rate
  - cost
  - speed
  - availability
  - integration complexity
  - error recoverability
- The experiment records schema failures and low-confidence behavior.
- The experiment records how provider output maps into `PalmFeatureSet`.
- A recommendation is documented for the first real Stage 5D provider.
- The recommendation includes fallback notes and known risks.

## Stage 5D Acceptance

Stage 5D is accepted when:

- One real provider is integrated behind `VlmProvider`.
- Mock Provider remains available for deterministic tests.
- Provider selection is configuration-driven.
- API keys are read only from environment variables.
- No API key is committed, logged, shown to frontend code, or written into docs.
- Provider timeout, retry limit, and provider-error mapping exist.
- Provider output is validated before normalization.
- Raw provider output is not written to result/poster storage.
- Provider failures produce Stage 4-compatible recoverable states.
- Cost and latency behavior are documented for Stage 6.

## Stage 5E Acceptance

Stage 5E is accepted when:

- `VlmAnalyzeOutput` is normalized into `PalmFeatureSet`.
- `PalmFeatureSet` is validated before persona mapping.
- Deterministic rules map palm features to the 36-persona result.
- VLM output does not directly decide `primary_persona`.
- LLM second-pass reasoning is not used for persona selection.
- `RecognitionResult` is the only result shape consumed by result/poster pages.
- Original 36-persona text and original rule source are not rewritten.
- Tests cover:
  - success
  - low confidence
  - retry required
  - rejected image
  - provider timeout/error
  - schema invalid
  - deterministic mapping stability

## Stage 5F Acceptance

Stage 5F is accepted when:

- Full flow works:

```text
index.html
-> upload/index.html
-> analyze/index.html
-> result/index.html
-> poster/index.html
-> upload/index.html
```

- Result page displays only normalized `RecognitionResult`.
- Poster page displays only normalized `RecognitionResult`.
- Error states do not expose model/provider internals.
- Stage 4 UI, layout, poster direction, and mobile-first visual baseline remain preserved.
- 390px and 430px screenshots are checked against Stage 4 expectations.
- Stage 4 storage/test/screenshot coverage is preserved or replaced with documented equivalent Stage 5 coverage.
- Stage 6 handoff exists and includes:
  - deployment runtime
  - environment variables
  - provider selection
  - API key handling
  - image retention/deletion policy
  - rate limits
  - cost controls
  - rollback plan

## Stage 5 Completion Criteria

Stage 5 is complete only when:

- 5A through 5F are accepted.
- Real provider integration works through the provider abstraction.
- Mock Provider remains available for repeatable tests.
- `RecognitionResult` is stable and documented.
- Deterministic persona mapping is implemented and tested.
- No Stage 4 UI regression is introduced.
- No forbidden scope has been added.
- Stage 6 handoff is ready for deployment planning.

## Conditions to Enter Stage 6

Palmmi can enter Stage 6 when:

- The full recognition flow is verified end to end.
- API keys and provider settings are environment-only.
- Image retention and deletion behavior is documented.
- Rate limiting and basic abuse protection are defined.
- Stage 5 test and screenshot evidence is recorded.
- Deployment environment requirements are known.
- Human approval confirms Stage 5 is frozen.
