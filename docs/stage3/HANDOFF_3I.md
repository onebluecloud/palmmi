# Palmmi Stage 3I Handoff

## 本轮做了什么

- 建立 Stage 3I 确定性分布模拟入口：`tests/stage3/run-stage3i-distribution.cjs`。
- 生成 54 个完整 33 字段模拟样本：
  - 36 个 P01-P36 人格定向样本。
  - 12 个相邻人格边界样本。
  - 3 个跨母型补判样本。
  - 3 个双母型 / 低置信边界样本。
- 使用 3H `matchPersona` / Top3 输出跑完整人格匹配。
- 输出母型分布、36 人格分布、Top1/Top2 分差、Top3 覆盖、相邻人格触发、跨母型补判触发和逐样本结果。
- 生成诊断报告：`docs/stage3/STAGE3I_DISTRIBUTION_REPORT.md`。
- 发现并修复一个 3H 集成 bug：低分相邻人格对不应覆盖当前主母型候选池内更高分人格。

## 新增/修改文件

- 新增：`tests/stage3/run-stage3i-distribution.cjs`
- 新增：`tests/stage3/fixtures/distribution/*.json`
- 新增：`docs/stage3/STAGE3I_DISTRIBUTION_REPORT.md`
- 新增：`docs/stage3/HANDOFF_3I.md`
- 新增：`tests/stage3/fixtures/sample-features-adjacent-low-pair.json`
- 修改：`lib/recognition/adjacentResolver.ts`
- 修改：`tests/stage3/persona-matcher.test.ts`
- 修改：`docs/stage3/STAGE3_STATE.md`
- 修改：`docs/stage3/CHANGE_REQUESTS.md`

## 运行命令

```powershell
node tests\stage3\run-stage3h-tests.cjs
node tests\stage3\run-stage3i-distribution.cjs
```

## 统计结果摘要

- 总样本数：54。
- 母型分布：M1 11、M2 7、M3 9、M4 8、M5 6、M6 4、M7 2、M8 7。
- 0 命中人格：`P27`, `P26`, `P29`, `P04`, `P32`, `P24`。
- 高频人格 Top：`P25` 5/54、`P35` 5/54、`P28` 4/54；未超过 10% WARNING 阈值。
- Top1/Top2 平均分差：0.1148。
- Top1/Top2 最小分差：0。
- Top1/Top2 分差 `<0.15`：33/54。
- 相邻人格触发：13 次。
- 跨母型补判检查：54 次。
- 跨母型补判触发：3 次。

## 风险清单

- WARNING：M7 月相型占比 3.70%，低于 5%。
- WARNING：6 个最终人格 0 命中：`P27`, `P26`, `P29`, `P04`, `P32`, `P24`。
- WARNING：33/54 个样本 Top1/Top2 分差 `<0.15`，边界偏密集。
- WARNING：`P05/P07`、`P25/P33` 在最终匹配输出中 0 次触发，需要后续扩展样本确认是样本不足还是规则粒度问题。
- 记录：跨母型补判触发率 3/54（5.56%），未见过高。

## 是否可以关闭 3I

可以。

3I 已完成确定性分布模拟、诊断报告、状态更新和交接文档。发现的一个实现 bug 已最小修复并回归通过；其余风险只记录，不在 3I 调权重或改 V4.2 规则。

## 3J 输入建议

3J 串联端到端闭环时，应保留 3I 的分布报告作为基线，重点观察 M7 低占比、6 个 0 命中人格、Top1/Top2 分差偏小和相邻规则零触发对。
