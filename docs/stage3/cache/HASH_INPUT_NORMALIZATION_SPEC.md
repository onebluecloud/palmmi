# Palmmi Stage 3F file_hash 输入与图片标准化规范

## 1. 目标

本文定义 `file_hash` 的输入对象，并明确原始文件 hash 与标准化识别图 hash 的关系。

这里仍然是 file hash，不是 perceptual hash。

## 2. 两种策略

### A. 对用户上传原始文件计算 file_hash

优点：

- 能判断用户是否上传了完全相同的原始文件。
- 与原始上传行为直接对应。
- 可用于日志和去重辅助。

限制：

- 同一图片经过不同压缩、格式转换或 EXIF 处理后，原始文件 hash 会变化。
- 原始文件不应长期保存。
- 不适合作为唯一识别输入缓存 key。

### B. 对标准化压缩后的识别图计算 file_hash

优点：

- 与实际送入 VLM 的识别输入一致。
- 能反映图片标准化流程对识别结果的影响。
- 更适合作为 VLM 识别缓存 key。

限制：

- 必须绑定 `image_normalization_version`。
- 标准化流程变化后，不能与旧版本 hash 混用。
- 仍然只能判断同一标准化文件，不能判断视觉相似。

## 3. 推荐方案

Palmmi Stage 3 推荐：

- 用 `original_file_hash` 判断完全相同原始文件。
- 用 `normalized_file_hash` 判断经过同一标准化流程后的识别输入。
- 缓存 key 主要使用 `normalized_file_hash` + `image_normalization_version`。
- `original_file_hash` 可用于日志和去重辅助。

## 4. key 使用建议

推荐缓存 key 中的 `file_hash` 指向 `normalized_file_hash`：

```text
palmmi:recognition:{normalized_file_hash}:{image_normalization_version}:{model_provider}:{model_name}:{model_version}:{prompt_version}:{schema_version}:{degradation_policy_version}:{rule_version}
```

`original_file_hash` 可保存在缓存 value 的 `image_metadata` 中，不作为唯一命中条件。

## 5. 标准化版本变化

标准化流程版本变化后：

- `image_normalization_version` 必须递增。
- `normalized_file_hash` 不应和旧版本混用。
- 旧缓存不直接删除。
- 新版本生成新缓存 key。
- 同一原图在新旧标准化版本下可保留两份结果用于对比。

## 6. 禁止事项

- 不使用 `perceptual_hash`。
- 不使用 pHash、dHash、aHash。
- 不使用 image similarity。
- 不使用 embedding similarity。
- 不把视觉相似图片当作同一图片。
- 不同文件即使看起来相似，也必须重新识别。
