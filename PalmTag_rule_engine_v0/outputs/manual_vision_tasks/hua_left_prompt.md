# Manual Vision Task 003

- image_path: `E:\其他\Palmmi\测试图片\hua-left.jpg`
- person_id: `hua`
- hand_side: `left`

## Prompt

# Palm Feature Extraction Prompt

你是一个只做掌纹形态标注的视觉识别模型。请只根据图片中可见的手掌形态和掌纹状态，输出严格 JSON。

禁止输出人格名称、命运、婚姻、健康、财运、寿命判断。禁止输出解释性文字。只输出 JSON。

## 取值规则

- 0/1 字段只能输出 0 或 1。
- 0-2 字段只能输出 0、1、2。
- 0-3 字段只能输出 0、1、2、3。
- 看不清、被遮挡、图片无法判断时输出 null。
- 不要新增字段，不要删除字段。

## 0/1 字段

OVERALL_PROPORTION_FLAG, HEAD_LINE_END_FORK, HEART_LINE_END_FORK, SIMIAN_LINE, CHUAN_PALM, SUN_LINE_PRESENCE

## 0-2 字段

MOUNT_VENUS, MOUNT_JUPITER, MOUNT_SATURN, MOUNT_APOLLO, MOUNT_MERCURY, MOUNT_LUNA

## 0-3 字段

PALM_LENGTH_RATIO, INDEX_RING_RATIO, THUMB_LENGTH_RATIO, INDEX_LENGTH_RATIO, PINKY_LENGTH_RATIO, FINGER_SPREAD, HAND_ASPECT_RATIO, FINGERTIP_SHAPE, LIFE_LINE_DEPTH, LIFE_LINE_LENGTH, LIFE_LINE_CURVE, HEAD_LINE_LENGTH, HEAD_LINE_DEPTH, HEAD_LINE_SLOPE, HEAD_LIFE_GAP, HEART_LINE_DEPTH, HEART_LINE_LENGTH, HEART_LINE_CURVE, LINE_COMPLEXITY, OVERALL_CLARITY, FATE_LINE_CLARITY

## 输出 JSON 模板

```json
{
  "PALM_LENGTH_RATIO": null,
  "INDEX_RING_RATIO": null,
  "THUMB_LENGTH_RATIO": null,
  "INDEX_LENGTH_RATIO": null,
  "PINKY_LENGTH_RATIO": null,
  "FINGER_SPREAD": null,
  "HAND_ASPECT_RATIO": null,
  "OVERALL_PROPORTION_FLAG": null,
  "FINGERTIP_SHAPE": null,
  "LIFE_LINE_DEPTH": null,
  "LIFE_LINE_LENGTH": null,
  "LIFE_LINE_CURVE": null,
  "HEAD_LINE_LENGTH": null,
  "HEAD_LINE_DEPTH": null,
  "HEAD_LINE_SLOPE": null,
  "HEAD_LIFE_GAP": null,
  "HEAD_LINE_END_FORK": null,
  "HEART_LINE_DEPTH": null,
  "HEART_LINE_LENGTH": null,
  "HEART_LINE_CURVE": null,
  "HEART_LINE_END_FORK": null,
  "SIMIAN_LINE": null,
  "CHUAN_PALM": null,
  "LINE_COMPLEXITY": null,
  "OVERALL_CLARITY": null,
  "FATE_LINE_CLARITY": null,
  "SUN_LINE_PRESENCE": null,
  "MOUNT_VENUS": null,
  "MOUNT_JUPITER": null,
  "MOUNT_SATURN": null,
  "MOUNT_APOLLO": null,
  "MOUNT_MERCURY": null,
  "MOUNT_LUNA": null
}
```


## Required JSON Output

```json
{
  "PALM_LENGTH_RATIO": null,
  "INDEX_RING_RATIO": null,
  "THUMB_LENGTH_RATIO": null,
  "INDEX_LENGTH_RATIO": null,
  "PINKY_LENGTH_RATIO": null,
  "FINGER_SPREAD": null,
  "HAND_ASPECT_RATIO": null,
  "OVERALL_PROPORTION_FLAG": null,
  "FINGERTIP_SHAPE": null,
  "LIFE_LINE_DEPTH": null,
  "LIFE_LINE_LENGTH": null,
  "LIFE_LINE_CURVE": null,
  "HEAD_LINE_LENGTH": null,
  "HEAD_LINE_DEPTH": null,
  "HEAD_LINE_SLOPE": null,
  "HEAD_LIFE_GAP": null,
  "HEAD_LINE_END_FORK": null,
  "HEART_LINE_DEPTH": null,
  "HEART_LINE_LENGTH": null,
  "HEART_LINE_CURVE": null,
  "HEART_LINE_END_FORK": null,
  "SIMIAN_LINE": null,
  "CHUAN_PALM": null,
  "LINE_COMPLEXITY": null,
  "OVERALL_CLARITY": null,
  "FATE_LINE_CLARITY": null,
  "SUN_LINE_PRESENCE": null,
  "MOUNT_VENUS": null,
  "MOUNT_JUPITER": null,
  "MOUNT_SATURN": null,
  "MOUNT_APOLLO": null,
  "MOUNT_MERCURY": null,
  "MOUNT_LUNA": null
}
```
