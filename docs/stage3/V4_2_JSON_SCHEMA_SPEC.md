# Palmmi Stage 3E V4.2 JSON Schema 规范

## 1. 目标

本文基于 Stage 3D 已冻结的 33 字段规范，定义 Palmmi Stage 3 的标准 JSON Schema。

3E 只冻结 Schema 与校验策略，不写业务代码，不接 API，不做规则引擎，不做人格匹配，不改 UI。

## 2. 双层 Schema

Palmmi Stage 3 使用两层 Schema：

1. VLM 原始输出 Schema
2. Palmmi 内部标准化 33 字段 Schema

两层 Schema 的边界必须固定：

- VLM 原始输出可以包含 `image_quality`、`main_lines`、`special_patterns`、`mounts`、`overall`、`confidence`。
- VLM 原始输出是视觉模型返回层，不得直接进入规则引擎。
- Palmmi 内部标准化层只能包含 33 个大写字段。
- 33 个字段名必须完全沿用 Stage 3D 文档中的大写字段名。
- 不允许新增字段。
- 不允许删除字段。
- 不允许重命名字段。
- 不允许把 VLM 小写字段直接作为 Palmmi 内部字段。

## 3. VLM 原始输出 Schema

VLM 原始输出必须是可解析 JSON。理想情况下只输出 JSON，不带解释文字，不带 Markdown 代码块。

允许的顶层 key：

| 顶层 key | 类型 | 是否允许 | 说明 |
|---|---|---|---|
| `image_quality` | object | 允许 | 图片质量与可见性信息，不直接进入 33 字段 |
| `main_lines` | object | 允许 | 主线、命运线、太阳线相关字段来源 |
| `special_patterns` | object | 允许 | 断掌、川字掌来源 |
| `mounts` | object | 允许 | 6 个掌丘字段来源 |
| `overall` | object | 允许 | 整体纹路复杂度和整体清晰度来源 |
| `confidence` | object | 允许 | VLM 分组置信度参考，不直接进入 33 字段 |

### 3.1 `image_quality`

| VLM 字段 | 类型 | 允许值 | 是否进入 33 字段 |
|---|---|---|---|
| `image_quality.overall` | number 或 null | `0/1/2/3/null` | 否 |
| `image_quality.lighting` | number 或 null | `0/1/2/3/null` | 否 |
| `image_quality.focus` | number 或 null | `0/1/2/3/null` | 否 |
| `image_quality.palm_visibility` | number 或 null | `0/1/2/3/null` | 否 |
| `image_quality.issues` | array | 字符串数组 | 否 |

### 3.2 `main_lines`

| VLM 字段 | 类型 | 允许值 | 映射到 Palmmi 字段 |
|---|---|---|---|
| `main_lines.life_line_depth` | number 或 null | `0/1/2/3/null` | `LIFE_LINE_DEPTH` |
| `main_lines.life_line_length` | number 或 null | `0/1/2/3/null` | `LIFE_LINE_LENGTH` |
| `main_lines.life_line_curve` | number 或 null | `0/1/2/3/null` | `LIFE_LINE_CURVE` |
| `main_lines.head_line_length` | number 或 null | `0/1/2/3/null` | `HEAD_LINE_LENGTH` |
| `main_lines.head_line_depth` | number 或 null | `0/1/2/3/null` | `HEAD_LINE_DEPTH` |
| `main_lines.head_line_slope` | number 或 null | `0/1/2/3/null` | `HEAD_LINE_SLOPE` |
| `main_lines.head_life_gap` | number 或 null | `0/1/2/3/null` | `HEAD_LIFE_GAP` |
| `main_lines.head_line_end_fork` | number 或 null | `0/1/null` | `HEAD_LINE_END_FORK` |
| `main_lines.heart_line_depth` | number 或 null | `0/1/2/3/null` | `HEART_LINE_DEPTH` |
| `main_lines.heart_line_length` | number 或 null | `0/1/2/3/null` | `HEART_LINE_LENGTH` |
| `main_lines.heart_line_curve` | number 或 null | `0/1/2/3/null` | `HEART_LINE_CURVE` |
| `main_lines.heart_line_end_fork` | number 或 null | `0/1/null` | `HEART_LINE_END_FORK` |
| `main_lines.fate_line_clarity` | number 或 null | `0/1/2/3/null` | `FATE_LINE_CLARITY` |
| `main_lines.sun_line_presence` | number 或 null | `0/1/null` | `SUN_LINE_PRESENCE` |

