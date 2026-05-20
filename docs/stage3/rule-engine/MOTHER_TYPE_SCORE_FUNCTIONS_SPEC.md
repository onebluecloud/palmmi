# Palmmi Stage 3G 母型评分函数规范

## 1. 目标

本文转写 V4.2 的 8 个母型评分函数。

权重、字段、阈值和 clamp 规则必须完全沿用 V4.2。本文只写工程可转写公式说明，不实现代码。

## 2. 通用规则

- 输入字段必须来自 Palmmi 内部标准化 33 字段。
- 每个分数先按公式求原始分。
- 每个母型最终分数使用 `min(score, 100)` 截断。
- 不允许新增字段。
- 不允许使用 V4.2 33 字段表外字段。
- M8 复纹型必须保留“多个母型评分 >= 60”的复合逻辑。

## 3. 8 母型评分函数

### M1 钢线型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M1` |
| `mother_type_name` | 钢线型 |
| `score_function_name` | `score_M1_steel` |
| `used_fields` | `HEAD_LINE_DEPTH`, `HEAD_LINE_LENGTH`, `OVERALL_CLARITY`, `LINE_COMPLEXITY`, `MOUNT_JUPITER` |
| `score_range` | 原始范围 0-117，最终范围 0-100 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 理性主线主导；`LINE_COMPLEXITY` 为反向加分项 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 智慧线深 | 12 | `HEAD_LINE_DEPTH * 12` |
| 智慧线长 | 10 | `HEAD_LINE_LENGTH * 10` |
| 整体清晰 | 8 | `OVERALL_CLARITY * 8` |
| 杂纹少反向加分 | 5 | `(3 - LINE_COMPLEXITY) * 5` |
| 木星丘 | 6 | `MOUNT_JUPITER * 6` |

### M2 暖纹型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M2` |
| `mother_type_name` | 暖纹型 |
| `score_function_name` | `score_M2_warm` |
| `used_fields` | `HEART_LINE_DEPTH`, `HEART_LINE_LENGTH`, `HEART_LINE_CURVE`, `MOUNT_VENUS`, `HEART_LINE_END_FORK` |
| `score_range` | 原始范围 0-112，最终范围 0-100 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 感情主线主导 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 感情线深 | 12 | `HEART_LINE_DEPTH * 12` |
| 感情线长 | 10 | `HEART_LINE_LENGTH * 10` |
| 感情线弧度 | 8 | `HEART_LINE_CURVE * 8` |
| 金星丘 | 8 | `MOUNT_VENUS * 8` |
| 感情线末端分叉 | 6 | `HEART_LINE_END_FORK * 6` |

### M3 密纹型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M3` |
| `mother_type_name` | 密纹型 |
| `score_function_name` | `score_M3_dense` |
| `used_fields` | `LINE_COMPLEXITY`, `MOUNT_LUNA`, `HEART_LINE_DEPTH`, `MOUNT_MERCURY` |
| `score_range` | 原始范围 0-100，最终范围 0-100 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 高信号密度 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 纹路复杂度 | 15 | `LINE_COMPLEXITY * 15` |
| 月丘 | 10 | `MOUNT_LUNA * 10` |
| 感情线深 | 7 | `HEART_LINE_DEPTH * 7` |
| 水星丘 | 7 | `MOUNT_MERCURY * 7` |

### M4 川字型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M4` |
| `mother_type_name` | 川字型 |
| `score_function_name` | `score_M4_chuan` |
| `used_fields` | `CHUAN_PALM`, `HEAD_LIFE_GAP`, `FINGER_SPREAD`, `MOUNT_SATURN` |
| `score_range` | 原始范围 0-105，最终范围 0-100 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 独立主导；`CHUAN_PALM` 为高加成项，`FINGER_SPREAD` 为反向加分项 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 川字掌 | 50 | `50 if CHUAN_PALM == 1 else 0` |
| 智慧线生命线分离度 | 10 | `HEAD_LIFE_GAP * 10` |
| 手指张开度低反向加分 | 5 | `(3 - FINGER_SPREAD) * 5` |
| 土星丘 | 5 | `MOUNT_SATURN * 5` |

