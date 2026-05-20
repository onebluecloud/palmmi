# Palmmi Stage 3E-b Prompt 实测记录模板

## 1. 使用方式

本模板用于人工或半自动记录千问 VL Prompt 实测结果。

不要填写假数据。只有真实执行测试后，才在表格中追加记录。

## 2. decision 枚举

| decision | 含义 |
|---|---|
| `PASS` | 输出可接受，可进入后续匹配准备层 |
| `RETRY_PROMPT` | Prompt 需要调整或重试 |
| `RETRY_IMAGE` | 图片质量或类型导致需要重新上传 |
| `REJECT` | 样本应拒绝，不进入后续识别 |
| `NEED_SCHEMA_REVIEW` | Schema 或映射规则需要人工复核 |

## 3. 记录表

| image_id | image_path | image_category | model_name | prompt_version | raw_output_path | parse_result | schema_result | missing_fields | enum_errors | type_errors | null_count | degraded_count | decision | notes |
|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 4. 字段说明

| 字段 | 说明 |
|---|---|
| `image_id` | 测试图片唯一编号 |
| `image_path` | 测试图片相对路径 |
| `image_category` | 图片类别 |
| `model_name` | 千问 VL 模型名称 |
| `prompt_version` | Prompt 版本 |
| `raw_output_path` | 原始输出保存路径 |
| `parse_result` | JSON 解析结果 |
| `schema_result` | Schema 校验结果 |
| `missing_fields` | 缺失字段数量或字段清单 |
| `enum_errors` | 枚举错误数量 |
| `type_errors` | 类型错误数量 |
| `null_count` | `null` 字段数量 |
| `degraded_count` | 降级字段数量 |
| `decision` | `PASS` / `RETRY_PROMPT` / `RETRY_IMAGE` / `REJECT` / `NEED_SCHEMA_REVIEW` |
| `notes` | 人工备注 |
