# Palmmi Stage 3G 规则引擎输入输出契约

## 1. 目标

本文定义规则引擎输入输出契约。

3G 输出中的 persona 相关字段只是占位契约，3H 才具体实现。

## 2. 输入契约

输入必须包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `normalized_33_fields` | object | Stage 3E 校验后的标准化 33 字段 |
| `validation_result` | object | Stage 3E 校验结果 |
| `degraded_fields` | array | 降级字段记录 |
| `schema_version` | string | Schema 版本 |
| `degradation_policy_version` | string | 降级策略版本 |
| `rule_version` | string | 规则版本 |

输入必须先通过 Stage 3E Schema，不得把 VLM 原始输出直接送入规则引擎。

## 3. 输出契约

输出必须包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `mother_type_scores` | object | 8 母型分数 |
| `eligible_primary_mothers` | object | 每个母型是否可作为主母型 |
| `primary_mother` | string 或 null | 主母型 |
| `secondary_mother` | string 或 null | 副母型 |
| `is_dual_mother` | boolean | 是否双母型 |
| `persona_candidate_pool` | array | 主母型内人格候选池 |
| `adjacent_resolution_placeholder` | object 或 null | 相邻人格区分占位，3H 实现 |
| `cross_mother_correction_placeholder` | object 或 null | 跨母型补判占位，3H 实现 |
| `rule_engine_status` | string | 规则引擎状态 |
| `error_codes` | array | 错误码 |

## 4. 状态枚举

| 状态 | 含义 |
|---|---|
| `RULE_READY` | 母型评分和候选池选择完成，可进入 3H |
| `INSUFFICIENT_CORE_SUPPORT` | 核心字段支撑不足 |
| `INPUT_SCHEMA_INVALID` | 输入未通过 3E Schema |
| `RETRY_REQUIRED` | 需要重拍或重试，不输出主母型 |
| `REJECTED` | 输入不可用或规则层拒绝 |

## 5. 处理边界

3G 输出不包含最终主人格。

3G 输出不包含 Top 3 人格。

3G 输出不包含解释性结果正文。

这些内容由后续 3H 定义。
