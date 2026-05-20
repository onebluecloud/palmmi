# Palmmi Stage 3D VLM 输出 Schema 映射

## 1. 目标

本文把 V4.2 §3.1 的 VLM 输出 JSON Schema 转写成 Palmmi 工程字段映射。

VLM 输出字段是原始输入层。

Palmmi 内部字段是标准化后的 33 字段层。

后续 3E 才做 JSON Schema 校验与降级。

本轮 3D 只定义映射关系，不实现校验代码。

## 2. 不直接进入 33 字段的 VLM 字段

| VLM 路径 | Palmmi 内部处理 |
|---|---|
| `image_quality.overall` | 不直接进入 33 字段，归 3C/3E 质量检测和日志使用 |
| `image_quality.lighting` | 不直接进入 33 字段，归质量检测使用 |
| `image_quality.focus` | 不直接进入 33 字段，归质量检测使用 |
| `image_quality.palm_visibility` | 不直接进入 33 字段，归质量检测使用 |
| `image_quality.issues` | 不直接进入 33 字段，归质量检测和失败分析使用 |
| `confidence.main_lines` | 不进入 33 字段，作为后续置信度参考 |
| `confidence.special_patterns` | 不进入 33 字段，作为后续置信度参考 |
| `confidence.mounts` | 不进入 33 字段，作为后续置信度参考 |
| `confidence.overall` | 不进入 33 字段，作为后续置信度参考 |

## 3. `main_lines` 映射

| VLM 路径 | Palmmi 内部字段 |
|---|---|
| `main_lines.life_line_depth` | `LIFE_LINE_DEPTH` |
| `main_lines.life_line_length` | `LIFE_LINE_LENGTH` |
| `main_lines.life_line_curve` | `LIFE_LINE_CURVE` |
| `main_lines.head_line_length` | `HEAD_LINE_LENGTH` |
| `main_lines.head_line_depth` | `HEAD_LINE_DEPTH` |
| `main_lines.head_line_slope` | `HEAD_LINE_SLOPE` |
| `main_lines.head_life_gap` | `HEAD_LIFE_GAP` |
| `main_lines.head_line_end_fork` | `HEAD_LINE_END_FORK` |
| `main_lines.heart_line_depth` | `HEART_LINE_DEPTH` |
| `main_lines.heart_line_length` | `HEART_LINE_LENGTH` |
| `main_lines.heart_line_curve` | `HEART_LINE_CURVE` |
| `main_lines.heart_line_end_fork` | `HEART_LINE_END_FORK` |
| `main_lines.fate_line_clarity` | `FATE_LINE_CLARITY` |
| `main_lines.sun_line_presence` | `SUN_LINE_PRESENCE` |

## 4. `special_patterns` 映射

| VLM 路径 | Palmmi 内部字段 |
|---|---|
| `special_patterns.simian_line` | `SIMIAN_LINE` |
| `special_patterns.chuan_palm` | `CHUAN_PALM` |

## 5. `mounts` 映射

| VLM 路径 | Palmmi 内部字段 |
|---|---|
| `mounts.mount_venus` | `MOUNT_VENUS` |
| `mounts.mount_jupiter` | `MOUNT_JUPITER` |
| `mounts.mount_saturn` | `MOUNT_SATURN` |
| `mounts.mount_apollo` | `MOUNT_APOLLO` |
| `mounts.mount_mercury` | `MOUNT_MERCURY` |
| `mounts.mount_luna` | `MOUNT_LUNA` |

## 6. `overall` 映射

| VLM 路径 | Palmmi 内部字段 |
|---|---|
| `overall.line_complexity` | `LINE_COMPLEXITY` |
| `overall.overall_clarity` | `OVERALL_CLARITY` |

## 7. 不来自 VLM 的内部字段

以下字段不在 VLM Prompt 中，由 MediaPipe 或几何处理输出：

- `PALM_LENGTH_RATIO`
- `INDEX_RING_RATIO`
- `THUMB_LENGTH_RATIO`
- `INDEX_LENGTH_RATIO`
- `PINKY_LENGTH_RATIO`
- `FINGER_SPREAD`
- `HAND_ASPECT_RATIO`
- `OVERALL_PROPORTION_FLAG`
- `FINGERTIP_SHAPE`

其中 `FINGERTIP_SHAPE` 需要按 `FINGERTIP_SHAPE_ENGINEERING_NOTE.md` 单独处理。

## 8. 映射数量校验

- VLM 映射进入 33 字段：24 个
- MediaPipe / 几何处理进入 33 字段：9 个
- 合计：33 个
