# Palmmi Claude Code Handoff

This is the entry point for the Claude Code handoff package. It indexes the detailed handoff documents under `handoff/claude-code/`.

## Current Status

Palmmi is in Stage 6F late validation. Stage 6G has not started.

Current true state:

```text
Stage 6F: not fully PASS
Stage 6G: BLOCKED
Latest commit: 0034715cdd7722f408cef81ba8f279651edad272
Next gate: real 5-palm collapse smoke + Android WeChat retest + iPhone WeChat test
```

Do not treat Stage 6F as complete until fresh real smoke and real device results prove it.

## Most Important Files

1. `handoff/claude-code/00_README_HANDOFF.md`
2. `handoff/claude-code/03_CURRENT_STAGE6_STATUS.md`
3. `handoff/claude-code/04_ARCHITECTURE_MAP.md`
4. `handoff/claude-code/07_QWEN_VLM_PIPELINE.md`
5. `handoff/claude-code/15_CLAUDE_CODE_EXECUTION_BRIEF.md`

## Handoff Directory

Detailed handoff package:

```text
handoff/claude-code/
```

Recommended reading order:

```text
00_README_HANDOFF.md
01_PROJECT_OVERVIEW.md
03_CURRENT_STAGE6_STATUS.md
04_ARCHITECTURE_MAP.md
07_QWEN_VLM_PIPELINE.md
09_RESULT_AND_POSTER_CONTRACT.md
10_TESTING_AND_VALIDATION_COMMANDS.md
13_CURRENT_BLOCKERS_AND_NEXT_STEPS.md
15_CLAUDE_CODE_EXECUTION_BRIEF.md
```

## Current Next Step

Confirm latest deployment for commit `0034715cdd7722f408cef81ba8f279651edad272`, then run the real 5-palm smoke outside Codex only with local secrets, and collect Android/iPhone WeChat real-device results. Do not enter Stage 6G before those results are recorded.

## Forbidden

Do not change Stage 3 rules, weights, thresholds, or 36-persona copy. Do not redo Stage 4 UI. Do not rewrite Stage 5/Qwen VLM core logic. Do not add payment, tips, login, user accounts, promotion features, or long-term image storage. Do not expose keys, tokens, Authorization headers, base64 image payloads, raw Qwen responses, user photos, or screenshots.

## Test Commands

```bash
npm run build
npm run test:stage6f
node scripts/stage6f/security-scan.cjs
npm run smoke:stage6f:qwen
```

The last command must be run without `--real` for normal verification. It should not call Qwen and should report `REAL_QWEN_DISABLED` with `api_calls_made: 0`.
