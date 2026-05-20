# Palmmi Stage 3 State

## 当前阶段

Stage 3L：最终验收与 Stage 4 交接（已完成）

Stage 3：已完成。当前为 mock 工程闭环已通过状态，可进入 Stage 4 页面产品化。

## Stage 3 总目标

建立 Palmmi 掌纹识别系统的工程化识别流水线：

图片输入与压缩 → 非手掌拦截 → 图片质量检测 → VLM 特征提取 → JSON 校验降级 → file_hash 缓存 → V4.2 双层评分规则引擎 → 36 人格输出 → 回归测试与成本统计。

## Stage 3 当前规则源

唯一主规则源为：

`E:\其他\claude下载文件\palmtag\PalmTag_掌纹量化研究报告_V4_2.md`

原报告文件名使用历史旧名 PalmTag。Stage 3 工程上下文只把它作为 V4.2 规则来源读取，不修改原始报告。

## 命名规则

PalmTag 是旧名。

Palmmi 是当前正式产品名。

工程文档、代码命名、用户可见文案都必须使用 Palmmi。

原始报告引用时可以注明“原报告旧名 PalmTag”。

## Stage 3 禁止事项

- 不重新设计 33 字段
- 不重新设计 8 母型
- 不重新设计 36 人格
- 不重新设计权重
- 不重写文案
- 不新增字段
- 不删除 V4.2 已定字段
- 不用 Codex 自己的理解替代 V4.2
- 不使用 perceptual_hash
- 不修改 Stage 2 UI
- 不接正式 API
- 不写业务代码
- 不写规则引擎
- 不做 36 人格匹配
- 不做端到端识别

## Stage 3 后续任务列表

- 3A：V4.2 注入与 Stage 3 上下文冻结
- 3B：图片输入、压缩、EXIF、上传限制
- 3C：非手掌拦截 + 图片质量检测
- 3D：V4.2 33字段工程转写
- 3E：V4.2 JSON Schema + 校验/降级机制
- 3E-b：V4.2 Prompt 实测调优 + 生产 Prompt 冻结
- 3F：file_hash 缓存 + 模型/prompt/schema/rule 版本管理
- 3G：V4.2 规则引擎代码化
- 3H：V4.2 双层评分流程实现
- 3I：36型分布模拟测试
- 3J：端到端识别闭环整合
- 3K：回归测试 + 成本统计 + 稳定性测试
- 3L：Stage 3 验收报告 + Stage 4 交接

## 当前完成状态

| 子任务 | 状态 |
|---|---|
| 3A：V4.2 注入与 Stage 3 上下文冻结 | 已完成 |
| 3B：图片输入、压缩、EXIF、上传限制 | 已完成 |
| 3C：非手掌拦截 + 图片质量检测 | 已完成 |
| 3D：V4.2 33字段工程转写 | 已完成 |
| 3E：V4.2 JSON Schema + 校验/降级机制 | 已完成 |
| 3E-b：V4.2 Prompt 实测调优 + 生产 Prompt 冻结 | 已完成 |
| 3F：file_hash 缓存 + 模型/prompt/schema/rule 版本管理 | 已完成 |
| 3G：V4.2 规则引擎代码化 | 已完成 |
| 3H：V4.2 双层评分流程实现 | 已完成 |
| 3I：36型分布模拟测试 | 已完成 |
| 3J：端到端识别闭环整合 | 已完成 |
| 3K：回归测试 + 成本统计 + 稳定性测试 | 已完成 |
| 3L：Stage 3 验收报告 + Stage 4 交接 | 已完成 |

## Stage 3B 新增文件

- `docs/stage3/IMAGE_INPUT_SPEC.md`
- `docs/stage3/IMAGE_INPUT_CONTRACT.md`
- `docs/stage3/IMAGE_PRIVACY_AND_STORAGE.md`
- `docs/stage3/IMAGE_INPUT_TEST_PLAN.md`
- `docs/stage3/HANDOFF_3B.md`

