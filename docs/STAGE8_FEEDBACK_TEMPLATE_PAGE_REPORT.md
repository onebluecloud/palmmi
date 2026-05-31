# Palmmi Stage 8 Feedback Template Page Report

Date: 2026-05-31

Status: `READY_FOR_INTERNAL_TESTING_NOT_PUBLIC`

## 1. Goal

Add a minimal Stage 8 feedback collection helper without starting public launch.

The helper must let a tester copy a safe feedback template after using Palmmi, while avoiding:

- Login.
- Database.
- Network feedback submission.
- Analytics.
- Payment or donation.
- Real Qwen calls.
- Original image storage.

## 2. Added Surface

| Path | Purpose |
|---|---|
| `/feedback/` | Local feedback template page. |
| `scripts/palmmi-feedback.js` | Builds and copies a safe manual feedback template from browser-local result/error state. |
| Result page | Adds a small feedback-template entry after result/poster actions. |
| Poster page | Adds a small feedback-template entry near poster actions. |

## 3. Safety Contract

- The feedback page does not call `fetch`, `XMLHttpRequest`, `sendBeacon`, or `FormData`.
- The page does not submit feedback to any endpoint.
- The page reads only browser-local Palmmi state already used by result/poster pages.
- The copied template includes only safe fields: environment, current page, visible error code/message, persona id/name, and quality status.
- The page warns testers not to paste photos, API keys, tokens, base64, raw provider responses, stack traces, phone numbers, WeChat IDs, or private information.

## 4. Cost Contract

- Real Qwen is not called by `/feedback/`.
- `api_calls_made=0`.
- `quota_consumed=false`.
- Default `npm test` remains zero-cost.

## 5. Verification

Automated Stage 6F mobile E2E now covers Stage 8 feedback:

| Check | Result |
|---|---|
| Feedback page exists | PASS |
| Feedback script exists | PASS |
| Manual template is present | PASS |
| Copy action is present | PASS |
| Sensitive-data warning is present | PASS |
| No network submit APIs in feedback source | PASS |
| Feedback page loads in browser automation | PASS |
| Template includes recent safe error code | PASS |
| Template includes recent safe persona label | PASS |
| Copy action works | PASS |
| `fetch_calls` | 0 |

## 6. Remaining Manual Risk

The page is ready for internal testing only. Real iPhone Safari, iPhone WeChat, Android Chrome, and Android WeChat feedback-copy behavior remains `MANUAL_REQUIRED` and must not be marked as PASS before final true-device testing.

## 7. Stage Decision

```text
Stage 8 feedback template page = READY_FOR_INTERNAL_TESTING_NOT_PUBLIC
```

Stage 8 soft launch itself is still not started.
