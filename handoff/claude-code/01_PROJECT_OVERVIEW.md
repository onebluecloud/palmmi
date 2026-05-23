# Project Overview

## What Palmmi Is

Palmmi is a lightweight entertainment product that turns a palm photo into a 36-type personality label. It is positioned closer to a playful MBTI-like result and shareable poster than to fortune telling or diagnosis.

## Product Path

```text
User uploads a palm photo
-> Qwen checks image validity and extracts palm_features
-> local Stage 5 adapter converts palm_features to rule input
-> frozen Stage 3 classifier/rule engine picks a 36-type personality
-> result page renders the safe analysis_result
-> poster page renders a shareable poster preview
```

Qwen is no longer trusted to decide the final personality. The local classifier is the authority for `personality_id`.

## Business Mode

Current business mode:

```text
First release: free
Tips/donation: deferred
Payment: not connected
```

Do not add payment, donation, login, user accounts, or promotion features in the current Stage 6F handoff work.

## User Experience Goal

The experience should work smoothly in mobile browsers and WeChat WebView:

- upload a clear single-palm image;
- get a stable entertainment result or a clear retry reason;
- read the result without raw technical data;
- generate a basic poster only from a valid, consistent result.

## What Palmmi Does Not Do

Palmmi does not make fortune, medical, psychological, identity, health, wealth, marriage, lifespan, or fate claims. It does not store original images long term. It does not require login. It does not currently do payment, tips, user profiles, history, or public promotion.

## Repository Note

`README.md` was requested in the handoff prompt but is not present at the repository root. The older rule-engine README exists at `PalmTag_rule_engine_v0/README.md`.
