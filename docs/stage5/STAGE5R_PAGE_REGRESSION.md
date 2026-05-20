# Palmmi Stage 5R Page Regression

## Goal

Verify that a real Qwen/VLM result can travel through the existing Stage 4 page route without changing visual UI:

```text
upload/index.html
  -> analyze/index.html
  -> same-origin /api/analyze
  -> QwenVlmProvider
  -> analysis-result.v1
  -> result/index.html
  -> poster/index.html
```

No API key values, provider raw responses, or complete base64 image payloads are included in this document.

## Implementation Change

Stage 5R added a small same-origin API client:

```text
scripts/palmmi-analyze-api-client.js
```

The analyze page now loads it before the existing analyze script:

```text
analyze/index.html
```

`scripts/palmmi-analyze.js` now:

```text
uses /api/analyze when served over HTTP(S)
saves analysis-result.v1 to palmmi:lastAnalysisResult on success
saves palmmi:lastAnalyzeError and clears stale success on failure
keeps the prior mock fallback when opened from file: or when no API client is available
```

No CSS, visual layout, persona copy, rules, weights, or thresholds were changed.

## Test Path

The automated test starts a local same-origin HTTP server that serves the existing static pages and handles:

```text
POST /api/analyze -> server/stage5p/analyze-service.js
```

Then Playwright drives the real browser page flow:

```text
upload page file input
  -> start analyze
  -> analyze page waits for done/error
  -> result page reads storage
  -> poster page reads same storage
```

Command:

```powershell
$env:PALMMI_VLM_PROVIDER='qwen'
$env:PALMMI_VLM_MODE='real-only'
node tests\stage5\stage5r-page-real-flow.test.cjs
```

## Real Page Results

| File | Analyze | Result | Poster | API calls | Provider |
| --- | --- | --- | --- | --- | --- |
| `微信图片_20260424095618_133_38.jpg` | done | partial-result | partial-result | 1 | qwen |
| `微信图片_20260424095619_134_38.jpg` | done | partial-result | partial-result | 1 | qwen |
| `微信图片_20260424095621_135_38.jpg` | done | partial-result | partial-result | 1 | qwen |
| `微信图片_20260424095622_136_38.jpg` | done | partial-result | partial-result | 1 | qwen |
| `dayi-left.jpg` | done | partial-result | partial-result | 1 | qwen |

All five real flows reached a user-visible result panel and a user-visible poster panel. The `partial-result` state reflects low-confidence/degraded real outputs and still renders the page safely.

## Storage Results

Passed:

```text
palmmi:anonymousDeviceId exists
palmmi:lastUpload exists after upload
palmmi:lastAnalysisResult contains analysis-result.v1 after success
palmmi:lastAnalyzeError is cleared after success
result page reads palmmi:lastAnalysisResult
poster page reads the same palmmi:lastAnalysisResult
failure paths do not leave a stale success result
```

## Error Results

| Scenario | Page behavior | API calls | Stored error |
| --- | --- | --- | --- |
| non-image upload | upload page blocks before analyze | 0 | no |
| missing Qwen key | analyze page stable error | 1 | yes |
| provider invalid response | analyze page stable error | 1 | yes |

No white screen, runtime crash, infinite loading, infinite retry, or repeated provider call was observed.

## Mock Regression

Mock mode was verified through the same page path:

```text
upload -> analyze -> /api/analyze -> mock provider -> result -> poster
```

Result:

```text
analysis state: done
result state: partial-result
poster state: partial-result
API calls: 1
provider: mock
```

## Security Results

Passed:

```text
loaded frontend has no Qwen API key/env/endpoint reference
result/poster still do not fetch provider APIs
result/poster DOM does not expose provider raw response markers
API responses do not expose API key markers
API responses do not expose full base64 image markers
API responses do not expose provider raw response markers
docs/tests do not contain real API key values
sensitive console statement scan passed
```

## Issues Found And Fixed

Fixed:

```text
analyze page did not call the Stage 5P API boundary and still saved a legacy mock RecognitionResult.
```

Fix:

```text
add same-origin analyze API client
prefer API when served over HTTP(S)
save analysis-result.v1 for result/poster pages
keep static/mock fallback for file: mode
```

Test harness issues corrected:

```text
avoid Chromium unsafe local ports
ignore expected blob preview request cancellation during navigation
treat non-image upload as upload-page rejection instead of analyze-page rejection
```

## Remaining Notes

The configured image directory did not provide a separate clearly named blurry/non-palm photo. Stage 5R covered a non-image upload block, a no-key provider error, and a provider-invalid-response error.

A Stage 5Q API-only regression rerun reported one `VLM_API_INVALID_RESPONSE` among five samples, while the Stage 5R page-flow rerun succeeded for all five. This should be monitored in Stage 5S or final-freeze review.

## Recommendation

Stage 5R page regression is accepted.

Recommended next step: **Stage 5S stability/final-freeze review**, not Stage 6.
