# Palmmi Stage 3J Handoff

## 本轮做了什么

- 建立 Stage 3J 端到端识别闭环：mock image metadata -> quality gate -> file_hash cache -> mock VLM features -> 33-field schema validation -> degradation/default -> 3G mother scoring -> 3H persona matching -> Top3 -> cache write -> RecognitionResult。
- 只使用 mock VLM / fixtures features JSON；没有接真实 VLM、千问 API 或任何外部 API。
- 建立可测试的质量门控接口，覆盖合格手掌、非手掌、手背、多手、模糊、低质量可用、超大图片 metadata、非图片 MIME。
- 建立 V4.2 33 字段 Schema 校验和降级记录，输出 `degraded_fields`、`missing_fields`、`invalid_fields`、`schema_warnings`、`should_retry`。
- 建立只使用 `file_hash` 的版本化缓存，覆盖首次 miss、第二次 hit、同 file_hash 不同 rule_version miss、不同 file_hash miss。
- 保留 3I 风险，不调权重、不修改 3G/3H 规则。

## 新增/修改文件

新增：

- `lib/recognition/recognitionPipeline.ts`
- `lib/recognition/recognitionCache.ts`
- `lib/recognition/qualityGate.ts`
- `lib/recognition/schemaValidator.ts`
- `lib/recognition/recognitionResult.ts`
- `tests/stage3/run-stage3j-pipeline.cjs`
- `tests/stage3/fixtures/pipeline/*.json`
- `docs/stage3/STAGE3J_PIPELINE_REPORT.md`
- `docs/stage3/HANDOFF_3J.md`

修改：

- `docs/stage3/STAGE3_STATE.md`
- `docs/stage3/CHANGE_REQUESTS.md`

## 运行命令

```bash
node tests/stage3/run-stage3h-tests.cjs
node tests/stage3/run-stage3i-distribution.cjs
node tests/stage3/run-stage3j-pipeline.cjs
```

## 测试结果

- Stage 3H：9/9 passed。
- Stage 3I：54 个分布模拟样本完成，报告重新生成。
- Stage 3J：14/14 passed，闭环报告生成。

## 已知风险

- 3I 风险继续保留给 3K/后续调参，不在 3J 修复：
  - M7 母型 2/54，低于 5%，WARNING。
  - `P27`、`P26`、`P29`、`P04`、`P32`、`P24` 为 0 命中。
  - Top1/Top2 分差 `< 0.15` 的样本为 33/54。
  - `P05/P07`、`P25/P33` 最终触发 0 次。
  - 跨母型补判 3/54，未见过高。
- Stage 3J 仍为 mock VLM 闭环，不包含真实图片识别或真实模型调用。

## 3K 输入建议

基于 3J 的端到端闭环，进行回归测试、成本统计、失败路径压力测试、缓存命中测试和 Stage 3 稳定性验收；不接真实 VLM，不改 UI。

## 是否可以关闭 3J

可以。3J 范围内的端到端 mock 闭环、质量门控、Schema 降级、file_hash 缓存、母型评分、人格式匹配和 Top3 输出均已串联并通过 3H/3I/3J 测试。
