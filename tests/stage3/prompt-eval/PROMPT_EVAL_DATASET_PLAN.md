# Palmmi Stage 3E-b Prompt 实测数据集计划

## 1. 目标

本文设计 10-20 张测试图片的数据集结构，用于千问 VL Prompt 实测。

如果当前项目没有测试图片，只创建计划文档，不伪造测试结果。

## 2. 推荐目录结构

```text
tests/stage3/prompt-eval/
  images/
    valid_palm/
    low_quality/
    non_palm/
    back_of_hand/
    multiple_hands/
    ai_generated_or_suspect/
  raw-outputs/
  reports/
```

## 3. 推荐样本数量

### 10 张最低样本

| 类别 | 数量 | 说明 |
|---|---:|---|
| `valid_palm` | 2 | 清晰正面掌心 |
| `low_quality` | 3 | 轻微模糊、光线较暗、过曝或裁切不完整 |
| `non_palm` | 2 | 非手掌、截图、二维码或风景图 |
| `back_of_hand` | 1 | 手背 |
| `multiple_hands` | 1 | 多只手 |
| `ai_generated_or_suspect` | 1 | 疑似 AI 生成手 |
| 合计 | 10 | 最低实测规模 |

### 20 张推荐样本

| 类别 | 数量 | 说明 |
|---|---:|---|
| `valid_palm` | 5 | 清晰正面掌心，尽量覆盖不同手型和肤色 |
| `low_quality` | 5 | 模糊、低光、过曝、裁切、反光 |
| `non_palm` | 4 | 非手掌、截图、二维码、风景图 |
| `back_of_hand` | 2 | 手背 |
| `multiple_hands` | 2 | 多只手 |
| `ai_generated_or_suspect` | 2 | 疑似 AI 生成手 |
| 合计 | 20 | 推荐实测规模 |

## 4. 命名规范

文件命名使用小写英文、类别前缀和三位编号：

```text
valid_palm_001.jpg
valid_palm_002.jpg
low_light_001.jpg
blurry_001.jpg
overexposed_001.jpg
cropped_palm_001.jpg
non_palm_001.jpg
back_of_hand_001.jpg
multiple_hands_001.jpg
ai_suspect_hand_001.jpg
```

## 5. 样本来源要求

- 优先使用专门采集的测试样本。
- 不长期保存用户真实原图。
- 自己或朋友提供的样本应单独归档，不进入公开仓库。
- 不保存任何用户身份信息。
- 不伪造测试图片。
- 不伪造测试结果。

## 6. 数据集状态记录

每次实测前应记录：

| 记录项 | 说明 |
|---|---|
| 数据集批次 | 例如 `prompt_eval_batch_001` |
| 样本总数 | 10 或 20 |
| 图片类别覆盖 | 是否覆盖 10 类要求 |
| 是否包含真实用户图 | 是 / 否 |
| 是否可进入公开仓库 | 是 / 否 |
| 备注 | 样本限制或风险 |
