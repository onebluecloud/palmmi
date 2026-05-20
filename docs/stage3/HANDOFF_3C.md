# Palmmi Stage 3C Handoff

## 本轮完成内容

- 创建非手掌拦截规范，冻结 3C 输入来源、拒绝类别、门控状态、拒绝原因和用户提示语。
- 创建图片质量门控规范，冻结质量维度、`quality_score` 分级、必须重拍条件、`LOW_QUALITY_PASS` 条件和输出对象。
- 创建轻量视觉预检规范，明确预检只做低成本布尔判断，不输出 33 字段、不判断人格或母型。
- 创建 3C 输出契约，定义 `QualityGateResult` 和后续模块读取规则。
- 创建 3C 测试计划，覆盖合格掌心、低质量可用、非手掌、截图、二维码、AI 生成手、假手等样本。
- 更新 Stage 3 决策日志。
- 更新 Stage 3 状态文件。

## 新增/修改文件列表

- 新增：`docs/stage3/NON_PALM_REJECTION_SPEC.md`
- 新增：`docs/stage3/IMAGE_QUALITY_GATE_SPEC.md`
- 新增：`docs/stage3/LIGHTWEIGHT_VISION_PREFLIGHT_SPEC.md`
- 新增：`docs/stage3/QUALITY_GATE_CONTRACT.md`
- 新增：`docs/stage3/QUALITY_GATE_TEST_PLAN.md`
- 新增：`docs/stage3/HANDOFF_3C.md`
- 修改：`docs/stage3/DECISIONS.md`
- 修改：`docs/stage3/STAGE3_STATE.md`

## 3C 核心输出

- `NON_PALM_REJECTION_SPEC.md`
- `IMAGE_QUALITY_GATE_SPEC.md`
- `LIGHTWEIGHT_VISION_PREFLIGHT_SPEC.md`
- `QUALITY_GATE_CONTRACT.md`
- `QUALITY_GATE_TEST_PLAN.md`

## 3C 状态

- `PASS`
- `LOW_QUALITY_PASS`
- `RETRY_REQUIRED`
- `REJECTED`

## 3C 和 3D 的边界

3C 只判断能否进入 VLM。

3D 才转写 V4.2 33字段。

3C 不输出 33 字段，不判断人格，不判断母型，不做规则引擎。

## 下一步 3D 应该做什么

- 基于 V4.2 报告转写 33 字段工程规范
- 字段名必须和 V4.2 完全一致
- 不得新增字段
- 不得删除字段
- 不得重新设计字段

## 3D 禁止做什么

- 不接千问 API
- 不调 prompt
- 不做规则引擎
- 不改 UI
- 不重新设计人格和母型
