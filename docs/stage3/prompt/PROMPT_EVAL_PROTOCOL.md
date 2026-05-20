# Palmmi Stage 3E-b Prompt 实测流程

## 1. 目标

本文定义千问 VL Prompt 实测流程，用于验证 Prompt 输出稳定性、JSON 纯净度和 Stage 3E Schema 合规性。

实测阶段只验证 Prompt 输出稳定性，不验证人格结果。

本阶段不做规则引擎，不做母型判断，不做 36 人格匹配。

## 2. 测试规模

| 规模 | 要求 |
|---|---|
| 最低规模 | 10 张图片 |
| 推荐规模 | 20 张图片 |

如果当前项目没有测试图片和 API 配置，只创建测试方案和报告模板，不伪造测试结果。

## 3. 测试图片类型

测试图片至少覆盖：

1. 清晰正面掌心。
2. 轻微模糊掌心。
3. 光线较暗掌心。
4. 过曝掌心。
5. 裁切不完整掌心。
6. 手背。
7. 多只手。
8. 非手掌图片。
9. 截图 / 二维码 / 风景图。
10. 疑似 AI 生成手。

## 4. 单图测试流程

每张图按以下流程执行：

1. 记录 `image_id` 和 `image_category`。
2. 记录 `model_name` 和 `prompt_version`。
3. 使用指定 Prompt 调用千问 VL。
4. 保存原始返回文本。
5. 提取或清洗 JSON。
6. 执行 JSON 可解析性校验。
7. 执行 VLM 原始输出 Schema 校验。
8. 执行字段类型、枚举范围、缺失字段和 `null` 统计。
9. 记录是否需要重试 Prompt 或重新上传图片。
10. 记录是否可进入后续匹配准备层。

## 5. 每张图必须记录的字段

| 字段 | 说明 |
|---|---|
| `image_id` | 测试图片唯一编号 |
| `image_category` | 图片类别 |
| `model_name` | 千问 VL 模型名称 |
| `prompt_version` | Prompt 版本 |
| `raw_output_saved` | 是否保存原始输出 |
| `json_parse_pass` | JSON 是否可解析 |
| `schema_validation_pass` | Schema 是否合规 |
| `missing_field_count` | 缺失字段数量 |
| `enum_out_of_range_count` | 枚举越界数量 |
| `type_mismatch_count` | 类型错误数量 |
| `null_field_count` | `null` 字段数量 |
| `degraded_field_count` | 降级字段数量 |
| `should_retry` | 是否应重试 Prompt |
| `should_reupload` | 是否应重新上传图片 |
| `accepted_for_matching` | 是否可进入后续匹配准备层 |
| `notes` | 人工备注 |

## 6. 指标定义

| 指标 | 计算方式 |
|---|---|
| JSON 可解析率 | `json_parse_pass = true` 的样本数 / 总样本数 |
| Schema 合规率 | `schema_validation_pass = true` 的样本数 / 总样本数 |
| 字段缺失率 | 缺失字段总数 / 应输出字段总数 |
| 枚举越界率 | 枚举越界字段总数 / 应校验字段总数 |
| 类型错误率 | 类型错误字段总数 / 应校验字段总数 |
| null 字段均值 | `null_field_count` 总和 / 总样本数 |
| 降级字段均值 | `degraded_field_count` 总和 / 总样本数 |

## 7. 非手掌与低质量样本要求

非手掌、手背、多只手、截图、二维码、风景图和疑似 AI 生成手样本不得被 Prompt 强行解释成高置信掌纹结果。

这类样本允许：

- 输出同一 JSON 结构。
- 大量掌纹字段为 `null`。
- `image_quality` 显示低质量或主体不可见。
- `confidence` 显示低置信。

这类样本不允许：

- 输出人格。
- 输出母型。
- 输出命运判断。
- 输出健康、婚姻、寿命判断。
- 编造清晰掌纹字段。

## 8. 失败复盘

每轮实测后必须复盘：

- 是否存在 Markdown 包裹。
- 是否存在解释文字。
- 是否存在缺失 key。
- 是否存在字符串数字。
- 是否存在小数或超范围枚举。
- 是否存在人格、母型或命运类输出。
- 是否需要修改 Prompt 措辞。
