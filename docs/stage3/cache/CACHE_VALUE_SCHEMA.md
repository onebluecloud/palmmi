# Palmmi Stage 3F 缓存 value Schema

## 1. 目标

本文定义 Palmmi Stage 3 同图缓存 value 保存什么。

缓存可以保存结构化识别结果，但不长期保存用户原图。

## 2. 缓存 value 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `cache_key` | string | 完整缓存 key |
| `file_hash` | string | 用于 key 的文件 hash，推荐为 `normalized_file_hash` |
| `image_metadata` | object | 图片尺寸、格式、大小、标准化版本等非身份信息 |
| `model_provider` | string | VLM 服务提供方 |
| `model_name` | string | VLM 模型名称 |
| `model_version` | string | VLM 模型版本 |
| `prompt_version` | string | Prompt 版本 |
| `schema_version` | string | Schema 版本 |
| `rule_version` | string | 规则版本 |
| `image_quality_result` | object | 图片质量检测结果或 VLM `image_quality` 摘要 |
| `vlm_raw_output_ref` | string 或 null | VLM 原始输出保存引用 |
| `normalized_33_fields` | object 或 null | Palmmi 内部标准化 33 字段 |
| `validation_result` | object | JSON 解析、Schema 校验、枚举校验、类型校验结果 |
| `degraded_fields` | array | 降级字段记录 |
| `error_codes` | array | 错误码清单 |
| `recognition_status` | string | `VALID` / `DEGRADED` / `RETRY_REQUIRED` / `REJECTED` |
| `mother_type_result_placeholder` | null | 母型结果占位说明，3F 不实现 |
| `persona_result_placeholder` | null | 人格结果占位说明，3F 不实现 |
| `created_at` | string | 缓存创建时间 |
| `expires_at` | string 或 null | 缓存过期时间 |

## 3. 占位字段说明

`mother_type_result_placeholder` 和 `persona_result_placeholder` 只是占位说明。

3F 不实现母型和人格结果。

后续规则引擎阶段如果要写入母型或人格结果，必须受 `rule_version` 控制，并在规则阶段另行定义。

## 4. VLM 原始输出引用

`vlm_raw_output_ref` 应与 3E-b 的 `RAW_OUTPUT_STORAGE_POLICY.md` 对齐。

可保存：

- 原始返回文本引用。
- 清洗后 JSON 引用。
- 校验结果摘要引用。
- 错误码引用。

不应保存：

- 用户真实原图的长期引用。
- 用户身份信息。
- 手机号、身份证、微信号、真实姓名、精准定位。

## 5. image_metadata 建议字段

`image_metadata` 可包含：

| 字段 | 说明 |
|---|---|
| `original_file_hash` | 原始上传文件 hash，可用于日志和去重辅助 |
| `normalized_file_hash` | 标准化识别图 hash，推荐用于缓存 key |
| `image_normalization_version` | 图片标准化流程版本 |
| `mime_type` | 文件类型 |
| `width` | 标准化后宽度 |
| `height` | 标准化后高度 |
| `file_size_bytes` | 文件大小 |
| `exif_removed` | 是否移除 EXIF |

## 6. 隐私边界

- 缓存可以保存结构化识别结果。
- 不长期保存用户原图。
- 如果保存压缩识别图，必须有过期时间。
- 原始输出保存策略要与 3E-b 的 `RAW_OUTPUT_STORAGE_POLICY.md` 对齐。
- `file_hash` 不应被当作用户身份标识。
