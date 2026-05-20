# Palmmi Stage 3G 相邻人格区分规则规范

## 1. 目标

本文转写 V4.2 §7.1 / §7.2 的 12 对相邻人格区分规则。

相邻人格规则只在候选人格得分接近时启用。

边界判断设定必须保留 `threshold = 0.15`。

## 2. 触发条件

```text
if abs(score(persona_a) - score(persona_b)) < 0.15:
    apply adjacent resolver
else:
    use higher score persona
```

## 3. 12 对相邻人格规则

| # | persona_a | persona_b | core_difference | resolver_fields | resolver_condition | selected_persona |
|---:|---|---|---|---|---|---|
| 1 | P01 人生排位赛选手 | P12 低调战略家 | 主动操控 vs 低调规划 | `MOUNT_JUPITER` | `MOUNT_JUPITER >= 1` | true -> P01；false -> P12 |
| 2 | P04 已读观望型 | P17 关系试用期 | 默认观察 vs 主动筛选 | `INDEX_LENGTH_RATIO` | `INDEX_LENGTH_RATIO >= 2` | true -> P17；false -> P04 |
| 3 | P05 藏进度条型 | P07 压力通电体 | 蓄能爆发 vs 持续高功能 | `LIFE_LINE_DEPTH` | `LIFE_LINE_DEPTH >= 3` | true -> P07；false -> P05 |
| 4 | P02 情绪预警机 | P22 情绪共振体 | 感知不卷入 vs 感知 + 卷入 | `HEART_LINE_DEPTH` | `HEART_LINE_DEPTH >= 3` | true -> P22；false -> P02 |
| 5 | P15 情绪自理人 | P33 自我闭环怪 | 情绪自治 vs 整体自洽 | `LINE_COMPLEXITY`, `OVERALL_CLARITY` | `LINE_COMPLEXITY <= 1 and OVERALL_CLARITY >= 2` | true -> P33；false -> P15 |
| 6 | P09 关系分层大师 | P34 社交小饭桌 | 关注边界 vs 关注深度 | `HEART_LINE_DEPTH` | `HEART_LINE_DEPTH >= 2` | true -> P34；false -> P09 |
| 7 | P14 恒温热源 | P35 情感满仓者 | 稳定优先 vs 真实优先 | `INDEX_LENGTH_RATIO` | `INDEX_LENGTH_RATIO >= 2` | true -> P35；false -> P14 |
| 8 | P27 本色出演 | P35 情感满仓者 | 温度均匀 vs 强度强烈 | `HEART_LINE_DEPTH`, `INDEX_LENGTH_RATIO` | `HEART_LINE_DEPTH >= 3 and INDEX_LENGTH_RATIO >= 2` | true -> P35；false -> P27 |
| 9 | P11 双面行者 | P21 反差克制系 | 横向并存 vs 表里反差 | `HEAD_LINE_END_FORK` | `HEAD_LINE_END_FORK == 1` | true -> P11；false -> P21 |
| 10 | P25 老干部 | P33 自我闭环怪 | 降噪稳定 vs 闭环稳定 | `CHUAN_PALM` | `CHUAN_PALM == 1` | true -> P33；false -> P25 |
| 11 | P10 先觉者 | P29 多线程玩家 | 直觉先于推导 vs 推导先于判断 | `MOUNT_LUNA`, `HEAD_LINE_SLOPE` | `MOUNT_LUNA >= 1 and HEAD_LINE_SLOPE >= 2` | true -> P10；false -> P29 |
| 12 | P03 人生不代驾 | P36 自带推进器 | 隐性主导场域 vs 自驱推进 | `MOUNT_JUPITER`, `INDEX_LENGTH_RATIO` | `MOUNT_JUPITER >= 1 and INDEX_LENGTH_RATIO >= 2` | true -> P03；false -> P36 |

## 4. 工程边界

- 相邻规则只用于候选人格分数接近时。
- 相邻规则不能绕过主母型候选池。
- 相邻规则不能绕过 Stage 3E Schema 校验。
- 相邻规则只使用 V4.2 33 字段表内字段。
- 3G 不实现相邻规则代码，只冻结规则表。
