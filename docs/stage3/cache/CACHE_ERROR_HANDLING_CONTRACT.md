# Palmmi Stage 3F 缓存错误处理契约

## 1. 目标

本文定义 Palmmi Stage 3 缓存层错误处理契约。

用户提示语必须简单，不能出现技术术语。

## 2. 标准错误对象

| 字段 | 类型 | 说明 |
|---|---|---|
| `error_code` | string | 机器可读错误码 |
| `system_message` | string | 系统日志使用的错误说明 |
| `user_message` | string | 给用户看的简单提示 |
| `retryable` | boolean | 是否可重试 |
| `should_call_vlm` | boolean | 是否应调用 VLM |
| `should_continue_pipeline` | boolean | 是否继续后续流程 |
| `should_log` | boolean | 是否记录日志 |

## 3. 错误码白名单

| error_code | system_message | user_message | retryable | should_call_vlm | should_continue_pipeline | should_log |
|---|---|---|---|---|---|---|
| `CACHE_KEY_INVALID` | Cache key is missing required fields or contains forbidden fields. | 识别准备失败，请再试一次。 | true | false | false | true |
| `CACHE_MISS` | No cache value matches the file hash and version combination. | 正在为你重新识别。 | true | true | true | true |
| `CACHE_HIT` | Cache value matched file hash and all required versions. | 识别结果已准备好。 | false | false | true | true |
| `CACHE_VERSION_MISMATCH` | File hash matched but one or more version fields differed. | 正在更新识别结果。 | true | true | true | true |
| `CACHE_VALUE_CORRUPTED` | Cache value is unreadable, incomplete, or inconsistent with key. | 识别结果需要重新生成。 | true | true | true | true |
| `CACHE_EXPIRED` | Cache value exceeded expires_at. | 识别结果已过期，正在重新处理。 | true | true | true | true |
| `CACHE_WRITE_FAILED` | Failed to write cache value. | 识别已完成，但暂时无法保存结果。 | true | false | true | true |
| `CACHE_READ_FAILED` | Failed to read cache value. | 正在重新处理。 | true | true | true | true |
| `CACHE_PRIVACY_VIOLATION` | Cache value contains disallowed personal data or long-term image reference. | 为保护隐私，请重新上传。 | false | false | false | true |
| `PERCEPTUAL_HASH_FORBIDDEN` | perceptual_hash or visual similarity cache path was attempted. | 识别准备失败，请再试一次。 | false | false | false | true |

## 4. 处理原则

- `CACHE_HIT` 不调用 VLM。
- `CACHE_MISS` 调用 VLM。
- `CACHE_VERSION_MISMATCH` 生成新缓存 key，不直接复用旧结果。
- `CACHE_VALUE_CORRUPTED` 不复用缓存。
- `CACHE_EXPIRED` 不复用缓存。
- `PERCEPTUAL_HASH_FORBIDDEN` 必须阻断流程并记录日志。

## 5. 用户提示语原则

用户提示语不应出现：

- cache。
- hash。
- version。
- schema。
- VLM。
- API。
- 规则引擎。

用户只需要知道是否正在重新识别、需要重试或需要重新上传。
