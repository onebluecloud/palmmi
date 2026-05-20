# Palmmi Stage 3F Handoff

## 本轮完成内容

- 定义 Palmmi Stage 3 同图缓存策略。
- 定义缓存 key 结构和版本字段。
- 定义缓存 value Schema。
- 定义缓存命中、未命中、部分命中和版本失效策略。
- 定义缓存失效策略。
- 定义缓存隐私和保留策略。
- 定义缓存层错误处理契约。
- 定义缓存策略测试计划。
- 定义版本注册表规范。
- 定义 file_hash 输入与图片标准化策略。
- 更新 Stage 3 状态文件。
- 更新 Stage 3 决策日志。

## 创建/修改文件

- 新增：`docs/stage3/cache/FILE_HASH_CACHE_SPEC.md`
- 新增：`docs/stage3/cache/CACHE_KEY_CONTRACT.md`
- 新增：`docs/stage3/cache/CACHE_VALUE_SCHEMA.md`
- 新增：`docs/stage3/cache/CACHE_HIT_MISS_POLICY.md`
- 新增：`docs/stage3/cache/CACHE_INVALIDATION_POLICY.md`
- 新增：`docs/stage3/cache/CACHE_PRIVACY_AND_RETENTION_POLICY.md`
- 新增：`docs/stage3/cache/CACHE_ERROR_HANDLING_CONTRACT.md`
- 新增：`docs/stage3/cache/CACHE_TEST_PLAN.md`
- 新增：`docs/stage3/cache/VERSION_REGISTRY_SPEC.md`
- 新增：`docs/stage3/cache/HASH_INPUT_NORMALIZATION_SPEC.md`
- 新增：`docs/stage3/HANDOFF_3F.md`
- 修改：`docs/stage3/STAGE3_STATE.md`
- 修改：`docs/stage3/DECISIONS.md`

## 本轮边界

本轮只设计缓存与版本管理策略。

本轮未写业务代码。

本轮未实现缓存。

本轮未接 API。

本轮未做规则引擎。

本轮未做 36 人格匹配。

本轮未改 UI。

本轮未使用 `perceptual_hash`。

## 关键冻结点

- Palmmi Stage 3 只使用 `file_hash`。
- 禁止使用 `perceptual_hash`。
- 禁止视觉相似图片缓存。
- 禁止 pHash、dHash、aHash、image similarity、embedding similarity。
- 同一文件 + 相同版本组合才允许命中缓存。
- 不同文件即使视觉相似，也必须视为不同图片。
- 缓存 key 必须包含版本信息。
- Prompt / Schema / Rule / Model / Normalization / Degradation Policy 变化必须产生新缓存 key。
- 不长期保存用户原图。

## 下一步 3G

基于 V4.2 §4、§5、§7 和 3D/3E 的字段规范，将 8 个母型评分函数、主母型核心字段硬约束、母型归属表、相邻人格区分规则转写为规则引擎工程规范；不接 VLM，不改 UI。
