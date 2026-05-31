# Stage 6G Test Cost Isolation Report

Date: 2026-05-31

## Conclusion

Stage 6G-Fix status: `CONDITIONAL_PASS`.

Default tests are now isolated from real Qwen E2E. `npm test` does not run the production normal-palm upload, does not require `VLM_API_KEY` / Qwen keys, reports `api_calls_made=0`, and does not consume Qwen quota.

Finalize update: the test-cost isolation fix was committed as `c0664a3e7b3f984feab1b56c8e9f3bb30636c3aa` and pushed to `origin/main`. Cloudflare Pages deployment status could not be confirmed through Wrangler because the local non-interactive environment has no usable Cloudflare API token. Online basic verification for `https://palmmi.onebluecloud723.workers.dev` passed, and the user later confirmed in Cloudflare Dashboard that commit `0761620fa1363a3a754b3bbd4c0269d5f25087cd` deployed successfully.

## Goal

Fix the Stage 6G test-cost risk where `test:stage6f` and `npm test` each performed one real production Qwen call. Real Qwen E2E must now be manual-only, explicitly guarded, and excluded from default test / CI / build paths.

## Modified Files

| File | Purpose |
|---|---|
| `package.json` | Keep `npm test` on the safe Stage 5P + Stage 6F/6G path; add explicit `test:stage6f:real`, `e2e:real-qwen`, and `security-scan` commands. |
| `tests/stage6f/mobile-e2e.test.cjs` | Disable production normal-palm upload by default; add `--real-qwen-e2e` plus `PALMMI_ALLOW_REAL_QWEN_TESTS=1` and key-marker checks for manual real E2E. |
| `tests/stage6f/stage6g-guards.test.cjs` | Add regressions proving default scripts exclude real Qwen and `--real` smoke is blocked without the explicit guard. |
| `scripts/stage6f/real-qwen-smoke.cjs` | Require `PALMMI_ALLOW_REAL_QWEN_TESTS=1` before any `--real` smoke can proceed; dry run reports zero calls and zero quota. |
| `scripts/stage6f/security-scan.cjs` | Include `VLM_API_KEY` in key-assignment scanning. |
| `docs/STAGE6G_STABILITY_COST_GUARD_REPORT.md` | Update Stage 6G report with the test-cost isolation fix. |
| `docs/STAGE6_STATE.md` | Update current Stage 6 status and command guidance. |

## Test Layers

| Layer | Command | Real Qwen | Quota |
|---|---|---:|---:|
| Default safe tests | `npm test` | NO | NO |
| Safe Stage 6F/6G local guard tests | `npm run test:stage6f` | NO by default | NO |
| Dry-run Qwen smoke | `npm run smoke:stage6f:qwen` | NO | NO |
| Manual real production E2E | `npm run test:stage6f:real` or `npm run e2e:real-qwen` | YES, only with explicit guard | YES |
| Manual real Qwen smoke | `npm run smoke:stage6f:qwen -- --real ...` | YES, only with explicit guard | YES |

## Real Qwen Guard

All real Qwen test paths are fail-safe unless:

- `PALMMI_ALLOW_REAL_QWEN_TESTS=1` is present.
- A Qwen key marker is present: `PALMMI_QWEN_API_KEY`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, or `VLM_API_KEY`.
- The command itself is explicitly real, such as `--real-qwen-e2e` or `--real`.

Without the guard, `scripts/stage6f/real-qwen-smoke.cjs --real` returns `REAL_QWEN_TESTS_DISABLED_BY_GUARD`, `api_calls_made=0`, and `quota_consumed=false`.

## Verification Results

