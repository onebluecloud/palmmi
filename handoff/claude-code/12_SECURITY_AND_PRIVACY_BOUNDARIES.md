# Security And Privacy Boundaries

## Core Boundaries

Palmmi Stage 6F must preserve:

- no long-term storage of user original images;
- no base64 image payloads in logs, docs, git, DOM, or storage after analysis;
- no raw Qwen responses in reports or API responses;
- no API keys, Cloudflare tokens, GitHub tokens, or Authorization headers in docs/logs/git/chat;
- no user photos or user screenshots committed;
- no new persistent image storage;
- no new payment, tips, login, user accounts, or promotion features.

## Allowed In Docs

Allowed:

```text
PALMMI_QWEN_API_KEY
QWEN_API_KEY
DASHSCOPE_API_KEY
PALMMI_QWEN_MODEL
QWEN_MODEL
PALMMI_VLM_PROVIDER
PALMMI_VLM_MODE
```

Only variable names are allowed. Values are not allowed.

## Storage Sanitization

`scripts/palmmi-analyze.js` strips forbidden fields before writing:

```text
analysis_input
internal
stage5bResult
provider_output
raw_provider
raw_response
rawText
base64
data_url
dataUrl
previewDataUrl
buffer
imageBuffer
Authorization
```

## API Sanitization

`server/stage5p/analyze-service.js` sanitizes recognition and analysis results. Safe diagnostics are allowlisted in `server/stage5p/errors.js`.

## Security Scan

Run:

```bash
node scripts/stage6f/security-scan.cjs
```

It scans tracked server/src/scripts/tests/docs/functions/api/worker files and `dist/` for:

```text
Authorization Bearer tokens
Qwen API key values
long image data URLs
long base64 payloads
raw Qwen response payloads
production file writes
persistent image storage references
```

## Handoff Package Safety

The handoff package must not contain real secrets, raw response content, base64 image content, user photos, or screenshots. It may contain command examples and local image directory path examples.
