# Testing And Validation Commands

## Ordinary Verification

Run from the repository root:

```bash
npm run build
npm run test:stage6f
node scripts/stage6f/security-scan.cjs
npm run smoke:stage6f:qwen
```

`npm test` is not available in `package.json`; do not report it as PASS.

## Real Qwen Smoke

Only run with local secrets already configured in the environment. Do not paste secrets into chat or docs.

```powershell
npm run smoke:stage6f:qwen -- --real `
  --image-dir "E:\其他\Palmmi\Palmmi-test-images" `
  --models qwen3-vl-flash `
  --collapse-check `
  --debug-classifier `
  --min-palm-samples 5 `
  --min-unique-personalities 2 `
  --max-real-calls 12
```

Expected pass standard:

```text
not-palm returns NOT_PALM
5 palm samples do not all return LOW_INFORMATION_FEATURE_SET
valid palm samples produce legal P01-P36 personalities
unique_personality_count >= 2
api_calls_made stays within max-real-calls
printed_key=false
printed_base64=false
printed_raw_response=false
```

Fail standards:

```text
ALL_PALM_LOW_INFORMATION
P31_COLLAPSE_CONFIRMED
PERSONALITY_COLLAPSE_RISK with hard_fail=true
not-palm returns a personality
keys/base64/raw response are printed
```

## A/B Model Test

```powershell
npm run smoke:stage6f:qwen -- --real `
  --image-dir "E:\其他\Palmmi\Palmmi-test-images" `
  --models qwen3-vl-flash,qwen3.6-flash `
  --collapse-check `
  --debug-classifier `
  --max-real-calls 10
```

A/B output is advisory. It should not automatically switch production model.

## Android WeChat Retest

Use a cache-busted URL after deployment:

```text
https://palmmi.pages.dev/upload/?v=stage6f-final-0034715
```

Pass standard:

```text
home opens
upload from camera/gallery works
not-palm returns retry/not-palm, not a personality
normal palm reaches result
multiple palms do not all collapse to the same personality
valid result can open poster
no key/base64/raw response shown
```

## iPhone WeChat Test

Same flow as Android. Simulated iPhone tests do not count as real iPhone WeChat PASS.

## Dry Smoke Must Not Call Qwen

This command:

```bash
npm run smoke:stage6f:qwen
```

must report:

```text
REAL_QWEN_DISABLED
api_calls_made: 0
```