### 3.3 `special_patterns`

| VLM 字段 | 类型 | 允许值 | 映射到 Palmmi 字段 |
|---|---|---|---|
| `special_patterns.simian_line` | number 或 null | `0/1/null` | `SIMIAN_LINE` |
| `special_patterns.chuan_palm` | number 或 null | `0/1/null` | `CHUAN_PALM` |

### 3.4 `mounts`

| VLM 字段 | 类型 | 允许值 | 映射到 Palmmi 字段 |
|---|---|---|---|
| `mounts.mount_venus` | number 或 null | `0/1/2/null` | `MOUNT_VENUS` |
| `mounts.mount_jupiter` | number 或 null | `0/1/2/null` | `MOUNT_JUPITER` |
| `mounts.mount_saturn` | number 或 null | `0/1/2/null` | `MOUNT_SATURN` |
| `mounts.mount_apollo` | number 或 null | `0/1/2/null` | `MOUNT_APOLLO` |
| `mounts.mount_mercury` | number 或 null | `0/1/2/null` | `MOUNT_MERCURY` |
| `mounts.mount_luna` | number 或 null | `0/1/2/null` | `MOUNT_LUNA` |

### 3.5 `overall`

| VLM 字段 | 类型 | 允许值 | 映射到 Palmmi 字段 |
|---|---|---|---|
| `overall.line_complexity` | number 或 null | `0/1/2/3/null` | `LINE_COMPLEXITY` |
| `overall.overall_clarity` | number 或 null | `0/1/2/3/null` | `OVERALL_CLARITY` |

### 3.6 `confidence`

| VLM 字段 | 类型 | 允许值 | 是否进入 33 字段 |
|---|---|---|---|
| `confidence.main_lines` | number 或 null | `0-1/null` | 否 |
| `confidence.special_patterns` | number 或 null | `0-1/null` | 否 |
| `confidence.mounts` | number 或 null | `0-1/null` | 否 |
| `confidence.overall` | number 或 null | `0-1/null` | 否 |

## 4. Palmmi 内部标准化 33 字段 Schema

Palmmi 内部标准化层只能包含下列 33 个大写字段。所有字段都是必填 key，字段值只能是数字枚举或 `null`。

匹配前必须经过校验与降级处理。字段缺失、类型错误、枚举越界不得直接流入规则引擎。

### 4.1 33 字段属性表

