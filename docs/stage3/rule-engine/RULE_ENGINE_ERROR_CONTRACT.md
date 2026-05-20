# Palmmi Stage 3G 规则引擎错误契约

## 1. 目标

本文定义规则引擎层错误码。

用户提示语不能出现技术术语。

## 2. 错误码表

| error_code | system_message | user_message | retryable | should_request_reupload | should_continue_pipeline | should_log |
|---|---|---|---|---|---|---|
| `RULE_INPUT_SCHEMA_INVALID` | Rule input did not pass Stage 3E schema validation. | 这张照片暂时无法识别，请再试一次。 | true | false | false | true |
| `RULE_FIELD_MISSING` | One or more required normalized 33 fields are missing. | 识别信息不完整，请再试一次。 | true | false | false | true |
| `RULE_FIELD_OUT_OF_RANGE` | One or more fields are outside allowed enum ranges. | 识别结果不稳定，请再试一次。 | true | false | false | true |
| `RULE_NO_ELIGIBLE_PRIMARY_MOTHER` | No mother type satisfies primary core support constraint. | 关键信息不够清楚，请重新上传。 | false | true | false | true |
| `RULE_CORE_SUPPORT_INSUFFICIENT` | Primary mother candidate lacks at least two core supporting fields. | 关键信息不够清楚，请重新上传。 | false | true | false | true |
| `RULE_MOTHER_SCORE_FAILED` | Failed to compute one or more mother type scores. | 识别结果需要重新处理。 | true | false | false | true |
| `RULE_PERSONA_MAPPING_INCOMPLETE` | Mother to persona mapping is missing or incomplete. | 识别结果需要重新处理。 | true | false | false | true |
| `RULE_ADJACENT_PAIR_INVALID` | Adjacent persona rule pair is missing, duplicated, or references unknown personas. | 识别结果需要重新处理。 | true | false | false | true |
| `RULE_CROSS_MOTHER_CHECK_FAILED` | Cross mother correction could not be evaluated. | 识别结果需要重新处理。 | true | false | false | true |
| `RULE_VERSION_MISMATCH` | Input rule_version does not match active rule registry. | 正在更新识别结果。 | true | false | false | true |

## 3. 处理原则

- 输入未通过 Stage 3E Schema 时，规则引擎不得继续。
- 没有 eligible primary 时，不强行输出主母型。
- 规则版本不一致时，不直接复用旧规则结果。
- 用户提示语只说明需要重试、重新上传或重新处理，不暴露内部字段、母型公式或规则细节。
