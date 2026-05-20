# Palmmi Stage 5O Security Boundary Review

## Scope

This review is for real Provider integration preparation only.

Stage 5O does not connect a real API, does not call a provider, does not read API keys, and does not write API keys.

## 1. API Key Boundary

API keys are server-side secrets.

Hard rules:

- API Key must never enter the frontend bundle.
- API Key can only be read through server-side environment variables.
- API Key must not be written into code.
- API Key must not be written into Markdown documents as a real value.
- API Key must not appear in logs.
- API Key must not appear in browser `localStorage`.
- API Key must not appear in browser `sessionStorage`.
- API Key must not appear in result/poster pages.
- API Key must not be returned by `/api/analyze` or any equivalent route.

Allowed documentation form:

```text
PALMMI_QWEN_API_KEY=<placeholder only>
```

Forbidden documentation form:

```text
PALMMI_QWEN_API_KEY=<real secret value>
```

## 2. Frontend Boundary

Current project shape is static frontend-first. That means frontend code cannot safely hold provider secrets.

The following files must not contain real provider secret handling:

```text
index.html
upload/**
analyze/**
result/**
poster/**
styles/**
browser-loaded scripts
```

Frontend may submit a user action to a server/API/worker route after Stage 5P, but the frontend must not construct provider-native authenticated requests.

## 3. Result/Poster Boundary

Result and poster pages must stay render-only consumers.

They must not:

- call provider APIs
- read API keys
- fetch real VLM endpoints
- parse raw provider responses
- read raw storage directly
- render `internal`, `provider_output`, `recognition_result.debug`, `PalmFeatureSet`, `RuleInput`, `RecognitionResult`, or `AnalysisInput`

They should continue to consume:

```text
readResultPageAnalysisData()
readPosterPageAnalysisData()
mapAnalysisStatusToResultPageState()
mapAnalysisStatusToPosterPageState()
```

## 4. Image Handling Boundary

Image handling rules:

- Do not store original palm images long term by default.
- Do not log original images.
- Do not log base64 image payloads.
- Do not write permanent base64 image payloads into browser storage.
- Temporary upload references must expire.
- Temporary server files or object-storage entries must have deletion/TTL policy.
- Signed URLs, if used, must be short-lived and must not be logged.

Recommended initial retention:

```text
temporary upload TTL: 15-60 minutes
failed retry retention: no longer than temporary upload TTL
permanent image archive: disabled
```

## 5. Logging Redaction Rules

Do not log:

```text
API keys
Authorization headers
full base64 image strings
full provider raw responses
full provider request bodies
signed image URLs
precise user location
phone number / WeChat / real name
browser storage dumps
```

Allowed logs:

```text
request_id
anonymous_device_id hash or truncated id
provider name
model name
latency_ms
project-level error code
image content type
image size in bytes
schema validation pass/fail
```

Provider raw response may be referenced only by an internal `raw_response_ref`, not shown to the browser.

## 6. Error Response Boundary

User-facing errors should use stable project-level codes and friendly copy.

Allowed user-facing shape:

```json
{
  "ok": false,
  "request_id": "req_...",
  "status": "RETRY_REQUIRED",
  "error": {
    "code": "IMAGE_LOW_QUALITY",
    "message_key": "retry_upload",
    "retryable": true
  }
}
```

Forbidden user-facing output:

```text
provider stack trace
provider raw JSON body
API endpoint secret details
Authorization header
prompt text containing private data
uncensored provider error body
```

Provider errors should map into:

```text
PROVIDER_TIMEOUT
PROVIDER_UNAVAILABLE
PROVIDER_REFUSED
PROVIDER_SCHEMA_INVALID
FEATURE_NORMALIZATION_FAILED
INTERNAL_ERROR
```

## 7. Cost Control Rules

Stage 5P must define these before calling a real provider:

```text
PALMMI_VLM_MAX_IMAGE_BYTES
PALMMI_VLM_TIMEOUT_MS
retry limit
provider mode
mock fallback policy
rate limit placeholder
```

Recommended initial values:

```text
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
PALMMI_VLM_TIMEOUT_MS=60000
retry limit=0 or 1
```

Do not retry blindly. Retry only on a bounded set of recoverable provider/network errors.

## 8. anonymous_device_id Boundary

`anonymous_device_id` may be used for:

- flow correlation
- basic anti-abuse
- retry counting
- aggregate operational metrics

It must not be used as:

- login identity
- payment identity
- phone identity
- WeChat identity
- real-name identity
- precise location identity

It must not embed:

```text
phone number
real name
IP address
user agent fingerprint
precise location
provider API key
```

## 9. Current Boundary Scan Notes

Stage 5O read-only scan found:

- No `.env*` file at the project root.
- No `api/`, `server/`, `app/`, `pages/`, or `public/` service route directory at the project root.
- Result/poster page files and page scripts have no `fetch`, direct `localStorage.getItem`, or direct `JSON.parse` provider bypass.
- API-key references in current docs/code are variable-name references or env-var access patterns; no secret-like `Bearer ...` or `sk-...` plaintext pattern was reported by the safe scan.
- `scripts/palmmi-stage5.js` currently returns `provider_output` from `runAnalyzeSkeleton()` and contains mock `raw_provider` references. These are not rendered by result/poster, but Stage 5P must avoid returning real provider raw output to browser callers.
- `src/stage5/palmmi-analysis-bridge.js` contains mock/internal `raw_response_ref` and `raw_provider` fields. Stage 5P must keep these behind UI-safe adapters and out of DOM.

## 10. Stage 5P Security Gate

Stage 5P should not start real provider implementation until:

- deployment runtime is chosen
- server/API/worker secret boundary is approved
- env var names are approved
- mock fallback policy is approved
- logging redaction policy is accepted
- test images are local-only or explicitly approved
- API key is configured outside the repo

Human must not paste real API keys into Codex chat or Markdown files.
