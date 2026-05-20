# Palmmi Stage 3 Final Acceptance Report

## Stage 3 总目标

Stage 3 的目标是把 V4.2 掌纹识别规则工程化，形成可测试、可回归、可交接的 mock 识别闭环：

```text
mock image metadata
  -> quality gate
  -> file_hash cache
  -> mock VLM feature fixture
  -> V4.2 33-field schema validation/degradation
  -> 8 mother scoring
  -> 36 persona matching
  -> adjacent/cross-mother checks
  -> Top3
  -> RecognitionResult
```

Stage 3 不负责页面产品化，也不负责真实 VLM 接入。

## 3A-3K 完成状态

| Stage | 状态 | 结果 |
| --- | --- | --- |
| 3A | 已完成 | V4.2 作为唯一规则源，Palmmi 命名冻结。 |
| 3B | 已完成 | 图片输入、压缩、EXIF、上传限制契约完成。 |
| 3C | 已完成 | 非手掌拦截与质量门控契约完成。 |
| 3D | 已完成 | V4.2 33 字段工程规范冻结。 |
| 3E | 已完成 | Schema 校验、降级、重拍策略冻结。 |
| 3E-b | 已完成 | Prompt 草案、版本策略和评测方案冻结。 |
| 3F | 已完成 | file_hash 缓存和版本隔离策略冻结。 |
| 3G | 已完成 | 8 母型评分、规则引擎契约冻结。 |
| 3H | 已完成 | 母型评分、人格匹配、Top3、相邻人格、跨母型补判实现并回归。 |
| 3I | 已完成，风险保留 | 54 个确定性样本完成分布诊断。 |
| 3J | 已完成 | 端到端 mock pipeline 串联完成。 |
| 3K | 已完成 | 稳定性、缓存、失败路径、成本和禁止路径检查完成。 |

## 当前识别闭环能力

- 输入 mock image metadata 和 mock VLM feature fixture。
- 在 quality gate 层处理非图片、非手掌、手背、多手、模糊、过暗、低质量等状态。
- 使用 V4.2 33 字段进行 Schema 校验、默认值降级和 retry 判定。
- 使用 file_hash 与版本字段构造缓存 key。
- 使用 V4.2 的 8 母型评分、36 人格归属、12 对相邻人格规则和跨母型补判规则。
- 输出统一 `RecognitionResult`，供 Stage 4 页面消费。

## 当前仍为 mock 的部分

- 图片输入是 mock metadata，不是页面真实上传链路。
- VLM 特征提取是 fixture，不是真实模型调用。
- `model_provider` 当前为 `mock`。
- 成本统计只用公式和 mock VLM 调用计数，不使用真实价格。

## 当前未接真实 VLM 的原因

- Stage 3 的验收目标是工程闭环，不是 provider 集成。
- V4.2 Prompt 仍需要真实样本专门评测后再冻结生产版本。
- 真实 API key、计费、限流、重试、日志和隐私策略应放到后续真实 VLM 专门阶段。
- Stage 4 是页面产品化阶段，不应在页面开发中临时接真实 VLM。

## 33 字段 Schema 状态

- 字段数量：33。
- 字段来源：V4.2，字段名沿用大写字段名。
- 当前实现：`lib/recognition/schemaValidator.ts`。
- 状态：可校验缺失、null、类型错误、枚举越界、连续降级、核心字段不足。
- 验收结论：已达到 mock 工程闭环要求。

## file_hash 缓存状态

- 当前实现：`lib/recognition/recognitionCache.ts`。
- key 包含 `file_hash`、`image_normalization_version`、`model_provider`、`model_name`、`mock_model_version/model_version`、`prompt_version`、`schema_version`、`degradation_policy_version`、`rule_version`。
- 同 file_hash + 同版本可命中缓存。
- rule/schema/prompt 版本变化不得复用旧缓存。
- 不使用 `perceptual_hash`。

## 质量门控状态

- 当前实现：`lib/recognition/qualityGate.ts`。
- `REJECTED`：非图片、非手掌、手背、多手、超大、尺寸不合法等。
- `RETRY_REQUIRED`：模糊、过暗、低清晰度。
- `LOW_QUALITY_PASS`：低质量但仍可用，后续结果降为 `LOW_CONFIDENCE`。
- `PASS`：可进入 mock VLM feature fixture。

