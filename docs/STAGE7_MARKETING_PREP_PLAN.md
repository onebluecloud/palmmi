# Palmmi Stage 7 Marketing Prep Plan

Date: 2026-05-31

## 1. Status

Stage 7 status: `PREPARED_NOT_ACTIVE`

This document is a preparation plan only. Stage 7 cannot be marked `PASS` until Stage 6H real-device acceptance and Stage 6I release-candidate closeout are no longer blocked.

Current blockers:

- iPhone Safari real-device acceptance: `MANUAL_REQUIRED`
- iPhone WeChat real-device acceptance: `MANUAL_REQUIRED`
- Android Chrome real-device acceptance: `MANUAL_REQUIRED`
- Android WeChat real-device acceptance: `MANUAL_REQUIRED`
- Stage 6I formal release-candidate closeout: `BLOCKED_BY_STAGE6H_MANUAL_REQUIRED`

## 2. Stage Goal

Prepare launch materials without publishing them.

Stage 7 is growth infrastructure, not a public release. The work in this stage is limited to account/profile preparation, draft content, FAQ, risk wording, and feedback collection planning.

## 3. Explicit Non-Goals

Do not do these in Stage 7:

- Do not publicly post on Xiaohongshu, Douyin, X, WeChat Moments, WeChat Channels, or Product Hunt.
- Do not buy or bind a production domain.
- Do not change DNS.
- Do not add payment, tipping, donation, login, membership, database, KV, R2, D1, or Durable Object.
- Do not change Stage 3 persona rules, weights, thresholds, or the 36 persona texts.
- Do not change the Stage 4 main UI style.
- Do not rewrite Stage 5 Qwen / VLM logic.
- Do not run real Qwen E2E by default.
- Do not write any API key, token, base64 image, test image, or raw provider response to the repository.

## 4. Positioning

Use this positioning:

- Palmmi is an entertainment-oriented palm style personality card.
- The result is a playful personality label and shareable poster.
- It is not fortune-telling, medical analysis, career advice, relationship advice, or financial prediction.

Preferred wording:

- AI palm-style personality label
- Palmmi personality card
- Palm texture inspired personality poster
- Entertainment personality analysis
- Generate your Palmmi card from a palm photo

Avoid wording:

- AI palmistry
- Fortune telling
- Predict your future
- Read your destiny
- Marriage, money, health, or career prediction
- Accurate personality diagnosis
- Scientific palm diagnosis

## 5. Platform Preparation

| Platform | Stage 7 Task | Current Status | Notes |
|---|---|---|---|
| Xiaohongshu | Reserve name, profile, 10 draft topics | DRAFT_READY | Do not publish before Stage 8 gate. |
| Douyin / WeChat Channels | Prepare 5 short-video scripts | DRAFT_READY | No upload in Stage 7. |
| X | Prepare 10 short posts | DRAFT_READY | Use only if targeting overseas users later. |
| WeChat Moments | Prepare 3 private small-circle drafts | DRAFT_READY | Use only for limited soft launch. |
| GitHub profile / repo | Keep technical repo clean | NO_CHANGE_REQUIRED | Do not turn repo into marketing page yet. |

## 6. Assets To Prepare

| Asset | Requirement | Status |
|---|---|---|
| Account name options | Avoid fortune-telling and medical claims. | Prepared in `docs/STAGE7_ACCOUNT_PROFILE_GUIDE.md`. |
| Avatar direction | Simple palm-line/card visual; no mystical symbols. | Prepared in `docs/STAGE7_ACCOUNT_PROFILE_GUIDE.md`. |
| Bio options | Entertainment and personality-card framing. | Prepared in `docs/STAGE7_ACCOUNT_PROFILE_GUIDE.md`. |
| Content drafts | Internal drafts only, not publish-ready. | Prepared in `docs/STAGE7_CONTENT_DRAFTS.md`. |
| FAQ | Must explain privacy, cost, limitations, and entertainment framing. | Prepared in `docs/STAGE7_CONTENT_DRAFTS.md`. |
| Poster share kit | Local save/copy tools for later internal testing. | Ready for internal testing; see `docs/STAGE7_POSTER_SHARE_KIT_REPORT.md`. |
| Feedback form | Manual or external form, no app database. | Planned below. |

## 7. Feedback Collection Plan

Preferred Stage 8 feedback method:

1. Use a simple external form or manual message collection.
2. Collect only minimal fields:
   - Device and browser
   - Upload success or failure
   - Result page success or failure
   - Poster save success or failure
   - Error code, if visible
   - One short comment
3. Do not collect palm photos in the feedback form unless the user explicitly sends them for debugging.
4. Do not add login or database storage for feedback in Stage 7.

## 8. Stage 7 Exit Criteria

Stage 7 can be marked `PASS` only when all are true:

- Stage 6H has no P0 / P1 true-device blocker.
- Stage 6I has been formally closed as `PASS` or `CONDITIONAL_PASS`.
- Account name and avatar direction are approved by the user.
- Draft content is reviewed and approved by the user.
- FAQ is ready.
- Feedback collection method is selected.
- Poster save/copy has passed simulated zero-cost checks and real-device limitations are recorded.
- No public release has happened yet.
- No payment, donation, login, database, or production domain has been added.

Current conclusion: Stage 7 is prepared but not active.

## 9. Verification Notes

This documentation work does not call Qwen.

Verification run on 2026-05-31:

- `npm run test:stage6f`: PASS, poster share kit helpers/actions PASS, `api_calls_made=0`, `quota_consumed=false`.
- `npm run security-scan`: PASS, `finding_count=0`.
- `npm run smoke:stage6f:qwen`: PASS, dry run, `api_calls_made=0`, `quota_consumed=false`.
- `npm run build`: PASS.
- `npm test`: PASS, default Stage 6F real Qwen path disabled, `api_calls_made=0`, `quota_consumed=false`.

Real Qwen called by this documentation work: `NO`.

Qwen quota consumed by this documentation work: `NO`.
