# Qwen VLM Pipeline

## Endpoint

Current default endpoint:

```text
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

## Models

Production default:

```text
qwen3-vl-flash
```

Supported for explicit A/B testing but not switched into production:

```text
qwen3.6-flash
```

Older rule-engine research materials also mention `qwen3.6-plus`, but current production code defaults to `qwen3-vl-flash`.

## Environment Variables

Provider and mode:

```text
PALMMI_VLM_PROVIDER
VLM_PROVIDER
PALMMI_VLM_MODE
VLM_MODE
```

Qwen model/key/endpoint:

```text
PALMMI_QWEN_MODEL
QWEN_MODEL
PALMMI_QWEN_API_KEY
QWEN_API_KEY
DASHSCOPE_API_KEY
PALMMI_QWEN_ENDPOINT
QWEN_ENDPOINT
```

Timeout and upload limit:

```text
PALMMI_VLM_TIMEOUT_MS
VLM_TIMEOUT_MS
PALMMI_VLM_MAX_IMAGE_BYTES
VLM_MAX_IMAGE_BYTES
```

Only variable names may be documented. Do not print values.

## Provider Design

Qwen runs in two stages:

1. validity precheck: verify clear, front-facing, complete, single human palm;
2. analysis extraction: extract observable `palm_features`.

Qwen should not decide final personality. The prompt explicitly asks for palm features only. Qwen personality output or candidate hints, if present, are diagnostic and ignored for the final ranking.

## Local Final Classifier

```text
Qwen palm_features
-> qwen-response-parser normalize aliases/Chinese values
-> buildVlmFeatures
-> normalize-vlm-to-palm-feature-set
-> palm-feature-set-to-rule-input
-> Stage 3 matcher
-> analysis-result.v1
```

`personality_id` must match `candidate_results[0].personality_id`.

## Real Smoke Script

```text
scripts/stage6f/real-qwen-smoke.cjs
```

Default command does not call Qwen:

```bash
npm run smoke:stage6f:qwen
```

Expected dry-run safety:

```text
REAL_QWEN_DISABLED
api_calls_made: 0
printed_key: false
printed_base64: false
printed_raw_response: false
```

Real smoke requires explicit `--real` and local secrets. Do not ask the user to paste keys into chat.

## Real Smoke Notes

For not-palm + 5 palm samples and one model, estimated calls are normally:

```text
1 not-palm precheck + 5 valid palms * 2 stages = 11
```

Use `--max-real-calls` to prevent accidental quota spend. Use `--debug-classifier` only for sanitized classifier diagnostics.
