# Palmmi Stage 6H Manual Test Deferral Decision

Date: 2026-05-31

## Decision

True-device testing is deferred until final development acceptance.

This is a development-flow decision only. It does not mark any true-device item as PASS.

## Current Automated Evidence

- Stage 6H online preflight has passed on workers.dev.
- Simulated mobile browser checks have passed for iPhone Safari, iPhone WeChat UA, Android Chrome, and Android WeChat UA.
- Default regression tests do not call real Qwen.
- Latest zero-cost checks report `api_calls_made=0`, `quota_consumed=false`, and `real_qwen_called=false`.

## Deferred Manual Items

The following items remain `MANUAL_REQUIRED` and must be completed before final public launch:

- iPhone WeChat true-device upload, analysis, result page, poster page, and save/share observation.
- Android WeChat true-device upload, analysis, result page, poster page, and save/share observation.
- iPhone Safari true-device browser flow.
- Android Chrome true-device browser flow.
- Abnormal input behavior on true devices: non-palm, blurry or dark palm, oversized image, non-image file, network failure, duplicate submit.
- True-device Qwen cost record and quota acknowledgement.

## Allowed While Deferred

- Continue non-public development tasks.
- Continue zero-cost automated verification.
- Continue documentation, launch guard, and internal checklist preparation.
- Run `npm run precheck:stage6i -- --expect-commit <commit> --defer-manual-result` to confirm the automated development gate.

## Not Allowed While Deferred

- Do not mark true-device checks as PASS.
- Do not publicly launch.
- Do not bind production domain or change DNS.
- Do not run real Qwen E2E unless explicitly approved with `PALMMI_ALLOW_REAL_QWEN_TESTS=1`.
- Do not modify Stage 3 persona rules, Stage 4 main UI style, or Stage 5 Qwen/VLM main logic as part of this deferral.

## Final Gate

Before public launch or final release-candidate closeout, run:

```text
npm run precheck:stage6i -- --expect-commit <latest-origin-main-commit> --manual-result-file <Codex-saved-user-result-text> --require-manual-result
```

This formal gate must remain fail-safe if true-device evidence is missing or insufficient.