## 下一步

新开 Codex 对话进入 Stage 4A：冻结 Stage 4 页面产品化上下文，读取 Stage 3 交接材料，确认页面范围、接口边界、禁止修改项和第一批页面任务。

Stage 4A 不接真实 VLM，不接真实 API，不改识别规则。

## Stage 3C 新增文件

- `docs/stage3/NON_PALM_REJECTION_SPEC.md`
- `docs/stage3/IMAGE_QUALITY_GATE_SPEC.md`
- `docs/stage3/LIGHTWEIGHT_VISION_PREFLIGHT_SPEC.md`
- `docs/stage3/QUALITY_GATE_CONTRACT.md`
- `docs/stage3/QUALITY_GATE_TEST_PLAN.md`
- `docs/stage3/HANDOFF_3C.md`

## Stage 3D 新增文件

- `docs/stage3/FIELD_SCHEMA_33_SPEC.md`
- `docs/stage3/FIELD_ENUM_AND_PRECISION_SPEC.md`
- `docs/stage3/FIELD_CONFIDENCE_TIERS_SPEC.md`
- `docs/stage3/VLM_OUTPUT_SCHEMA_MAPPING.md`
- `docs/stage3/FINGERTIP_SHAPE_ENGINEERING_NOTE.md`
- `docs/stage3/HANDOFF_3D.md`

## Stage 3E 新增文件

- `docs/stage3/V4_2_JSON_SCHEMA_SPEC.md`
- `docs/stage3/FIELD_VALIDATION_RULES_SPEC.md`
- `docs/stage3/FIELD_ENUM_WHITELIST_SPEC.md`
- `docs/stage3/MISSING_FIELD_AND_NULL_POLICY.md`
- `docs/stage3/FIELD_DEGRADATION_POLICY.md`
- `docs/stage3/SCHEMA_ERROR_HANDLING_CONTRACT.md`
- `docs/stage3/SCHEMA_TEST_PLAN.md`
- `docs/stage3/HANDOFF_3E.md`

## Stage 3E-b 新增文件

- `docs/stage3/prompt/VLM_PROMPT_SOURCE_V4_2.md`
- `docs/stage3/prompt/VLM_PROMPT_PRODUCTION_DRAFT.md`
- `docs/stage3/prompt/PROMPT_EVAL_PROTOCOL.md`
- `docs/stage3/prompt/PROMPT_ACCEPTANCE_CRITERIA.md`
- `docs/stage3/prompt/PROMPT_VERSIONING_POLICY.md`
- `docs/stage3/prompt/PROMPT_EVAL_RECORD_TEMPLATE.md`
- `docs/stage3/prompt/RAW_OUTPUT_STORAGE_POLICY.md`
- `tests/stage3/prompt-eval/PROMPT_EVAL_DATASET_PLAN.md`
- `tests/stage3/prompt-eval/PROMPT_EVAL_REPORT_TEMPLATE.md`
- `docs/stage3/HANDOFF_3E_B.md`

## Stage 3F 新增文件

- `docs/stage3/cache/FILE_HASH_CACHE_SPEC.md`
- `docs/stage3/cache/CACHE_KEY_CONTRACT.md`
- `docs/stage3/cache/CACHE_VALUE_SCHEMA.md`
- `docs/stage3/cache/CACHE_HIT_MISS_POLICY.md`
- `docs/stage3/cache/CACHE_INVALIDATION_POLICY.md`
- `docs/stage3/cache/CACHE_PRIVACY_AND_RETENTION_POLICY.md`
- `docs/stage3/cache/CACHE_ERROR_HANDLING_CONTRACT.md`
- `docs/stage3/cache/CACHE_TEST_PLAN.md`
- `docs/stage3/cache/VERSION_REGISTRY_SPEC.md`
- `docs/stage3/cache/HASH_INPUT_NORMALIZATION_SPEC.md`
- `docs/stage3/HANDOFF_3F.md`