## 母型评分状态

- 当前实现：`lib/recognition/motherScores.ts`。
- 8 母型评分沿用 V4.2。
- 主母型必须满足至少 2 个核心字段支撑。
- 副母型来自分数排序。
- 第一/第二母型分差小于 15 分时标记 `is_dual_mother = true`。

## 人格匹配状态

- 当前实现：`lib/recognition/personaCatalog.ts`、`personaRules.ts`、`personaMatcher.ts`。
- 36 人格名称与母型归属沿用 V4.2。
- 页面层不得直接调用人格规则，不得重新判断人格。
- 3I 风险保留，不在 3L 调权重。

## Top3 输出状态

- `top3` 输出最多 3 个候选。
- 每个候选包含 `id/persona_id`、`name`、`mother_type`、`score`、`reason_codes`、`matched_features`、`conflict_features`。
- Stage 4 可以展示 Top3，但不能重排、重算或重写人格判断。

## 失败路径状态

已覆盖：

- 非图片 MIME -> `REJECTED`
- 非手掌 -> `REJECTED`
- 手背 -> `REJECTED`
- 多手 -> `REJECTED`
- 模糊/过暗 -> `RETRY_REQUIRED`
- 低质量可用 -> `LOW_CONFIDENCE`
- Schema 缺字段/null 过多/严重非法 -> `RETRY_REQUIRED`
- 枚举越界 -> 记录 `invalid_fields` 并降级
- 母型核心不足 -> `RETRY_REQUIRED`
- Top1/Top2 分差过小 -> `LOW_CONFIDENCE`

## 缓存版本隔离状态

- 同 file_hash + 同版本：第二次命中缓存。
- 同 file_hash + 不同 `rule_version`：不命中。
- 同 file_hash + 不同 `schema_version`：不命中。
- 同 file_hash + 不同 `prompt_version`：不命中。
- 不同 file_hash：不命中。
- `CACHE_HIT` 通过 `cache.cache_hit = true` 与 `debug.cache_hit = true` 表达，不改变原识别状态。

## 成本统计状态

Stage 3K 统计结果：

- pipeline 执行数：24。
- mock VLM 调用数：17。
- 质量门控前置拦截：6。
- 缓存命中：1。
- Schema 失败且不进入匹配：3。

估算公式：

```text
estimated_cost = vlm_call_count * cost_per_vlm_call
estimated_cost_no_cache = vlm_candidate_count * cost_per_vlm_call
avoided_cost_from_quality_gate = quality_gate_blocked_count * cost_per_vlm_call
avoided_cost_from_cache = cache_hit_count * cost_per_vlm_call
```

`cost_per_vlm_call` 是后续配置参数，不在 Stage 3 写死真实价格。

## 3I 遗留风险

以下风险保留到后续真实样本校准阶段，不在 3L 处理：

- M7 母型 2/54，低于 5%，WARNING。
- P27、P26、P29、P04、P32、P24 为 0 最终命中。
- Top1/Top2 分差 `< 0.15` 的样本为 33/54。
- P05/P07、P25/P33 最终触发 0 次。
- 跨母型补判 3/54，未见过高。

## Stage 3 是否可以关闭

可以关闭。Stage 3 已完成 mock 工程闭环、稳定性验收、回归测试、成本统计、失败路径、缓存隔离和 Stage 4 接口交接准备。

## 是否允许进入 Stage 4

允许进入 Stage 4 页面产品化。Stage 4 只消费 Stage 3 的 `RecognitionResult`，不得临时接真实 VLM，不得绕过 pipeline，不得重写规则。

## Stage 4 前置条件

- 读取 `docs/stage3/HANDOFF_TO_STAGE4.md`。
- 读取 `docs/stage4/STAGE4_CONTEXT.md`。
- 读取 `docs/stage4/STAGE4_INPUT_CONTRACT.md`。
- 读取 `docs/stage4/STAGE4_FORBIDDEN_CHANGES.md`。
- 新开 Stage 4A 对话先冻结页面范围和接口边界。
