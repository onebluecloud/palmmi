# Palmmi Stage 6I Release Candidate Checklist

Date: 2026-05-31

## 1. Stage Status

Stage 6I status: `BLOCKED_BY_STAGE6H_MANUAL_REQUIRED`

Stage 6I is not active yet. This checklist is prepared in advance so the release-candidate closeout can start immediately after Stage 6H reaches at least `CONDITIONAL_PASS`.

Current blocker:

- iPhone Safari real-device acceptance: `MANUAL_REQUIRED`
- iPhone WeChat real-device acceptance: `MANUAL_REQUIRED`
- Android Chrome real-device acceptance: `MANUAL_REQUIRED`
- Android WeChat real-device acceptance: `MANUAL_REQUIRED`

## 2. Entry Criteria

Stage 6I can start after Stage 6H reaches at least `CONDITIONAL_PASS`. The minimum manual gate for `CONDITIONAL_PASS` is iPhone WeChat plus Android WeChat, no P0 / P1 true-device blocker, and any untested iPhone Safari / Android Chrome items kept as `MANUAL_REQUIRED` rather than marked PASS.

| Gate | Required Result | Current Result | Evidence |
|---|---|---|---|
| Stage 6G-Finalize deployed | PASS | PASS | Latest deployment is now confirmed through `/build-meta.json`; Cloudflare Dashboard is only a fallback if build metadata is unavailable. |
| Latest pushed documentation state deployed | PASS / MANUAL_REQUIRED | PASS_BY_BUILD_META | `npm run preflight:stage6h -- --expect-commit <latest-origin-main-commit>` confirms the live workers.dev commit through `/build-meta.json` without Cloudflare auth. Dashboard is only a fallback if this command fails. |
| Stage 6H automated online review | PASS | PASS | `/`, `/upload/`, `/result/`, `/poster/`, empty API POST, and non-image API POST passed. |
| iPhone Safari real device | PASS / CONDITIONAL_PASS / MANUAL_REQUIRED_WITH_RISK | MANUAL_REQUIRED | Waiting for user test result; can remain MANUAL_REQUIRED only if WeChat minimum gate passes and no P0 / P1 blocker is observed. |
| iPhone WeChat real device | PASS / CONDITIONAL_PASS | MANUAL_REQUIRED | Waiting for user test result. |
| Android Chrome real device | PASS / CONDITIONAL_PASS / MANUAL_REQUIRED_WITH_RISK | MANUAL_REQUIRED | Waiting for user test result; can remain MANUAL_REQUIRED only if WeChat minimum gate passes and no P0 / P1 blocker is observed. |
| Android WeChat real device | PASS / CONDITIONAL_PASS | MANUAL_REQUIRED | Waiting for user test result. |
| No P0 / P1 true-device blocker | PASS | UNKNOWN | Cannot be known until real-device testing finishes. |

## 3. Required Verification Commands

These commands must be re-run when Stage 6I actually starts:

Preferred aggregate command:

```text
npm run precheck:stage6i -- --expect-commit <latest-origin-main-commit> --manual-result-file <Codex-saved-user-result-text> --require-manual-result
```

This command runs only the zero-cost checks listed below. It refuses to run if `PALMMI_ALLOW_REAL_QWEN_TESTS=1` is set, redacts command output summaries, and reports `api_calls_made=0`, `quota_consumed=false`, and `real_qwen_called=false` when the path is safe. Without `--manual-result-file`, it can still prove the automated precheck is safe, but `can_enter_stage6i` remains `false` because Stage 6H manual evidence is missing. Use `--require-manual-result` for the formal Stage 6I gate so missing or insufficient manual evidence exits fail-safe. If `--require-manual-result` is used without `--manual-result-file`, the command fails immediately with `STAGE6I_MANUAL_RESULT_FILE_MISSING` and does not run child commands.

| Command | Purpose | Real Qwen Cost |
|---|---|---|
| `npm test` | Default regression; must not call real Qwen. | NO |
| `npm run build` | Cloudflare Pages build output. | NO |
| `npm run security-scan` | Key/base64/raw response/logging scan. | NO |
| `npm run smoke:stage6f:qwen` | Dry-run Qwen smoke; must report `api_calls_made=0`. | NO |
| `npm run preflight:stage6h` | Online page/API invalid-input preflight; must report `api_calls_made=0`. | NO |
| `npm run preflight:stage6h -- --expect-commit <commit>` | Same as above, plus deployed commit check through `/build-meta.json`. | NO |
| `npm run check:stage6h:manual -- --file <result-text>` | Text-only check of user true-device result paste; must report `api_calls_made=0`. | NO |
| `npm run precheck:stage6i -- --expect-commit <commit> --manual-result-file <result-text> --require-manual-result` | Aggregates the zero-cost commands above, blocks if real-Qwen env is enabled, and fails safe if Stage 6H manual evidence is missing or insufficient. | NO |

