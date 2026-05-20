# Palmmi Stage 5 Final Report

## 1. Stage 5 Summary

Stage 5 is the real VLM recognition-chain stage. It connected Palmmi's preserved Stage 4 page flow to a controlled server/API boundary, provider selection, Qwen VLM provider, normalized recognition output, and result/poster consumption through `analysis-result.v1`.

Final freeze review result:

```text
Stage 5 freeze recommendation: yes
recommended next stage: Stage 6A - deployment plan confirmation
direct Stage 6 implementation: not started
```

## 2. Completed Scope

Completed:

- Stage 5A planning, decisions, API contract, acceptance criteria, and state documents.
- Stage 5B upload/analyze skeleton, anonymous device id, Mock Provider, and basic image validation.
- Stage 5C-M provider contract, normalization, deterministic recognition pipeline, `analysis-result.v1`, page adapters, result/poster mapping, and mock regressions.
- Stage 5N result/poster browser boundary verification.
- Stage 5O provider wiring plan, security boundary review, and environment plan.
- Stage 5P server/API boundary, provider selection, Qwen Provider wiring, no-key guard, mock mode, and boundary tests.
- Stage 5Q real Qwen minimum-chain test through `api/analyze.js` and `server/stage5p/analyze-service.js`.
- Stage 5R real page regression from upload through analyze, Qwen, result, and poster.
- Stage 5S final freeze review, regression rerun, security scan, and Stage 6 handoff documents.

## 3. Not Done In Stage 5

Not in Stage 5 scope:

- Production deployment.
- Domain, HTTPS, or hosting platform setup.
- Production platform secret configuration.
- Production logging, monitoring, rate limiting, or cost dashboards.
- Real payment, login, SEO, mini program, or real sharing loop.
- UI redesign or visual refresh.
- Persona copy, rule, weight, or threshold changes.
- Large-scale real-user image validation.

## 4. Real VLM Chain Status

Current real chain:

```text
upload page
  -> analyze page
  -> same-origin /api/analyze
  -> server/stage5p/analyze-service.js
  -> provider selection
  -> QwenVlmProvider
  -> VlmAnalyzeOutput-like provider result
  -> recognition pipeline
  -> analysis-result.v1
  -> result page
  -> poster page
```

Status:

```text
Qwen Provider exists: yes
provider selection exists: yes
analyze API boundary exists: yes
real Qwen minimum chain passed: yes
real page chain passed: yes
real palm samples in Stage 5S rerun: 5
Stage 5S real minimum-chain successes: 5
Stage 5S real page-flow successes: 5
```

API Key handling:

```text
API Key detected in environment during 5S: yes
API Key value printed or documented: no
API Key written to repo: no
```

## 5. Mock Chain Status

Mock mode remains available and covered by regression.

```text
default provider mode: mock/mock-only when provider env is absent
MockVlmProvider remains selectable: yes
mock provider reads Qwen key: no
Stage 5P mock boundary test: passed
Stage 5R mock page flow: passed
```

## 6. Page Chain Status

Stage 5R and Stage 5S verified:

```text
upload -> analyze -> /api/analyze -> provider -> result -> poster
```

Results:

```text
real page flow tested: yes
real palm page-flow samples: 5
successful real page flows: 5
result page displayed a user-visible result state: yes
poster page displayed a user-visible poster state: yes
mock page flow passed: yes
error states stayed stable: yes
```

The real outputs rendered as `partial-result` because the samples produced low-confidence/degraded recognition outputs. This is acceptable for Stage 5 freeze because the chain remains safe, normalized, and renderable.

## 7. Result/Poster Status

Result and poster pages remain render-only consumers.

```text
result/poster direct provider fetch: no
result/poster direct Qwen call: no
result/poster API Key access: no
result/poster provider raw response access: no
result/poster reads analysis-result.v1 adapter output: yes
```

The tested storage handoff remains:

```text
palmmi:anonymousDeviceId
palmmi:lastUpload
palmmi:lastAnalysisResult
palmmi:lastAnalyzeError
```

## 8. Security Boundary Status

Stage 5S security freeze scan passed.

Checked:

- Frontend files do not contain Qwen key handling.
- Result/poster do not fetch provider endpoints.
- Result/poster do not read provider raw response.
- `.env.example` contains empty placeholders only.
- Stage 5 docs/tests do not contain a real API key.
- Sensitive console statement scan found no API Key, complete base64, or provider raw-response logging pattern.
- API responses and page DOM do not expose API Key, complete base64 image payloads, provider raw response, `provider_output`, `raw_provider`, `raw_response`, `rawText`, or `recognition_result.debug`.

## 9. Test Summary

Stage 5S commands passed:

```text
Stage 5B-R regression: exit 0
Stage 4C/4D/4E/4F/4G/4I/4J regression: exit 0
static security freeze scan: exit 0
```

Key Stage 5S real-call result:

```text
Stage 5Q real minimum-chain rerun: 5/5 real palm samples succeeded
Stage 5R real page-flow rerun: 5/5 real palm samples succeeded
mock flow: passed
no-key guard: stable VLM_API_KEY_MISSING path
provider invalid response page path: stable error state
```

Failed test commands:

```text
none
```

## 10. Known Risks

### Qwen Output Stability

Stage 5Q API-only testing previously observed one `VLM_API_INVALID_RESPONSE` among five real samples during one rerun. The same image set passed Stage 5R page-flow testing 5/5, and the Stage 5S rerun passed 5Q and 5R with 5/5 real successes.

Conclusion:

```text
not a page-link blocker
still a provider-output stability observation
continue monitoring during Stage 6 grey release
```

### Cost

Real provider calls cost money. Stage 6 needs deployment-level rate limiting, request volume monitoring, and cost alerts before broad release.

### Deployment Secret Boundary

The Qwen key must stay in server/platform secret configuration only. It must never use frontend-exposed environment prefixes or static frontend config.

### Image Privacy

Original images are not intended for long-term storage. Stage 6 must verify production log, cache, temporary file, object storage, and retention behavior.

### Real User Diversity

Stage 5 tested a small local sample set. Stage 6 should start with grey testing, not large-scale public promotion.

## 11. Freeze Recommendation

Stage 5 is recommended for freeze.

Reason:

- Real and mock recognition chains pass.
- Result/poster remain behind normalized data adapters.
- Stage 4 page regressions pass.
- Security boundary checks pass.
- UI/CSS and persona assets were not changed in 5S.
- Known provider-output stability risk is documented and non-blocking for deployment planning.

## 12. Stage 6 Recommendation

Recommended next stage:

```text
Stage 6A - deployment plan confirmation
```

Do not jump directly into broad Stage 6 implementation. Stage 6 should begin with deployment/runtime choices, secret handling, rate limiting, logging, smoke-test plan, and rollback plan.

## 13. Stage 6 Preconditions

Before production or grey release, a human should prepare:

- Deployment platform choice.
- Domain and HTTPS plan.
- Production Qwen/provider secret in the platform secret manager.
- Production environment variables.
- ICP/filing decision if needed for the deployment target.
- 3-10 grey-test palm images.
- WeChat in-app test devices.
- Privacy statement final text.
- Log redaction policy.
- Rate-limit and cost-control policy.
- Rollback plan.
- Donation QR code only if Stage 6 explicitly wants a static donation placement; no real payment system is part of the default Stage 6 handoff.
