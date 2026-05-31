# Palmmi Stage 9 Public Launch Guard

Date: 2026-05-31

Status: `NOT_STARTED_BLOCKED_BY_STAGE6H_6I_8`

This document is an internal launch guard only. It is not public copy, not a launch announcement, and not permission to publish.

## 1. Entry Criteria

Stage 9 can start only after:

- Stage 6H reaches at least `CONDITIONAL_PASS`.
- Stage 6I is closed as `PASS` or `CONDITIONAL_PASS`.
- Stage 7 prep material is reviewed and approved by the user.
- Stage 8 soft launch has real feedback and no P0 / P1 blocker.
- Qwen cost from Stage 8 is reviewed and acceptable.
- The user explicitly chooses a public launch channel and timing.

Current status:

| Gate | Current Status |
|---|---|
| Stage 6H real-device acceptance | `MANUAL_REQUIRED` |
| Stage 6I release candidate | `BLOCKED_BY_STAGE6H_MANUAL_REQUIRED` |
| Stage 7 marketing prep | `PREPARED_NOT_ACTIVE` |
| Stage 8 soft launch | `NOT_STARTED_BLOCKED_BY_STAGE6H_6I_7` |
| Public launch | `NOT_ALLOWED` |

## 2. Hard No-Go Conditions

Do not start Stage 9 if any item is true:

- iPhone WeChat or Android WeChat true-device flow is untested.
- Result page or poster page has a real-device P0 / P1 issue.
- API errors expose key, token, base64 image, raw provider response, or stack trace.
- Default tests call real Qwen.
- Qwen cost is unknown or unacceptable.
- Stage 8 did not run with real users.
- The user has not approved public posting.

## 3. Allowed Preparation Before Stage 9

The following are allowed while Stage 9 is blocked:

- Keep this guard document up to date.
- Review Stage 7 draft positioning for safety.
- Prepare private checklists for launch day.
- Keep public channels dormant.
- Keep `workers.dev` as the test link unless the user explicitly approves domain work.

## 4. Forbidden Before Stage 9

Do not do these before the entry criteria pass:

- Do not post on Xiaohongshu, Douyin, X, WeChat Moments, Product Hunt, or similar public channels.
- Do not bind a formal domain.
- Do not change DNS.
- Do not add payment, tipping, login, membership, or a database.
- Do not modify Stage 3 personality rules, weights, or thresholds.
- Do not rewrite Stage 5 Qwen / VLM logic.
- Do not run real Qwen E2E automatically.

## 5. Launch-Day Verification

Before any public post, re-run:

```text
npm test
npm run build
npm run security-scan
npm run smoke:stage6f:qwen
npm run preflight:stage6h -- --expect-commit <latest-origin-main-commit>
npm run precheck:stage6i -- --expect-commit <latest-origin-main-commit> --manual-result-file <Codex-saved-stage6h-result-text> --require-manual-result
```

Expected zero-cost verification:

- `npm test` reports `api_calls_made=0`.
- `smoke:stage6f:qwen` reports `REAL_QWEN_DISABLED`, `api_calls_made=0`.
- `preflight:stage6h` reports `api_calls_made=0`, `quota_consumed=false`, and deployed commit match.
- `precheck:stage6i` reports `precheck_ok=true`, `formal_gate_ok=true`, and `can_enter_stage6i=true`.

Do not run real Qwen E2E unless the user explicitly approves quota use for a manual final check.

## 6. Stage 9 Current Conclusion

```text
Stage 9 = NOT_STARTED_BLOCKED_BY_STAGE6H_6I_8
```

The next required action is still Stage 6H true-device feedback. Stage 9 must not be marked `PASS` or `CONDITIONAL_PASS` until Stage 8 produces acceptable real-user feedback.
