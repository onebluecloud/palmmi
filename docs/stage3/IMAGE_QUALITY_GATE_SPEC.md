# Palmmi Stage 3C 图片质量门控规范

## 1. 质量检测目标

质量门控用于判断 `processed_image` 是否满足掌纹特征提取的最低条件。

3C 不产出 33 字段，不解释掌纹含义，不判断人格或母型，只判断图片是否可以继续进入后续 VLM 特征提取。

## 2. 检测维度

必须包含以下检测维度：

1. `brightness`：亮度
2. `exposure`：过曝程度
3. `blur`：模糊程度
4. `palm_visibility`：掌心可见度
5. `palm_completeness`：手掌完整度
6. `palm_size_ratio`：手掌占画面比例
7. `line_visibility`：掌纹可见度
8. `shadow_level`：阴影程度
9. `occlusion_level`：遮挡程度
10. `orientation_quality`：拍摄角度是否适合
11. `background_noise`：背景干扰程度
12. `single_hand_confidence`：单只手置信度
13. `palm_side_confidence`：掌心正面置信度

这些维度只用于门控，不替代 V4.2 的 33 字段。

## 3. 质量评分

定义 `quality_score`，范围 0-100。

建议分级：

- 80-100：`PASS`
- 60-79：`LOW_QUALITY_PASS`
- 40-59：`RETRY_REQUIRED`
- 0-39：`REJECTED`

具体数值是工程初始阈值，后续可以通过 `CHANGE_REQUESTS.md` 受控调整。

## 4. 必须重拍条件

以下情况必须 `RETRY_REQUIRED` 或 `REJECTED`：

- 掌心不可见
- 手背
- 拳头
- 手掌裁切超过 30%
- 掌纹基本不可见
- 严重模糊
- 严重过暗
- 严重过曝
- 多只手重叠
- 图片不是人手
- 图片疑似截图/文档/二维码
- AI 生成手疑似明显

明显不满足人手掌心识别条件时，应直接拒绝，不进入完整 VLM。

## 5. LOW_QUALITY_PASS 条件

以下情况可以低质量通过：

- 光线稍暗但主线可见
- 轻微模糊但掌纹仍可识别
- 轻微裁切但三大主线基本可见
- 角度略斜但掌心区域可见
- 背景复杂但不影响掌纹

`LOW_QUALITY_PASS` 进入后续识别时，必须携带 `low_quality_flags`，用于后续降低置信度。

可用 `low_quality_flags` 示例：

- `SLIGHTLY_DARK`
- `SLIGHTLY_BLURRY`
- `MINOR_CROPPING`
- `ANGLE_SLIGHTLY_OFF`
- `BACKGROUND_COMPLEX`
- `LINES_PARTIALLY_VISIBLE`

## 6. 输出对象

定义 `QualityGateResult`：

- `gate_status`
- `quality_score`
- `reject_reason`
- `user_message`
- `low_quality_flags`
- `detected_issue_codes`
- `can_enter_vlm`
- `should_retry`
- `should_log_failure`
- `created_at`

`gate_status` 只能是：

- `PASS`
- `LOW_QUALITY_PASS`
- `RETRY_REQUIRED`
- `REJECTED`

`can_enter_vlm` 规则：

- `PASS` = `true`
- `LOW_QUALITY_PASS` = `true`
- `RETRY_REQUIRED` = `false`
- `REJECTED` = `false`

`should_retry` 规则：

- `PASS` = `false`
- `LOW_QUALITY_PASS` = `false`
- `RETRY_REQUIRED` = `true`
- `REJECTED` = `false`
