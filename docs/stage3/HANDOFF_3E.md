# Palmmi Stage 3E Handoff

## 本轮完成内容

- 基于 Stage 3D 已冻结的 33 字段规范，定义 Palmmi Stage 3 标准 JSON Schema。
- 区分 VLM 原始输出 Schema 与 Palmmi 内部标准化 33 字段 Schema。
- 冻结字段校验层级、枚举白名单、缺失字段处理、`null` 处理和字段降级策略。
- 定义 Schema 层错误处理契约。
- 定义 3E Schema 测试计划。
- 更新 Stage 3 状态文件。
- 更新 Stage 3 决策日志。

## 创建/修改文件

- 新增：`docs/stage3/V4_2_JSON_SCHEMA_SPEC.md`
- 新增：`docs/stage3/FIELD_VALIDATION_RULES_SPEC.md`
- 新增：`docs/stage3/FIELD_ENUM_WHITELIST_SPEC.md`
- 新增：`docs/stage3/MISSING_FIELD_AND_NULL_POLICY.md`
- 新增：`docs/stage3/FIELD_DEGRADATION_POLICY.md`
- 新增：`docs/stage3/SCHEMA_ERROR_HANDLING_CONTRACT.md`
- 新增：`docs/stage3/SCHEMA_TEST_PLAN.md`
- 新增：`docs/stage3/HANDOFF_3E.md`
- 修改：`docs/stage3/STAGE3_STATE.md`
- 修改：`docs/stage3/DECISIONS.md`

## 本轮边界

3E 只完成 JSON Schema、字段校验、枚举白名单、缺失字段处理、降级策略文档。

本轮未写代码。

本轮未接 API。

本轮未做规则引擎。

本轮未做人格匹配。

本轮未改 UI。

## 关键冻结点

- Palmmi 内部标准化层只能包含 33 个大写字段。
- 所有字段值必须是数字枚举或 `null`。
- 二档字段只允许 `0/1/null`。
- 三档字段只允许 `0/1/2/null`。
- 四档字段只允许 `0/1/2/3/null`。
- 字段校验失败不能直接进入规则引擎。
- 降级字段必须记录，不能伪装成高置信原始识别结果。
- 连续 5 个字段降级触发重拍。
- 低置信字段不能单独决定主母型，也不能作为主母型核心字段支撑。

## 下一步 3E-b

基于 V4.2 Prompt 模板和 3E Schema 规范，设计千问 VL Prompt 实测方案，记录 10-20 张图的 JSON 合规率、字段缺失率、枚举越界率，并冻结生产版 Prompt。
