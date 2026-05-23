# Claude Code Execution Brief

## Direct Instruction

Claude Code, do not continue blind fixing. First confirm the current Stage 6F state, then use real smoke and real device results to decide whether Stage 6F can move toward Stage 6G.

## First Files To Read

```text
CLAUDE_CODE_HANDOFF.md
handoff/claude-code/00_README_HANDOFF.md
handoff/claude-code/03_CURRENT_STAGE6_STATUS.md
handoff/claude-code/07_QWEN_VLM_PIPELINE.md
handoff/claude-code/10_TESTING_AND_VALIDATION_COMMANDS.md
handoff/claude-code/13_CURRENT_BLOCKERS_AND_NEXT_STEPS.md
docs/STAGE6_STATE.md
docs/STAGE6F_MOBILE_WECHAT_E2E_REPORT.md
```

## Do Not Modify

```text
Stage 3 rules, weights, thresholds, 36-persona copy
Stage 4 UI structure/style
Stage 5/Qwen core logic unless a new bugfix task explicitly requires it
payment/tips/login/user system/promotion features
long-term image storage
```

## Current First Task

Confirm whether latest commit `0034715cdd7722f408cef81ba8f279651edad272` is deployed, then run non-real verification. Real Qwen smoke should only be run if local secrets already exist in the environment.

## Pass Criteria

Stage 6F can only move forward if:

```text
npm run build passes
npm run test:stage6f passes
security scan passes
dry smoke reports REAL_QWEN_DISABLED and api_calls_made=0
real 5-palm smoke passes latest commit
Android WeChat passes
iPhone WeChat passes
no secrets/base64/raw responses are exposed
```

## Commands

```bash
git status --short --branch
git log -1 --oneline
npm run build
npm run test:stage6f
node scripts/stage6f/security-scan.cjs
npm run smoke:stage6f:qwen
```

Real smoke command is documented in `10_TESTING_AND_VALIDATION_COMMANDS.md`.

## Secret Safety

Never print or request:

```text
Qwen API key
Cloudflare token
GitHub token
Authorization header
.env contents
base64 image payload
raw Qwen response
user photos/screenshots
```

## How To Submit Results

If only documentation changes are made, commit only:

```text
CLAUDE_CODE_HANDOFF.md
handoff/claude-code/**
```

If evidence changes Stage 6 state, also update and commit the relevant docs. Do not commit user images, screenshots, `.env`, smoke raw outputs, or secrets.

## Final Output Format

Report:

```text
files added/changed
zip created or ZIP_NOT_AVAILABLE
build/test/security/dry-smoke result
git status summary
latest commit hash
secret/base64/raw-response leakage status
remaining blockers
```