### M5 贯纹型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M5` |
| `mother_type_name` | 贯纹型 |
| `score_function_name` | `score_M5_thrust` |
| `used_fields` | `SIMIAN_LINE`, `THUMB_LENGTH_RATIO`, `FATE_LINE_CLARITY`, `LIFE_LINE_DEPTH` |
| `score_range` | 原始范围 0-110，最终范围 0-100 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 断掌 / 单点贯穿主导 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 断掌 | 50 | `50 if SIMIAN_LINE == 1 else 0` |
| 拇指相对长度 | 8 | `THUMB_LENGTH_RATIO * 8` |
| 命运线清晰度 | 7 | `FATE_LINE_CLARITY * 7` |
| 生命线深度 | 5 | `LIFE_LINE_DEPTH * 5` |

### M6 轨道型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M6` |
| `mother_type_name` | 轨道型 |
| `score_function_name` | `score_M6_orbit` |
| `used_fields` | `FATE_LINE_CLARITY`, `SUN_LINE_PRESENCE`, `OVERALL_CLARITY`, `THUMB_LENGTH_RATIO` |
| `score_range` | 原始范围 0-99，最终范围 0-99 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 命运线主导；成为主母型仍必须满足核心字段硬约束 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 命运线清晰度 | 18 | `FATE_LINE_CLARITY * 18` |
| 太阳线存在 | 15 | `SUN_LINE_PRESENCE * 15` |
| 整体清晰 | 6 | `OVERALL_CLARITY * 6` |
| 拇指相对长度 | 4 | `THUMB_LENGTH_RATIO * 4` |

### M7 月相型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M7` |
| `mother_type_name` | 月相型 |
| `score_function_name` | `score_M7_moon` |
| `used_fields` | `MOUNT_LUNA`, `HEAD_LINE_SLOPE`, `FINGERTIP_SHAPE`, `HEART_LINE_DEPTH` |
| `score_range` | 原始范围 0-99，最终范围 0-99 |
| `clamp_rule` | `score = min(score, 100)` |
| `notes` | 直觉主导；低置信字段不能作为主母型核心支撑 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 月丘 | 18 | `MOUNT_LUNA * 18` |
| 智慧线下垂度 | 12 | `HEAD_LINE_SLOPE * 12` |
| 指尖锥 / 尖 | 15 | `15 if FINGERTIP_SHAPE in [2, 3] else 0` |
| 感情线深 | 4 | `HEART_LINE_DEPTH * 4` |

### M8 复纹型

| 项 | 内容 |
|---|---|
| `mother_type_id` | `M8` |
| `mother_type_name` | 复纹型 |
| `score_function_name` | `score_M8_complex` |
| `used_fields` | 其他 7 个母型分数、`HEAD_LINE_END_FORK`, `CHUAN_PALM`, `HEART_LINE_DEPTH` |
| `score_range` | 原始范围 0-155，最终范围 0-100 |
| `clamp_rule` | `score = min(base_score, 100)` |
| `notes` | 复合特征；必须保留“多个母型评分 >= 60”的逻辑 |

| formula_terms | weight | 工程公式 |
|---|---:|---|
| 高分母型数量 | 50 + 15 | `if high_count >= 2: base_score = 50 + (high_count - 2) * 15` |
| 智慧线末端分叉 | 15 | `+15 if HEAD_LINE_END_FORK == 1 else +0` |
| 川字掌 + 感情线深 | 15 | `+15 if CHUAN_PALM == 1 and HEART_LINE_DEPTH >= 2 else +0` |

M8 的 `high_count` 定义：

```text
high_count = count(score_M1..score_M7 where score >= 60)
```

## 4. 母型名称校验

Stage 3G 固定 8 个母型：

- M1 钢线型
- M2 暖纹型
- M3 密纹型
- M4 川字型
- M5 贯纹型
- M6 轨道型
- M7 月相型
- M8 复纹型
