# Stage 6G Stability / Cost Guard Report

Date: 2026-05-31

## Conclusion

Stage 6G status: `CONDITIONAL_PASS`.

Reason: Stage 6G stability and cost guards are in place, and Stage 6G-Fix has isolated real Qwen E2E from default tests. Default `npm test` no longer runs the production normal-palm upload, reports `api_calls_made=0`, and does not consume Qwen quota. Stage 6G remains conditional because iPhone WeChat, Android WeChat, iPhone Safari physical device, and Android Chrome physical device remain `MANUAL_REQUIRED`.

Finalize update: Stage 6G-Fix was committed as `c0664a3e7b3f984feab1b56c8e9f3bb30636c3aa` and pushed to `origin/main`. Online basic verification for `https://palmmi.onebluecloud723.workers.dev` passed. Direct Cloudflare deployment-status confirmation was `BLOCKED` in the local Codex environment because Wrangler required `CLOUDFLARE_API_TOKEN`; the user later confirmed in Cloudflare Dashboard that commit `0761620fa1363a3a754b3bbd4c0269d5f25087cd` deployed successfully.

## Goal

Add the minimum pre-launch stability, cost, error-message, timeout, and logging protections without changing the real Qwen path, the Qwen model, the 36 persona content, payments, login, storage architecture, or the UI style.

## Modified Files

| File | Purpose |
|---|---|
| `server/stage5p/analyze-service.js` | Add lightweight in-memory in-flight / recent-success duplicate image guard, enforce actual buffer/base64 size before provider calls, and expose a test reset hook. |
| `server/stage5p/errors.js` | Add `DUPLICATE_SUBMISSION` with a user-readable message and sanitized diagnostics. |
| `functions/api/analyze.js` | Add API wrapper Content-Length preflight, safer wrapper messages, and status mapping for timeout / duplicate submissions. |
| `scripts/palmmi-upload.js` | Add explicit `isAnalyzing` submit lock and user-readable mappings for duplicate, network, payload, and provider request errors. |
| `scripts/palmmi-analyze-api-client.js` | Map browser fetch failures to `NETWORK_FAILED` without exposing technical errors. |
| `tests/stage6f/stage6g-guards.test.cjs` | Add fast non-Qwen Stage 6G guard tests plus Stage 6G-Fix regressions proving default tests exclude real Qwen and `--real` smoke requires `PALMMI_ALLOW_REAL_QWEN_TESTS=1`. |
| `tests/stage6f/mobile-e2e.test.cjs` | Include Stage 6G guard coverage in `npm run test:stage6f`, keep production normal-palm upload disabled by default, and expose `--real-qwen-e2e` only for manual real E2E. |
| `scripts/stage6f/real-qwen-smoke.cjs` | Require `PALMMI_ALLOW_REAL_QWEN_TESTS=1` before any `--real` smoke can select samples or read keys; dry run reports `quota_consumed=false`. |
| `scripts/stage6f/security-scan.cjs` | Extend scan to flag sensitive production logging patterns and `VLM_API_KEY` assignments. |
| `package.json` | Keep `npm test` safe by default; add `test:stage6f:real`, `e2e:real-qwen`, and `security-scan` scripts. |
| `docs/STAGE6G_STABILITY_COST_GUARD_REPORT.md` | New Stage 6G report. |
| `docs/STAGE6G_TEST_COST_ISOLATION_REPORT.md` | Stage 6G-Fix test cost isolation report. |
| `docs/STAGE6_STATE.md` | Stage 6G state update. |

## Cost Protection

- Frontend disables the analysis button while analysis is pending and also keeps an explicit `isAnalyzing` lock for re-entrant click events.
- Backend rejects duplicate in-flight requests for the same anonymous device, file name, content type, declared size, and image-content hash.
- Backend rejects the same successfully analyzed image again for a short TTL window of 30 seconds.
- Backend rejects empty, non-image, declared oversized, buffer oversized, and base64 oversized payloads before provider execution.
- Qwen smoke remains dry-run by default and reports `api_calls_made=0`, `quota_consumed=false`.
- `--real` smoke is now also blocked unless `PALMMI_ALLOW_REAL_QWEN_TESTS=1` is set.
- `npm test` and `npm run test:stage6f` no longer run the production normal-palm upload; that path is isolated behind `npm run test:stage6f:real` / `npm run e2e:real-qwen`.

## Rate Limit / Throttle

This project still has no login, Redis, database, KV, R2, D1, or Durable Object. Stage 6G intentionally does not add them.

The backend guard is lightweight and best-effort only. It works inside a warm function isolate, but it is not a distributed, durable, per-user rate limiter. It can be bypassed by a cold isolate, a different anonymous device id, or renamed/resized images.

## Error Messages

