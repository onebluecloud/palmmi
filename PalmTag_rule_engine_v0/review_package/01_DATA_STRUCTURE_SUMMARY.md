# 三层数据结构说明

## 总体结构

PalmTag 当前使用三层结构：

```text
字段层 -> 规则层 -> 展示层
```

字段层负责定义 33 个掌纹字段；规则层负责根据字段计算母型、人格和易混分流；展示层负责根据最终 `persona_id` 输出用户可读文案。

## 字段层：33 个掌纹字段

字段层来自 `field_schema_33.json`，当前共有 33 个字段。字段包括：

- 手掌/手指比例：如 `PALM_LENGTH_RATIO`、`THUMB_LENGTH_RATIO`。
- 三大主线：生命线、智慧线、感情线的深度、长度、曲度。
- 特殊纹：如 `SIMIAN_LINE`、`CHUAN_PALM`。
- 复杂度与清晰度：如 `LINE_COMPLEXITY`、`OVERALL_CLARITY`。
- 掌丘字段：如 `MOUNT_VENUS`、`MOUNT_LUNA`。

每个字段包含 key、中文名、取值范围、来源、置信层级、默认值、备注等。

## 规则层

规则层包括：

- 8 个母型：M1-M8。
- 36 个人格：P01-P36。
- 易混人格分流规则：当前 14 条。

规则层输入为完整 33 字段，输出为主母型、副母型、最终人格和完整评分链路。

## 展示层

展示层来自 `display_content.json`，当前包含 P01-P36 的展示文案。主要字段包括：

- `persona_id`
- `persona_code`
- `persona_name`
- `hook`
- `quote`
- `final_judgement`
- `poster_title`
- `poster_subtitle`
- `three_keywords`
- `share_copy`

## 三层如何连接

字段层只提供结构化输入，不包含人格文案。规则层只计算结果，不生成展示话术。展示层只根据 `persona_id` 取文案，不参与规则评分。

## persona_id 作为唯一连接键

`persona_id` 是规则层与展示层之间的唯一连接键。规则引擎输出最终 `persona_id` 后，结果组装器用该 ID 到展示层查找人格名称、钩子、金句和最终判断。

## Excel 主表

评审包 `data/` 下已复制：

- `PalmTag_三层数据总表_V3.xlsx`：当前最终主表。
- `PalmTag_三层数据总表.xlsx`：早期版本，供追溯参考。
