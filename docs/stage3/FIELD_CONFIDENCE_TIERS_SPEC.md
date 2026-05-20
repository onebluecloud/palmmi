# Palmmi Stage 3D 字段置信度三档规范

## 1. 目标

本文按 V4.2 §2.6 转写 33 字段置信度三档分级。

三档分级决定字段在工程中的权限，不改变字段名、取值范围或字段总数。

## 2. 核心字段 21 个

完整列表：

- `LIFE_LINE_DEPTH`
- `LIFE_LINE_LENGTH`
- `LIFE_LINE_CURVE`
- `HEAD_LINE_DEPTH`
- `HEAD_LINE_LENGTH`
- `HEAD_LINE_SLOPE`
- `HEART_LINE_DEPTH`
- `HEART_LINE_LENGTH`
- `HEART_LINE_CURVE`
- `SIMIAN_LINE`
- `CHUAN_PALM`
- `OVERALL_CLARITY`
- `LINE_COMPLEXITY`
- `PALM_LENGTH_RATIO`
- `INDEX_RING_RATIO`
- `THUMB_LENGTH_RATIO`
- `INDEX_LENGTH_RATIO`
- `PINKY_LENGTH_RATIO`
- `FINGER_SPREAD`
- `HAND_ASPECT_RATIO`
- `OVERALL_PROPORTION_FLAG`

工程权限：

- 可参与母型评分主项。
- 可参与人格判断主项。
- 是 MVP 上线必须稳定输出的字段。
- 母型评分公式中的高权重项必须落在这一档。

## 3. 辅助字段 4 个

完整列表：

- `FATE_LINE_CLARITY`
- `SUN_LINE_PRESENCE`
- `HEART_LINE_END_FORK`
- `HEAD_LIFE_GAP`

工程权限：

- 可参与评分。
- 可参与人格细化。
- 权重不应过高。
- 不能单独决定主母型。

## 4. 低置信字段 8 个

完整列表：

- `HEAD_LINE_END_FORK`
- `FINGERTIP_SHAPE`
- `MOUNT_VENUS`
- `MOUNT_JUPITER`
- `MOUNT_SATURN`
- `MOUNT_APOLLO`
- `MOUNT_MERCURY`
- `MOUNT_LUNA`

工程权限：

- 只做低权重加分。
- 可参与人格细化。
- 可参与文案润色。
- 不能单独决定主母型。
- MVP 阶段不应让它们单独决定关键人格。

## 5. 主母型硬约束

V4.2 主母型硬约束：

某母型成为主母型时，必须至少由 2 个核心字段支撑。

辅助字段和低置信字段只能加分，不能单独决定主母型。如果不满足核心字段最低支撑，该母型只能作为副母型或文案修饰，不能成为主母型。

## 6. 数量校验

- 核心字段：21 个
- 辅助字段：4 个
- 低置信字段：8 个
- 合计：33 个

## 7. 易错点

- `HEAD_LINE_END_FORK` 是低置信字段。
- `HEART_LINE_END_FORK` 是辅助字段。
- `FINGERTIP_SHAPE` 是低置信字段，不是稳定核心几何字段。
