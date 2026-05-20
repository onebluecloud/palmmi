# Palmmi Stage 5Q Real API Test Report

## Test Goal

Verify the smallest real Qwen VLM chain through the Stage 5P server/API boundary:

```text
real image
  -> api/analyze.js / server/stage5p/analyze-service.js
  -> image validation
  -> anonymous_device_id
  -> provider selection
  -> QwenVlmProvider
  -> Qwen real API
  -> VlmAnalyzeOutput
  -> normalizeRecognition / Stage 5F pipeline
  -> RecognitionResult
  -> analysis-result.v1
  -> sanitized API response
```

This report does not include API key values, key prefixes, key lengths, complete base64 images, or provider raw responses.

## Test Environment

```text
date: 2026-05-19
runtime: local Node.js process
analyze boundary: server/stage5p/analyze-service.js
API entry module: api/analyze.js
provider selection: server/stage5p/provider-selection.js
Qwen Provider: server/stage5p/providers/qwen-vlm-provider.js
Mock Provider: server/stage5p/providers/mock-vlm-provider.js
```

Environment presence only:

```text
PALMMI_QWEN_API_KEY exists: yes
QWEN_API_KEY exists: no
PALMMI_QWEN_MODEL exists: yes
QWEN_MODEL exists: no
```

Ambient provider config before override:

```text
PALMMI_VLM_PROVIDER exists: no
PALMMI_VLM_MODE exists: no
effective provider: mock
effective mode: mock-only
```

Stage 5Q process-local real mode:

```text
provider: qwen
mode: real-only
model name configured: yes
model value documented: no
```

## Image Sample Statistics

```text
image directory: E:\其他\Palmmi\测试图片 - 副本
allowed image files found: 13
real palm samples tested: 5
error/boundary samples tested: 2
```

Real palm samples:

```text
微信图片_20260424095618_133_38.jpg
微信图片_20260424095619_134_38.jpg
微信图片_20260424095621_135_38.jpg
微信图片_20260424095622_136_38.jpg
dayi-left.jpg
```

Error/boundary samples:

```text
unsupported content-type boundary using 微信图片_20260424095618_133_38.jpg metadata
in-memory synthetic blank PNG
```

No image was copied into a long-term project directory.

## Success Sample Summary

| File | Provider | API ok | RecognitionResult | Recognition status | Confidence present | Leak flags |
| --- | --- | --- | --- | --- | --- | --- |
| `微信图片_20260424095618_133_38.jpg` | qwen | yes | yes | LOW_CONFIDENCE | yes | none |
| `微信图片_20260424095619_134_38.jpg` | qwen | yes | yes | LOW_CONFIDENCE | yes | none |
| `微信图片_20260424095621_135_38.jpg` | qwen | yes | yes | LOW_CONFIDENCE | yes | none |
| `微信图片_20260424095622_136_38.jpg` | qwen | yes | yes | LOW_CONFIDENCE | yes | none |
| `dayi-left.jpg` | qwen | yes | yes | LOW_CONFIDENCE | yes | none |

All successful responses were sanitized and excluded:

```text
provider_output
raw_provider
raw_response
rawText
provider choices
Authorization
API key env names as response data
complete data:image/base64 payloads
```

## Failure Sample Summary

| File | Sample type | API ok | Error code | Error category | Crash | Timeout | Leak flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `微信图片_20260424095618_133_38.jpg` | missing-key guard | no | VLM_API_KEY_MISSING | API Key missing | no | no | none |
| `微信图片_20260424095618_133_38.jpg` | unsupported content type | no | FILE_TYPE_UNSUPPORTED | image format boundary | no | no | none |
| `synthetic-blank.png` | synthetic non-palm | no | VLM_API_REQUEST_FAILED | provider request/image rejection path | no | no | none |

The missing-key guard used a fake fetch counter and confirmed fetch was not called.

## Qwen Structure Stability

```text
Qwen returned parseable responses for real palm samples: yes
Qwen output converted into provider output: yes
provider output normalized into PalmFeatureSet: yes
RecognitionResult generated: yes
analysis-result.v1 generated: yes
```

Observed real palm outputs produced `LOW_CONFIDENCE` recognition status. This does not block Stage 5Q because Stage 5Q validates the safe minimum chain, not recognition-quality tuning.

## Normalize Stability

```text
normalizeVlmToPalmFeatureSet stable for real samples: yes
runPalmmiRecognitionPipeline stable for real samples: yes
runPalmmiAnalysisBridge stable for real samples: yes
buildAnalysisResultContract stable for real samples: yes
```

No `VLM_RESPONSE_NORMALIZE_FAILED` was observed.

## RecognitionResult Stability

```text
RecognitionResult present for successful real samples: yes
confidence present for successful real samples: yes
provider_meta provider: qwen
raw/debug/internal fields removed from API response: yes
```

Result/poster still do not directly consume Qwen raw output and still pass Stage 5N browser verification.

## Cost, Timeout, And Format Findings

```text
provider timeout observed: no
unexpected crash observed: no
real palm request failure observed: no
real palm normalize failure observed: no
schema/format instability blocking Stage 5Q: no
```

The in-memory blank PNG returned a stable provider request/image rejection path without crashing the API boundary.

## Security Findings

Passed:

```text
API key written to code/docs/tests: no
API key printed/logged: no
API key returned by API response: no
complete base64 image returned by API response: no
provider raw response returned by API response: no
frontend Qwen key/endpoint references: no
result/poster direct Qwen fetch: no
result/poster raw/internal/debug exposure: no
.env.example real key value: no
docs/stage5 real key value: no
tests/stage5 real key value: no
sensitive console statement scan: passed
```

No security risk requiring Stage 5Q rework was found.

## Regression Status

Passed:

```text
Stage 5B through Stage 5P tests
Stage 5N result/poster browser tests
Stage 4C / 4D / 4E / 4F / 4G / 4I / 4J tests
Stage 5Q real-link test
static boundary scan
```

Failed:

```text
none
```

## Recommendation

Stage 5Q is accepted for the minimum real Qwen provider chain.

Recommended next stage: **Stage 5R - real-link page regression**.

Do not enter Stage 6 before Stage 5R verifies result/poster page behavior with real-link output.
