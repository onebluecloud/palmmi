# 人工标注与人工判断说明

## 为什么做人工基准标注

V0.4/V0.5 真实图片测试发现视觉模型输出高度集中，不能直接判断是规则问题还是视觉字段偏移。因此引入 9 张真实手掌图片的人工基准标注，用来校准视觉模型字段尺度。

## 9 张真实手掌图的人工标注

人工基准文件为：

```text
manual_baseline/PalmTag_manual_annotations_v01.json
```

关键人工均值包括：

| 字段 | 人工均值 | 说明 |
|---|---:|---|
| HEAD_LINE_DEPTH | 1.78 | 不应普遍打到 2 以上 |
| HEAD_LINE_LENGTH | 2.33 | 智慧线长度整体偏长，可以保留 |
| OVERALL_CLARITY | 1.78 | 不能默认给 2 |
| LINE_COMPLEXITY | 1.78 | V0.5 后方向基本正确 |
| FATE_LINE_CLARITY | 1.44 | V0.5 曾压得过低 |
| HEART_LINE_DEPTH | 1.33 | 多数不是深感情线 |

## GPT 对 9 张图的人工判断

V0.8 基于 qwen3.6-plus 生成了人工评审包。V0.9 进一步修正 Prompt 和边界。V0.10 根据人工判断做极小边界修正。

## 5 张争议图的最终人工目标

重点争议样本：

- `dayi-left`：应为 P31，而不是 P25。
- `grand-right`：应为 P20，而不是 P31。
- `kai-left`：应保持 P25。
- `qing-right`：应保持 P25。
- `zheng-left`：应保持 P32。

## V0.9 到 V0.10 的修正目标

V0.10 人工定稿目标：

| image_file | 目标人格 |
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

## 当前人工认为较可信的结果

V0.10 已全部达成人工目标。仍需注意：这是 9 张图的小样本人工校准结果，不能代表大规模泛化准确性。下一阶段应扩大真实手掌样本，并引入用户主观反馈。

## 人工复评包

评审包 `human_review/` 下已复制 V0.8、V0.9、V0.10 人工评审包。
