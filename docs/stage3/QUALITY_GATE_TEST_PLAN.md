# Palmmi Stage 3C 质量门控测试计划

## 1. 目标

本测试计划用于验证 3C 是否能稳定拦截非手掌图和低质量图片，并只允许合格或低质量可用的 `processed_image` 进入后续 VLM 特征提取。

本轮不实现测试代码，不调用 API。

## 2. 测试矩阵

| # | 测试样本分类 | 测试目的 | 预期 gate_status | 预期 reject_reason | 是否进入 VLM | 用户提示语方向 | 是否需要人工复核 |
|---|---|---|---|---|---|---|---|
| 1 | 合格掌心图 | 验证标准掌心图可通过 | `PASS` | `null` | 是 | 无 | 否 |
| 2 | 光线稍暗但可识别 | 验证轻微亮度问题可低质量通过 | `LOW_QUALITY_PASS` | `null` | 是 | 无；记录光线稍暗标记 | 是 |
| 3 | 轻微模糊但可识别 | 验证轻微模糊可低质量通过 | `LOW_QUALITY_PASS` | `null` | 是 | 无；记录轻微模糊标记 | 是 |
| 4 | 掌纹不清晰 | 验证掌纹不可见时要求重拍 | `RETRY_REQUIRED` | `TOO_BLURRY` 或 `LOW_RESOLUTION` | 否 | 掌纹不够清楚，请靠近一点重新拍 | 是 |
| 5 | 手背图 | 验证手背拦截 | `RETRY_REQUIRED` | `BACK_OF_HAND` | 否 | 请拍掌心，不要拍手背 | 否 |
| 6 | 拳头图 | 验证闭合手无法识别 | `RETRY_REQUIRED` | `FIST_OR_CLOSED_HAND` | 否 | 请张开手掌，拍一张掌心照片 | 否 |
| 7 | 多只手 | 验证多手干扰拦截 | `RETRY_REQUIRED` | `MULTIPLE_HANDS_UNCLEAR` | 否 | 图片里有多只手，请只拍一只手 | 是 |
| 8 | 手掌严重裁切 | 验证完整度不足拦截 | `RETRY_REQUIRED` | `PALM_TOO_CROPPED` | 否 | 手掌没有拍完整，请重新拍一张 | 是 |
| 9 | 手掌太小 | 验证手掌占比不足拦截 | `RETRY_REQUIRED` | `PALM_TOO_SMALL` | 否 | 手掌在画面里太小，请靠近一点重新拍 | 是 |
| 10 | 过曝图 | 验证强光导致不可识别 | `RETRY_REQUIRED` | `TOO_BRIGHT` | 否 | 图片过曝，请避开强光重新拍 | 是 |
| 11 | 过暗图 | 验证光线不足导致不可识别 | `RETRY_REQUIRED` | `TOO_DARK` | 否 | 光线太暗，请换到明亮处重新拍 | 是 |
| 12 | 严重阴影 | 验证阴影遮挡掌纹时拦截 | `RETRY_REQUIRED` | `SEVERE_SHADOW` | 否 | 阴影太重，请换个光线均匀的位置重新拍 | 是 |
| 13 | 戴手套 | 验证掌纹不可见拦截 | `REJECTED` | `PALM_NOT_VISIBLE` 或 `PALM_OCCLUDED` | 否 | 请露出完整掌心重新拍 | 否 |
| 14 | 自拍图 | 验证人脸自拍非手掌拦截 | `REJECTED` | `NOT_HAND` | 否 | 这张图不像手掌，请重新上传 | 否 |
| 15 | 风景图 | 验证自然场景非手掌拦截 | `REJECTED` | `NOT_HAND` | 否 | 这张图不像手掌，请重新上传 | 否 |
| 16 | 宠物图 | 验证动物图片非人手拦截 | `REJECTED` | `NOT_HUMAN_HAND` | 否 | 请上传真人手掌照片 | 否 |
| 17 | 聊天截图 | 验证截图类输入拦截 | `REJECTED` | `SCREENSHOT_OR_DOCUMENT` | 否 | 请直接上传手掌照片，不要上传截图或文档 | 否 |
| 18 | 二维码 | 验证二维码输入拦截 | `REJECTED` | `SCREENSHOT_OR_DOCUMENT` | 否 | 请直接上传手掌照片，不要上传截图或文档 | 否 |
| 19 | AI 生成手 | 验证明显合成手风险拦截 | `REJECTED` | `AI_GENERATED_OR_SYNTHETIC_SUSPECTED` | 否 | 请上传真实手掌照片 | 是 |
| 20 | 玩具手/假手 | 验证非真人手拦截 | `REJECTED` | `NOT_HUMAN_HAND` 或 `AI_GENERATED_OR_SYNTHETIC_SUSPECTED` | 否 | 请上传真人手掌照片 | 是 |

## 3. 测试断言

- `PASS` 必须 `can_enter_vlm = true`。
- `LOW_QUALITY_PASS` 必须 `can_enter_vlm = true`，且 `low_quality_flags` 不为空。
- `RETRY_REQUIRED` 必须 `can_enter_vlm = false`，且 `should_retry = true`。
- `REJECTED` 必须 `can_enter_vlm = false`。
- 非手掌、截图、二维码、文档、宠物、风景、自拍不得进入完整 VLM。
- 3C 不输出 33 字段，不判断人格，不判断母型。
- 所有失败提示必须面向普通用户，不使用工程术语。

## 4. 人工复核范围

以下样本需要人工复核：

- 光线稍暗但可识别
- 轻微模糊但可识别
- 掌纹不清晰
- 多只手
- 手掌严重裁切
- 手掌太小
- 过曝图
- 过暗图
- 严重阴影
- AI 生成手
- 玩具手/假手

人工复核只确认 3C 门控结果，不评价 33 字段或人格输出。
