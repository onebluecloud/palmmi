# Claude Code Handoff README

## Purpose

This package lets Claude Code take over Palmmi without reading prior Codex conversations. It summarizes the product, stage history, current Stage 6F state, architecture, Qwen/VLM pipeline, tests, deployment, blockers, and safety boundaries.

## Project

```text
Project: Palmmi
Current phase: Stage 6F late validation / Stage 6G not started
Current target: complete online real-chain stability and real-device validation before Stage 6G
Latest commit: 0034715cdd7722f408cef81ba8f279651edad272
```

## Claude Code Takeover

Claude Code should start by confirming the current git state, reading this package, and then deciding from fresh smoke/device evidence whether Stage 6F can move forward. It must not continue blind bug fixing or mark Stage 6F as complete without new validation.

## Reading Order

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

## Scope Of This Export

This export is documentation only. It does not fix Stage 6 bugs, change business code, change rules, or include user images, screenshots, `.env` content, secrets, raw model responses, or base64 payloads.
