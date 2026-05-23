# File Index

| File | Role | Critical | Claude Code may modify? |
|---|---|---:|---|
| `CLAUDE_CODE_HANDOFF.md` | Handoff entry point | Yes | Yes, docs only |
| `handoff/claude-code/**` | Detailed handoff package | Yes | Yes, docs only |
| `README.md` | Requested root README | Missing | N/A |
| `package.json` | Build/test scripts | Yes | No for handoff |
| `.gitignore` | Env/image/output ignore rules | Yes | No unless safety issue |
| `.env.example` | Env variable names only | Yes | Only placeholders, never real values |
| `docs/STAGE6_STATE.md` | Authoritative Stage 6 status | Yes | Only update with evidence |
| `docs/STAGE6F_MOBILE_WECHAT_E2E_REPORT.md` | Stage 6F history and validation report | Yes | Only update with evidence |
| `docs/STAGE6E_QWEN_REQUEST_FIX_REPORT.md` | Stage 6E Cloudflare Qwen fix | Yes | Usually no |
| `docs/STAGE6E_REAL_QWEN_REPORT.md` | Stage 6E real Qwen report | Yes | Usually no |
| `docs/STAGE6_ENV_AND_SECRETS.md` | Env/secrets policy | Yes | Only policy updates |
| `docs/stage3/**` | Frozen Stage 3 docs/specs | Yes | No in Stage 6F |
| `docs/stage4/**` | Frozen Stage 4 UI docs/screenshots | Yes | No in Stage 6F |
| `docs/stage5/**` | Stage 5 handoff/API/contract docs | Yes | Only if evidence changes |
| `PalmTag_rule_engine_v0/data/display_content.json` | 36-persona display copy | Yes | No |
| `PalmTag_rule_engine_v0/data/persona_rules.json` | Persona rules | Yes | No |
| `PalmTag_rule_engine_v0/data/mother_scoring.json` | Mother scoring | Yes | No |
| `lib/recognition/*.ts` | Stage 3 classifier/rules runtime | Yes | No unless separately approved |
| `index.html` | Home page | Yes | No for handoff |
| `upload/index.html` | Upload page | Yes | No for handoff |
| `analyze/index.html` | Analyze/loading page | Medium | No for handoff |
| `result/index.html` | Result page | Yes | No for handoff |
| `poster/index.html` | Poster page | Yes | No for handoff |
| `styles/palmmi.css` | Stage 4 visual system | Yes | No for handoff |
| `scripts/palmmi-upload.js` | Upload/check/compress/inline analyze | Yes | No for handoff |
| `scripts/palmmi-analyze-api-client.js` | Browser API client | Yes | No for handoff |
| `scripts/palmmi-analyze.js` | Analysis storage and bridge | Yes | No for handoff |
| `scripts/palmmi-result.js` | Result renderer | Yes | No for handoff |
| `scripts/palmmi-poster.js` | Poster renderer/contract blocking | Yes | No for handoff |
| `api/analyze.js` | CommonJS analyze wrapper | Yes | No for handoff |
| `functions/api/analyze.js` | Cloudflare Pages API route | Yes | No for handoff |
| `server/stage5p/errors.js` | Error codes/safe diagnostics | Yes | No for handoff |
| `server/stage5p/analyze-service.js` | Core analyze API service | Yes | No for handoff |
| `server/stage5p/env.js` | Provider/Qwen env defaults | Yes | No for handoff |
| `server/stage5p/provider-selection.js` | Mock/Qwen provider selection | Yes | No for handoff |
| `server/stage5p/providers/qwen-vlm-provider.js` | Qwen validity/features provider | Yes | No for handoff |
| `server/stage5p/providers/qwen-response-parser.js` | Qwen JSON/alias parser | Yes | No for handoff |
| `src/stage5/normalize-vlm-to-palm-feature-set.js` | VLM -> PalmFeatureSet adapter | Yes | No for handoff |
| `src/stage5/palm-feature-set-to-rule-input.js` | PalmFeatureSet -> Stage 3 rule input | Yes | No for handoff |
| `src/stage5/palmmi-recognition-pipeline.js` | Local recognition pipeline | Yes | No for handoff |
| `src/stage5/analysis-result-contract.js` | `analysis-result.v1` builder | Yes | No for handoff |
| `src/stage5/analysis-result-read-adapter.js` | Result contract reader | Yes | No for handoff |
| `src/stage5/analysis-result-storage-reader.js` | Stable/legacy storage reader | Yes | No for handoff |
| `src/stage5/page-analysis-reader.js` | Result/poster data reader | Yes | No for handoff |
| `src/stage5/page-analysis-state-mapper.js` | Page state mapper | Yes | No for handoff |
| `scripts/stage6f/real-qwen-smoke.cjs` | Dry/real Qwen smoke and collapse check | Yes | No for handoff |
| `scripts/stage6f/security-scan.cjs` | Secret/base64/raw response scan | Yes | No for handoff |
| `tests/stage6f/mobile-e2e.test.cjs` | Stage 6F regression test suite | Yes | No for handoff |
| `scripts/build-cloudflare-pages.cjs` | Static build for Cloudflare Pages | Yes | No for handoff |
| `wrangler.toml` | Cloudflare Pages config | Yes | No for handoff |
