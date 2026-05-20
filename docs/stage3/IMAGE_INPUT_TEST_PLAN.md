# Palmmi Stage 3B 图片输入测试计划

## 1. 目标

本测试计划用于验证 3B 图片输入、格式限制、尺寸限制、压缩、EXIF 去除、预览图生成和拒绝状态是否符合规范。

本轮不实现测试代码，只冻结测试类别、预期状态和人工复核要求。

## 2. 测试矩阵

| # | 测试分类 | 输入样例 | 预期状态 | 是否进入 3C | 失败提示方向 | 是否需要人工复核 |
|---|---|---|---|---|---|---|
| 1 | 正常 jpg 图片 | 手机拍摄 `jpg`，短边 ≥ 600px，大小 ≤ 10MB | `ACCEPTED` | 是 | 无 | 否 |
| 2 | 正常 png 图片 | 清晰 `png`，短边 ≥ 600px，大小 ≤ 10MB | `ACCEPTED` | 是 | 无 | 否 |
| 3 | 正常 webp 图片 | 浏览器可解码 `webp`，短边 ≥ 600px | `ACCEPTED` | 是 | 无 | 否 |
| 4 | iPhone HEIC 图片 | iPhone 相册 `heic` 原图 | `ACCEPTED` 或 `REJECTED_FILE_TYPE` | 视转换结果 | 若失败，提示转为 jpg 或重新拍照上传 | 是 |
| 5 | 超大图片 | 20MB 手机原图 | `REJECTED_FILE_TOO_LARGE` | 否 | 提示图片过大，建议重新拍摄或压缩后上传 | 否 |
| 6 | 过小图片 | 200x200 图片 | `REJECTED_IMAGE_TOO_SMALL` | 否 | 提示图片尺寸过小，需重新拍摄 | 否 |
| 7 | 损坏图片 | 文件头损坏或无法解码的图片 | `REJECTED_IMAGE_CORRUPTED` | 否 | 提示图片无法读取，请更换图片 | 否 |
| 8 | 非图片文件改后缀 | `txt` 改名为 `palm.jpg` | `REJECTED_FILE_TYPE` 或 `REJECTED_IMAGE_CORRUPTED` | 否 | 提示文件不是有效图片 | 否 |
| 9 | GIF 动图 | `gif` 动图文件 | `REJECTED_FILE_TYPE` | 否 | 提示不支持动图，请上传静态图片 | 否 |
| 10 | PDF 文件 | `pdf` 文件或改后缀 `jpg` 的 `pdf` | `REJECTED_FILE_TYPE` | 否 | 提示不支持 PDF，请上传图片 | 否 |
| 11 | 透明 PNG | 大面积透明、内容很少的 `png` | `REJECTED_IMAGE_CORRUPTED` 或 `ACCEPTED` | 视是否为空白图 | 若为空白，提示图片无有效内容；若通过，由 3C 判断质量 | 是 |
| 12 | 横向极端宽图 | 例如 4000x300 长条图 | `REJECTED_IMAGE_CORRUPTED` | 否 | 提示图片比例异常，请重新拍摄 | 是 |
| 13 | 纵向极端长图 | 例如 300x4000 长条图 | `REJECTED_IMAGE_CORRUPTED` | 否 | 提示图片比例异常，请重新拍摄 | 是 |
| 14 | 微信内拍照上传 | 微信内置浏览器直接拍照 | `ACCEPTED`、`REJECTED_FILE_TYPE` 或 `REJECTED_COMPRESSION_FAILED` | 成功时是 | 若失败，提示从相册选择或使用系统浏览器重试 | 是 |
| 15 | 微信内相册上传 | 微信内置浏览器从相册选图 | `ACCEPTED`、`REJECTED_FILE_TYPE` 或 `REJECTED_COMPRESSION_FAILED` | 成功时是 | 若失败，提示换图、转 jpg 或重试 | 是 |
| 16 | 安卓大图上传 | 安卓相机 8MB-15MB 大图 | `ACCEPTED` 或 `REJECTED_COMPRESSION_FAILED` | 成功时是 | 若压缩失败，提示更换图片或重新拍摄 | 是 |
| 17 | 弱网环境上传 | 3G/弱 Wi-Fi 上传标准图 | 本地处理成功时为 `ACCEPTED`；上传失败不生成 3C 输入 | 成功上传后是 | 提示网络不稳定，请重试 | 是 |

## 3. 关键断言

- `ACCEPTED` 的图片必须生成 `processed_image`。
- `ACCEPTED` 的图片必须 `exif_removed = true`。
- `ACCEPTED` 的识别图最长边必须在 1280px - 1600px。
- `ACCEPTED` 的预览图最长边不得超过 512px。
- 被拒绝的图片不得进入 3C。
- 3B 不判断是否为手掌、是否清晰、是否掌纹完整。
- `heic` / `heif` 必须作为兼容风险单独记录，不得假设所有浏览器可用。

## 4. 人工复核范围

以下类别需要人工复核实际设备表现：

- iPhone HEIC 图片
- 透明 PNG
- 横向极端宽图
- 纵向极端长图
- 微信内拍照上传
- 微信内相册上传
- 安卓大图上传
- 弱网环境上传

人工复核只确认输入层行为，不评价掌纹识别结果。
