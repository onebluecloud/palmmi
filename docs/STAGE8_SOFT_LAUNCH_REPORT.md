# Palmmi Stage 8 Soft Launch Report

Date: 2026-05-31

Status: `NOT_STARTED_FEEDBACK_ENTRY_READY_MANUAL_GATE`

This is a report template and execution plan only. Stage 8 soft launch has not started.

Stage 8 now has a local manual feedback helper at `/feedback/`. It only builds a copyable feedback template in the browser and does not submit feedback over the network.

## 1. Entry Criteria

Stage 8 can start only after:

- Stage 6H has no P0 / P1 true-device blocker.
- Stage 6I is closed as `PASS` or `CONDITIONAL_PASS`.
- Stage 7 prep material has been reviewed by the user.
- The first small audience is selected.
- Feedback collection method is ready.
- Qwen cost risk is accepted for a controlled small test.

Current status:

| Gate | Current Status |
|---|---|
| Stage 6H | `MANUAL_REQUIRED` |
| Stage 6I | `BLOCKED_BY_STAGE6H_MANUAL_REQUIRED` |
| Stage 7 | `PREPARED_NOT_ACTIVE` |
| Poster save/copy | `SIMULATED_PASS_MANUAL_REQUIRED` |
| Feedback log | Template created in `docs/STAGE8_FEEDBACK_LOG.md` |
| Feedback page | `/feedback/` deployed and ready for internal testing, no network submit |
| Public release | Not allowed |

## 2. Soft Launch Scope

Recommended first batch:

- 5 to 10 trusted friends.
- One small WeChat group only if needed.
- No broad Xiaohongshu / Douyin / X publication.
- No paid traffic.
- No public domain announcement.

Do not launch to multiple platforms at once.

## 3. What To Validate

| Area | Question |
|---|---|
| Access | Can users open the page on their phone? |
| Upload | Can they choose from album and take a photo? |
| Analysis | Does a clear palm image produce a result? |
| Errors | Are `NOT_PALM`, `IMAGE_NOT_CLEAR`, timeout, and network messages understandable? |
| Result | Does the result page show a real analysis result? |
| Poster | Can the poster page open and be saved? |
| Share copy | Can users copy a safe share caption without technical details? |
| WeChat | Does WeChat WebView work acceptably? |
| Cost | Does usage stay within a manually acceptable Qwen cost range? |
| Privacy | Do users understand that Palmmi is entertainment-oriented and not long-term original-image storage? |

## 4. Metrics To Record

Stage 8 does not require analytics code by default. Manual tracking is acceptable.

| Metric | Collection Method |
|---|---|
| Number of testers invited | Manual count |
| Number of testers who opened link | Manual response or Cloudflare dashboard if available |
| Successful uploads | User feedback |
| Successful results | User feedback |
| Successful poster saves | User feedback |
| Successful share-copy actions | User feedback |
| Error codes observed | User screenshots or messages |
| Device/browser mix | User feedback |
| Repeat usage interest | User feedback |
| Share intent | User feedback |
| Qwen cost | Provider dashboard/manual estimate |

## 4A. Feedback Collection Helper

`/feedback/` is available as an internal helper for testers who have just completed an upload/result/poster flow.

It:

- Builds a `Palmmi 内测反馈` template from browser-local safe fields.
- Lets the tester copy the template manually.
- Links back to upload/result pages.
- Does not call `fetch`, `XMLHttpRequest`, `sendBeacon`, or `FormData`.
- Does not write to a database or long-term storage.
- Does not call Qwen and does not consume quota.

It must not be treated as a public contact form. Testers still send feedback manually.

## 5. Cost Guard During Stage 8

Before sharing the link:

- Confirm real Qwen key is configured only in Cloudflare environment, not in the repo.
- Confirm default `npm test` remains zero-cost.
- Do not run real Qwen E2E automatically.
- Keep the first test cohort small.
- Ask testers not to spam repeated uploads.
- Stop the test if repeated duplicate submissions or cost spikes appear.

## 6. Rollback / Stop Criteria

Stop Stage 8 immediately if any occurs:

- Upload fails for most real-device users.
- WeChat WebView blocks the core flow.
- Result or poster page frequently fails.
- API errors expose sensitive data.
- Qwen cost grows unexpectedly.
- Users report privacy concerns.
- Any key, token, base64 image, raw provider response, or stack trace appears in UI/log output.

## 7. Stage 8 Result Template

Do not fill this as PASS before a real soft launch.

| Item | Result | Evidence |
|---|---|---|
| Test cohort size | NOT_STARTED | Waiting for Stage 6H / 6I / 7. |
| Public release avoided | PASS_SO_FAR | No Stage 8 launch has happened. |
| Link opened | NOT_STARTED | Waiting for testers. |
| Upload success | NOT_STARTED | Waiting for testers. |
| Result success | NOT_STARTED | Waiting for testers. |
| Poster save success | NOT_STARTED | Waiting for testers. |
| Feedback template page | READY_ZERO_COST | `/feedback/` exists; automated copy-template and online preflight checks passed with `api_calls_made=0`. |
| WeChat behavior | NOT_STARTED | Waiting for testers. |
| Qwen cost acceptable | NOT_STARTED | Waiting for controlled usage. |
| Critical issues | UNKNOWN | Cannot conclude before launch. |

Current conclusion:

```text
Stage 8 = NOT_STARTED_FEEDBACK_ENTRY_READY_MANUAL_GATE
```
