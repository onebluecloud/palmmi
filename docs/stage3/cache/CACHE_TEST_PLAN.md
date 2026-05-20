# Palmmi Stage 3F 缓存策略测试计划

## 1. 目标

本文定义缓存策略测试计划。

本计划不写测试代码，只写测试用例设计。

## 2. 测试用例

| 编号 | 输入条件 | 预期是否命中缓存 | 是否调用 VLM | 是否重新校验 Schema | 是否重新计算规则 | 预期错误码或状态 |
|---|---|---|---|---|---|---|
| T01 | 同一文件重复上传，所有版本一致，缓存未过期 | 是 | 否 | 否 | 否 | `CACHE_HIT` |
| T02 | 同一文件，但 `prompt_version` 改变 | 否 | 是 | 是 | 是，后续规则阶段执行 | `CACHE_VERSION_MISMATCH` |
| T03 | 同一文件，但 `schema_version` 改变 | 否 | 视情况，可复用原始输出重新校验；必要时调用 | 是 | 是，后续规则阶段执行 | `CACHE_VERSION_MISMATCH` |
| T04 | 同一文件，但 `rule_version` 改变 | 不复用完整结果 | 否，若 VLM 输出和标准字段仍有效 | 可复核 | 是，后续规则阶段执行 | `CACHE_VERSION_MISMATCH` |
| T05 | 同一文件，但 `model_version` 改变 | 否 | 是 | 是 | 是，后续规则阶段执行 | `CACHE_VERSION_MISMATCH` |
| T06 | 不同文件但内容看起来相似 | 否 | 是 | 是 | 是，后续规则阶段执行 | `CACHE_MISS` |
| T07 | 不同用户上传同一文件，所有版本一致 | 是 | 否 | 否 | 否 | `CACHE_HIT` |
| T08 | 缓存过期 | 否 | 是 | 是 | 是，后续规则阶段执行 | `CACHE_EXPIRED` |
| T09 | 缓存 value 损坏或缺少必填字段 | 否 | 是 | 是 | 是，后续规则阶段执行 | `CACHE_VALUE_CORRUPTED` |
| T10 | 发现调用路径尝试使用 `perceptual_hash` | 否 | 否 | 否 | 否 | `PERCEPTUAL_HASH_FORBIDDEN` |
| T11 | 同一文件，但 `image_normalization_version` 改变 | 否 | 是 | 是 | 是，后续规则阶段执行 | `CACHE_VERSION_MISMATCH` |
| T12 | 同一文件，但 `degradation_policy_version` 改变 | 否 | 视情况，可复用原始输出重新降级；必要时调用 | 是 | 是，后续规则阶段执行 | `CACHE_VERSION_MISMATCH` |

## 3. 覆盖要求

测试计划必须覆盖：

1. 同一文件重复上传。
2. 同一文件但 `prompt_version` 改变。
3. 同一文件但 `schema_version` 改变。
4. 同一文件但 `rule_version` 改变。
5. 同一文件但 `model_version` 改变。
6. 不同文件但内容看起来相似。
7. 不同用户上传同一文件。
8. 缓存过期。
9. 缓存 value 损坏。
10. 禁止 `perceptual_hash` 被使用。

## 4. 验收标准

缓存策略测试设计通过条件：

- 不同文件即使视觉相似也不命中缓存。
- `prompt_version`、`schema_version`、`rule_version`、`model_version`、`image_normalization_version` 变化都会导致新缓存 key。
- `perceptual_hash` 出现时必须触发 `PERCEPTUAL_HASH_FORBIDDEN`。
- 完全命中不调用 VLM。
- 缓存 miss 或版本失效不直接返回旧结果。
