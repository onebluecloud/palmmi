# 视觉识别说明

## 为什么接入千问视觉 API

PalmTag 的规则引擎需要完整 33 个掌纹字段。真实产品中用户不会手动填写字段，因此需要视觉模型从手掌图片中提取结构化字段。当前使用阿里云百炼千问视觉 OpenAI 兼容接口，便于在国内环境调用。

## 当前默认模型

当前默认模型：

```text
qwen3.6-plus
```

## 为什么最终选择 qwen3.6-plus

多模型对比结果显示：

- `qwen3.6-plus` 33 字段完整率 100%。
- 与人工基准平均偏差 0.22。
- M1 占比从 `qwen-vl-plus` 的 9/9 降到 4/9。
- P06 不再集中。
- 相比 `qwen3-vl-plus` 字段偏差更低。
- 相比 `qwen3.5-flash` 字段完整率更高。

## 多模型对比结果摘要

| Model | 33字段完整率 | 平均偏差 | M1占比 | P06占比 |
|---|---:|---:|---:|---:|
| qwen-vl-plus | 100.0% | 0.22 | 9/9 | 2/9 |
| qwen3-vl-plus | 100.0% | 0.46 | 0/9 | 0/9 |
| qwen3.5-plus | 100.0% | 0.26 | 7/9 | 0/9 |
| qwen3.5-flash | 85.2% | 0.26 | 9/9 | 2/9 |
| qwen3.6-plus | 100.0% | 0.22 | 4/9 | 0/9 |
| qwen3.6-flash | 100.0% | 0.23 | 6/9 | 1/9 |

## 版本演进

- V0.4：接入 qwen-vl-plus，技术链路跑通，但 9 张图全部 M1。
- V0.5：诊断字段偏移，发现清晰度/智慧线深度偏高、复杂度偏低等问题。
- V0.6：引入人工基准，修正 OVERALL_CLARITY 和 FATE_LINE_CLARITY。
- V0.8：锁定 qwen3.6-plus，生成真实结果人工评审包。
- V0.9：继续使用 qwen3.6-plus，修正 HEAD_LIFE_GAP、强线条、FATE_LINE_CLARITY、OVERALL_CLARITY 和 LINE_COMPLEXITY 口径。
- V0.10：Prompt 不变，只修规则边界。

## 当前视觉 Prompt 主要策略

- 只输出 33 字段 JSON，不输出人格或解释。
- 三次识别投票融合。
- 0/1 字段多数投票。
- 0-2/0-3 字段取中位数。
- 多个 null 使用默认值。
- 特殊纹必须至少两次为 1 才最终为 1。
- 掌丘字段不稳定时保守给 1。

## 当前视觉识别风险

- 掌丘字段仍受光照和角度影响大。
- HEAD_LIFE_GAP 对起点分离的判断仍可能不稳定。
- FATE_LINE_CLARITY 容易把浅纵向线误判为 0 或 2。
- LINE_COMPLEXITY 可能受照片清晰度、皮肤纹理和掌心噪点影响。
- 小样本 9 张不足以证明泛化能力。

## Prompt 文件

评审包 `prompts/` 下已复制当前 Prompt 与历史 Prompt：

- `palm_feature_extraction_prompt.md`
- `palm_feature_extraction_prompt_v05.md`
- `palm_feature_extraction_prompt_v06.md`
- `palm_feature_extraction_prompt_v09.md`
