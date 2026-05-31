# Palmmi Donation Strategy Draft

Date: 2026-05-31

Status: `DRAFT_ONLY_NO_CODE`

This document is a strategy note only. No payment, tipping, donation, QR code, checkout, membership, login, or billing code is added in this stage.

## 1. Current Decision

Do not add donation or payment now.

Reasons:

- Stage 6H real-device acceptance is still `MANUAL_REQUIRED`, but the user has deferred it to final development acceptance.
- Stage 6I can continue as non-public development with `--defer-manual-result`; formal release-candidate closeout remains blocked until Stage 6H true-device evidence is provided.
- Stage 7 is preparation only and not a public release.
- Stage 8 soft launch has not started.
- There is no evidence yet that users want to support the product.
- Payment and tipping add compliance, refund, user support, and trust risks.
- Mobile donation flows can interrupt the core upload-result-poster experience.

## 2. When To Reconsider

Donation can be reconsidered only after all are true:

- Stage 6H has no P0 / P1 real-device blocker.
- Stage 6I is `PASS` or `CONDITIONAL_PASS`.
- Stage 8 soft launch shows repeat usage or sharing intent.
- Users explicitly ask how to support the product.
- Qwen cost becomes visible enough to justify a support option.
- The owner is ready to handle payment compliance, withdrawal, refunds, and support messages.

## 3. Possible Future Options

| Option | Fit | Risk |
|---|---|---|
| No donation | Best current option | No cost recovery, but keeps product simple. |
| Manual support note | Later low-friction option | Must not block core use or imply payment required. |
| WeChat / Alipay QR tip | Possible for China users | QR flow can be awkward in mobile browsers and may raise compliance questions. |
| Buy-me-a-coffee style link | Possible for overseas users | Adds external platform dependency and trust issues. |
| Paid extra poster styles | Not recommended yet | Requires product validation, payment, and support. |
| Membership | Not recommended | Requires login, database, entitlement logic, and support. |

## 4. Recommended Future Placement

If donation is ever added, it should be:

- Optional.
- After a successful result or poster, not before upload.
- Small and quiet.
- Clearly framed as support, not payment for accuracy.
- Removable by config.

Do not place donation:

- On the upload button.
- Before analysis.
- Inside error states.
- As a condition for viewing result or poster.
- In any way that pressures users.

## 5. Draft Support Copy

Not approved for publication:

```text
Palmmi 目前免费小范围测试。如果你觉得这个小工具有趣，之后可能会开放自愿支持入口，用来覆盖 AI 分析成本。

支持完全自愿，不影响使用，也不代表结果更准确。
```

## 6. Risks

| Risk | Mitigation |
|---|---|
| Users think payment improves result accuracy | State clearly that support is voluntary and does not affect analysis. |
| Refund or complaint handling | Do not add payment until support process exists. |
| Platform review risk | Avoid fortune-telling or paid prediction framing. |
| UX interruption | Never block upload/result/poster with donation. |
| Compliance uncertainty | Review payment and donation rules before implementation. |
| Scope creep | Keep Stage 6 / 7 / early Stage 8 payment-free. |

## 7. Current Gate

Donation status remains:

```text
DRAFT_ONLY_NO_CODE
```

No repository changes should include payment, donation, tipping, QR codes, checkout, login, account history, database, or entitlement logic.
