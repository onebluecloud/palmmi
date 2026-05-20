# Palmmi Stage 5 To Stage 6 Handoff

## Handoff Decision

Stage 5 is ready to freeze and hand off to Stage 6 planning.

Recommended next step:

```text
Stage 6A - deployment plan confirmation
```

Do not start broad Stage 6 implementation before confirming deployment runtime, secret handling, logging, rate limits, smoke tests, and rollback.

## Stage 6 Can Do

Stage 6 may cover:

- Deployment platform selection.
- Domain setup.
- HTTPS setup.
- Production environment variables.
- Platform secret configuration.
- Production logging.
- Basic monitoring.
- Rate limiting.
- Provider call volume and cost monitoring.
- Deployment smoke tests.
- Grey testing with real images.
- WeChat in-app browser testing.
- Mobile device testing.
- Privacy statement confirmation.
- Rollback and recovery plan.

## Stage 6 Cannot Do By Default

Stage 6 must not use deployment as an excuse to expand product scope.

Do not do by default:

- Redesign UI.
- Rewrite 36-persona copy.
- Change persona rules, weights, or thresholds.
- Add complex login.
- Add account binding.
- Add large commercial features.
- Build a mini program.
- Add real payment flow.
- Add real sharing growth loop.
- Add SEO as a side task.

Real payment, login, mini program, or large commercial features require a separate human-approved stage.

## Boundaries Stage 6 Must Protect

Required boundaries:

- API Key only in platform/server secret configuration.
- Frontend never holds API Key.
- Frontend never uses provider-native authenticated requests.
- Result/poster never receive provider raw response.
- Result/poster never fetch Qwen or provider endpoints.
- `/api/analyze` or equivalent backend boundary returns only normalized safe data or stable errors.
- Images are not stored long term by default.
- Logs redact request bodies, Authorization headers, provider raw responses, complete base64 payloads, signed URLs, and private user data.
- Real provider costs are controlled by rate limits and monitoring.
- No silent production mock fallback unless a human explicitly approves it.

## Current Stage 5 Runtime Shape

Current local/test shape:

```text
static pages
  -> analyze page same-origin /api/analyze when served over HTTP(S)
  -> api/analyze.js
  -> server/stage5p/analyze-service.js
  -> provider selection
  -> MockVlmProvider or QwenVlmProvider
  -> analysis-result.v1
  -> result/poster adapters
```

Current provider variables:

```text
PALMMI_VLM_PROVIDER=mock | qwen
PALMMI_VLM_MODE=mock-only | real-only | real-with-mock-fallback
PALMMI_QWEN_API_KEY=<platform secret only>
PALMMI_QWEN_MODEL=<configured outside docs if changed>
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

Do not store real secret values in docs, code, tests, `.env`, `.env.local`, browser storage, or frontend config.

## Human Preparation Checklist

Before Stage 6 implementation, prepare:

- Deployment platform choice.
- Domain.
- HTTPS plan.
- Production Qwen Key or provider secret.
- Platform secret manager access.
- Production environment variable values.
- ICP/filing decision if needed.
- 3-10 grey-test palm images.
- 1-2 invalid or low-quality test samples.
- WeChat in-app test devices.
- Mobile browser test devices.
- Privacy statement final wording.
- Log retention and redaction policy.
- Rate-limit policy.
- Cost budget or call-volume guardrail.
- Rollback plan.
- Donation QR code if Stage 6 explicitly wants static donation placement; default Stage 6 does not add a payment system.

## Recommended Stage 6 Split

### 6A Deployment Plan Confirmation

Choose runtime:

```text
serverless function
Node service
worker route
other backend boundary
```

Decide:

- Static asset hosting.
- API route hosting.
- Body-size limits.
- Timeout limits.
- Rollback method.

### 6B Production Environment Variables And Secrets

Configure:

- Provider mode.
- Provider secret.
- Model variable.
- Timeout.
- Max image bytes.
- Any platform-specific secret bindings.

Verify:

- Secret is not available to frontend bundle.
- Secret does not use public env prefixes.
- `.env.example` remains placeholder-only.

### 6C Deployment Smoke Test

Run:

- Mock smoke.
- No-key or intentionally missing-secret staging guard.
- One real Qwen smoke.
- Result page refresh after real result.
- Poster page refresh after real result.
- Error-state smoke.

### 6D WeChat And Mobile Real Environment Test

Verify:

- Upload works in WeChat browser.
- Analyze route works under HTTPS.
- Result and poster pages render on target mobile widths.
- Refresh behavior does not crash.
- Error states are recoverable.

### 6E Logs, Rate Limits, And Cost Protection

Add:

- Request count tracking.
- Provider latency tracking.
- Error code counts.
- Basic rate limits.
- Cost/call-volume monitoring.
- Redaction verification.

Do not log:

- API Key.
- Authorization header.
- Full base64 image.
- Provider raw response.
- User private identity fields.

### 6F Grey Release And Rollback Plan

Run a small grey test first.

Track:

- Success rate.
- `VLM_API_INVALID_RESPONSE`.
- Provider timeout/request failure.
- User retry rate.
- Cost per successful analysis.
- Result/poster render errors.

Prepare rollback:

- Disable real provider.
- Switch to mock-only for local/dev only.
- Pause public entry if provider is unstable.
- Restore previous deployment.

### 6G Stage 6 Freeze

Freeze only after:

- Production smoke passes.
- Logs are redacted.
- Cost and rate controls exist.
- WeChat/mobile tests pass.
- Privacy statement is confirmed.
- Rollback path is tested.

## Known Risks To Carry Into Stage 6

Provider-output stability:

```text
One earlier Stage 5Q API-only rerun observed VLM_API_INVALID_RESPONSE for 1/5 real samples.
Stage 5R page flow passed 5/5.
Stage 5S rerun passed 5Q and 5R with 5/5 real successes.
```

Cost:

```text
Real provider calls incur cost and need deployment-level controls.
```

Privacy:

```text
Production logs, temporary upload handling, and cache behavior must be checked before grey release.
```

Scale:

```text
Stage 5 used a small sample set. Stage 6 should grey test before public scale.
```
