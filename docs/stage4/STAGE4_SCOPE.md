# Palmmi Stage 4 Scope

## Stage 4 Definition

Stage 4 is page productization.

It turns the Stage 3 mock `RecognitionResult` into a mobile-first Palmmi product experience. Stage 4 owns page flow, user-facing states, visual hierarchy, result rendering, poster rendering, and screenshot acceptance.

Stage 4 does not own recognition intelligence.

## Stage 4 Product Scope

Stage 4 includes:

1. 首页 / 落地页
2. 上传页 / 拍照引导
3. 分析中页面
4. 异常状态
5. 结果页数据渲染
6. 结果页视觉打磨
7. 分享海报数据渲染
8. 分享海报视觉打磨
9. 移动端全流程验收
10. Stage 5 交接

## Stage 4 Out Of Scope

Stage 4 does not do:

1. 不接真实 VLM。
2. 不调用千问、百炼、Qwen-VL 或任何真实视觉模型 API。
3. 不改 Stage 3 的识别规则。
4. 不改 8 个 score 函数。
5. 不改 36 人格规则。
6. 不改 mock pipeline 核心逻辑。
7. 不改缓存核心逻辑。
8. 不改 Stage 3 测试。
9. 不做真实支付。
10. 不做登录系统。
11. 不做后台管理系统。
12. 不做大规模架构重构。

## Stage 4A Allowed Scope

Stage 4A only creates or modifies documentation under `docs/stage4/`.

Allowed Stage 4A outputs:

- `docs/stage4/STAGE4_STATE.md`
- `docs/stage4/STAGE4_SCOPE.md`
- `docs/stage4/STAGE4_VISUAL_BASELINE.md`
- `docs/stage4/STAGE4_DESIGN_TOKENS.md`
- `docs/stage4/STAGE4_SCREENSHOT_LOG.md`
- `docs/stage4/STAGE4_ACCEPTANCE.md`
- `docs/stage4/STAGE4_WORKFLOW.md`
- `docs/stage4/STAGE4_NEXT_TASKS.md`

Existing Stage 4 handoff files remain valid:

- `docs/stage4/STAGE4_CONTEXT.md`
- `docs/stage4/STAGE4_INPUT_CONTRACT.md`
- `docs/stage4/STAGE4_FORBIDDEN_CHANGES.md`

## Stage 4A Forbidden Scope

Stage 4A must not modify:

- `app/`
- `components/`
- `lib/`
- `public/`
- `tests/`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`
- any Stage 3 pipeline file
- any score/rule/personality engine file
- any mock generator core file
- any VLM/API related file

Stage 4A must not create:

- formal page files
- UI components
- CSS files
- `design-tokens.ts`
- API routes
- VLM provider files
- upload implementation files

## Stage 3 Interface Boundary

Stage 4 consumes only Stage 3 `RecognitionResult`.

The only allowed future recognition entry boundary is Stage 3 pipeline:

```js
const {
  runRecognitionPipeline,
  createDefaultPipelineConfig
} = require("lib/recognition/recognitionPipeline.ts");
```

Stage 4 pages must not directly import or call:

- `lib/recognition/personaRules.ts`
- `lib/recognition/personaMatcher.ts`
- `lib/recognition/adjacentResolver.ts`
- `lib/recognition/crossMotherCorrection.ts`
- `lib/recognition/motherScores.ts`
- V4.2 original report files
- raw feature fixtures for page-side scoring

## Stage 4 Consumable Fields

Stage 4 may render these `RecognitionResult` fields:

- `status`
- `primary_mother`
- `secondary_mother`
- `is_dual_mother`
- `primary_persona`
- `top3`
- `matched_features`
- `conflict_features`
- `reason_codes`
- `correction`
- `cache`
- `quality_gate`
- `schema`
- `debug` fields only when explicitly used for internal QA/admin diagnostics

User-facing pages must not expose raw JSON, schema diagnostics, raw error codes, rule engine terms, or VLM internals.

## Recognition Status Mapping

| Status | Stage 4 page behavior |
| --- | --- |
| `SUCCESS` | Show primary persona, primary mother, Top3, explanation, and poster entry. |
| `LOW_CONFIDENCE` | Show result with a gentle conservative-result hint and a retake option. |
| `RETRY_REQUIRED` | Do not show persona, mother, or Top3. Show retake guidance. |
| `REJECTED` | Do not show persona, mother, or Top3. Show upload rejection reason in plain language. |
| `CACHE_HIT` | Not an independent page status. Use `cache.cache_hit = true` only for diagnostics. |

## Mobile-First Principle

Stage 4 must be mobile-first.

Reason: Palmmi's main distribution scenarios are WeChat, Xiaohongshu, Moments, and other phone-first social contexts.

Frozen requirements:

1. Mobile is the primary design and acceptance target.
2. Priority viewport widths are 390px and 430px.
3. Desktop only receives basic responsive adaptation and is not the primary experience.
4. Every page first screen must work on phone widths.
5. Every future screenshot acceptance must include mobile screenshots.
6. Desktop screenshots may supplement acceptance, but cannot replace mobile acceptance.

## Current Project Structure Notes

Observed at Stage 4A start:

- `app/`: missing.
- `components/`: missing.
- `public/`: missing.
- `lib/recognition/`: exists and belongs to Stage 3 recognition logic.
- `tests/stage3/`: exists and belongs to Stage 3 tests.
- `docs/stage4/`: exists with Stage 4 handoff documents.

Stage 4A does not create front-end directories. Future page implementation stages must decide file placement based on the project structure at that time.

## Stage 4 Substage Plan

| Stage | Scope |
| --- | --- |
| 4A | Create documentation, boundaries, visual baseline, screenshot mechanism, and long-context workflow. |
| 4B | Freeze design baseline and information architecture for homepage, upload, loading, result, and poster pages. |
| 4C | Implement homepage and upload page mobile-first. |
| 4D | Implement loading page and connect page flow to Stage 3 mock pipeline. |
| 4E | Cover upload failure, format error, oversized image, analysis failure, timeout, unknown persona, lost state, retry, and rejected states. |
| 4F | Render all 36 personas correctly on result page with stable data. |
| 4G | Polish result page visual impact, hierarchy, mobile reading, and share intent. |
| 4H | Render base poster structure for any persona. |
| 4I | Polish poster for WeChat, Xiaohongshu, and Moments sharing. |
| 4J | Validate complete mobile flow from home to upload, loading, result, poster, save/share, and retest. |
| 4K | Freeze Stage 4 and hand off to Stage 5 real VLM integration. |

## Stage 4 Exit Boundary

Stage 4 is complete only when the mobile-first user flow works with the Stage 3 mock pipeline and has screenshots for key stages.

Real VLM belongs to Stage 5 or a dedicated real VLM integration stage.
