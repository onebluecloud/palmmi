# Palmmi Stage 3G 母型核心字段支撑规范

## 1. 目标

本文转写 V4.2 §4.3.1 的主母型核心字段最低支撑硬约束。

## 2. MOTHER_TYPE_FIELDS

| 母型 | core 字段 | aux 字段 | low 字段 |
|---|---|---|---|
| M1 钢线型 | `HEAD_LINE_DEPTH`, `HEAD_LINE_LENGTH`, `OVERALL_CLARITY`, `LINE_COMPLEXITY` | 无 | `MOUNT_JUPITER` |
| M2 暖纹型 | `HEART_LINE_DEPTH`, `HEART_LINE_LENGTH`, `HEART_LINE_CURVE` | `HEART_LINE_END_FORK` | `MOUNT_VENUS` |
| M3 密纹型 | `LINE_COMPLEXITY`, `HEART_LINE_DEPTH` | 无 | `MOUNT_LUNA`, `MOUNT_MERCURY` |
| M4 川字型 | `CHUAN_PALM`, `FINGER_SPREAD` | `HEAD_LIFE_GAP` | `MOUNT_SATURN` |
| M5 贯纹型 | `SIMIAN_LINE`, `THUMB_LENGTH_RATIO`, `LIFE_LINE_DEPTH` | `FATE_LINE_CLARITY` | 无 |
| M6 轨道型 | `OVERALL_CLARITY`, `THUMB_LENGTH_RATIO` | `FATE_LINE_CLARITY`, `SUN_LINE_PRESENCE` | 无 |
| M7 月相型 | `HEAD_LINE_SLOPE`, `HEART_LINE_DEPTH` | 无 | `MOUNT_LUNA`, `FINGERTIP_SHAPE` |
| M8 复纹型 | `CHUAN_PALM`, `HEART_LINE_DEPTH` | 无 | `HEAD_LINE_END_FORK` |

## 3. 硬约束

某母型成为主母型时，必须至少由 2 个核心字段支撑。

辅助字段和低置信字段只能加分，不能单独决定主母型。

低置信字段不能作为主母型核心支撑字段。

## 4. count_core_fields_matched

`count_core_fields_matched(mother_type, normalized_33_fields)` 的工程逻辑：

1. 读取该母型的 `core` 字段列表。
2. 对每个核心字段读取标准化数值。
3. 字段为 `null` 时不计入命中。
4. 字段缺失时规则引擎不得处理，应返回输入错误。
5. 正向加分字段：字段值 `>= 1` 计为命中。
6. 布尔高加成字段：字段值 `== 1` 计为命中。
7. 反向加分字段按公式贡献判断，`(3 - value) > 0` 时计为命中。
8. 返回命中的核心字段数量。

反向加分字段：

| 母型 | 字段 | 命中条件 |
|---|---|---|
| M1 | `LINE_COMPLEXITY` | `LINE_COMPLEXITY < 3` |
| M4 | `FINGER_SPREAD` | `FINGER_SPREAD < 3` |

## 5. is_eligible_as_primary

`is_eligible_as_primary(mother_type, normalized_33_fields)` 的工程逻辑：

```text
core_count = count_core_fields_matched(mother_type, normalized_33_fields)
return core_count >= 2
```

该判断只决定是否可作为主母型，不改变原始母型评分公式。

## 6. 全部母型不满足硬约束

如果 8 个母型全部不满足主母型核心字段硬约束：

- 不应强行输出主母型。
- 不应把最高分母型作为主母型兜底返回给用户。
- 应进入 `RETRY_REQUIRED` 或图片质量不足分支。
- 应记录 `RULE_NO_ELIGIBLE_PRIMARY_MOTHER` 或 `RULE_CORE_SUPPORT_INSUFFICIENT`。

## 7. 与低置信字段的关系

低置信字段可以参与公式加分，但不能作为主母型核心字段支撑。

典型风险：

- M6 轨道型不能只靠 `FATE_LINE_CLARITY` 和 `SUN_LINE_PRESENCE` 成为主母型。
- M7 月相型不能只靠 `MOUNT_LUNA` 和 `FINGERTIP_SHAPE` 成为主母型。
