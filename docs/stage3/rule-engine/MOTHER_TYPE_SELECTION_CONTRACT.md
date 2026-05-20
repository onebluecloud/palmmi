# Palmmi Stage 3G 母型选择契约

## 1. 目标

本文定义主母型、副母型、双母型选择契约。

规则引擎输入必须是 Stage 3E 校验后的标准化 33 字段。

## 2. 输入前置条件

进入母型选择前必须满足：

- `normalized_33_fields` 存在。
- 输入字段完整覆盖 33 字段。
- 输入字段通过 3E Schema。
- 字段值完成降级记录。
- `schema_version`、`degradation_policy_version`、`rule_version` 存在。

## 3. 输出字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `raw_scores` | object | 8 个母型原始评分 |
| `eligible_as_primary` | object | 每个母型是否满足主母型核心字段硬约束 |
| `primary_mother` | string 或 null | 主母型 id |
| `primary_score` | number 或 null | 主母型分数 |
| `secondary_mother` | string 或 null | 副母型 id |
| `secondary_score` | number 或 null | 副母型分数 |
| `is_dual_mother` | boolean | 第一第二差距是否小于 15 分 |

## 4. V4.2 选择逻辑

必须保留 V4.2 逻辑：

1. 先计算 8 母型 `raw_scores`。
2. 计算每个母型的 `eligible_as_primary`。
3. 主母型只能从满足核心字段硬约束的母型中选择。
4. 副母型可以来自 Top 2。
5. 第一第二差距小于 15 分时，视为双母型用户。

工程流程：

```text
raw_scores = score all M1..M8
eligible_as_primary = core_support_count >= 2 for each mother
sorted_scores = raw_scores desc
primary = highest score mother where eligible_as_primary == true
secondary = highest score mother where mother != primary
is_dual_mother = secondary exists and (primary_score - secondary_score) < 15
```

## 5. 异常分支

| 异常 | 处理 |
|---|---|
| 没有任何 eligible primary | 返回 `RULE_NO_ELIGIBLE_PRIMARY_MOTHER`，进入 `RETRY_REQUIRED` |
| `raw_scores` 为空 | 返回 `RULE_MOTHER_SCORE_FAILED` |
| 输入字段缺失 | 返回 `RULE_FIELD_MISSING` |
| 输入字段未通过 3E Schema | 返回 `RULE_INPUT_SCHEMA_INVALID` |
| 字段越界 | 返回 `RULE_FIELD_OUT_OF_RANGE` |

## 6. 不允许的行为

- 不允许在没有 eligible primary 时强行选最高分母型。
- 不允许辅助字段或低置信字段单独决定主母型。
- 不允许跳过 8 母型评分直接选择 36 人格。
- 不允许把副母型当作主母型返回。