| Code | User-visible message |
|---|---|
| `REQUEST_TIMEOUT` | 当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片。 |
| `VLM_API_REQUEST_FAILED` | 分析服务暂时不可用，请稍后重试。 |
| `IMAGE_NOT_CLEAR` | 照片掌纹不够清晰，请在光线均匀的位置重新拍摄，确保掌心完整、掌纹可见。 |
| `NOT_PALM` | 未检测到清晰掌心，请上传清晰、正面、完整的单手掌照片。 |
| `FILE_TOO_LARGE` | 图片过大，请压缩后重新上传。 |
| `FILE_TYPE_UNSUPPORTED` | 图片格式不支持，请上传 JPG / PNG / WebP。 |
| `NETWORK_FAILED` | 网络连接暂时中断，请检查网络后重新上传。 |
| `DUPLICATE_SUBMISSION` | 这张照片正在分析或刚刚分析过，请稍等片刻后再试。 |

No stack trace, provider raw response, API key, base64 image content, or request payload is exposed to the user.

## Logging Minimalism

- No new production `console.log` / `console.error` output was added.
- Security scan now checks production code for sensitive console logging involving API keys, Authorization, base64/data URLs, raw provider responses, payloads, bodies, or images.
- Responses and storage continue to strip raw provider fields, base64, data URLs, buffers, and Authorization-like fields.

## Timeout Strategy

- Frontend API client keeps a 60s abort timeout and maps abort to `REQUEST_TIMEOUT`.
- Qwen provider keeps a 60s abort timeout around each provider fetch.
- Timeout does not auto-retry and does not clear the last valid analysis result.
- User retry remains manual to avoid automatic cost amplification.

## Verification Results

| Command | Result | Notes |
|---|---|---|
| `npm run test:stage5p` | PASS | Stage 5P provider boundary tests passed. |
| `npm run build` | PASS | Cloudflare Pages static output written to `dist`. |
| `npm run security-scan` | PASS | `finding_count=0`, no key/base64/raw response/persistent storage/sensitive logging findings. |
| `node tests\stage6f\stage6g-guards.test.cjs` | PASS | Script isolation, real-smoke env guard, duplicate image, invalid input, and network message guards passed. |
| `npm run smoke:stage6f:qwen` | PASS | Dry run, `REAL_QWEN_DISABLED`, `api_calls_made=0`, `quota_consumed=false`, model `qwen3-vl-flash-2026-01-22`. |
| `npm test` | PASS | Stage 5P + safe Stage 6F/6G suite passed; `normal_palm_upload.status=DISABLED_BY_DEFAULT`, `api_calls_made=0`, `quota_consumed=false`. |
| `npm test` with Qwen key env vars cleared | PASS | Key env vars blank, `has_qwen_key=false`, `api_calls_made=0`, `quota_consumed=false`. |
| `git push origin main` | PASS | Pushed `c0664a3e7b3f984feab1b56c8e9f3bb30636c3aa` to `origin/main`. |
| Cloudflare deployment query | BLOCKED | Cloudflare MCP deployment tool was unavailable; `wrangler pages deployment list` required `CLOUDFLARE_API_TOKEN`. |
| Cloudflare Dashboard confirmation | PASS | User confirmed latest deployed commit `0761620fa1363a3a754b3bbd4c0269d5f25087cd` succeeded. |
| Online basic verification | PASS | `/`, `/upload/`, `/result/`, `/poster/` returned Palmmi pages; empty `POST /api/analyze` returned `FILE_TYPE_UNSUPPORTED`; no key/base64/raw response/stack leaks. |

## Real Qwen Usage

- `npm test`: no real Qwen call, `api_calls_made=0`, `quota_consumed=false`.
- `npm run test:stage6f`: no real Qwen call by default; production normal-palm upload is `DISABLED_BY_DEFAULT`.
- `npm run smoke:stage6f:qwen`: no real Qwen call, `api_calls_made=0`, `quota_consumed=false`.
- `npm run test:stage6f:real` / `npm run e2e:real-qwen`: manual real production E2E only. It requires `PALMMI_ALLOW_REAL_QWEN_TESTS=1` and a Qwen key marker (`PALMMI_QWEN_API_KEY`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, or `VLM_API_KEY`). It may consume Qwen quota.
- `npm run smoke:stage6f:qwen -- --real ...`: manual real Qwen smoke only. It requires `PALMMI_ALLOW_REAL_QWEN_TESTS=1` plus a Qwen key. It may consume Qwen quota.

Total real Qwen calls made by Stage 6G-Fix verification: 0. No quota was consumed in this fix verification.

## Remaining Risks

- iPhone WeChat physical device: `MANUAL_REQUIRED`.
- Android WeChat physical device: `MANUAL_REQUIRED`.
- iPhone Safari physical device: `MANUAL_REQUIRED`.
- Android Chrome physical device: `MANUAL_REQUIRED`.
- The duplicate guard is best-effort in-memory protection, not durable distributed rate limiting.
- Missing dark / blurry / cropped-incomplete fixtures remain `BLOCKED_BY_MISSING_FIXTURE`.

## Not Done

- No persona rule changes.
- No 36 persona copy changes.
- No Qwen model switch.
- No payment, tipping, promotion, or launch content.
- No login or user system.
- No Redis, database, KV, R2, D1, or Durable Object.
- No long-term original image storage.
- No broad UI redesign.
