# Palmmi Stage 3F 缓存 key 契约

## 1. 目标

本文定义 Palmmi Stage 3 同图缓存 key 结构。

缓存 key 必须同时表达文件身份和识别链路版本，避免 prompt、schema、degradation policy、rule 或 model 升级后污染旧结果。

## 2. 必需字段

缓存 key 必须至少包含：

| 字段 | 作用 |
|---|---|
| `file_hash` | 判断完全相同文件，推荐使用标准化识别图的 file hash |
| `image_normalization_version` | 标记图片压缩、裁切、EXIF 移除、尺寸策略等标准化流程版本 |
| `model_provider` | 标记 VLM 服务提供方 |
| `model_name` | 标记 VLM 模型名称 |
| `model_version` | 标记具体模型版本或固定模型别名版本 |
| `prompt_version` | 标记 VLM Prompt 版本 |
| `schema_version` | 标记 VLM 输出 Schema 与内部 33 字段 Schema 版本 |
| `degradation_policy_version` | 标记字段降级策略版本 |
| `rule_version` | 标记后续规则引擎和人格映射规则版本 |

## 3. 版本变化规则

| 字段变化 | 缓存 key 是否变化 | 原因 |
|---|---|---|
| `prompt_version` 变化 | 必须变化 | Prompt 会影响 VLM 原始输出 |
| `schema_version` 变化 | 必须变化 | Schema 会影响校验和标准化结果 |
| `rule_version` 变化 | 必须变化 | 规则会影响母型和人格结果 |
| `model_version` 变化 | 必须变化 | 模型输出可能变化 |
| `image_normalization_version` 变化 | 必须变化 | 同一原图经不同标准化流程可能产生不同识别输入 |
| `degradation_policy_version` 变化 | 必须变化 | 降级字段和值可能变化 |
| `model_provider` 或 `model_name` 变化 | 必须变化 | 服务方或模型不同，输出不可视为同一结果 |

## 4. 示例 key

基础示例：

```text
palmmi:recognition:{file_hash}:{model_version}:{prompt_version}:{schema_version}:{rule_version}
```

推荐完整示例：

```text
palmmi:recognition:{normalized_file_hash}:{image_normalization_version}:{model_provider}:{model_name}:{model_version}:{prompt_version}:{schema_version}:{degradation_policy_version}:{rule_version}
```

## 5. key 字段说明

| 字段 | 示例 | 维护方式 |
|---|---|---|
| `file_hash` | `sha256:...` | 由文件内容计算 |
| `image_normalization_version` | `image_norm_v1` | 图片标准化策略变更时递增 |
| `model_provider` | `qwen` | 模型供应商变更时更新 |
| `model_name` | `qwen-vl-plus` | 模型名称变更时更新 |
| `model_version` | `qwen_vl_plus_2026_05` | 模型版本变更时更新 |
| `prompt_version` | `prompt_v1_prod_candidate` | Prompt 文本变更时更新 |
| `schema_version` | `schema_v4_2_33_fields_v1` | Schema 或字段校验规则变更时更新 |
| `degradation_policy_version` | `degradation_v1` | 降级阈值或默认值策略变更时更新 |
| `rule_version` | `rule_v4_2_v1` | 规则引擎或人格规则变更时更新 |

## 6. 禁止事项

- 不允许把 `perceptual_hash` 放进 key。
- 不允许把 pHash、dHash、aHash 放进 key。
- 不允许把 image similarity 或 embedding similarity 放进 key。
- 不允许只用 `file_hash` 命中跨版本缓存。
- 不允许把用户身份作为同图缓存命中条件。
