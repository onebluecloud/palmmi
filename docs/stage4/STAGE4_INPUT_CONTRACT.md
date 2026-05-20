# Palmmi Stage 4 Input Contract

## 前端页面接收 RecognitionResult 的结构

Stage 4 页面接收的唯一识别结果对象是 `RecognitionResult`：

| 字段 | 类型 | 页面用途 |
| --- | --- | --- |
| `status` | string | 页面状态分支。 |
| `cache` | object | 后台诊断缓存命中。 |
| `image_input` | object/null | 后台诊断输入 metadata。 |
| `quality_gate` | object | 失败、重拍、低质量提示来源。 |
| `schema` | object | 后台诊断字段质量。 |
| `mother_scores` | object/null | 后台诊断，不用于页面重算。 |
| `primary_mother` | object/null | 结果页主母型。 |
| `secondary_mother` | object/null | 副母型 / 双母型展示。 |
| `is_dual_mother` | boolean | 是否展示双母型。 |
| `primary_persona` | object/null | 结果页主人格。 |
| `top3` | array | Top3 候选。 |
| `recognition` | object/null | 解释链、修正信息、低置信来源。 |
| `error_codes` | array | 页面失败状态映射。 |
| `debug` | object | 仅后台查看。 |

## 结果页需要字段

- `status`
- `primary_mother`
- `secondary_mother`
- `is_dual_mother`
- `primary_persona`
- `top3`
- `recognition.explanation`
- `recognition.correction`
- `quality_gate.status`
- `schema.status`

结果页只在 `SUCCESS` 或 `LOW_CONFIDENCE` 时展示人格结果。

## 海报页需要字段

- `primary_persona.name`
- `primary_persona.mother_type`
- `primary_mother.name`
- `secondary_mother.name`
- `is_dual_mother`
- `top3`
- 面向用户的解释文案

海报页不展示 `debug`、`schema` 原始字段、`mother_scores` 或工程 error code。

## 加载页需要字段

- pipeline 当前状态由页面流程控制。
- 可引用 `status` 做最终跳转。
- 不展示中间 features。
- 不直接调用 VLM。

## 失败页需要字段

适用于 `REJECTED`：

- `status`
- `quality_gate.reason_codes`
- `error_codes`

页面应把工程原因转成普通用户提示，不显示原始代码。

## 重拍页需要字段

适用于 `RETRY_REQUIRED`：

- `status`
- `quality_gate.reason_codes`
- `schema.schema_warnings`
- `error_codes`

页面提示应聚焦照片更清晰、更亮、掌心正面、单只手、掌纹完整。

## 调试字段哪些不能展示给用户

用户侧不得展示：

- `debug`
- `mother_scores`
- `schema.normalized_features`
- `schema.degraded_fields`
- `schema.missing_fields`
- `schema.null_fields`
- `schema.invalid_fields`
- `schema.schema_warnings`
- `cache.cache_key`
- `error_codes` 原始工程码

这些字段可以进入后台诊断、日志或内部 QA 面板。

## debug 字段哪些只供后台使用

仅后台可见：

- `debug.pipeline_version`
- `debug.rule_version`
- `debug.matcher_rule_version`
- `debug.schema_version`
- `debug.prompt_version`
- `debug.mock_model_version`
- `debug.image_normalization_version`
- `debug.degradation_policy_version`
- `debug.mock_vlm_used`
- `debug.cache_hit`
- `debug.notes`

页面可以根据后台配置展示 debug 面板，但默认用户体验中不得展示。
