# Palmmi Stage 4 Workflow

## Purpose

This file defines the long-context Codex workflow for Stage 4.

Every future Stage 4 conversation should start by reading the Stage 4 state and scope before making changes.

## Start-Of-Stage Reading Order

For every future Stage 4 substage, read:

1. `docs/stage4/STAGE4_STATE.md`
2. `docs/stage4/STAGE4_SCOPE.md`
3. `docs/stage4/STAGE4_ACCEPTANCE.md`
4. `docs/stage4/STAGE4_WORKFLOW.md`
5. `docs/stage4/STAGE4_VISUAL_BASELINE.md`
6. `docs/stage4/STAGE4_DESIGN_TOKENS.md`
7. `docs/stage4/STAGE4_SCREENSHOT_LOG.md`
8. `docs/stage4/STAGE4_INPUT_CONTRACT.md`
9. `docs/stage4/STAGE4_FORBIDDEN_CHANGES.md`
10. `docs/stage3/HANDOFF_TO_STAGE4.md`
11. `docs/stage3/STAGE3_FINAL_ACCEPTANCE_REPORT.md`

When implementing pipeline-related page flow in Stage 4D or later, also read:

- `docs/stage3/STAGE3J_PIPELINE_REPORT.md`
- `docs/stage3/STAGE3K_STABILITY_REPORT.md`
- `lib/recognition/recognitionPipeline.ts` as read-only context unless that stage explicitly allows adapter work

## Per-Stage Execution Pattern

Each future Stage 4 stage should:

1. Check `git status --short`.
2. Read the Stage 4 state/scope/workflow docs.
3. Confirm allowed and forbidden paths for the current stage.
4. Make only the scoped changes for that stage.
5. Run the smallest relevant verification.
6. Capture required screenshots when UI changes exist.
7. Update `docs/stage4/STAGE4_SCREENSHOT_LOG.md` when screenshots are captured.
8. Update `docs/stage4/STAGE4_STATE.md` with current status.
9. Check `git status --short` again.
10. Report whether any forbidden path was modified.

## Stage 4A Workflow

Stage 4A only creates documentation.

Allowed output:

- state file
- scope file
- visual baseline
- design tokens documentation
- screenshot log mechanism
- acceptance criteria
- workflow file
- next tasks file

Stage 4A does not:

- write UI
- modify CSS
- create `design-tokens.ts`
- create app routes
- connect mock pipeline into pages
- connect real VLM
- modify Stage 3 code
- run Stage 3 tests unless needed for investigation

## Stage 4B Workflow

Stage 4B freezes design baseline only.

It should output:

- homepage information architecture
- upload page information architecture
- loading page information architecture
- result page information architecture
- poster page information architecture
- mobile first-screen structure for each page
- core copy for each page
- visual reference principles
- forbidden items for each page
- entry criteria for Stage 4C

Stage 4B should not implement formal pages.

## Stage 4C Workflow

Stage 4C implements homepage and upload page only.

It should:

- stay mobile-first
- avoid touching Stage 3 recognition logic
- avoid connecting real VLM
- capture mobile screenshots
- update screenshot log

## Stage 4D Workflow

Stage 4D implements loading page and mock pipeline page flow.

It should:

- call Stage 3 mock pipeline only through a page/service adapter
- consume `RecognitionResult`
- not import scoring/rule internals into UI components
- not connect real VLM
- capture loading and flow screenshots

## Stage 4E Workflow

Stage 4E implements exception states before result polish.

Required states:

- upload failure
- unsupported format
- oversized image
- analysis failure
- timeout
- unknown persona
- lost state
- `RETRY_REQUIRED`
- `REJECTED`

Each error must provide a recovery path.

## Stage 4F Workflow

Stage 4F implements result data rendering.

It should:

- verify all 36 personas can render
- preserve Top3 order
- avoid heavy visual polish until data rendering is stable
- hide debug/schema/raw error fields from users

## Stage 4G Workflow

Stage 4G polishes result page visuals.

It should:

- improve result impact
- improve information hierarchy
- improve mobile reading
- improve share intent
- keep data logic unchanged
- capture polished result screenshots

## Stage 4H Workflow

Stage 4H implements poster data rendering.

It should:

- generate a base poster for any persona
- keep poster data sourced from `RecognitionResult`
- avoid debug/schema/raw score display
- capture poster screenshots

## Stage 4I Workflow

Stage 4I polishes poster visuals.

It should optimize for:

- WeChat
- Xiaohongshu
- Moments

It must keep poster text short and shareable.

## Stage 4J Workflow

Stage 4J validates complete mobile flow:

```text
首页 -> 上传 -> 分析中 -> 结果页 -> 海报 -> 保存/分享 -> 重新测试
```

It should:

- run the app if an app exists by then
- capture full-flow mobile screenshots
- check no blank pages
- check recovery from errors
- confirm Stage 3 tests remain intact or record why they were not run

## Stage 4K Workflow

Stage 4K freezes Stage 4 and prepares Stage 5 handoff.

It should document:

- final Stage 4 file list
- final screenshot list
- final mobile acceptance result
- remaining real VLM tasks
- Stage 5 interface expectations
- forbidden items that must remain frozen

## Git Hygiene

Before and after each stage:

```powershell
git status --short
```

For forbidden path checks:

```powershell
git status --short -- app components lib public tests package.json package-lock.json pnpm-lock.yaml yarn.lock
```

If forbidden paths show changes that were not part of the stage scope, stop and report.

## Screenshot Workflow

When UI exists:

1. Start the local app using the project's normal command.
2. Capture 390px and 430px mobile screenshots for the relevant page.
3. Save screenshots under `docs/stage4/screenshots/`.
4. Update `docs/stage4/STAGE4_SCREENSHOT_LOG.md`.
5. Record whether rework is needed.

Stage 4A has no screenshot capture requirement.

## Forbidden Workflow Shortcuts

Do not:

- temporarily connect a real VLM for a better demo
- add API keys
- call Qwen/Bailian/Qwen-VL
- modify Stage 3 rules to make a page look better
- rewrite persona names
- reorder Top3 for presentation
- expose debug data as user-facing content
- create payment/login/admin systems during Stage 4
- do broad architecture restructuring

## Status Update Rules

At the end of every future Stage 4 substage, update:

- `docs/stage4/STAGE4_STATE.md`
- `docs/stage4/STAGE4_SCREENSHOT_LOG.md` if screenshots were captured
- relevant stage-specific documents created during that substage

Keep Stage 4 state factual and concise.
