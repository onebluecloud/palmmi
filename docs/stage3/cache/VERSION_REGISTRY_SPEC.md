# Palmmi Stage 3F 版本注册表规范

## 1. 目标

本文定义 Palmmi Stage 3 版本注册表。

版本号必须写入 Stage 3 状态文件或单独版本表，不能散落在代码和文档里。

## 2. 版本字段

| 版本字段 | 来源文件 | 谁维护 | 何时递增 | 递增后影响哪些缓存 |
|---|---|---|---|---|
| `image_normalization_version` | Stage 3B 图片输入与标准化规范；后续可迁入版本表 | Stage 3 工程维护者 | 图片压缩、尺寸、EXIF、识别图生成流程变化时 | 所有图片识别输入缓存 |
| `model_version` | 模型配置和模型调用记录；后续可迁入版本表 | Stage 3 工程维护者 | VLM 模型名称、供应商或固定模型版本变化时 | VLM 原始输出、33 字段、后续规则结果缓存 |
| `prompt_version` | `docs/stage3/prompt/PROMPT_VERSIONING_POLICY.md` | Prompt 维护者 | Prompt 文本、字段说明、输出约束变化时 | VLM 原始输出、33 字段、后续规则结果缓存 |
| `schema_version` | `docs/stage3/V4_2_JSON_SCHEMA_SPEC.md` 与字段校验规范 | Schema 维护者 | Schema、字段白名单、校验规则变化时 | 33 字段标准化结果和后续规则结果缓存 |
| `degradation_policy_version` | `docs/stage3/FIELD_DEGRADATION_POLICY.md` | Schema / 识别链路维护者 | 降级默认值、阈值、状态规则变化时 | 降级字段、识别状态和后续规则结果缓存 |
| `rule_version` | 后续 Stage 3G / 3H 规则引擎规范 | 规则维护者 | 母型评分、硬约束、人格归属或相邻人格区分规则变化时 | 母型结果、人格结果和最终输出缓存 |
| `cache_policy_version` | `docs/stage3/cache/` | 缓存策略维护者 | 缓存 key、value、失效或隐私策略变化时 | 缓存读取写入策略，不一定重算 VLM |

## 3. 初始版本建议

| 版本字段 | 初始建议值 |
|---|---|
| `image_normalization_version` | `image_norm_v1` |
| `model_version` | `model_unfrozen` |
| `prompt_version` | `prompt_v1_prod_candidate` |
| `schema_version` | `schema_v4_2_33_fields_v1` |
| `degradation_policy_version` | `degradation_v1` |
| `rule_version` | `rule_v4_2_unimplemented` |
| `cache_policy_version` | `cache_policy_v1` |

## 4. 维护原则

- 版本字段必须集中登记。
- 版本字段不得只存在于代码常量里。
- 任何版本递增都必须有修改原因。
- 版本递增后必须评估是否影响缓存 key。
- 版本递增后不得覆盖旧版本缓存。

## 5. 与 Stage 3 状态文件关系

Stage 3F 后续可选择：

1. 在 `docs/stage3/STAGE3_STATE.md` 中维护当前版本摘要。
2. 新建单独版本表，例如 `docs/stage3/cache/VERSION_REGISTRY.md`。

无论采用哪种方式，版本号都不能散落在代码和文档里，必须有唯一登记位置。