| Command | Result | Evidence |
|---|---|---|
| `node tests\stage6f\stage6g-guards.test.cjs` | PASS | Cost isolation scripts PASS; real smoke guard PASS with `api_calls_made=0`, `quota_consumed=false`. |
| `npm test` | PASS | Safe Stage 5P + Stage 6F/6G passed; normal palm upload was `DISABLED_BY_DEFAULT`, `api_calls_made=0`, `quota_consumed=false`. |
| `npm test` with Qwen key env vars cleared | PASS | `PALMMI_QWEN_API_KEY`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, `VLM_API_KEY`, and `PALMMI_ALLOW_REAL_QWEN_TESTS` were blank; `has_qwen_key=false`, `api_calls_made=0`, `quota_consumed=false`. |
| `npm run build` | PASS | Cloudflare Pages static output written to `dist`; no real Qwen path invoked. |
| `npm run security-scan` | PASS | `finding_count=0`; no key, base64, raw response, persistent image storage, or sensitive production logging findings. |
| `npm run smoke:stage6f:qwen` | PASS | Dry run returned `REAL_QWEN_DISABLED`, `api_calls_made=0`, `quota_consumed=false`. |

## Finalize Verification

| Check | Result | Evidence |
|---|---|---|
| Push to `origin/main` | PASS | `c0664a3e7b3f984feab1b56c8e9f3bb30636c3aa` is present at `refs/heads/main`. |
| GitHub commit checks | PASS | No GitHub status checks or workflow runs are configured for this commit. |
| Cloudflare deployment query | BLOCKED | `wrangler pages deployment list --project-name palmmi --environment production --json` requires `CLOUDFLARE_API_TOKEN`; no token was configured or requested. |
| Cloudflare Dashboard confirmation | PASS | User confirmed latest deployed commit `0761620fa1363a3a754b3bbd4c0269d5f25087cd` succeeded. |
| Online `/` | PASS | HTTP 200, Palmmi page, not Hello World, no sensitive leak markers. |
| Online `/upload/` | PASS | HTTP 200, Palmmi page, not Hello World, no sensitive leak markers. |
| Online `/result/` | PASS | HTTP 200, Palmmi page, not Hello World, no sensitive leak markers. |
| Online `/poster/` | PASS | HTTP 200, Palmmi page, not Hello World, no sensitive leak markers. |
| Online `POST /api/analyze` empty JSON | PASS | HTTP 400, `FILE_TYPE_UNSUPPORTED`, no key/base64/raw provider response/stack leak. |

## Cloudflare / CI Boundary

Cloudflare build remains `npm run build`, which does not run real Qwen. No `.github` workflows are present in this repo. GitHub / CI default should use `npm test`, `npm run build`, and `npm run security-scan`; none of these require real keys or consume Qwen quota.

## Real Qwen Commands

These commands may consume Qwen quota and must be run manually only after confirming available quota and key configuration:

- `npm run test:stage6f:real`
- `npm run e2e:real-qwen`
- `npm run smoke:stage6f:qwen -- --real ...`

Before running any of them, set `PALMMI_ALLOW_REAL_QWEN_TESTS=1` and ensure a Qwen key marker exists. This fix did not run these commands.

## Remaining Risks

- Manual real Qwen E2E was not run in Stage 6G-Fix by design, to avoid cost.
- iPhone WeChat physical device remains `MANUAL_REQUIRED`.
- Android WeChat physical device remains `MANUAL_REQUIRED`.
- iPhone Safari physical device remains `MANUAL_REQUIRED`.
- Android Chrome physical device remains `MANUAL_REQUIRED`.
- Stage 6G runtime duplicate protection remains lightweight in-memory protection, not durable distributed rate limiting.

## Stage 6H Readiness

Stage 6H is unblocked from the deployment side because the user confirmed the latest Cloudflare deployment. The remaining Stage 6H gate is real-device verification across iPhone Safari, iPhone WeChat, Android Chrome, and Android WeChat; Codex must not mark those as PASS without user evidence.

## Not Done

- No business recognition logic changes.
- No Stage 3 persona rule, weight, threshold, or copy changes.
- No Stage 4 UI style changes.
- No Stage 5 Qwen / VLM main logic changes.
- No payment, tipping, login, deployment, or environment-variable changes.
- No real API key or token written to files.
