# Palmmi Stage 3H Handoff

## 本轮完成内容

- 基于 3G 冻结的 8 母型评分函数，实现母型评分、核心字段支撑、主母型/副母型/双母型选择。
- 基于 V4.2 的 36 人格归属与 36 段“掌纹依据”，实现人格规则匹配结构。
- 实现主母型内人格匹配：先确定主母型，再只在该母型候选池内评分。
- 实现跨母型补判：跨母型人格分数必须高于当前主人格 20% 以上，且对应母型分数 `>= 50` 才允许跳转。
- 实现 12 对相邻人格区分规则，保留 `threshold = 0.15`。
- 实现 Top 3 候选输出，包含 `persona_id`、`name`、`mother_type`、`score`、`reason_codes`、`matched_features`。
- 实现解释性结果结构，记录母型原因、人格原因、命中字段、冲突字段、跨母型补判、相邻人格区分和低置信状态。
- 补充 Stage 3H 最小 Node 测试脚本与 11 个标准化 33 字段 fixture。

## 创建/修改文件

- 新增：`lib/recognition/recognitionTypes.ts`
- 新增：`lib/recognition/motherScores.ts`
- 新增：`lib/recognition/personaCatalog.ts`
- 新增：`lib/recognition/personaRules.ts`
- 新增：`lib/recognition/personaMatcher.ts`
- 新增：`lib/recognition/adjacentResolver.ts`
- 新增：`lib/recognition/crossMotherCorrection.ts`
- 新增：`tests/stage3/run-stage3h-tests.cjs`
- 新增：`tests/stage3/persona-matcher.test.ts`
- 新增：`tests/stage3/adjacent-resolver.test.ts`
- 新增：`tests/stage3/cross-mother-correction.test.ts`
- 新增：`tests/stage3/fixtures/sample-features-m1.json`
- 新增：`tests/stage3/fixtures/sample-features-m2.json`
- 新增：`tests/stage3/fixtures/sample-features-m3.json`
- 新增：`tests/stage3/fixtures/sample-features-m4.json`
- 新增：`tests/stage3/fixtures/sample-features-m5.json`
- 新增：`tests/stage3/fixtures/sample-features-m6.json`
- 新增：`tests/stage3/fixtures/sample-features-m7.json`
- 新增：`tests/stage3/fixtures/sample-features-m8.json`
- 新增：`tests/stage3/fixtures/sample-features-cross-mother.json`
- 新增：`tests/stage3/fixtures/sample-features-close-top12.json`
- 新增：`tests/stage3/fixtures/sample-features-no-eligible.json`
- 新增：`docs/stage3/HANDOFF_3H.md`
- 修改：`docs/stage3/STAGE3_STATE.md`

## 上下文恢复说明

- `docs/stage3/API_CONTRACT.md` 精确路径不存在；本轮使用 `docs/stage3/rule-engine/RULE_ENGINE_INPUT_OUTPUT_CONTRACT.md` 作为规则引擎输入输出契约的等价上下文。
- 3G 文档冻结了母型评分、36 人格归属、跨母型和相邻人格规则，但没有展开 36 人格逐项评分条件；本轮只从 V4.2 源文件 §6.2 的每个人格“掌纹依据”抽取字段条件，没有重新设计人格名称、人格文案或规则字段。

## 本轮边界

本轮未接 VLM。

本轮未调用千问 API。

本轮未修改 UI。

本轮未修改 `app/`、`components/`、`public/`、`package.json`。

本轮未修改 Stage 2 文件。

本轮未改 3G 已确认的 8 母型评分函数权重、字段名、阈值。

## 测试结果

运行命令：

```powershell
node tests\stage3\run-stage3h-tests.cjs
```

结果：`8/8 Stage 3H tests passed.`

## 下一步 3I

基于 3H 的人格匹配与 Top3 输出，对 36 型分布进行模拟测试，检查母型/人格是否出现过度集中、永远不命中、相邻人格混淆等问题；不接 VLM，不改 UI。
