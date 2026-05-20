# Palmmi Stage 3 Codex Workflow

## 全局规则

- 每轮只做一个子任务。
- 每轮只读取必要文件。
- 禁止发散到未授权模块。
- 不改无关文件。
- 结束时必须写本轮 `HANDOFF`。
- 结束时必须更新 `STAGE3_STATE.md`。
- 原始 V4.2 报告只按 `V4_2_SOURCE_MAP.md` 指定章节读取，不整份反复读取。
- 工程文档、代码命名和用户可见文案统一使用 Palmmi。
- 不使用 `perceptual_hash`。

## 每轮 HANDOFF 要求

每轮结束必须输出 `docs/stage3/HANDOFF_<阶段>.md`，内容包含：

- 本轮完成内容
- 读取过的规则来源
- 修改过的文件
- 未完成或待确认事项
- 下一轮入口
- 下一轮允许做什么
- 下一轮禁止做什么

## 3A-3L 对话规范

| 阶段 | 目标 | 允许读取 | 禁止做的事 | 必须输出 |
|---|---|---|---|---|
| 3A | V4.2 注入与 Stage 3 上下文冻结 | `docs/`、V4.2 原报告、`D:\codex-skills\INDEX.md` | 写识别代码、接 API、改 UI、改原报告 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`DECISIONS.md`、`CHANGE_REQUESTS.md`、`STAGE3_CONTEXT.md`、`CODEX_WORKFLOW.md`、`HANDOFF_3A.md` |
| 3B | 图片输入、压缩、EXIF、上传限制 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`STAGE3_CONTEXT.md`、`HANDOFF_3A.md`、3B 明确授权文件 | 接 API、做规则引擎、改 UI、改 33 字段 | 3B 实施文件、`HANDOFF_3B.md`、更新 `STAGE3_STATE.md` |
| 3C | 非手掌拦截 + 图片质量检测 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3B.md`、3C 明确授权文件 | 做 VLM 人格判断、做评分规则、改 UI | 3C 实施文件、`HANDOFF_3C.md`、更新 `STAGE3_STATE.md` |
| 3D | V4.2 33字段工程转写 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3C.md`、V4.2 §2 与附录 A 相关片段 | 新增字段、删除字段、改字段名、改取值范围 | 33字段工程定义、`HANDOFF_3D.md`、更新 `STAGE3_STATE.md` |
| 3E | V4.2 JSON Schema + 校验/降级机制 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3D.md`、V4.2 §2.4-§3.1 相关片段 | 让 VLM 输出人格、跳过枚举校验、静默吞掉非法字段 | Schema、校验与降级实现、`HANDOFF_3E.md`、更新 `STAGE3_STATE.md` |
| 3E-b | V4.2 Prompt 实测调优 + 生产 Prompt 冻结 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3E.md`、V4.2 §3.1-§3.3 相关片段 | 改字段含义、让 Prompt 判断人格、忽略成本记录 | Prompt 实测记录、生产 Prompt、`HANDOFF_3E-b.md`、更新 `STAGE3_STATE.md` |
| 3F | `file_hash` 缓存 + 模型/prompt/schema/rule 版本管理 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`HANDOFF_3E-b.md`、3F 明确授权文件 | 使用 `perceptual_hash`、绕过版本号、缓存未校验 JSON | 缓存与版本机制、`HANDOFF_3F.md`、更新 `STAGE3_STATE.md` |
| 3G | V4.2 规则引擎代码化 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3F.md`、V4.2 §4.2-§4.3.1 相关片段 | 重写权重、改母型定义、跳过核心字段硬约束 | 8母型 score 函数、`HANDOFF_3G.md`、更新 `STAGE3_STATE.md` |
| 3H | V4.2 双层评分流程实现 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3G.md`、V4.2 §4.1、§4.4-§4.6、§5.3、§7 相关片段 | 先算 36 人格再反推母型、跳过跨母型补判、改人格归属 | 双层评分流程、`HANDOFF_3H.md`、更新 `STAGE3_STATE.md` |
| 3I | 36型分布模拟测试 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3H.md`、V4.2 §10、§10.1、§11.2.1 相关片段 | 用测试结果静默改权重、跳过变更请求 | 模拟测试与分布报告、`HANDOFF_3I.md`、更新 `STAGE3_STATE.md` |
| 3J | 端到端识别闭环整合 | `STAGE3_STATE.md`、`HANDOFF_3I.md`、3B-3I 产物、3J 明确授权文件 | 重做前序模块、改 UI、引入新规则源 | 端到端闭环、`HANDOFF_3J.md`、更新 `STAGE3_STATE.md` |
| 3K | 回归测试 + 成本统计 + 稳定性测试 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`HANDOFF_3J.md`、3K 明确授权文件 | 只跑快乐路径、忽略成本、跳过稳定性记录 | 回归测试、成本统计、稳定性报告、`HANDOFF_3K.md`、更新 `STAGE3_STATE.md` |
| 3L | Stage 3 验收报告 + Stage 4 交接 | `STAGE3_STATE.md`、`V4_2_SOURCE_MAP.md`、`V4_2_SUMMARY_INDEX.md`、`HANDOFF_3K.md`、V4.2 §6、§8、§9、附录 B、附录 C 相关片段 | 改 36 人格文案、开启 Stage 4 实现、改 Stage 2 UI | Stage 3 验收报告、Stage 4 交接、`HANDOFF_3L.md`、更新 `STAGE3_STATE.md` |