Do not run `npm run test:stage6f:real`, `npm run e2e:real-qwen`, or any `--real` smoke command unless the user explicitly approves a real Qwen test and accepts quota use.

## 4. Precheck Run

Codex ran a Stage 6I preparation precheck on 2026-05-31. This does not promote Stage 6I to PASS because Stage 6H real-device testing is still missing.

| Command | Result | Evidence |
|---|---|---|
| `npm test` | PASS | Stage 5P + safe Stage 6F/6G + Stage 6H + Stage 6I script tests passed; `normal_palm_upload.status=DISABLED_BY_DEFAULT`, `api_calls_made=0`, `quota_consumed=false`. |
| `npm run build` | PASS | Cloudflare Pages static output written to `dist`. |
| `npm run security-scan` | PASS | `finding_count=0`; no key/base64/raw response/persistent image storage/sensitive logging findings. |
| `npm run smoke:stage6f:qwen` | PASS | Dry run returned `REAL_QWEN_DISABLED`, `api_calls_made=0`, `quota_consumed=false`. |
| `npm run preflight:stage6h` | PASS | Online pages passed; invalid API POST returned controlled 400; `api_calls_made=0`, `quota_consumed=false`. |
| `npm run precheck:stage6i -- --expect-commit 107b864627532992b7eb5366165ecffc23d96371` | PASS_ZERO_COST_NO_MANUAL_RESULT | Aggregated safe checks passed with `precheck_ok=true`, `api_calls_made=0`, `quota_consumed=false`, `real_qwen_called=false`; no manual-result file means `can_enter_stage6i=false` until Stage 6H user evidence arrives. |
| `npm run precheck:stage6i -- --expect-commit 83084e127a90b2a136e8ae10fd4bce122d16a43a --require-manual-result` | EXPECTED_FAILSAFE | Aggregated safe checks passed with zero Qwen calls, then formal gate exited non-zero with `STAGE6I_MANUAL_RESULT_REQUIRED` because no Stage 6H manual-result file was supplied. |
| `node tests/stage6i/release-candidate-precheck.test.cjs` | PASS | Confirms formal gate without `--manual-result-file` fails fast with `STAGE6I_MANUAL_RESULT_FILE_MISSING` before any child command runs. |

Real Qwen calls made by this precheck: `0`.

Qwen quota consumed by this precheck: `NO`.

## 5. Release Candidate Checklist

| Item | Status | Evidence / Notes |
|---|---|---|
| Default tests do not call real Qwen | PRECHECK_PASS | `npm test` passed with `api_calls_made=0`, `quota_consumed=false`; re-run when Stage 6I formally starts. |
| Build succeeds | PRECHECK_PASS | `npm run build` passed; re-run when Stage 6I formally starts. |
| Security scan passes | PRECHECK_PASS | `npm run security-scan` passed with `finding_count=0`; re-run when Stage 6I formally starts. |
| Qwen smoke dry run is zero-cost | PRECHECK_PASS | `npm run smoke:stage6f:qwen` passed with `api_calls_made=0`; re-run when Stage 6I formally starts. |
| Online pages accessible | PRECHECK_PASS | `npm run preflight:stage6h` verified `/`, `/upload/`, `/result/`, `/poster/` on workers.dev. |
| API invalid input is sanitized | PRECHECK_PASS | `npm run preflight:stage6h` verified invalid `POST /api/analyze` returns controlled 400 and no sensitive leak. |
| Deployed commit self-check | PRECHECK_PASS | `npm run preflight:stage6h -- --expect-commit <latest-origin-main-commit>` confirms `/build-meta.json` matches the expected commit. |
| Stage 6I aggregate precheck | READY_ZERO_COST | `npm run precheck:stage6i` runs the safe command set, refuses `PALMMI_ALLOW_REAL_QWEN_TESTS=1`, redacts command output summaries, and supports `--require-manual-result` for formal gate fail-safe behavior. |
| Manual result text checker | READY_ZERO_COST | `npm run check:stage6h:manual` can classify pasted true-device results; it does not verify the truth of the manual claims. |
| Result page reads stored result | WAITING_STAGE6H | Needs true-device successful analysis result. |
| Poster page reads stored result | WAITING_STAGE6H | Needs true-device successful analysis result. |
| WeChat WebView upload works | WAITING_STAGE6H | iPhone and Android WeChat manual results required. |
| Real-device photo capture works | WAITING_STAGE6H | iPhone and Android manual results required. |
| Error prompts understandable | WAITING_STAGE6H | True-device abnormal input results required. |
| No key/base64/raw response leak on UI | WAITING_STAGE6H | True-device page observation required. |
| No P0 / P1 blocker | WAITING_STAGE6H | Cannot be concluded before Stage 6H. |
| Rollback reference identified | READY | Last known pushed commits include the current build-metadata deployment-gate commit, Stage 7 / Donation / Stage 8 planning drafts, and Stage 6G-Fix isolation commits listed below. |
| Formal domain binding decision | NOT_REQUIRED_FOR_6I | Current plan keeps workers.dev link for testing; no DNS change in Stage 6I. |
| Payment / donation disabled | PASS | No payment, tipping, login, or donation code is present in Stage 6I scope. |

