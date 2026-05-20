# Palmmi Stage 3C 输出契约

## 1. 输入与输出

3C 接收 3B 的 `ImageInputStandardObject`。

3C 输出 `QualityGateResult`。

3D/3E/3E-b 后续模块只能在 `can_enter_vlm = true` 时继续。

`RETRY_REQUIRED` 和 `REJECTED` 不允许进入完整 VLM 特征提取。

`LOW_QUALITY_PASS` 必须进入后续模块时携带 `low_quality_flags`。

后续置信度计算必须考虑 3C 的 `gate_status` 和 `low_quality_flags`。

## 2. QualityGateResult 字段表

| 字段 | 类型 | 必填 | 允许值 / 规则 | 说明 |
|---|---|---|---|---|
| `image_input_id` | string | 是 | 3B 输入对象 ID 或稳定引用 | 用于关联 `ImageInputStandardObject` |
| `gate_status` | enum | 是 | `PASS`、`LOW_QUALITY_PASS`、`RETRY_REQUIRED`、`REJECTED` | 3C 门控状态 |
| `quality_score` | integer | 是 | 0-100 | 初始质量分 |
| `can_enter_vlm` | boolean | 是 | `PASS`/`LOW_QUALITY_PASS` 为 `true`；其他为 `false` | 是否允许进入完整 VLM |
| `should_retry` | boolean | 是 | `RETRY_REQUIRED` 为 `true`；其他为 `false` | 是否提示用户重拍 |
| `reject_reason` | enum/null | 是 | 见 `NON_PALM_REJECTION_SPEC.md` | `PASS` 时为 `null` |
| `user_message` | string/null | 是 | 面向普通用户的提示语 | `PASS` 时可为 `null` |
| `low_quality_flags` | string[] | 是 | 低质量标记数组 | `LOW_QUALITY_PASS` 时不得为空 |
| `detected_issue_codes` | string[] | 是 | 检测到的问题代码 | 可用于日志和后续分析 |
| `preflight_confidence` | number/null | 是 | 0-1 或 `null` | 轻量预检置信度 |
| `is_human_hand` | boolean/null | 是 | `true` / `false` / `null` | 是否为真人手 |
| `is_palm_side` | boolean/null | 是 | `true` / `false` / `null` | 是否为掌心正面 |
| `is_single_hand` | boolean/null | 是 | `true` / `false` / `null` | 是否单只手 |
| `is_clear_enough` | boolean/null | 是 | `true` / `false` / `null` | 是否足够清晰 |
| `is_complete_enough` | boolean/null | 是 | `true` / `false` / `null` | 手掌是否足够完整 |
| `palm_lines_visible` | boolean/null | 是 | `true` / `false` / `null` | 掌纹是否可见 |
| `is_synthetic_suspected` | boolean/null | 是 | `true` / `false` / `null` | 是否疑似 AI 生成、玩具手或假手 |
| `created_at` | ISO 8601 datetime string | 是 | ISO 8601 时间字符串 | 3C 结果创建时间 |

## 3. 状态规则

| gate_status | can_enter_vlm | should_retry | 后续处理 |
|---|---|---|---|
| `PASS` | `true` | `false` | 可进入后续 VLM 特征提取 |
| `LOW_QUALITY_PASS` | `true` | `false` | 可进入后续 VLM，但必须携带 `low_quality_flags` |
| `RETRY_REQUIRED` | `false` | `true` | 不进入 VLM，提示用户重拍 |
| `REJECTED` | `false` | `false` | 不进入 VLM，拒绝识别 |

## 4. 后续模块约束

- 3D 只转写 V4.2 33字段工程规范，不消费失败图片。
- 3E/VLM 只能处理 `can_enter_vlm = true` 的图片。
- 3E-b Prompt 实测必须记录 `gate_status`，避免把 3C 的低质量问题误判为字段规则问题。
- 3G/3H 规则引擎只能读取 3E 产出的字段和置信度，不读取图片。
- `LOW_QUALITY_PASS` 的 `low_quality_flags` 必须进入后续置信度计算。
