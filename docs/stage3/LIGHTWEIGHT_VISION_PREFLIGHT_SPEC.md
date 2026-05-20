# Palmmi Stage 3C 轻量视觉预检规范

## 1. 目标

在调用完整 VLM 33 字段识别前，用更轻量的判断确认图片是否为可识别手掌图。

轻量视觉预检是成本控制和垃圾图拦截层，不是 V4.2 识别规则的一部分。

## 2. 预检不做什么

- 不输出 33 字段
- 不判断人格
- 不判断母型
- 不生成解释链
- 不调用 V4.2 完整 Prompt
- 不做规则引擎

## 3. 预检只判断什么

预检只输出：

- `is_human_hand`
- `is_palm_side`
- `is_single_hand`
- `is_clear_enough`
- `is_complete_enough`
- `palm_lines_visible`
- `is_synthetic_suspected`
- `reject_reason`
- `confidence`

## 4. 预检 JSON 示例

```json
{
  "is_human_hand": true,
  "is_palm_side": true,
  "is_single_hand": true,
  "is_clear_enough": true,
  "is_complete_enough": true,
  "palm_lines_visible": true,
  "is_synthetic_suspected": false,
  "reject_reason": null,
  "confidence": 0.92
}
```

预检只返回 JSON，不返回解释文本，不返回 Markdown。

## 5. 预检判定逻辑

- `confidence >= 0.85` 且所有核心布尔值为 `true`：`PASS`
- `confidence 0.65-0.84` 且问题不严重：`LOW_QUALITY_PASS`
- `confidence < 0.65` 或核心条件失败：`RETRY_REQUIRED` / `REJECTED`

核心布尔值包括：

- `is_human_hand`
- `is_palm_side`
- `is_single_hand`
- `is_clear_enough`
- `is_complete_enough`
- `palm_lines_visible`

`is_synthetic_suspected = true` 时，不直接做复杂鉴伪；如果疑似明显，应返回 `AI_GENERATED_OR_SYNTHETIC_SUSPECTED` 并拒绝或要求重拍。

## 6. 成本控制原则

- 轻量预检的 prompt 必须短。
- 轻量预检不得包含 V4.2 33 字段表。
- 轻量预检不得要求模型解释原因。
- 轻量预检只返回 JSON。
- 轻量预检失败时不得继续调用完整 VLM。
- 轻量预检不得复用完整识别 Prompt。

## 7. 与完整 VLM 的关系

轻量预检只负责决定是否进入完整 VLM 特征提取。

完整 VLM 特征提取只能在 `can_enter_vlm = true` 时发生，并由后续 3E-b 冻结生产 Prompt。
