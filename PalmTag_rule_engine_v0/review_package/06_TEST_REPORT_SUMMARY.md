# 最终测试报告汇总

## 最新 pytest

最新测试：

```text
pytest -q
51 passed
```

## 随机 JSON 测试

V0.2 随机测试：

- 样本数：1000。
- 8 母型均命中。
- P01-P36 均可命中。
- 无无法输出人格样本。
- 无主母型核心支撑不足样本。
- 无 display_content 缺失。
- M8 占比 15.9%。
- M7 占比 6.2%。

## 多模型对比

推荐模型：`qwen3.6-plus`。

核心指标：

- 33 字段完整率 100%。
- 平均人工基准偏差 0.22。
- M1 占比 4/9。
- P06 占比 0/9。

## qwen3.6-plus 真实图片测试

V0.10：

- 图片数：9。
- pass 数：27。
- API 失败：0。
- JSON 解析失败：0。
- 每次 pass 字段完整：33/33。

## V0.8 / V0.9 / V0.10 人格变化

| image_file | V0.8 | V0.9 | V0.10 |
|---|---|---|---|
| dayi-left | P31 | P25 | P31 |
| grand-right | P20 | P31 | P20 |
| hua-left | P31 | P31 | P31 |
| kai-left | P31 | P25 | P25 |
| lan-right | P29 | P29 | P29 |
| qing-left | P31 | P25 | P25 |
| qing-right | P32 | P25 | P25 |
| zheng-left | P32 | P32 | P32 |
| zheng-right | P29 | P29 | P29 |

## 当前 9 张图最终输出

| image_file | final persona |
|---|---|
| dayi-left | P31 留一手 |
| grand-right | P20 深夜复盘脑 |
| hua-left | P31 留一手 |
| kai-left | P25 |
| lan-right | P29 多线程玩家 |
| qing-left | P25 |
| qing-right | P25 |
| zheng-left | P32 大招捏手党 |
| zheng-right | P29 多线程玩家 |

## 当前仍需人工确认的问题

- 9 张图样本量太小，不足以评估泛化。
- P25/P31 边界仍需更多真实样本验证。
- P20 的 M1 边界入口是极小补丁，需要观察是否会误吸高复杂样本。
- 掌丘字段和 HEAD_LIFE_GAP 仍需人工复核。
- 下一阶段建议扩大真实手掌样本，并引入用户主观反馈。

## 已复制报告

评审包 `reports/` 下已复制：

- `outputs/*.md`
- `outputs/model_compare/`
- `outputs/human_review/`
- `outputs/qwen_real_image_batch*`