## 6. Privacy / Safety Closeout

| Check | Current Status | Notes |
|---|---|---|
| No long-term original image storage | PASS_IN_CURRENT_CODE | No database, R2, D1, KV, Durable Object, or persistent image storage was added. |
| No key written to repository | PASS_IN_CURRENT_CODE | Security scan must be re-run at Stage 6I. |
| No raw provider response exposed | PASS_IN_CURRENT_CODE | API errors are sanitized; UI true-device observation still required. |
| No medical / fortune-telling claim | READY_TO_REVIEW | Stage 7 content must preserve entertainment positioning. |
| No login / account system | PASS | No login added. |
| No payment / donation | PASS | No payment or tipping added. |

## 7. Rollback Plan

If a Stage 6I verification or Stage 6H true-device result exposes a severe issue:

1. Do not publish publicly.
2. Record the issue in `docs/STAGE6_STATE.md`.
3. If code changes are needed, open a Stage 6H-Fix or Stage 6I-Fix task.
4. Keep real Qwen tests manual-only and quota-controlled.
5. Use Git history to identify the last deployable commit before the issue.

Known recent commits:

- `b002515319293798dea1cc069389a6d052fbd3a9` - build metadata preflight documented as the deployment gate.
- `0be17d2c7793f2b8f1a8a06bdc61c9f0e3f64001` - Stage 6 state deployment-confirmation status update.
- `d5afc2ee653c50874fd6f7ac8bd3c3c6a61f63e0` - Stage 7 / Donation / Stage 8 planning drafts.
- `4b6d1c7a8e57152dce5df89befbcc72d8cbc757f` - Stage 6I release-candidate checklist.
- `642887835db8bdfe8227e159f0aca0e39389df45` - Stage 6H real-device acceptance checklist.
- `0761620fa1363a3a754b3bbd4c0269d5f25087cd` - Stage 6G finalize deployment check.
- `c0664a3e7b3f984feab1b56c8e9f3bb30636c3aa` - isolate real Qwen E2E from default test suite.

## 8. Exit Criteria

Stage 6I can be marked `PASS` or `CONDITIONAL_PASS` only after:

- Stage 6H has no P0 / P1 true-device blocker.
- `npm test` passes with zero real Qwen calls.
- `npm run build` passes.
- `npm run security-scan` passes with `finding_count=0`.
- `npm run smoke:stage6f:qwen` dry run reports `api_calls_made=0`.
- `npm run preflight:stage6h` reports `api_calls_made=0`, `quota_consumed=false`, and no sensitive leak.
- If `/build-meta.json` is deployed, `npm run preflight:stage6h -- --expect-commit <latest-origin-main-commit>` confirms the live commit.
- `npm run precheck:stage6i -- --expect-commit <latest-origin-main-commit> --manual-result-file <result-text> --require-manual-result` reports `precheck_ok=true`, `formal_gate_ok=true`, and `can_enter_stage6i=true`.
- Online pages and invalid API responses pass.
- Remaining risks are documented and acceptable for limited release-candidate use.

Until then, Stage 6I remains prepared but blocked.
