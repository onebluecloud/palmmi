# Palmmi Stage 3C 非手掌拦截规范

## 1. 目标

3C 的职责是判断 3B 输出的 `processed_image` 是否值得继续进入后续 VLM 特征提取。流程为：

processed_image

↓

基础图像质量检查

↓

非手掌预检

↓

掌心/手背判断

↓

单手/多手判断

↓

完整度判断

↓

是否进入后续 VLM 特征提取

3C 只做“是否值得继续识别”的门控判断，不输出 33 个掌纹字段，不判断人格，不判断母型，不调用完整 VLM 特征提取。

## 2. 输入来源

输入必须来自 3B 的 `ImageInputStandardObject`。

后续 3C 只能使用：

- `processed_image`
- `preview_image`
- 3B 输出的元信息
- 3B 的 `input_status`

禁止直接读取 `original_image`。

如果 3B 的 `input_status` 不是 `ACCEPTED`，3C 不执行质量门控，也不进入后续 VLM。

## 3. 非手掌拒绝类别

3C 必须能拒绝或要求重拍以下类别：

- 风景图
- 自拍/人脸图
- 宠物图
- 食物图
- 截图
- 二维码
- 文档/表格/聊天记录截图
- 手背
- 拳头
- 戴手套
- 多只手严重重叠
- 玩具手/假手
- AI 生成手
- 手掌主体缺失
- 手掌被遮挡严重
- 掌心未朝上

明显不属于人手掌心的图片应尽早拒绝，避免浪费后续完整 VLM 成本。

## 4. 3C 输出状态

统一状态为：

- `PASS`：可以进入后续 VLM 特征提取。
- `LOW_QUALITY_PASS`：勉强可进入，但后续置信度需要降低。
- `RETRY_REQUIRED`：需要用户重拍。
- `REJECTED`：拒绝识别。

`PASS` 和 `LOW_QUALITY_PASS` 可以进入后续 VLM 特征提取。

`RETRY_REQUIRED` 和 `REJECTED` 不允许进入完整 VLM 特征提取。

## 5. 拒绝原因枚举

`reject_reason` 只能使用以下枚举或 `null`：

- `NOT_IMAGE_AFTER_PROCESSING`
- `NOT_HAND`
- `NOT_HUMAN_HAND`
- `BACK_OF_HAND`
- `FIST_OR_CLOSED_HAND`
- `MULTIPLE_HANDS_UNCLEAR`
- `PALM_NOT_VISIBLE`
- `PALM_TOO_CROPPED`
- `PALM_TOO_SMALL`
- `PALM_OCCLUDED`
- `TOO_BLURRY`
- `TOO_DARK`
- `TOO_BRIGHT`
- `SEVERE_SHADOW`
- `SEVERE_REFLECTION`
- `LOW_RESOLUTION`
- `AI_GENERATED_OR_SYNTHETIC_SUSPECTED`
- `SCREENSHOT_OR_DOCUMENT`
- `UNKNOWN_UNUSABLE`

## 6. 用户提示语

| reject_reason | 用户提示语 |
|---|---|
| `NOT_IMAGE_AFTER_PROCESSING` | 图片无法识别，请重新上传一张手掌照片。 |
| `NOT_HAND` | 这张图不像手掌，请重新上传。 |
| `NOT_HUMAN_HAND` | 请上传真人手掌照片。 |
| `BACK_OF_HAND` | 请拍掌心，不要拍手背。 |
| `FIST_OR_CLOSED_HAND` | 请张开手掌，拍一张掌心照片。 |
| `MULTIPLE_HANDS_UNCLEAR` | 图片里有多只手，请只拍一只手。 |
| `PALM_NOT_VISIBLE` | 请上传一张清晰的手掌正面照片。 |
| `PALM_TOO_CROPPED` | 手掌没有拍完整，请重新拍一张。 |
| `PALM_TOO_SMALL` | 手掌在画面里太小，请靠近一点重新拍。 |
| `PALM_OCCLUDED` | 手掌被遮挡了，请露出完整掌心重新拍。 |
| `TOO_BLURRY` | 掌纹不够清楚，请靠近一点重新拍。 |
| `TOO_DARK` | 光线太暗，请换到明亮处重新拍。 |
| `TOO_BRIGHT` | 图片过曝，请避开强光重新拍。 |
| `SEVERE_SHADOW` | 阴影太重，请换个光线均匀的位置重新拍。 |
| `SEVERE_REFLECTION` | 反光太强，请避开强光或擦干手掌后重拍。 |
| `LOW_RESOLUTION` | 图片太模糊或太小，请重新拍一张清晰照片。 |
| `AI_GENERATED_OR_SYNTHETIC_SUSPECTED` | 请上传真实手掌照片。 |
| `SCREENSHOT_OR_DOCUMENT` | 请直接上传手掌照片，不要上传截图或文档。 |
| `UNKNOWN_UNUSABLE` | 这张图无法识别，请重新上传一张清晰的手掌照片。 |

提示语必须面向普通用户，不使用工程术语，不解释模型或算法细节。

## 7. 3C 与后续阶段边界

3C 只判断图片是否适合进入 VLM 特征提取。

3D/3E 才处理 V4.2 33字段和 JSON Schema。

3E-b 才做 VLM Prompt 实测。

3G/3H 才做规则引擎和双层评分。

3C 不得提前实现这些内容。
