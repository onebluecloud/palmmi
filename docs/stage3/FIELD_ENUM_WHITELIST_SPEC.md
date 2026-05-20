# Palmmi Stage 3E 字段枚举白名单规范

## 1. 目标

本文列出 Palmmi 内部标准化 33 字段完整枚举白名单。

所有字段值必须是数字枚举或 `null`。禁止字符串枚举。

## 2. 0/1 二档字段 6 个

| 字段名 | 允许值 | 是否允许 null | 默认降级值 | 字段等级 |
|---|---|---|---:|---|
| `SIMIAN_LINE` | `0/1/null` | 是 | 1 | 核心字段 |
| `CHUAN_PALM` | `0/1/null` | 是 | 1 | 核心字段 |
| `SUN_LINE_PRESENCE` | `0/1/null` | 是 | 1 | 辅助字段 |
| `HEAD_LINE_END_FORK` | `0/1/null` | 是 | 1 | 低置信字段 |
| `HEART_LINE_END_FORK` | `0/1/null` | 是 | 1 | 辅助字段 |
| `OVERALL_PROPORTION_FLAG` | `0/1/null` | 是 | 1 | 核心字段 |

## 3. 0-2 三档字段 6 个

| 字段名 | 允许值 | 是否允许 null | 默认降级值 | 字段等级 |
|---|---|---|---:|---|
| `MOUNT_VENUS` | `0/1/2/null` | 是 | 1 | 低置信字段 |
| `MOUNT_JUPITER` | `0/1/2/null` | 是 | 1 | 低置信字段 |
| `MOUNT_SATURN` | `0/1/2/null` | 是 | 1 | 低置信字段 |
| `MOUNT_APOLLO` | `0/1/2/null` | 是 | 1 | 低置信字段 |
| `MOUNT_MERCURY` | `0/1/2/null` | 是 | 1 | 低置信字段 |
| `MOUNT_LUNA` | `0/1/2/null` | 是 | 1 | 低置信字段 |

## 4. 0-3 四档字段 21 个

| 字段名 | 允许值 | 是否允许 null | 默认降级值 | 字段等级 |
|---|---|---|---:|---|
| `PALM_LENGTH_RATIO` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `INDEX_RING_RATIO` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `THUMB_LENGTH_RATIO` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `INDEX_LENGTH_RATIO` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `PINKY_LENGTH_RATIO` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `FINGER_SPREAD` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HAND_ASPECT_RATIO` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `FINGERTIP_SHAPE` | `0/1/2/3/null` | 是 | 2 | 低置信字段 |
| `LIFE_LINE_DEPTH` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `LIFE_LINE_LENGTH` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `LIFE_LINE_CURVE` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HEAD_LINE_LENGTH` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HEAD_LINE_DEPTH` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HEAD_LINE_SLOPE` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HEAD_LIFE_GAP` | `0/1/2/3/null` | 是 | 2 | 辅助字段 |
| `HEART_LINE_DEPTH` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HEART_LINE_LENGTH` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `HEART_LINE_CURVE` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `LINE_COMPLEXITY` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `OVERALL_CLARITY` | `0/1/2/3/null` | 是 | 2 | 核心字段 |
| `FATE_LINE_CLARITY` | `0/1/2/3/null` | 是 | 2 | 辅助字段 |

## 5. 数量校验

| 类别 | 数量 |
|---|---:|
| 0/1 二档字段 | 6 |
| 0-2 三档字段 | 6 |
| 0-3 四档字段 | 21 |
| 合计 | 33 |

| 字段等级 | 数量 |
|---|---:|
| 核心字段 | 21 |
| 辅助字段 | 4 |
| 低置信字段 | 8 |
| 合计 | 33 |

## 6. 明确禁止

以下值或字段不得进入 Palmmi 内部标准化层：

- 字符串值，例如 `"1"`、`"yes"`、`"清晰"`。
- 小数值，例如 `1.5`。
- 负数，例如 `-1`。
- 超范围数字，例如二档字段输出 `2`，三档字段输出 `3`，四档字段输出 `4`。
- 未定义字段名。
- V4.2 字段表外字段。
- VLM 小写字段直接进入内部标准化层。
