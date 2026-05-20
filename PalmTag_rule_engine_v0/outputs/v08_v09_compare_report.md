# PalmTag V0.8 vs V0.9 Compare Report

## 1. 字段变化

| field | V0.8 avg | V0.9 avg | change |
|---|---:|---:|---:|
| HEAD_LIFE_GAP | 0.0 | 0.11 | 0.11 |
| HEAD_LINE_DEPTH | 2.0 | 1.89 | -0.11 |
| LIFE_LINE_DEPTH | 2.0 | 1.89 | -0.11 |
| FATE_LINE_CLARITY | 1.22 | 1.56 | 0.34 |
| OVERALL_CLARITY | 1.44 | 1.78 | 0.34 |
| LINE_COMPLEXITY | 2.0 | 1.78 | -0.22 |

## 2. 人格变化

| image_file | V0.8 persona | V0.9 persona | 是否变化 | 判断 |
|---|---|---|---|---|
| dayi-left.jpg | P31 | P25 | 是 | P31 default-outlet risk reduced. |
| grand-right.jpg | P20 | P31 | 是 | Changed; needs manual review. |
| hua-left.jpg | P31 | P31 | 否 | No change. |
| kai-left.jpg | P31 | P25 | 是 | P31 default-outlet risk reduced. |
| lan-right.jpg | P29 | P29 | 否 | P29 preserved. |
| qing-left.jpg | P31 | P25 | 是 | P31 default-outlet risk reduced. |
| qing-right.jpg | P32 | P25 | 是 | Changed; needs manual review. |
| zheng-left.jpg | P32 | P32 | 否 | P32 retained; check strong-action support. |
| zheng-right.jpg | P29 | P29 | 否 | P29 preserved. |

## 3. 重点样本检查

### kai-left

- V0.8: M1 / P31 留一手
- V0.9: M1 / P25 老干部
- 变化原因: P31 -> P25; FATE_LINE_CLARITY 1 -> 2; LINE_COMPLEXITY 2 -> 1
- V0.9 key fields: HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, LIFE_LINE_DEPTH=2, FATE_LINE_CLARITY=2, OVERALL_CLARITY=2, LINE_COMPLEXITY=1
- V0.9 persona scores: P01=0, P06=75.0, P12=0, P25=90.0, P31=0

### qing-left

- V0.8: M1 / P31 留一手
- V0.9: M1 / P25 老干部
- 变化原因: P31 -> P25; LINE_COMPLEXITY 2 -> 1
- V0.9 key fields: HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, LIFE_LINE_DEPTH=2, FATE_LINE_CLARITY=1, OVERALL_CLARITY=2, LINE_COMPLEXITY=1
- V0.9 persona scores: P01=0, P06=75.0, P12=0, P25=90.0, P31=60.0

### qing-right

- V0.8: M8 / P32 大招捏手党
- V0.9: M1 / P25 老干部
- 变化原因: P32 -> P25; mother M8 -> M1; OVERALL_CLARITY 1 -> 2
- V0.9 key fields: HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, LIFE_LINE_DEPTH=2, FATE_LINE_CLARITY=2, OVERALL_CLARITY=2, LINE_COMPLEXITY=2
- V0.9 persona scores: P01=0, P06=0, P12=0, P25=0, P31=0

### zheng-left

- V0.8: M8 / P32 大招捏手党
- V0.9: M8 / P32 大招捏手党
- 变化原因: No major persona or key-field change.
- V0.9 key fields: HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, LIFE_LINE_DEPTH=2, FATE_LINE_CLARITY=2, OVERALL_CLARITY=2, LINE_COMPLEXITY=2
- V0.9 persona scores: P08=0, P11=0, P21=0, P23=0, P24=0, P32=74.0

### zheng-right

- V0.8: M7 / P29 多线程玩家
- V0.9: M7 / P29 多线程玩家
- 变化原因: HEAD_LINE_DEPTH 2 -> 1; LIFE_LINE_DEPTH 2 -> 1
- V0.9 key fields: HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=1, LIFE_LINE_DEPTH=1, FATE_LINE_CLARITY=1, OVERALL_CLARITY=1, LINE_COMPLEXITY=2
- V0.9 persona scores: P04=62.0, P10=0, P18=0, P29=84.0