## Stage 3G 新增文件

- `docs/stage3/rule-engine/RULE_ENGINE_SOURCE_MAP.md`
- `docs/stage3/rule-engine/MOTHER_TYPE_SCORE_FUNCTIONS_SPEC.md`
- `docs/stage3/rule-engine/MOTHER_TYPE_FIELD_SUPPORT_SPEC.md`
- `docs/stage3/rule-engine/MOTHER_TYPE_SELECTION_CONTRACT.md`
- `docs/stage3/rule-engine/MOTHER_TO_PERSONA_MAPPING_SPEC.md`
- `docs/stage3/rule-engine/PERSONA_RULE_ENGINE_BOUNDARY_SPEC.md`
- `docs/stage3/rule-engine/ADJACENT_PERSONA_RULES_SPEC.md`
- `docs/stage3/rule-engine/CROSS_MOTHER_CORRECTION_SPEC.md`
- `docs/stage3/rule-engine/RULE_ENGINE_INPUT_OUTPUT_CONTRACT.md`
- `docs/stage3/rule-engine/RULE_ENGINE_ERROR_CONTRACT.md`
- `docs/stage3/rule-engine/RULE_ENGINE_TEST_PLAN.md`
- `docs/stage3/HANDOFF_3G.md`

## Stage 3H 新增文件

- `lib/recognition/recognitionTypes.ts`
- `lib/recognition/motherScores.ts`
- `lib/recognition/personaCatalog.ts`
- `lib/recognition/personaRules.ts`
- `lib/recognition/personaMatcher.ts`
- `lib/recognition/adjacentResolver.ts`
- `lib/recognition/crossMotherCorrection.ts`
- `tests/stage3/run-stage3h-tests.cjs`
- `tests/stage3/persona-matcher.test.ts`
- `tests/stage3/adjacent-resolver.test.ts`
- `tests/stage3/cross-mother-correction.test.ts`
- `tests/stage3/fixtures/sample-features-m1.json`
- `tests/stage3/fixtures/sample-features-m2.json`
- `tests/stage3/fixtures/sample-features-m3.json`
- `tests/stage3/fixtures/sample-features-m4.json`
- `tests/stage3/fixtures/sample-features-m5.json`
- `tests/stage3/fixtures/sample-features-m6.json`
- `tests/stage3/fixtures/sample-features-m7.json`
- `tests/stage3/fixtures/sample-features-m8.json`
- `tests/stage3/fixtures/sample-features-cross-mother.json`
- `tests/stage3/fixtures/sample-features-close-top12.json`
- `tests/stage3/fixtures/sample-features-no-eligible.json`
- `docs/stage3/HANDOFF_3H.md`

## Stage 3I 新增/修改文件

- 新增：`tests/stage3/run-stage3i-distribution.cjs`
- 新增：`tests/stage3/fixtures/distribution/*.json`（54 个确定性 33 字段模拟样本）
- 新增：`docs/stage3/STAGE3I_DISTRIBUTION_REPORT.md`
- 新增：`docs/stage3/HANDOFF_3I.md`
- 新增：`tests/stage3/fixtures/sample-features-adjacent-low-pair.json`
- 修改：`lib/recognition/adjacentResolver.ts`
- 修改：`tests/stage3/persona-matcher.test.ts`
- 修改：`docs/stage3/CHANGE_REQUESTS.md`
- 修改：`docs/stage3/STAGE3_STATE.md`

## Stage 3I 风险发现

