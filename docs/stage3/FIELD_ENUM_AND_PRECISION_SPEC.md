# Palmmi Stage 3D 字段枚举与精度规范

## 1. 目标

本文转写 V4.2 §2.4 字段精度策略，冻结 Palmmi 33 字段的数值枚举范围。

所有取值必须是数字枚举，不允许字符串枚举。

不能出现 V4.2 字段表外字段。

## 2. 0/1 二档字段 6 个

完整列表：

- `SIMIAN_LINE`
- `CHUAN_PALM`
- `SUN_LINE_PRESENCE`
- `HEAD_LINE_END_FORK`
- `HEART_LINE_END_FORK`
- `OVERALL_PROPORTION_FLAG`

工程含义：

- 只表达“无/有”或“不满足/满足”。
- 原始枚举值只能是 `0` 或 `1`。
- 原始层可为 `null`，后续 3E 降级默认值为 `1`。
- 不允许输出 `true` / `false` 字符串，也不允许输出中文枚举。

## 3. 0-2 三档字段 6 个

完整列表：

- `MOUNT_VENUS`
- `MOUNT_JUPITER`
- `MOUNT_SATURN`
- `MOUNT_APOLLO`
- `MOUNT_MERCURY`
- `MOUNT_LUNA`

工程含义：

- 用于掌丘饱满度粗粒度判断。
- 原始枚举值只能是 `0`、`1`、`2`。
- 原始层可为 `null`，后续 3E 降级默认中位数为 `1.5`。
- `1.5` 只作为降级中位数，不改变原始三档枚举。

## 4. 0-3 四档字段 21 个

完整列表：

- `PALM_LENGTH_RATIO`
- `INDEX_RING_RATIO`
- `THUMB_LENGTH_RATIO`
- `INDEX_LENGTH_RATIO`
- `PINKY_LENGTH_RATIO`
- `FINGER_SPREAD`
- `HAND_ASPECT_RATIO`
- `FINGERTIP_SHAPE`
- `LIFE_LINE_DEPTH`
- `LIFE_LINE_LENGTH`
- `LIFE_LINE_CURVE`
- `HEAD_LINE_LENGTH`
- `HEAD_LINE_DEPTH`
- `HEAD_LINE_SLOPE`
- `HEAD_LIFE_GAP`
- `HEART_LINE_DEPTH`
- `HEART_LINE_LENGTH`
- `HEART_LINE_CURVE`
- `LINE_COMPLEXITY`
- `OVERALL_CLARITY`
- `FATE_LINE_CLARITY`

工程含义：

- 用于几何比例、主线强弱、主线长度、主线弧度、整体清晰度等多档粗量化。
- 原始枚举值只能是 `0`、`1`、`2`、`3`。
- 原始层可为 `null`，后续 3E 降级默认值为 `2`。
- `FINGERTIP_SHAPE` 虽然是 0-3 四档字段，但它是低置信字段，不得作为核心母型判定字段。

## 5. 数量校验

- 0/1 二档字段：6 个
- 0-2 三档字段：6 个
- 0-3 四档字段：21 个
- 合计：33 个

## 6. 禁止事项

- 不允许字符串枚举。
- 不允许布尔值替代 `0/1`。
- 不允许新增字段表外字段。
- 不允许把 VLM 小写字段直接当作 Palmmi 内部标准字段。
- 不允许在 3D 阶段实现校验代码；校验与降级属于后续 3E。
