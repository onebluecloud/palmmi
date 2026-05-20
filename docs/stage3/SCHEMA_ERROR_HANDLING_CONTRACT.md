# Palmmi Stage 3E Schema 错误处理契约

## 1. 目标

本文定义 Palmmi Stage 3E Schema 层错误处理契约。

错误处理契约用于统一校验层、重试分支、重拍分支和后续匹配入口之间的状态表达。3E 不实现代码。

## 2. 标准错误对象

Schema 层错误对象必须包含以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `error_code` | string | 机器可读错误码 |
| `error_message_for_system` | string | 给系统日志和调试使用的错误说明 |
| `user_message` | string | 给用户看的简单提示语，不写技术术语 |
| `retryable` | boolean | 是否可以自动重试 |
| `should_call_vlm_again` | boolean | 是否应再次调用 VLM |
| `should_request_reupload` | boolean | 是否应要求用户重新上传 |
| `should_continue_to_matching` | boolean | 是否允许进入后续匹配 |

## 3. 错误码白名单

| error_code | error_message_for_system | user_message | retryable | should_call_vlm_again | should_request_reupload | should_continue_to_matching |
|---|---|---|---|---|---|---|
| `JSON_PARSE_FAILED` | VLM output is not parseable JSON. | 没有识别成功，请再试一次。 | true | true | false | false |
| `JSON_SCHEMA_INVALID` | VLM output structure does not match the accepted raw schema or internal 33-field schema. | 这张照片暂时没有识别好，请再试一次。 | true | true | false | false |
| `MISSING_REQUIRED_FIELD` | One or more required 33-field keys are missing. | 识别信息不完整，请再试一次。 | true | true | false | false |
| `ENUM_OUT_OF_RANGE` | A field value is outside its allowed enum whitelist. | 识别结果不稳定，请再试一次。 | true | true | false | false |
| `TYPE_MISMATCH` | A field value is not number or null. | 识别结果格式不对，请再试一次。 | true | true | false | false |
| `TOO_MANY_NULL_FIELDS` | Too many fields are null before degradation. | 这张照片有些地方看不清，请换一张更清晰的。 | false | false | true | false |
| `TOO_MANY_DEGRADED_FIELDS` | Five consecutive fields were degraded. | 这张照片不够清晰，请重新上传。 | false | false | true | false |
| `CORE_FIELDS_INSUFFICIENT` | Core fields are insufficient for reliable downstream matching. | 关键信息不够清楚，请重新上传。 | false | false | true | false |
| `VLM_OUTPUT_UNMAPPABLE` | VLM output cannot be mapped to the 33-field internal schema. | 没有识别到需要的信息，请再试一次。 | true | true | false | false |
| `LOW_CONFIDENCE_OUTPUT` | Output is parseable but confidence is low and some fields must be degraded. | 识别结果有些不确定，我们会按保守方式处理。 | true | false | false | true |

## 4. 匹配入口规则

`should_continue_to_matching = true` 只允许在以下情况出现：

- Schema 校验通过。
- 字段名严格等于 33 个大写字段。
- 所有字段值为合法数字枚举。
- 降级字段数量未触发重拍。
- 核心字段充足。
- 低置信字段没有被当作主母型核心支撑。

除 `LOW_CONFIDENCE_OUTPUT` 且降级后仍满足核心字段要求外，其他错误码默认不得继续进入后续匹配。

## 5. 用户提示语原则

用户提示语必须简单：

- 不写 JSON、Schema、枚举、字段名等技术术语。
- 不解释 VLM、规则引擎或内部流程。
- 只告诉用户可以重试、换清晰照片或重新上传。
- 不输出命运、健康、婚姻、寿命等解释。
