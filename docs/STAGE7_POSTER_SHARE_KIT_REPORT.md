# Palmmi Stage 7 Poster Share Kit Report

Date: 2026-05-31

Status: `READY_FOR_INTERNAL_TESTING_NOT_PUBLIC`

Commit: `a8e8a106489475a60af37c5e84d293fd794dcd54`

Deployment: `DEPLOYED_CONFIRMED_BY_BUILD_META`

## 1. Goal

Turn the poster page save/copy controls from placeholders into a minimal local share kit for later small-scale testing.

This work does not publish Palmmi, does not add analytics, does not add login, and does not call Qwen.

## 2. Modified Files

| File | Purpose |
|---|---|
| `poster/index.html` | Add stable IDs for poster side copy and action notes while keeping no-JS/non-ready fallback text accurate. |
| `scripts/palmmi-poster.js` | Enable ready-state poster save/copy actions, generate local PNG canvas output, and build sanitized share text. |
| `scripts/palmmi-result.js` | Update result-page poster note to stop describing save/copy as placeholders. |
| `tests/stage6f/mobile-e2e.test.cjs` | Add zero-cost browser and helper regression coverage for poster save/copy. |

## 3. Share Kit Behavior

When the poster page has a valid ready analysis result:

- `保存图片` becomes enabled.
- The browser generates a local PNG poster from the already-rendered safe view model.
- If direct download is unsupported or blocked, the user sees a screenshot fallback hint.
- `复制分享文案` becomes enabled.
- The copied text contains only user-facing persona name, persona code, hook, summary, and safe tags.

When the poster page has no valid result, the controls remain disabled and the existing problem/retry flow is preserved.

Copy cleanup update:

- Result and poster copy no longer says enabled save/copy actions are placeholders.
- Non-ready fallback copy says a valid analysis result is required before saving or copying.
- Stage 6F now includes `stage7.poster_share_kit_copy.status=PASS` to block regressions to stale placeholder copy.

## 4. Cost And Privacy

- No network request is added.
- No uploaded palm image is read from storage or exported.
- No provider raw response is used.
- No API key, token, base64 image, stack trace, or provider internals are displayed.
- Share text is built from the sanitized poster view model only.

## 5. Verification

Latest local zero-cost verification:

```text
node tests\stage6f\stage6g-guards.test.cjs
npm run test:stage6f
npm run smoke:stage6f:qwen
npm run security-scan
npm run build
npm test
```

Result:

```text
PASS
stage7.poster_share_kit_helpers.status=PASS
stage7.poster_share_kit_copy.status=PASS
stage7.poster_share_kit_actions.status=PASS
real_qwen_e2e.status=DISABLED_BY_DEFAULT
api_calls_made=0
quota_consumed=false
smoke.status=REAL_QWEN_DISABLED
security_scan.finding_count=0
```

Latest deployment check:

```text
npm run preflight:stage6h -- --expect-commit a8e8a106489475a60af37c5e84d293fd794dcd54
```

Result:

```text
PASS
build_meta.matches_expected_commit=true
api_calls_made=0
quota_consumed=false
real_qwen_called=false
```

## 6. Remaining Risk

- iPhone Safari, iPhone WeChat, Android Chrome, and Android WeChat real-device save/download behavior remains `MANUAL_REQUIRED`.
- Some mobile WebViews may block direct file download; the UI keeps a screenshot fallback hint.
- Stage 8 cannot start until the final true-device gate and release-candidate gate are satisfied.

## 7. Non-Goals

- No public launch.
- No social-platform posting.
- No payment, donation, login, database, KV, R2, D1, Durable Object, domain, DNS, or analytics integration.
- No Stage 3 persona rule, weight, threshold, or 36-persona copy changes.
- No Stage 5 Qwen / VLM pipeline rewrite.
