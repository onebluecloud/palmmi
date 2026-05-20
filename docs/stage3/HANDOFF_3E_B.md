# Palmmi Stage 3E-b Handoff

## 本轮完成内容

- 转写 V4.2 来源版 VLM Prompt。
- 基于 V4.2 Prompt 和 Stage 3E Schema，编写第一版生产候选 Prompt。
- 定义千问 VL Prompt 实测流程。
- 定义生产 Prompt 验收与冻结标准。
- 定义 Prompt 版本管理策略。
- 创建 Prompt 实测记录模板。
- 定义 VLM 原始输出保存策略。
- 创建 10-20 张测试图片数据集计划。
- 创建 Prompt 实测报告模板。
- 更新 Stage 3 状态文件。
- 更新 Stage 3 决策日志。

## 创建/修改文件

- 新增：`docs/stage3/prompt/VLM_PROMPT_SOURCE_V4_2.md`
- 新增：`docs/stage3/prompt/VLM_PROMPT_PRODUCTION_DRAFT.md`
- 新增：`docs/stage3/prompt/PROMPT_EVAL_PROTOCOL.md`
- 新增：`docs/stage3/prompt/PROMPT_ACCEPTANCE_CRITERIA.md`
- 新增：`docs/stage3/prompt/PROMPT_VERSIONING_POLICY.md`
- 新增：`docs/stage3/prompt/PROMPT_EVAL_RECORD_TEMPLATE.md`
- 新增：`docs/stage3/prompt/RAW_OUTPUT_STORAGE_POLICY.md`
- 新增：`tests/stage3/prompt-eval/PROMPT_EVAL_DATASET_PLAN.md`
- 新增：`tests/stage3/prompt-eval/PROMPT_EVAL_REPORT_TEMPLATE.md`
- 新增：`docs/stage3/HANDOFF_3E_B.md`
- 修改：`docs/stage3/STAGE3_STATE.md`
- 修改：`docs/stage3/DECISIONS.md`

## API 调用状态

本轮未真实调用千问 API，只完成 Prompt 实测方案、生产候选 Prompt、版本策略、记录模板和数据集计划。

## 本轮边界

本轮未写业务代码。

本轮未接正式 API。

本轮未做规则引擎。

本轮未做 36 人格匹配。

本轮未改 UI。

本轮未伪造测试结果。

## 关键冻结点

- V4.2 Prompt 是来源版，不直接视为生产版。
- 生产版 Prompt 必须经过 10-20 张图实测后冻结。
- VLM 只做视觉字段提取，不输出人格、母型、命运、健康、婚姻、寿命判断。
- `FINGERTIP_SHAPE` 不进入 VLM Prompt。
- `prompt_version` 必须进入后续缓存 key。
- Prompt 冻结后，后续修改必须走变更记录。
- 如果没有测试图片和 API 配置，本轮不伪造实测结果，只创建测试方案和报告模板。

## 下一步 3F

基于 file_hash、model_version、prompt_version、schema_version、rule_version 设计同图缓存与版本管理策略；只保留 file_hash，不使用 perceptual_hash。