- 总样本数：54。
- 母型分布：M7 月相型命中 2/54（3.70%），低于 5%，标记 WARNING。
- 36 人格分布：6 个最终人格 0 命中：`P27`, `P26`, `P29`, `P04`, `P32`, `P24`。
- 高频人格：最高为 `P25` 和 `P35`，各 5/54（9.26%），未超过 10% WARNING 阈值。
- Top1/Top2 分差：平均 0.1148，最小 0，33/54 个样本分差 `<0.15`，边界偏密集，后续需关注。
- 相邻人格：13 次触发；`P05/P07`、`P25/P33` 在最终匹配输出中 0 次触发，需在后续样本扩展中继续检查。
- 跨母型补判：检查 54 次，实际触发 3 次（5.56%），未见触发率过高。
- 3I 发现并修复一个 3H 集成 bug：低分相邻人格对不应覆盖当前主母型候选池内更高分的人格；已在 `CHANGE_REQUESTS.md` 记录。
## Stage 3J 完成更新

- 当前阶段：Stage 3J 端到端识别闭环工程整合（已完成）。
- 端到端闭环：已跑通 mock image metadata、质量门控、file_hash 缓存、mock VLM features、33 字段 Schema 校验/降级、8 母型评分、36 人格匹配、跨母型补判、相邻人格区分、Top3 输出和统一 RecognitionResult。
- 3I 风险保留：M7 低于 5%、`P27`/`P26`/`P29`/`P04`/`P32`/`P24` 0 命中、33/54 个样本 Top1/Top2 分差 `<0.15`、`P05/P07` 与 `P25/P33` 最终触发 0 次、跨母型补判 3/54 未见过高，均保留给 3K/后续调参，不在 3J 调权重。
- Stage 3J 新增文件：`lib/recognition/recognitionPipeline.ts`、`lib/recognition/recognitionCache.ts`、`lib/recognition/qualityGate.ts`、`lib/recognition/schemaValidator.ts`、`lib/recognition/recognitionResult.ts`、`tests/stage3/run-stage3j-pipeline.cjs`、`tests/stage3/fixtures/pipeline/*.json`、`docs/stage3/STAGE3J_PIPELINE_REPORT.md`、`docs/stage3/HANDOFF_3J.md`。
- 回归结果：`node tests/stage3/run-stage3h-tests.cjs` 9/9 passed；`node tests/stage3/run-stage3i-distribution.cjs` 通过并重新生成分布报告；`node tests/stage3/run-stage3j-pipeline.cjs` 14/14 passed。
- 下一步 3K：基于 3J 的端到端闭环，进行回归测试、成本统计、失败路径压力测试、缓存命中测试和 Stage 3 稳定性验收；不接真实 VLM，不改 UI。

## Stage 3K Completion Update (2026-05-16)

- Current authoritative stage: Stage 3K stability acceptance and regression diagnostics are complete.
- Stage 3 mock engineering loop: passed through 3H, 3I, 3J, and 3K tests.
- Stage 3 can enter engineering acceptance and Stage 4 interface handoff for page productization.
- Stage 3 remains mock-only: no real API, no real VLM, no Qwen key, and no UI change.
- 3I risks are retained: M7 under 5%, six zero-hit personas, 33/54 close Top1/Top2 samples, P05/P07 and P25/P33 zero final adjacent triggers, and cross-mother correction 3/54.
- Next target: finalize Stage 3 acceptance and Stage 4 handoff materials; keep real VLM integration in a later dedicated stage.

## Stage 3L Completion Update (2026-05-16)

- Stage 3L is complete.
- Stage 3 is complete.
- Current Stage 3 state: mock engineering loop passed.
- Real VLM integration: not connected.
- Real API integration: not connected.
- Recognition rules are frozen.
- V4.2 fields, rules, mother/persona mapping, 36 persona names, 12 adjacent persona rules, `threshold = 0.15`, and cross-mother correction `20% + mother score >= 50` are frozen.
- 3I distribution risks are retained for a later real-sample calibration stage.
- Stage 4 may begin page productization using Stage 3 `RecognitionResult`.
- Next step: open a new Codex conversation for Stage 4A; only freeze page productization context, do not connect real VLM.
