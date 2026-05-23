# Deployment And Cloudflare

## Platform

Palmmi is deployed on Cloudflare Pages.

```text
Project: palmmi
Production URL: https://palmmi.pages.dev/
API URL: https://palmmi.pages.dev/api/analyze
Deployment branch: main
```

`wrangler.toml`:

```text
name = palmmi
compatibility_date = 2026-05-20
compatibility_flags = nodejs_compat
pages_build_output_dir = dist
```

## Build

```bash
npm run build
```

This runs:

```text
node scripts/build-cloudflare-pages.cjs
```

The script writes static output to `dist` and copies required Stage 5 browser modules into `dist/src/stage5/`.

## Cloudflare Function

```text
functions/api/analyze.js
```

It handles `POST /api/analyze`, passes `context.env` to the server analysis service, uses server-side `fetch`, and returns JSON with `Cache-Control: no-store`.

## Secrets / Env

Required or relevant environment variables:

```text
PALMMI_VLM_PROVIDER
PALMMI_VLM_MODE
PALMMI_QWEN_API_KEY
QWEN_API_KEY
DASHSCOPE_API_KEY
PALMMI_QWEN_MODEL
QWEN_MODEL
PALMMI_QWEN_ENDPOINT
QWEN_ENDPOINT
PALMMI_VLM_TIMEOUT_MS
PALMMI_VLM_MAX_IMAGE_BYTES
```

Only configure secret values in Cloudflare/environment secret storage. Do not put values in docs, git, browser config, or chat.

## Confirm Deployment

Recommended checks:

```bash
git log -1 --oneline
git status --short --branch
npm run build
```

Then confirm Cloudflare Pages deployed the latest `main` commit in the Cloudflare UI or deployment logs. Use the commit hash in cache-busted test URLs:

```text
?v=stage6f-final-<commit>
```

Current latest commit:

```text
0034715cdd7722f408cef81ba8f279651edad272
```

## WeChat Cache Bypass

Use:

```text
https://palmmi.pages.dev/upload/?v=stage6f-final-0034715
```

If another commit is deployed, replace the suffix with the actual commit hash.
