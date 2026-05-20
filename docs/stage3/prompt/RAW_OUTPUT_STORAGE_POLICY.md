# Palmmi Stage 3E-b VLM 原始输出保存策略

## 1. 目标

本文定义 Prompt 实测时如何保存 VLM 原始输出，便于复盘 JSON 纯净度、Schema 合规率、字段缺失率、枚举越界率和类型错误率。

## 2. 建议目录

建议保存目录：

```text
tests/stage3/prompt-eval/raw-outputs/
```

每个样本建议使用独立子目录：

```text
tests/stage3/prompt-eval/raw-outputs/{image_id}/{prompt_version}/
```

## 3. 每次调用保存内容

每次调用保存：

| 文件 | 内容 |
|---|---|
| `raw_response.txt` | 模型原始返回文本 |
| `cleaned_output.json` | 清洗后的 JSON |
| `validation_summary.md` | 校验结果摘要 |
| `error_codes.txt` | 错误码清单 |

## 4. 保存原则

- 不长期保存用户真实原图。
- 测试样本如果来自自己或朋友，需要单独归档，不进入公开仓库。
- 原始输出可以保存用于调试。
- 不保存任何用户身份信息。
- 原始输出中如出现个人信息，应删除样本或做脱敏记录。

## 5. 原始输出命名建议

```text
raw-outputs/
  valid_palm_001/
    prompt_v1_prod_candidate/
      raw_response.txt
      cleaned_output.json
      validation_summary.md
      error_codes.txt
```

## 6. 与测试报告关系

测试报告只引用原始输出路径和指标摘要，不粘贴大段原始输出。

如果原始输出出现非 JSON、解释文字、人格、母型或命运类判断，应在报告中记录错误类型和 Prompt 修改建议。
