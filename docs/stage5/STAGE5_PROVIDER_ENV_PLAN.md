# Palmmi Stage 5O Provider Environment Plan

## Scope

This document defines environment-variable and deployment boundaries before real Provider integration.

No real API key is included here.

## 1. Local Development Environment Example

Use placeholder values only:

```dotenv
PALMMI_VLM_PROVIDER=mock
PALMMI_VLM_MODE=mock-only
PALMMI_QWEN_API_KEY=<set outside repo when Stage 5P is approved>
PALMMI_QWEN_MODEL=qwen3-vl-flash
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

For local development before Stage 5P:

```dotenv
PALMMI_VLM_PROVIDER=mock
PALMMI_VLM_MODE=mock-only
```

Do not create `.env` with real secrets in this repository during Stage 5O.

## 2. Production Environment Example

Use platform secret settings, not committed files:

```text
PALMMI_VLM_PROVIDER=qwen
PALMMI_VLM_MODE=real-only
PALMMI_QWEN_API_KEY=<configured in hosting provider secret manager>
PALMMI_QWEN_MODEL=qwen3-vl-flash
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

Production fallback option, only if human-approved:

```text
PALMMI_VLM_MODE=real-with-mock-fallback
```

If fallback is enabled in production, UI copy and analytics must make clear whether the result came from a real provider or a fallback path. Otherwise provider failure should return a stable retry/error state.

## 3. `.env.example` Recommendation

Current project root has no `package.json` and no `.env.example`.

Stage 5P should add `.env.example` only if a server/API/worker runtime is introduced.

Recommended `.env.example` fields:

```dotenv
PALMMI_VLM_PROVIDER=mock
PALMMI_VLM_MODE=mock-only
PALMMI_QWEN_API_KEY=
PALMMI_QWEN_MODEL=qwen3-vl-flash
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

Rules:

- `.env.example` may contain empty values or placeholders only.
- `.env` and `.env.local` must not be committed.
- real API key values must stay in host secret configuration or local ignored files.

## 4. Static Hosting Boundary

If Palmmi is deployed as only static files:

```text
index.html
upload/**
analyze/**
result/**
poster/**
scripts/**
styles/**
```

then real VLM calls cannot be done safely from the frontend.

Reason:

- any frontend API key becomes visible to users
- provider request URLs and headers become inspectable
- browser storage is not a secret store

Required before real provider:

```text
server/API route/worker/proxy layer
```

Static hosting can still serve the UI, but analysis must call a backend boundary controlled by the project.

## 5. Node Service Boundary

If Stage 5P uses a Node service, recommended shape:

```text
server/index.js
server/routes/analyze.js
server/providers/qwen-provider.js
server/providers/mock-provider.js
server/security/redaction.js
server/config/env.js
```

The frontend should call only:

```text
POST /api/analyze
```

The Node service should:

- read env vars from `process.env`
- validate content type and image size before provider calls
- enforce timeout
- redact logs
- return stable project error codes
- normalize provider output before returning page-consumable data

## 6. Serverless Boundary

If Stage 5P uses serverless functions:

```text
api/analyze.js
api/upload.js optional
api/_providers/qwen.js
api/_shared/redaction.js
api/_shared/env.js
```

Notes:

- avoid storing large image payloads in logs
- enforce platform body-size limits
- use provider timeout below platform timeout
- store secrets in platform env/secret manager
- keep raw provider response out of the client response

## 7. Cloudflare / Vercel-like Boundary

### Cloudflare Workers

Use environment bindings/secrets:

```text
PALMMI_QWEN_API_KEY as Worker secret
PALMMI_VLM_PROVIDER as environment variable
```

Notes:

- respect Worker request body limits
- avoid long-running provider calls beyond Worker limits
- prefer temporary object storage only if upload size requires it
- do not log request bodies or base64 images

### Vercel / Netlify / similar

Use platform environment variables:

```text
PALMMI_QWEN_API_KEY
PALMMI_VLM_PROVIDER
PALMMI_VLM_MODE
```

Notes:

- do not expose secrets with public prefixes
- do not use frontend-exposed env names
- keep provider adapter in serverless function code
- verify logs do not contain provider raw response or image payloads

## 8. Existing Service Route Status

Current repository status:

```text
api/: absent
server/: absent
app/: absent
pages/: absent
public/: absent
package.json: absent
```

Therefore Stage 5P must first add or select a minimal server/API/worker boundary before a real VLM provider can be safely connected.

## 9. Minimal Server Boundary Before Stage 5P Provider Call

Minimum required server-side components:

```text
environment reader
provider selector
mock provider adapter
real provider adapter
input validator
timeout wrapper
error mapper
log redactor
response normalizer
tests
```

Minimum route contract:

```text
POST /api/analyze
```

Request:

```json
{
  "request_id": "req_...",
  "anonymous_device_id": "anon_...",
  "upload_ref": "upl_...",
  "provider": "auto",
  "locale": "zh-CN"
}
```

Response:

```json
{
  "ok": true,
  "request_id": "req_...",
  "analysis_result": {
    "schemaVersion": "analysis-result.v1"
  }
}
```

or stable error:

```json
{
  "ok": false,
  "request_id": "req_...",
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message_key": "retry_upload",
    "retryable": true
  }
}
```

## 10. Stage 5P Human Preparation

Before Stage 5P, a human must prepare:

```text
choose the real Provider
decide whether first real Provider is Qwen only
create API Key in the provider console
configure API Key in deployment secret settings, not chat/docs
choose deployment runtime
prepare 3-5 local real palm test images
approve image handling policy
approve timeout and max image size
approve retry and fallback policy
```

Human should not:

```text
paste API Key into Codex
commit .env
put API Key in Markdown
upload private real images into repo
```

## 11. Stage 5P Recommended First Path

Recommended conservative Stage 5P sequence:

1. Add server/API/worker boundary with mock provider only.
2. Verify the frontend can call that boundary without UI/CSS changes.
3. Add env reader and redaction tests.
4. Add Qwen provider adapter behind config.
5. Run with `PALMMI_VLM_PROVIDER=mock`.
6. Human configures real key outside repo.
7. Run 3-5 local real-image tests.
8. Keep Stage 5N result/poster browser test in regression.

Do not start with frontend direct provider calls.
