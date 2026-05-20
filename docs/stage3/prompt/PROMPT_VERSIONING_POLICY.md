# Palmmi Stage 3E-b Prompt 版本管理策略

## 1. 目标

本文定义 Palmmi VLM Prompt 的版本管理策略。

Prompt 是后续识别结果可复现性的一部分，必须纳入版本记录和缓存 key。

## 2. 版本号格式

Prompt 版本号使用以下格式：

| 版本号 | 含义 |
|---|---|
| `prompt_v0_source_v4_2` | V4.2 来源版 Prompt |
| `prompt_v1_prod_candidate` | 第一版生产候选 Prompt |
| `prompt_v1_1_json_strict` | 强化 JSON 纯净度版本 |
| `prompt_v1_2_low_quality_guard` | 强化低质量 / 非手掌保护版本 |
| `prompt_v1_final` | 冻结生产版 Prompt |

## 3. 每次修改必须记录

每次 Prompt 修改必须记录：

| 记录项 | 说明 |
|---|---|
| 版本号 | 新 Prompt 版本 |
| 修改原因 | 为什么需要修改 |
| 修改内容 | 实际改了哪些约束或措辞 |
| 影响字段 | 可能影响哪些 VLM 原始字段或内部字段 |
| 是否需要重新跑测试 | 是 / 否 |
| 是否影响缓存 key | 是 / 否 |

## 4. 缓存 key 关系

`prompt_version` 是后续 `file_hash` 缓存 key 的组成部分。

prompt_version 是后续 file_hash 缓存 key 的组成部分。

后续缓存 key 至少应考虑：

- `file_hash`
- `model_version`
- `prompt_version`
- `schema_version`
- `rule_version`

同一图片在不同 Prompt 版本下可能产生不同 VLM 输出，因此不能只用图片 hash 命中旧结果。

## 5. 修改规则

Prompt 修改分为三类：

| 修改类型 | 示例 | 是否需要重新测试 | 是否影响缓存 key |
|---|---|---|---|
| 非语义格式整理 | 修正文档排版，不改 Prompt 文本 | 否 | 否 |
| 输出约束修改 | 增加禁止 markdown、禁止解释文字 | 是 | 是 |
| 字段判断口径修改 | 修改掌丘、主线、低质量样本说明 | 是 | 是 |

## 6. 冻结后变更

Prompt 冻结为 `prompt_v1_final` 后，未经 `CHANGE_REQUESTS.md` 记录不得随意修改。

冻结后如需修改，必须记录：

- 修改动机。
- 影响范围。
- 新版本号。
- 是否需要回归测试。
- 是否影响缓存 key。
- 是否影响已缓存结果可复现性。

## 7. 禁止事项

- 不允许静默覆盖已有 Prompt 版本。
- 不允许复用同一版本号表达不同 Prompt 文本。
- 不允许 Prompt 修改后继续复用旧缓存 key。
- 不允许通过 Prompt 修改新增、删除或重命名 33 字段体系。
