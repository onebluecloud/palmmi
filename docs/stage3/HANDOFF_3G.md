# Palmmi Stage 3G Handoff

## 本轮完成内容

- 完成 V4.2 规则引擎工程规范来源映射。
- 转写 8 个母型评分函数。
- 转写主母型核心字段最低支撑硬约束。
- 定义主母型、副母型、双母型选择契约。
- 转写 8 母型到 36 人格候选池映射。
- 定义 3G 与 3H 的人格规则实现边界。
- 转写 12 对相邻人格区分规则。
- 转写跨母型补判机制。
- 定义规则引擎输入输出契约。
- 定义规则引擎错误契约。
- 定义规则引擎规范测试计划。
- 更新 Stage 3 状态文件。
- 更新 Stage 3 决策日志。

## 创建/修改文件

- 新增：`docs/stage3/rule-engine/RULE_ENGINE_SOURCE_MAP.md`
- 新增：`docs/stage3/rule-engine/MOTHER_TYPE_SCORE_FUNCTIONS_SPEC.md`
- 新增：`docs/stage3/rule-engine/MOTHER_TYPE_FIELD_SUPPORT_SPEC.md`
- 新增：`docs/stage3/rule-engine/MOTHER_TYPE_SELECTION_CONTRACT.md`
- 新增：`docs/stage3/rule-engine/MOTHER_TO_PERSONA_MAPPING_SPEC.md`
- 新增：`docs/stage3/rule-engine/PERSONA_RULE_ENGINE_BOUNDARY_SPEC.md`
- 新增：`docs/stage3/rule-engine/ADJACENT_PERSONA_RULES_SPEC.md`
- 新增：`docs/stage3/rule-engine/CROSS_MOTHER_CORRECTION_SPEC.md`
- 新增：`docs/stage3/rule-engine/RULE_ENGINE_INPUT_OUTPUT_CONTRACT.md`
- 新增：`docs/stage3/rule-engine/RULE_ENGINE_ERROR_CONTRACT.md`
- 新增：`docs/stage3/rule-engine/RULE_ENGINE_TEST_PLAN.md`
- 新增：`docs/stage3/HANDOFF_3G.md`
- 修改：`docs/stage3/STAGE3_STATE.md`
- 修改：`docs/stage3/DECISIONS.md`

## 本轮边界

本轮只完成 V4.2 规则引擎工程规范转写。

本轮未写业务代码。

本轮未实现规则引擎代码。

本轮未接 VLM。

本轮未接千问 API。

本轮未做端到端识别。

本轮未改 UI。

## 下一步 3H

基于 3G 的母型评分与候选池规范，实现 36 人格规则、主母型内人格匹配、跨母型补判、Top 3 候选输出和解释性结果结构的工程规范；不接 VLM，不改 UI。
