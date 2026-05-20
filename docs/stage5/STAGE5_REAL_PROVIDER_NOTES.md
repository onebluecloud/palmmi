# Palmmi Stage 5P Real Provider Notes

## Scope

Stage 5P adds real Provider wiring code behind a server/API boundary and implements the first minimal Qwen Provider adapter.

Stage 5P does not run a real Qwen call, does not use a real API key, and does not upload real palm images to a third-party Provider.

## Qwen Provider Location

```text
server/stage5p/providers/qwen-vlm-provider.js
```

Responsibilities:

- format the Qwen-compatible vision request
- read the API key only from server-side configuration/environment
- enforce timeout handling
- parse the provider response into normalized palm feature data
- map provider failures into stable Stage 5P error codes
- avoid returning raw provider response bodies

## Provider Selection Location

```text
server/stage5p/provider-selection.js
```

Selection logic:

```text
PALMMI_VLM_PROVIDER=mock -> MockVlmProvider
PALMMI_VLM_PROVIDER=qwen -> QwenVlmProvider
unset/empty -> mock
unknown -> VLM_PROVIDER_NOT_CONFIGURED
```

Mode logic:

```text
PALMMI_VLM_MODE=mock-only
PALMMI_VLM_MODE=real-only
PALMMI_VLM_MODE=real-with-mock-fallback
```

Mock fallback is available only when explicitly configured with `real-with-mock-fallback`.

## Analyze API Entry

```text
api/analyze.js
server/stage5p/analyze-service.js
```

Current server-side flow:

```text
request body
  -> image validation
  -> anonymous_device_id
  -> provider selection
  -> QwenVlmProvider or MockVlmProvider
  -> runPalmmiRecognitionPipeline()
  -> runPalmmiAnalysisBridge()
  -> buildAnalysisResultContract()
  -> sanitized API response
```

The API response excludes raw provider output, API keys, `recognition_result.debug`, `analysis_input`, and `internal.stage5bResult`.

## Environment Variables

Canonical names:

```dotenv
PALMMI_VLM_PROVIDER=mock
PALMMI_VLM_MODE=mock-only
PALMMI_QWEN_API_KEY=
PALMMI_QWEN_MODEL=qwen3-vl-flash
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

Compatibility aliases:

```dotenv
QWEN_API_KEY=
QWEN_MODEL=
VLM_TIMEOUT_MS=60000
VLM_MAX_IMAGE_BYTES=8388608
```

Do not put a real key in `.env.example`, code, docs, tests, browser storage, or chat.

## Local Configuration

Mock mode:

```powershell
$env:PALMMI_VLM_PROVIDER='mock'
$env:PALMMI_VLM_MODE='mock-only'
```

Qwen mode for Stage 5Q, with the key configured outside the repo:

```powershell
$env:PALMMI_VLM_PROVIDER='qwen'
$env:PALMMI_VLM_MODE='real-only'
$env:PALMMI_QWEN_MODEL='qwen3-vl-flash'
```

The real API key must be set in the shell, local secret manager, or deployment platform secret settings. It must not be pasted into Codex.

## Switching mock / qwen

Use mock:

```text
PALMMI_VLM_PROVIDER=mock
PALMMI_VLM_MODE=mock-only
```

Use Qwen without fallback:

```text
PALMMI_VLM_PROVIDER=qwen
PALMMI_VLM_MODE=real-only
```

Use Qwen with explicit developer fallback:

```text
PALMMI_VLM_PROVIDER=qwen
PALMMI_VLM_MODE=real-with-mock-fallback
```

Production should not silently show mock results for a real-provider failure unless a human explicitly approves that behavior.

## Stage 5Q Real Call Test

Stage 5Q should:

1. Configure the real Qwen key outside the repo.
2. Use the Stage 5P `api/analyze.js` boundary, not frontend direct Qwen calls.
3. Run 3-5 local real palm test images.
4. Run 1-2 invalid/error images.
5. Confirm stable success and error responses.
6. Confirm no raw provider response or API key appears in API responses, logs, result page, poster page, localStorage, or sessionStorage.
7. Rerun Stage 5N browser verification after real-call tests.

## Current Risk Points

- The project still has no package/runtime wrapper around `api/analyze.js`; Stage 5Q must choose how to execute the boundary locally or on a deployment platform.
- Current frontend analyze flow still uses the existing static Stage 5B mock skeleton. Stage 5P adds the safe API boundary but does not redesign the frontend flow.
- Real provider calls require careful body-size handling in the chosen runtime.
- `real-with-mock-fallback` must remain a human-approved mode because mock results can hide real provider failures.

## Stage 5Q Human Checklist

```text
confirm Qwen as first real Provider
configure PALMMI_QWEN_API_KEY or QWEN_API_KEY outside the repo
do not send the key to Codex
prepare 3-5 real palm test images
prepare 1-2 invalid/error test images
confirm PALMMI_QWEN_MODEL or QWEN_MODEL
confirm timeout and max image size
confirm retry and fallback policy
choose local/serverless/worker runtime for api/analyze.js
```
