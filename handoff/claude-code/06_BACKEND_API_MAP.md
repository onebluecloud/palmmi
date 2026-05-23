# Backend API Map

## API

```text
POST /api/analyze
```

Production URL:

```text
https://palmmi.pages.dev/api/analyze
```

Cloudflare entry:

```text
functions/api/analyze.js
```

CommonJS wrapper:

```text
api/analyze.js
```

Core service:

```text
server/stage5p/analyze-service.js
```

## Request Shape

Expected request is JSON:

```json
{
  "request_id": "generated-or-client-id",
  "anonymous_device_id": "anonymous-id",
  "locale": "zh-CN",
  "image": {
    "file_name": "palm.jpg",
    "content_type": "image/jpeg",
    "size_bytes": 123456,
    "data_url": "redacted in docs"
  }
}
```

Do not log or document the real `data_url`.

## Image Handling

Accepted server-side content types:

```text
image/jpeg
image/png
image/webp
```

Default max image bytes:

```text
8388608
```

Images are passed to Qwen in request memory. Production code should not write user originals to long-term storage.

## API Flow

```text
request JSON
-> image normalize/validate
-> resolve provider env
-> provider selection
-> Qwen provider or mock provider
-> local recognition pipeline
-> analysis bridge
-> analysis-result.v1 contract
-> sanitized response
```

## Response Shape

Success response includes:

```text
ok
request_id
status
provider
model
recognition_result
analysis_result
warnings
```

Error response includes:

```text
ok=false
request_id
status=RETRY_REQUIRED
error.code
error.message
error.retryable
diagnostics, if safe
```

## Error Codes

Server/project error codes currently include:

```text
VLM_PROVIDER_NOT_CONFIGURED
VLM_API_KEY_MISSING
VLM_API_TIMEOUT
REQUEST_TIMEOUT
VLM_API_REQUEST_FAILED
VLM_API_INVALID_RESPONSE
VLM_PROVIDER_UNAVAILABLE
VLM_RESPONSE_NORMALIZE_FAILED
NOT_PALM
IMAGE_NOT_CLEAR
ANALYSIS_UNRELIABLE
LOW_INFORMATION_FEATURE_SET
FILE_TOO_LARGE
FILE_TYPE_UNSUPPORTED
UNKNOWN_ERROR
```

Frontend/API-client or page/poster states also use:

```text
API_REQUEST_FAILED
RESULT_READ_FAILED
RESULT_WRITE_FAILED
UPLOAD_STATE_LOST
METHOD_NOT_ALLOWED
INVALID_REQUEST_BODY
POSTER_RESULT_READ_FAILED
POSTER_CONTRACT_INVALID
POSTER_NOT_ALLOWED_FOR_INVALID_IMAGE
POSTER_MAIN_CANDIDATE_MISMATCH
```

`LOW_CONFIDENCE` is primarily a status/quality status, not a terminal API error.

## Sanitization

API responses and storage must not include:

```text
provider_output
raw_provider
raw_response
rawText
recognition_result.debug
analysis_input
internal.stage5bResult
API key values
Authorization headers
complete base64 image payloads
```
