# Architecture Map

## High-Level Structure

```text
frontend pages
  index.html
  upload/index.html
  analyze/index.html
  result/index.html
  poster/index.html

browser scripts
  scripts/palmmi-upload.js
  scripts/palmmi-analyze-api-client.js
  scripts/palmmi-analyze.js
  scripts/palmmi-result.js
  scripts/palmmi-poster.js

server/API
  functions/api/analyze.js
  api/analyze.js
  server/stage5p/analyze-service.js
  server/stage5p/env.js
  server/stage5p/provider-selection.js
  server/stage5p/errors.js
  server/stage5p/providers/qwen-vlm-provider.js
  server/stage5p/providers/qwen-response-parser.js

Stage 5 pipeline
  src/stage5/normalize-vlm-to-palm-feature-set.js
  src/stage5/palm-feature-set-to-rule-input.js
  src/stage5/palmmi-recognition-pipeline.js
  src/stage5/palmmi-analysis-bridge.js
  src/stage5/analysis-result-contract.js
  src/stage5/analysis-result-read-adapter.js
  src/stage5/analysis-result-storage-reader.js
  src/stage5/page-analysis-reader.js
  src/stage5/page-analysis-state-mapper.js

Stage 3 classifier/rules
  lib/recognition/*.ts
  PalmTag_rule_engine_v0/data/*.json
  docs/stage3/**

tests and validation
  tests/stage6f/mobile-e2e.test.cjs
  scripts/stage6f/real-qwen-smoke.cjs
  scripts/stage6f/security-scan.cjs

deployment
  scripts/build-cloudflare-pages.cjs
  wrangler.toml
  functions/api/analyze.js
```

## Page Ownership

| Area | Files |
|---|---|
| Home | `index.html`, `styles/palmmi.css` |
| Upload | `upload/index.html`, `scripts/palmmi-upload.js`, `scripts/palmmi-analyze-api-client.js` |
| Analyze | `analyze/index.html`, `scripts/palmmi-analyze.js` |
| Result | `result/index.html`, `scripts/palmmi-result.js`, `src/stage5/page-analysis-reader.js`, `src/stage5/page-analysis-state-mapper.js` |
| Poster | `poster/index.html`, `scripts/palmmi-poster.js`, `src/stage5/page-analysis-reader.js`, `src/stage5/page-analysis-state-mapper.js` |

## Backend Ownership

| Area | Files |
|---|---|
| Cloudflare Pages Function | `functions/api/analyze.js` |
| CommonJS API wrapper | `api/analyze.js` |
| Analyze service | `server/stage5p/analyze-service.js` |
| Env/config | `server/stage5p/env.js` |
| Provider selection | `server/stage5p/provider-selection.js` |
| Qwen provider | `server/stage5p/providers/qwen-vlm-provider.js` |
| Qwen parser | `server/stage5p/providers/qwen-response-parser.js` |
| Errors | `server/stage5p/errors.js` |

## Classifier Ownership

The final personality is produced locally through:

```text
Qwen palm_features
-> normalize-vlm-to-palm-feature-set
-> palm-feature-set-to-rule-input
-> lib/recognition/personaMatcher.ts
-> palmmi-recognition-pipeline
-> analysis-result-contract
```

Do not let Qwen personality hints override local classifier output.
