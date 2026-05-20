# Palmmi Stage 4 Next Tasks

## Next Stage

Stage 4B: 关键页面设计基准。

Stage 4B should not implement formal pages. It should freeze page information architecture, mobile first-screen structure, core copy, visual references, forbidden items, and entry criteria for Stage 4C.

## Stage 4B Required Reading

Before doing Stage 4B, read:

1. `docs/stage4/STAGE4_STATE.md`
2. `docs/stage4/STAGE4_SCOPE.md`
3. `docs/stage4/STAGE4_VISUAL_BASELINE.md`
4. `docs/stage4/STAGE4_DESIGN_TOKENS.md`
5. `docs/stage4/STAGE4_ACCEPTANCE.md`
6. `docs/stage4/STAGE4_WORKFLOW.md`
7. `docs/stage4/STAGE4_INPUT_CONTRACT.md`
8. `docs/stage4/STAGE4_FORBIDDEN_CHANGES.md`
9. `docs/stage3/HANDOFF_TO_STAGE4.md`
10. `docs/stage3/STAGE3_FINAL_ACCEPTANCE_REPORT.md`

## Stage 4B Scope

Stage 4B should:

1. 读取 Stage 4A 文档。
2. 不写正式页面。
3. 先冻结关键页面设计基准。
4. 输出首页、上传页、分析页、结果页、海报页的信息架构。
5. 输出移动端首屏结构。
6. 输出每个页面的核心文案。
7. 输出视觉参考原则。
8. 输出每个页面禁止事项。
9. 输出进入 Stage 4C 的验收标准。

## Stage 4B Suggested Output Files

Suggested documentation outputs:

- `docs/stage4/STAGE4B_PAGE_BASELINE.md`
- `docs/stage4/STAGE4B_INFORMATION_ARCHITECTURE.md`
- `docs/stage4/STAGE4B_COPY_BASELINE.md`
- `docs/stage4/STAGE4B_ACCEPTANCE.md`

Stage 4B may adjust this file list if a more precise documentation structure is needed, but it should stay under `docs/stage4/`.

## Stage 4B Page Baseline Tasks

### Home Page

Define:

- product first-screen message
- primary action
- secondary trust/privacy hint
- abstract palm visual direction
- mobile 390px and 430px first-screen structure

Forbidden:

- fortune-telling claims
- medical or diagnostic claims
- desktop-first hero layout
- real VLM claims

### Upload Page

Define:

- upload entry structure
- photo guidance
- privacy-light copy
- accepted image expectations
- retake/reselect behavior at the copy level

Forbidden:

- implementing upload code
- reading files
- calling APIs
- modifying image compression logic
- exposing technical metadata to users

### Loading / Analysis Page

Define:

- loading states
- analysis copy
- calm scan visual direction
- transition expectation to result or error state

Forbidden:

- fake model-progress precision
- real VLM calls
- API status polling implementation
- raw pipeline/debug display

### Result Page

Define:

- result hierarchy
- primary persona presentation
- mother type label placement
- Top3 display approach
- low-confidence hint placement
- poster entry

Forbidden:

- recalculating persona
- rewriting persona names
- reordering Top3
- showing raw scores as truth
- exposing debug/schema fields

### Poster Page

Define:

- base poster composition
- share-oriented copy length
- Palmmi brand placement
- abstract palm-line motif
- data fields shown from `RecognitionResult`

Forbidden:

- long paragraphs
- raw Top3 score table
- full scary palm imagery
- medical/fate claims
- QR/payment/login/admin features

## Stage 4B Acceptance Criteria

Stage 4B passes when:

1. It has read Stage 4A documents.
2. It creates only documentation under `docs/stage4/`.
3. It does not implement UI files.
4. It freezes information architecture for home, upload, loading, result, and poster pages.
5. It freezes mobile first-screen structure for 390px and 430px thinking.
6. It freezes core user-facing copy direction.
7. It records visual reference principles without creating UI.
8. It records forbidden items for each page.
9. It defines clear entry criteria for Stage 4C.
10. `git status` shows no Stage 4B changes outside the allowed docs scope.

## Stage 4C Entry Criteria

Stage 4C can start only after Stage 4B has:

- a frozen homepage baseline
- a frozen upload page baseline
- a frozen mobile first-screen structure
- approved core copy for homepage and upload
- clear visual direction aligned with Stage 4A
- explicit forbidden changes carried forward
- acceptance criteria for screenshots

Stage 4C should then implement homepage and upload page only.