| 字段名 | type | allowed_values | required | nullable | default_degraded_value | confidence_tier | source | usage |
|---|---|---|---|---|---:|---|---|---|
| `PALM_LENGTH_RATIO` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `INDEX_RING_RATIO` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `THUMB_LENGTH_RATIO` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `INDEX_LENGTH_RATIO` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `PINKY_LENGTH_RATIO` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `FINGER_SPREAD` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `HAND_ASPECT_RATIO` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | MediaPipe 几何 | 母型评分 |
| `OVERALL_PROPORTION_FLAG` | number 或 null | `0/1/null` | true | true | 1 | 核心字段 | MediaPipe 几何 | 质量门控 / 母型评分 |
| `FINGERTIP_SHAPE` | number 或 null | `0/1/2/3/null` | true | true | 2 | 低置信字段 | MediaPipe + 图像轮廓粗判 | 人格细化 / 文案润色 |
| `LIFE_LINE_DEPTH` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.life_line_depth` | 母型评分 |
| `LIFE_LINE_LENGTH` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.life_line_length` | 母型评分 |
| `LIFE_LINE_CURVE` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.life_line_curve` | 母型评分 |
| `HEAD_LINE_LENGTH` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.head_line_length` | 母型评分 |
| `HEAD_LINE_DEPTH` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.head_line_depth` | 母型评分 |
| `HEAD_LINE_SLOPE` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.head_line_slope` | 母型评分 |
| `HEAD_LIFE_GAP` | number 或 null | `0/1/2/3/null` | true | true | 2 | 辅助字段 | VLM `main_lines.head_life_gap` | 母型评分 / 人格细化 |
| `HEAD_LINE_END_FORK` | number 或 null | `0/1/null` | true | true | 1 | 低置信字段 | VLM `main_lines.head_line_end_fork` | 人格细化 / 文案润色 |
| `HEART_LINE_DEPTH` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.heart_line_depth` | 母型评分 |
| `HEART_LINE_LENGTH` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.heart_line_length` | 母型评分 |
| `HEART_LINE_CURVE` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `main_lines.heart_line_curve` | 母型评分 |
| `HEART_LINE_END_FORK` | number 或 null | `0/1/null` | true | true | 1 | 辅助字段 | VLM `main_lines.heart_line_end_fork` | 母型评分 / 人格细化 |
| `SIMIAN_LINE` | number 或 null | `0/1/null` | true | true | 1 | 核心字段 | VLM `special_patterns.simian_line` | 母型评分 |
| `CHUAN_PALM` | number 或 null | `0/1/null` | true | true | 1 | 核心字段 | VLM `special_patterns.chuan_palm` | 母型评分 |
| `LINE_COMPLEXITY` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `overall.line_complexity` | 母型评分 |
| `OVERALL_CLARITY` | number 或 null | `0/1/2/3/null` | true | true | 2 | 核心字段 | VLM `overall.overall_clarity` | 质量门控 / 母型评分 |
| `FATE_LINE_CLARITY` | number 或 null | `0/1/2/3/null` | true | true | 2 | 辅助字段 | VLM `main_lines.fate_line_clarity` | 母型评分 / 人格细化 |
| `SUN_LINE_PRESENCE` | number 或 null | `0/1/null` | true | true | 1 | 辅助字段 | VLM `main_lines.sun_line_presence` | 母型评分 / 人格细化 |
| `MOUNT_VENUS` | number 或 null | `0/1/2/null` | true | true | 1 | 低置信字段 | VLM `mounts.mount_venus` | 人格细化 / 文案润色 |
| `MOUNT_JUPITER` | number 或 null | `0/1/2/null` | true | true | 1 | 低置信字段 | VLM `mounts.mount_jupiter` | 人格细化 / 文案润色 |
| `MOUNT_SATURN` | number 或 null | `0/1/2/null` | true | true | 1 | 低置信字段 | VLM `mounts.mount_saturn` | 人格细化 / 文案润色 |
| `MOUNT_APOLLO` | number 或 null | `0/1/2/null` | true | true | 1 | 低置信字段 | VLM `mounts.mount_apollo` | 人格细化 / 文案润色 |
| `MOUNT_MERCURY` | number 或 null | `0/1/2/null` | true | true | 1 | 低置信字段 | VLM `mounts.mount_mercury` | 人格细化 / 文案润色 |
| `MOUNT_LUNA` | number 或 null | `0/1/2/null` | true | true | 1 | 低置信字段 | VLM `mounts.mount_luna` | 人格细化 / 文案润色 |

## 5. 枚举约束

- 二档字段只允许 `0/1/null`。
- 三档字段只允许 `0/1/2/null`。
- 四档字段只允许 `0/1/2/3/null`。
- 禁止字符串枚举。
- 禁止布尔值替代 `0/1`。
- 禁止小数值。
- 禁止负数。
- 禁止超范围数字。
- 禁止未定义字段名。
- 禁止 V4.2 字段表外字段进入 Palmmi 内部标准化层。

## 6. 匹配前要求

Palmmi 内部标准化 33 字段对象通过校验后，仍需按降级策略处理 `null`、低置信、缺失映射和枚举问题。

规则引擎只允许接收校验通过且已完成降级记录的 33 字段对象。任何字段缺失、枚举越界或类型错误都不得直接进入后续匹配。
