# Palmmi Stage 3E Schema 测试计划

## 1. 目标

本文定义 Palmmi Stage 3E 的 Schema 测试用例设计。

本计划不写测试代码，只冻结测试场景、预期校验结果、错误码、降级与后续匹配条件。

## 2. 测试范围

测试覆盖：

- VLM 原始输出 JSON 可解析性。
- 33 字段 key 完整性。
- 字段白名单。
- 字段类型。
- 枚举范围。
- `null` 与缺失字段处理。
- 降级数量统计。
- VLM 原始字段到内部 33 字段映射。
- 是否允许进入后续匹配。

## 3. 测试样例

| 编号 | 输入情况 | 预期校验结果 | 预期错误码 | 是否允许降级 | 是否允许进入后续匹配 |
|---|---|---|---|---|---|
| T01 | 完整合法 JSON，VLM 原始字段可全部映射，几何字段齐全，33 字段值均在白名单内 | 通过 | 无 | 否 | 是 |
| T02 | 内部 33 字段缺少 1 个辅助字段，例如 `FATE_LINE_CLARITY` | 失败，进入缺失字段分支 | `MISSING_REQUIRED_FIELD` | 是 | 否，补齐或降级记录后才可继续 |
| T03 | 内部 33 字段多出 `MIDDLE_LENGTH` | 多余字段被拒绝进入标准化层；若 33 字段齐全则记录并丢弃 | `JSON_SCHEMA_INVALID` | 否 | 视 33 字段是否完整 |
| T04 | `LIFE_LINE_DEPTH` 为字符串 `"2"` | 失败 | `TYPE_MISMATCH` | 否 | 否 |
| T05 | `MOUNT_VENUS` 为小数 `1.5` | 失败 | `ENUM_OUT_OF_RANGE` | 否 | 否 |
| T06 | `SIMIAN_LINE` 为负数 `-1` | 失败 | `ENUM_OUT_OF_RANGE` | 否 | 否 |
| T07 | `CHUAN_PALM` 为 `2` | 失败 | `ENUM_OUT_OF_RANGE` | 否 | 否 |
| T08 | 总 `null` 字段数达到 5 个 | 失败，触发重拍 | `TOO_MANY_NULL_FIELDS` | 否 | 否 |
| T09 | 核心字段缺失达到 3 个，例如 `LIFE_LINE_DEPTH`、`HEAD_LINE_DEPTH`、`OVERALL_CLARITY` 缺失 | 失败，核心字段不足 | `CORE_FIELDS_INSUFFICIENT` | 否 | 否 |
| T10 | 低置信字段缺失，例如 `FINGERTIP_SHAPE` 缺失，其余字段完整 | 失败后进入低置信字段降级链 | `MISSING_REQUIRED_FIELD` | 是 | 降级记录完成且核心字段充足后可继续 |
| T11 | VLM 输出带 Markdown 代码块包裹 | 初次解析失败或需先抽取 JSON；不得直接映射 | `JSON_PARSE_FAILED` | 否 | 否 |
| T12 | VLM 输出 JSON 前后带解释文字 | 初次解析失败或需重试纯 JSON | `JSON_PARSE_FAILED` | 否 | 否 |
| T13 | VLM 输出完全不是 JSON，例如一段自然语言解释 | 失败 | `JSON_PARSE_FAILED` | 否 | 否 |
| T14 | VLM 输出包含 `main_lines.fingertip_shape`，但缺少几何层 `FINGERTIP_SHAPE` | VLM 字段不可映射，内部字段仍缺失 | `VLM_OUTPUT_UNMAPPABLE` | 是，仅可对内部低置信字段降级 | 否，降级记录完成且核心字段充足后才可继续 |
| T15 | 连续 5 个字段进入降级，例如多个掌丘和末端分叉均不稳定 | 失败，要求重新上传 | `TOO_MANY_DEGRADED_FIELDS` | 否 | 否 |
| T16 | VLM 分组置信度低，但 33 字段合法，只有 1-2 个低置信字段降级 | 通过但标记降级 | `LOW_CONFIDENCE_OUTPUT` | 是 | 是，但降级字段不得作为主母型核心支撑 |

## 4. 验收标准

3E Schema 测试设计通过条件：

- 覆盖完整合法 JSON。
- 覆盖缺少字段。
- 覆盖多出字段。
- 覆盖字段为字符串。
- 覆盖字段为小数。
- 覆盖字段为负数。
- 覆盖字段超出枚举范围。
- 覆盖 `null` 字段过多。
- 覆盖核心字段缺失。
- 覆盖低置信字段缺失。
- 覆盖 VLM 输出带 Markdown 包裹。
- 覆盖 VLM 输出带解释文字。
- 覆盖 VLM 输出完全不是 JSON。
- 每个样例都明确输入情况、预期校验结果、预期错误码、是否允许降级、是否允许进入后续匹配。
