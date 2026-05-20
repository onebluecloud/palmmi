# Palmmi Stage 3B 图片输入契约

## 1. 目标

本文定义 3B 输出给 3C 的输入契约。识别系统后续统一使用 `processed_image`，不使用 `original_image`。

3C 不允许直接读取原图，只读取 3B 处理后的标准识别图和输入元信息。

后续 3E/VLM 不允许直接读取用户原图。

## 2. 3B 输出对象

`ImageInputStandardObject` 由两部分组成：

- `processed_image`：去除 EXIF、压缩后的标准识别图。
- `metadata`：输入层处理后的结构化元信息。

`processed_image` 只在 `input_status = ACCEPTED` 时存在。被拒绝的输入只输出错误状态和可展示的失败提示方向，不进入 3C。

## 3. 字段契约

| 字段 | 类型 | 必填 | 允许值 / 规则 | 说明 |
|---|---|---|---|---|
| `processed_image` | binary/blob/reference | 条件必填 | 仅 `ACCEPTED` 时必填 | 3B 生成的标准识别图；后续 3C/3E 只能使用它 |
| `original_file_name` | string | 是 | 用户上传文件名；可为空字符串兜底 | 仅用于排查和用户提示，不作为识别依据 |
| `original_mime_type` | string | 是 | 检测到的 MIME；`ACCEPTED` 时只能是支持的图片 MIME | 原始文件 MIME；不信任扩展名 |
| `original_size_bytes` | integer | 是 | 非负整数 | 原图大小；超过 15MB 必须拒绝 |
| `original_width` | integer/null | 是 | 正整数或 `null` | 文件无法解码时可为 `null` |
| `original_height` | integer/null | 是 | 正整数或 `null` | 文件无法解码时可为 `null` |
| `processed_mime_type` | string/null | 是 | `image/jpeg`、`image/webp`、`image/png` 或 `null` | 标准识别图 MIME；拒绝时为 `null` |
| `processed_size_bytes` | integer/null | 是 | 目标 300KB - 1.5MB；拒绝时为 `null` | 压缩后识别图大小 |
| `processed_width` | integer/null | 是 | 最长边 1280px - 1600px；拒绝时为 `null` | 标准识别图宽度 |
| `processed_height` | integer/null | 是 | 最长边 1280px - 1600px；拒绝时为 `null` | 标准识别图高度 |
| `preview_width` | integer/null | 是 | 最长边不超过 512px；拒绝时可为 `null` | 预览图宽度，不用于识别 |
| `preview_height` | integer/null | 是 | 最长边不超过 512px；拒绝时可为 `null` | 预览图高度，不用于识别 |
| `exif_removed` | boolean | 是 | `true` / `false` | `ACCEPTED` 时必须为 `true` |
| `compression_applied` | boolean | 是 | `true` / `false` | 是否执行压缩或格式标准化 |
| `compression_quality` | number/null | 是 | `0.75` - `0.85` 或 `null` | JPEG/WebP 压缩质量 |
| `longest_side_limit` | integer/null | 是 | `1280` - `1600` 或 `null` | 识别图最长边限制 |
| `input_status` | enum | 是 | 见错误状态枚举 | 3B 输入处理结果 |
| `reject_reason` | string/null | 是 | 简短稳定原因或 `null` | `ACCEPTED` 时必须为 `null` |
| `created_at` | ISO 8601 datetime string | 是 | ISO 8601 时间字符串 | 3B 标准对象创建时间 |

## 4. 错误状态枚举

| 状态 | 是否进入 3C | 含义 |
|---|---|---|
| `ACCEPTED` | 是 | 文件已通过 3B 输入标准化，可进入 3C |
| `REJECTED_FILE_TYPE` | 否 | 文件类型不支持，或文件伪装成图片 |
| `REJECTED_FILE_TOO_LARGE` | 否 | 文件超过大小限制 |
| `REJECTED_IMAGE_TOO_SMALL` | 否 | 图片短边低于 600px，无法保证识别输入质量 |
| `REJECTED_IMAGE_CORRUPTED` | 否 | 图片损坏、无法解码、空白图或读取失败 |
| `REJECTED_COMPRESSION_FAILED` | 否 | 压缩、转换、EXIF 去除或标准识别图生成失败 |

## 5. 后续模块读取规则

- 3C 只能读取 `processed_image` 和 `ImageInputStandardObject` 元信息。
- 3C 不读取、不回退、不重试用户原图。
- 3E/VLM 只能读取通过 3C 的 `processed_image`。
- 3E/VLM 不读取 `preview_image`。
- 3G/3H 规则引擎不读取任何图片，只读取后续 3E 产出的 33 字段。
- 如果后续发现 `processed_image` 质量不足，应由 3C 返回重拍或质量失败，不应回退到原图。

## 6. 兼容性说明

`heic` / `heif` 只作为兼容项记录。若浏览器无法稳定读取或转换，应返回可理解的文件类型失败提示，或引导用户使用 `jpg` / `jpeg` / `png` / `webp`。
