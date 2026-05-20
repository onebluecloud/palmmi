# Palmmi Stage 3G 规则引擎规范测试计划

## 1. 目标

本文定义 Stage 3G 规则引擎规范测试计划。

本计划不写测试代码，只写测试用例设计。

## 2. 测试用例

| 编号 | 输入字段构造说明 | 预期母型分 | 预期主母型 | 是否满足核心字段硬约束 | 是否双母型 | 是否触发相邻规则 | 是否触发跨母型补判 | 预期状态 |
|---|---|---|---|---|---|---|---|---|
| T01 | M1 字段高：`HEAD_LINE_DEPTH>=2`, `HEAD_LINE_LENGTH>=2`, `OVERALL_CLARITY>=2`, `LINE_COMPLEXITY<=1` | M1 高分 | M1 | 是 | 否 | 否 | 否 | `RULE_READY` |
| T02 | M2 字段高：`HEART_LINE_DEPTH>=2`, `HEART_LINE_LENGTH>=2`, `HEART_LINE_CURVE>=2`, `MOUNT_VENUS>=1` | M2 高分 | M2 | 是 | 否 | 视人格分数 | 否 | `RULE_READY` |
| T03 | M3 低置信字段高，但 `LINE_COMPLEXITY` 或 `HEART_LINE_DEPTH` 不足 | M3 可高分 | 非 M3 或无 eligible | 否 | 否 | 否 | 否 | `INSUFFICIENT_CORE_SUPPORT` 或 `RETRY_REQUIRED` |
| T04 | M6 依赖 `FATE_LINE_CLARITY`、`SUN_LINE_PRESENCE` 高分，但 `OVERALL_CLARITY`、`THUMB_LENGTH_RATIO` 不足 | M6 可高分 | 非 M6 或无 eligible | 否 | 否 | 否 | 否 | `INSUFFICIENT_CORE_SUPPORT` 或 `RETRY_REQUIRED` |
| T05 | M7 依赖 `MOUNT_LUNA`、`FINGERTIP_SHAPE` 高分，但 `HEAD_LINE_SLOPE`、`HEART_LINE_DEPTH` 不足 | M7 可高分 | 非 M7 或无 eligible | 否 | 否 | 否 | 否 | `INSUFFICIENT_CORE_SUPPORT` 或 `RETRY_REQUIRED` |
| T06 | 至少两个其他母型评分 `>=60`，并可能有 `HEAD_LINE_END_FORK=1` | M8 高分 | M8，前提核心字段满足 | 视 M8 core | 视分差 | 否 | 否 | `RULE_READY` |
| T07 | 第一第二母型分差 `<15`，两者中主母型满足核心字段硬约束 | Top1/Top2 接近 | Top1 eligible | 是 | 是 | 否 | 否 | `RULE_READY` |
| T08 | 8 个母型核心字段均不足 | 全部不 eligible | null | 否 | 否 | 否 | 否 | `RETRY_REQUIRED` |
| T09 | 主母型候选池内 P01 / P12 分数差 `<0.15`，`MOUNT_JUPITER>=1` | 母型正常 | M1 | 是 | 否 | 是 | 否 | `RULE_READY`，相邻规则选 P01 |
| T10 | 主母型候选池内 P10 / P29 分数差 `<0.15`，`MOUNT_LUNA>=1 and HEAD_LINE_SLOPE>=2` | 母型正常 | M7 | 是 | 否 | 是 | 否 | `RULE_READY`，相邻规则选 P10 |
| T11 | 跨母型人格匹配度比当前主人格高 20% 以上，且新母型分 `>=50` | 新母型分合格 | 初始主母型保留记录 | 是 | 视分差 | 视候选 | 是 | `RULE_READY`，记录跨母型补判 |
| T12 | 输入字段未通过 3E Schema | 不计算 | null | 否 | 否 | 否 | 否 | `INPUT_SCHEMA_INVALID` |

## 3. 覆盖要求

测试计划必须覆盖：

1. M1 高分且核心字段满足。
2. M2 高分且核心字段满足。
3. M3 高分但核心字段不足。
4. M6 依赖辅助字段高分但核心字段不足。
5. M7 依赖低置信字段高分但核心字段不足。
6. M8 多母型评分 `>=60`。
7. 第一第二母型差距 `<15`，双母型成立。
8. 全部母型核心字段不足，触发 `RETRY_REQUIRED`。
9. 相邻人格 P01/P12 分流。
10. 相邻人格 P10/P29 分流。
11. 跨母型补判满足 20% + 母型分 `>=50`。
12. 输入字段未通过 Schema，规则引擎拒绝处理。

## 4. 验收标准

- 8 母型公式可逐项追溯到 V4.2。
- 主母型选择必须经过核心字段硬约束。
- 相邻人格规则只在分数接近时触发。
- 跨母型补判必须记录原因。
- 输入未通过 Schema 时不得执行规则引擎。
