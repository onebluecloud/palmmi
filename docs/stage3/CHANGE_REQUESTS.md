# Palmmi Stage 3 Change Requests

## Change Request Template

- CR 编号：
- 提出时间：
- 变更标题：
- 变更内容：
- 触发原因：
- 依据来源：
- 影响范围：
- 影响文件：
- 是否影响字段：
- 是否影响 Prompt：
- 是否影响 Schema：
- 是否影响规则引擎：
- 是否影响缓存：
- 是否影响 Stage 4：
- 是否需要回归测试：
- 是否需要更新 STAGE3_STATE.md：
- 是否批准：
- 处理结果：

## CR-0001

- CR 编号：CR-0001
- 提出时间：2026-05-15
- 变更标题：统一正式产品名为 Palmmi
- 变更内容：将项目正式名称从 PalmTag 统一为 Palmmi。原始 V4.2 报告不修改，工程文档和用户可见内容统一使用 Palmmi。
- 触发原因：项目当前正式名称已变更，需要避免后续阶段命名混乱。
- 依据来源：Stage 3A 用户指令。
- 影响范围：工程文档、后续代码命名、用户可见文案。
- 影响文件：`docs/stage3/*` 及后续阶段新增或修改文件。
- 是否影响字段：否。
- 是否影响 Prompt：后续生产 Prompt 中产品名应使用 Palmmi；原始报告引用不修改。
- 是否影响 Schema：否。
- 是否影响规则引擎：否。
- 是否影响缓存：否。
- 是否影响 Stage 4：是，Stage 4 交接必须延续 Palmmi 命名。
- 是否需要回归测试：否。
- 是否需要更新 STAGE3_STATE.md：是。
- 是否批准：是。
- 处理结果：Stage 3A 工程文档统一使用 Palmmi；原始报告旧名仅在引用说明中保留。

## CR-0002

- CR 编号：CR-0002
- 提出时间：2026-05-16
- 变更标题：修复低分相邻人格对覆盖高分候选的问题
- 变更内容：`resolveAdjacentInCandidates` 只允许对包含当前最高分候选的人格相邻对执行相邻分流，不再让候选池中任意低分相邻对覆盖更高分的非相邻人格。
- 触发原因：Stage 3I 分布模拟发现，低分 `P01/P12` 相邻对会覆盖同一母型内更高分的 `P06`、`P25` 等候选，导致最终人格与 Top3 分数排序不一致。
- 依据来源：V4.2 相邻人格规则的工程语义是“候选人格得分接近时启用”，不应让无关低分相邻对绕过当前 Top 候选。
- 影响范围：Stage 3H 相邻人格集成逻辑；不修改 12 对相邻人格规则本身。
- 影响文件：`lib/recognition/adjacentResolver.ts`、`tests/stage3/persona-matcher.test.ts`、`tests/stage3/fixtures/sample-features-adjacent-low-pair.json`。
- 是否影响字段：否。
- 是否影响 Prompt：否。
- 是否影响 Schema：否。
- 是否影响规则引擎：是，仅修复相邻分流的应用范围；不改规则、权重、阈值。
- 是否影响缓存：否。
- 是否影响 Stage 4：是，Stage 4 应继承修复后的相邻分流行为。
- 是否需要回归测试：是。
- 是否需要更新 STAGE3_STATE.md：是。
- 是否批准：是。
- 处理结果：已补充回归样例并通过 `node tests\stage3\run-stage3h-tests.cjs`；Stage 3I 分布模拟重新生成报告。

## Stage 3I 规则变更结论

3I 未提出立即规则变更；本轮只记录一个实现 bug 修复。未修改 8 母型评分权重、36 人格名称、12 对相邻人格规则、`threshold = 0.15` 或跨母型补判 `20% + 母型分 >= 50` 条件。
## Stage 3J 规则变更结论

3J 未修改规则，仅完成闭环串联。未修改 8 母型评分权重、36 人格名称、12 对相邻人格规则、`threshold = 0.15`、跨母型补判 `20% + 母型分 >= 50` 条件，也未引入 `perceptual_hash`。本轮新增质量门控、Schema 校验降级、file_hash 版本化缓存和 RecognitionResult 管线封装，属于 Stage 3J 工程整合，不提出立即规则变更。

## Stage 3K Rule Change Conclusion

3K 未修改规则，仅新增稳定性测试与验收报告。

- Change record: Stage 3K stability acceptance artifacts only.
- Change content: added Stage 3K regression/stability test entrypoint and Stage 3K/Stage 3 acceptance reports.
- Trigger reason: required Stage 3K stability acceptance, cache diagnostics, failure-path diagnostics, cost statistics, and handoff documentation.
- Impact scope: tests and docs only.
- Affected files: `tests/stage3/run-stage3k-stability.cjs`, `docs/stage3/STAGE3K_STABILITY_REPORT.md`, `docs/stage3/STAGE3_ACCEPTANCE_REPORT.md`, `docs/stage3/HANDOFF_3K.md`, `docs/stage3/STAGE3_STATE.md`, `docs/stage3/CHANGE_REQUESTS.md`.
- Affects 3G/3H rules: no.
- Affects 8 mother scoring weights: no.
- Affects 36 persona names: no.
- Affects 12 adjacent persona rules: no.
- Affects `threshold = 0.15`: no.
- Affects cross-mother correction `20% + mother score >= 50`: no.
- Introduces `perceptual_hash`: no.
- Requires regression tests: yes.
- Regression result: `node tests/stage3/run-stage3h-tests.cjs` passed 9/9; `node tests/stage3/run-stage3i-distribution.cjs` completed 54 samples; `node tests/stage3/run-stage3j-pipeline.cjs` passed 14/14; `node tests/stage3/run-stage3k-stability.cjs` passed 5/5.

## Stage 3L Rule Change Conclusion

3L 未修改识别规则、未修改母型评分、未修改人格匹配、未修改相邻人格规则、未修改跨母型补判，仅生成最终验收与 Stage 4 交接材料。

- Change record: Stage 3L final acceptance and Stage 4 handoff artifacts only.
- Change content: generated final Stage 3 acceptance report, Stage 4 handoff, Stage 4 context, Stage 4 input contract, Stage 4 forbidden changes, and 3L handoff.
- Trigger reason: required Stage 3 final acceptance and Stage 4 page-productization handoff.
- Impact scope: docs only.
- Affected files: `docs/stage3/STAGE3_FINAL_ACCEPTANCE_REPORT.md`, `docs/stage3/HANDOFF_TO_STAGE4.md`, `docs/stage3/HANDOFF_3L.md`, `docs/stage4/STAGE4_CONTEXT.md`, `docs/stage4/STAGE4_INPUT_CONTRACT.md`, `docs/stage4/STAGE4_FORBIDDEN_CHANGES.md`, `docs/stage3/STAGE3_STATE.md`, `docs/stage3/CHANGE_REQUESTS.md`.
- Documentation-level correction: `STAGE3_STATE.md` was updated from stale 3J/3K/3L pending status to final Stage 3 complete status.
- Affects 3G/3H rules: no.
- Affects mother scoring weights: no.
- Affects persona matching: no.
- Affects 12 adjacent persona rules: no.
- Affects `threshold = 0.15`: no.
- Affects cross-mother correction `20% + mother score >= 50`: no.
- Introduces `perceptual_hash`: no.
- Requires regression tests: yes.
- Regression result: 3H, 3I, 3J, and 3K commands were run for final handoff verification.
