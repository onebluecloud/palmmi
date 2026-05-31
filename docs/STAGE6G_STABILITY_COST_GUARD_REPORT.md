# Stage 6G Stability / Cost Guard Report

Date: 2026-05-31

## Conclusion

Stage 6G status: `CONDITIONAL_PASS`.

Reason: local code, build, security scan, dry-run smoke, Stage 6F production E2E, and full `npm test` passed. Stage 6G remains conditional because the new guard code still needs normal Cloudflare deployment after this commit, and iPhone WeChat, Android WeChat, iPhone Safari physical device, and Android Chrome physical device remain `MANUAL_REQUIRED`.

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
| `tests/stage6f/stage6g-guards.test.cjs` | Add fast non-Qwen Stage 6G guard tests. |
| `tests/stage6f/mobile-e2e.test.cjs` | Include Stage 6G guard coverage in `npm run test:stage6f`, including repeated-click protection. |
| `scripts/stage6f/security-scan.cjs` | Extend scan to flag sensitive production logging patterns. |
| `docs/STAGE6G_STABILITY_COST_GUARD_REPORT.md` | New Stage 6G report. |
| `docs/STAGE6_STATE.md` | Stage 6G state update. |

## Cost Protection

- Frontend disables the analysis button while analysis is pending and also keeps an explicit `isAnalyzing` lock for re-entrant click events.
- Backend rejects duplicate in-flight requests for the same anonymous device, file name, content type, declared size, and image-content hash.
- Backend rejects the same successfully analyzed image again for a short TTL window of 30 seconds.
- Backend rejects empty, non-image, declared oversized, buffer oversized, and base64 oversized payloads before provider execution.
- Qwen smoke remains dry-run by default and reports `api_calls_made=0` unless `--real` is explicitly passed.

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
| `node scripts\stage6f\security-scan.cjs` | PASS | `finding_count=0`, no key/base64/raw response/persistent storage/sensitive logging findings. |
| `npm run smoke:stage6f:qwen` | PASS | Dry run, `REAL_QWEN_DISABLED`, `api_calls_made=0`, model `qwen3-vl-flash-2026-01-22`. |
| `npm run test:stage6f` | PASS | Stage 6G guard tests passed; production normal palm upload returned HTTP 200, `provider=qwen`, with `analysis_result`; result/poster readable. |
| `npm test` | PASS | Stage 5P + Stage 6F full suite passed. |

## Real Qwen Usage

- `npm run smoke:stage6f:qwen`: no real Qwen call, `api_calls_made=0`.
- `npm run test:stage6f`: yes, one production normal palm upload E2E call.
- `npm test`: yes, one additional production normal palm upload E2E call because it includes `test:stage6f`.

Total real Qwen production E2E calls made by this Stage 6G verification: 2. This likely consumed quota. No `--real` smoke was run.

## Remaining Risks

- iPhone WeChat physical device: `MANUAL_REQUIRED`.
- Android WeChat physical device: `MANUAL_REQUIRED`.
- iPhone Safari physical device: `MANUAL_REQUIRED`.
- Android Chrome physical device: `MANUAL_REQUIRED`.
- New Stage 6G code still needs normal Cloudflare deployment after this commit before production can exercise the new duplicate guard.
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
