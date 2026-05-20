# Palmmi Stage 3I Distribution Simulation Report

## Scope

- Deterministic 33-field JSON fixtures only.
- No VLM call, no API call, no UI change.
- 3H `matchPersona` / Top3 output is used as-is.
- 3I is diagnostic only; it does not tune weights or force distribution balance.

## Summary

- Total samples: 54
- Zero-hit personas: P27, P26, P29, P04, P32, P24
- Top1/Top2 average gap: 0.1148
- Top1/Top2 min gap: 0
- Top1/Top2 gap < 0.15 count: 33
- Adjacent applied count: 13
- Cross-mother checked count: 54
- Cross-mother applied count: 3

## Mother Distribution

| Mother | Name | Count | Percent |
| --- | --- | --- | --- |
| M1 | 钢线型 | 11 | 20.37% |
| M2 | 暖纹型 | 7 | 12.96% |
| M3 | 密纹型 | 9 | 16.67% |
| M4 | 川字型 | 8 | 14.81% |
| M5 | 贯纹型 | 6 | 11.11% |
| M6 | 轨道型 | 4 | 7.41% |
| M7 | 月相型 | 2 | 3.70% |
| M8 | 复纹型 | 7 | 12.96% |

## Persona Distribution

| Persona | Name | Count | Percent |
| --- | --- | --- | --- |
| P01 | 人生排位赛选手 | 2 | 3.70% |
| P12 | 低调战略家 | 2 | 3.70% |
| P25 | 老干部 | 5 | 9.26% |
| P06 | 混乱过敏体 | 1 | 1.85% |
| P31 | 留一手 | 1 | 1.85% |
| P35 | 情感满仓者 | 5 | 9.26% |
| P14 | 恒温热源 | 1 | 1.85% |
| P27 | 本色出演 | 0 | 0.00% |
| P30 | 温柔排版师 | 1 | 1.85% |
| P02 | 情绪预警机 | 2 | 3.70% |
| P22 | 情绪共振体 | 2 | 3.70% |
| P20 | 深夜复盘脑 | 1 | 1.85% |
| P28 | 感知偏科生 | 4 | 7.41% |
| P09 | 关系分层大师 | 1 | 1.85% |
| P34 | 社交小饭桌 | 2 | 3.70% |
| P33 | 自我闭环怪 | 2 | 3.70% |
| P15 | 情绪自理人 | 1 | 1.85% |
| P17 | 关系试用期 | 2 | 3.70% |
| P05 | 藏进度条型 | 1 | 1.85% |
| P03 | 人生不代驾 | 2 | 3.70% |
| P36 | 自带推进器 | 1 | 1.85% |
| P07 | 压力通电体 | 2 | 3.70% |
| P13 | 慢牛型选手 | 1 | 1.85% |
| P26 | 深根型选手 | 0 | 0.00% |
| P16 | PPT过敏体 | 2 | 3.70% |
| P19 | 低调高光型 | 1 | 1.85% |
| P10 | 先觉者 | 1 | 1.85% |
| P29 | 多线程玩家 | 0 | 0.00% |
| P18 | 情绪缝合怪 | 1 | 1.85% |
| P04 | 已读观望型 | 0 | 0.00% |
| P11 | 双面行者 | 2 | 3.70% |
| P21 | 反差克制系 | 1 | 1.85% |
| P08 | 软钉子 | 2 | 3.70% |
| P32 | 大招捏手党 | 0 | 0.00% |
| P23 | 身份自定义 | 2 | 3.70% |
| P24 | 节奏掌控者 | 0 | 0.00% |

## High Frequency Personas Top 10

| Persona | Count | Percent |
| --- | --- | --- |
| P25 | 5 | 9.26% |
| P35 | 5 | 9.26% |
| P28 | 4 | 7.41% |
| P01 | 2 | 3.70% |
| P02 | 2 | 3.70% |
| P03 | 2 | 3.70% |
| P07 | 2 | 3.70% |
| P08 | 2 | 3.70% |
| P11 | 2 | 3.70% |
| P12 | 2 | 3.70% |

## High Frequency Mothers Top 8

| Mother | Count | Percent |
| --- | --- | --- |
| M1 | 11 | 20.37% |
| M3 | 9 | 16.67% |
| M4 | 8 | 14.81% |
| M2 | 7 | 12.96% |
| M8 | 7 | 12.96% |
| M5 | 6 | 11.11% |
| M6 | 4 | 7.41% |
| M7 | 2 | 3.70% |

## Top3 Coverage

| Persona | Top3 Count | Percent of Samples |
| --- | --- | --- |
| P01 | 3 | 5.56% |
| P12 | 3 | 5.56% |
| P25 | 6 | 11.11% |
| P06 | 1 | 1.85% |
| P31 | 1 | 1.85% |
| P35 | 5 | 9.26% |
| P14 | 3 | 5.56% |
| P27 | 2 | 3.70% |
| P30 | 4 | 7.41% |
| P02 | 18 | 33.33% |
| P22 | 2 | 3.70% |
| P20 | 6 | 11.11% |
| P28 | 9 | 16.67% |
| P09 | 3 | 5.56% |
| P34 | 2 | 3.70% |
| P33 | 6 | 11.11% |
| P15 | 12 | 22.22% |
| P17 | 2 | 3.70% |
| P05 | 6 | 11.11% |
| P03 | 2 | 3.70% |
| P36 | 3 | 5.56% |
| P07 | 3 | 5.56% |
| P13 | 1 | 1.85% |
| P26 | 1 | 1.85% |
| P16 | 10 | 18.52% |
| P19 | 3 | 5.56% |
| P10 | 9 | 16.67% |
| P29 | 4 | 7.41% |
| P18 | 3 | 5.56% |
| P04 | 8 | 14.81% |
| P11 | 4 | 7.41% |
| P21 | 1 | 1.85% |
| P08 | 4 | 7.41% |
| P32 | 0 | 0.00% |
| P23 | 11 | 20.37% |
| P24 | 1 | 1.85% |

## Adjacent Pair Trigger Counts

| Pair | Applied Count |
| --- | --- |
| P01/P12 | 1 |
| P04/P17 | 1 |
| P05/P07 | 0 |
| P02/P22 | 2 |
| P15/P33 | 2 |
| P09/P34 | 1 |
| P14/P35 | 2 |
| P27/P35 | 1 |
| P11/P21 | 1 |
| P25/P33 | 0 |
| P10/P29 | 1 |
| P03/P36 | 1 |

## Per Sample Output

| Sample | Categories | Mother | Persona | Top3 | Gap | Adjacent | Cross |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p01-target.json | persona-target; target:P01; mother-typical:M1 | M1 | P01 | P01:1, P20:0.75, P36:0.75 | 0.25 | no | not_applied |
| p12-target.json | persona-target; target:P12; mother-typical:M1 | M1 | P12 | P12:1, P15:1, P23:1 | 0 | no | not_applied |
| p25-target.json | persona-target; target:P25; mother-typical:M1 | M1 | P25 | P25:1, P33:0.75, P15:0.6667 | 0.25 | no | not_applied |
| p06-target.json | persona-target; target:P06; mother-typical:M1 | M1 | P06 | P06:1, P25:1, P33:0.75 | 0 | no | not_applied |
| p31-target.json | persona-target; target:P31; mother-typical:M1 | M1 | P31 | P31:1, P29:1, P04:0.75 | 0 | no | not_applied |
| p35-target.json | persona-target; target:P35; mother-typical:M2 | M2 | P35 | P35:1, P02:0.6667, P28:0.6667 | 0.3333 | no | applied |
| p14-target.json | persona-target; target:P14; mother-typical:M2 | M2 | P14 | P14:1, P28:0.6667, P04:0.5 | 0.3333 | no | not_applied |
| p27-target.json | persona-target; target:P27; mother-typical:M2 | M3 | P02 | P02:0.6667, P27:1, P11:0.6667 | 0.3333 | no | not_applied |
| p30-target.json | persona-target; target:P30; mother-typical:M2 | M2 | P30 | P30:1, P20:0.75, P02:0.6667 | 0.25 | no | applied |
| p02-target.json | persona-target; target:P02; mother-typical:M3 | M3 | P02 | P02:1, P28:1, P08:0.5 | 0 | no | not_applied |
| p22-target.json | persona-target; target:P22; mother-typical:M3 | M3 | P22 | P22:1, P02:1, P18:0.75 | 0 | P02/P22 | not_applied |
| p20-target.json | persona-target; target:P20; mother-typical:M3 | M3 | P20 | P20:1, P02:0.6667, P23:0.6667 | 0.3333 | no | not_applied |
| p28-target.json | persona-target; target:P28; mother-typical:M3 | M3 | P28 | P28:1, P02:0.6667, P15:0.6667 | 0.3333 | no | not_applied |
| p09-target.json | persona-target; target:P09; mother-typical:M4 | M4 | P09 | P09:1, P15:1, P04:0.75 | 0 | no | not_applied |
| p34-target.json | persona-target; target:P34; mother-typical:M4 | M4 | P34 | P34:1, P15:0.6667, P23:0.6667 | 0.3333 | no | not_applied |
| p33-target.json | persona-target; target:P33; mother-typical:M4 | M4 | P33 | P33:1, P15:1, P23:0.6667 | 0 | P15/P33 | not_applied |
| p15-target.json | persona-target; target:P15; mother-typical:M4 | M4 | P15 | P15:1, P23:0.6667, P28:0.6667 | 0.3333 | no | not_applied |
| p17-target.json | persona-target; target:P17; mother-typical:M4 | M4 | P17 | P17:1, P15:0.6667, P23:0.6667 | 0.3333 | no | not_applied |
| p05-target.json | persona-target; target:P05; mother-typical:M5 | M5 | P05 | P05:1, P16:1, P07:0.75 | 0 | no | not_applied |
| p03-target.json | persona-target; target:P03; mother-typical:M5 | M5 | P03 | P03:1, P05:0.75, P16:0.6667 | 0.25 | no | not_applied |
| p36-target.json | persona-target; target:P36; mother-typical:M5 | M5 | P36 | P36:1, P16:1, P05:0.75 | 0 | no | not_applied |
| p07-target.json | persona-target; target:P07; mother-typical:M5 | M5 | P07 | P07:1, P16:1, P05:0.75 | 0 | no | not_applied |
| p13-target.json | persona-target; target:P13; mother-typical:M6 | M6 | P13 | P13:1, P16:0.6667, P19:0.6667 | 0.3333 | no | not_applied |
| p26-target.json | persona-target; target:P26; mother-typical:M6 | M6 | P16 | P16:1, P26:1, P05:0.75 | 0 | no | not_applied |
| p16-target.json | persona-target; target:P16; mother-typical:M6 | M6 | P16 | P16:1, P08:0.75, P24:0.6667 | 0.25 | no | not_applied |
| p19-target.json | persona-target; target:P19; mother-typical:M6 | M6 | P19 | P19:1, P29:1, P23:0.6667 | 0 | no | not_applied |
| p10-target.json | persona-target; target:P10; mother-typical:M7 | M3 | P28 | P28:1, P10:1, P04:0.75 | 0 | no | not_applied |
| p29-target.json | persona-target; target:P29; mother-typical:M7 | M3 | P28 | P28:0.6667, P29:1, P04:0.75 | 0.3333 | no | not_applied |
| p18-target.json | persona-target; target:P18; mother-typical:M7 | M7 | P18 | P18:1, P30:0.75, P02:0.6667 | 0.25 | no | not_applied |
| p04-target.json | persona-target; target:P04; mother-typical:M7 | M3 | P28 | P28:0.6667, P04:1, P15:0.6667 | 0.3333 | no | not_applied |
| p11-target.json | persona-target; target:P11; mother-typical:M8 | M8 | P11 | P11:1, P02:1, P10:1 | 0 | no | not_applied |
| p21-target.json | persona-target; target:P21; mother-typical:M8 | M8 | P21 | P21:1, P02:1, P10:1 | 0 | no | not_applied |
| p08-target.json | persona-target; target:P08; mother-typical:M8 | M8 | P08 | P08:1, P02:1, P10:1 | 0 | no | not_applied |
| p32-target.json | persona-target; target:P32; mother-typical:M8 | M8 | P23 | P23:1, P04:1, P10:1 | 0 | no | not_applied |
| p23-target.json | persona-target; target:P23; mother-typical:M8 | M8 | P23 | P23:1, P02:1, P10:1 | 0 | no | not_applied |
| p24-target.json | persona-target; target:P24; mother-typical:M8 | M8 | P08 | P08:1, P02:1, P10:1 | 0 | no | not_applied |
| adjacent-p01-p12.json | adjacent-boundary; adjacent:P01/P12 | M1 | P01 | P01:1, P12:1, P16:1 | 0 | P01/P12 | not_applied |
| adjacent-p04-p17.json | adjacent-boundary; adjacent:P04/P17 | M4 | P17 | P17:1, P04:1, P09:0.75 | 0 | P04/P17 | not_applied |
| adjacent-p05-p07.json | adjacent-boundary; adjacent:P05/P07 | M5 | P07 | P07:1, P16:1, P05:0.75 | 0 | no | not_applied |
| adjacent-p02-p22.json | adjacent-boundary; adjacent:P02/P22 | M3 | P22 | P22:1, P02:1, P18:0.75 | 0 | P02/P22 | not_applied |
| adjacent-p15-p33.json | adjacent-boundary; adjacent:P15/P33 | M4 | P33 | P33:1, P15:1, P23:0.6667 | 0 | P15/P33 | not_applied |
| adjacent-p09-p34.json | adjacent-boundary; adjacent:P09/P34 | M4 | P34 | P34:1, P09:1, P15:0.6667 | 0 | P09/P34 | not_applied |
| adjacent-p14-p35.json | adjacent-boundary; adjacent:P14/P35 | M2 | P35 | P35:1, P14:1, P02:0.6667 | 0 | P14/P35 | not_applied |
| adjacent-p27-p35.json | adjacent-boundary; adjacent:P27/P35 | M2 | P35 | P35:1, P27:1, P02:0.6667 | 0 | P27/P35 | not_applied |
| adjacent-p11-p21.json | adjacent-boundary; adjacent:P11/P21 | M8 | P11 | P11:1, P02:1, P10:1 | 0 | P11/P21 | not_applied |
| adjacent-p25-p33.json | adjacent-boundary; adjacent:P25/P33 | M1 | P25 | P25:1, P15:1, P33:1 | 0 | no | not_applied |
| adjacent-p10-p29.json | adjacent-boundary; adjacent:P10/P29 | M7 | P10 | P10:1, P28:1, P29:1 | 0 | P10/P29 | not_applied |
| adjacent-p03-p36.json | adjacent-boundary; adjacent:P03/P36 | M5 | P03 | P03:1, P16:1, P36:1 | 0 | P03/P36 | not_applied |
| cross-mother-should-apply.json | cross-mother | M2 | P35 | P35:1, P20:0.75, P30:0.75 | 0.25 | no | applied |
| cross-mother-no-20-percent.json | cross-mother | M1 | P12 | P12:1, P20:1, P23:1 | 0 | no | not_applied |
| cross-mother-mother-score-too-low.json | cross-mother | M1 | P25 | P25:0.6667, P11:1, P19:1 | 0.3333 | no | not_applied |
| dual-mother-under-15.json | dual-mother | M1 | P25 | P25:1, P20:0.75, P30:0.75 | 0.25 | no | not_applied |
| dual-mother-over-15.json | dual-mother | M1 | P25 | P25:1, P01:0.8, P33:0.75 | 0.2 | no | not_applied |
| dual-mother-low-confidence-boundary.json | dual-mother | M2 | P35 | P35:1, P14:1, P02:0.6667 | 0 | P14/P35 | not_applied |

## Risk List

- WARNING MOTHER_UNDER_5_PERCENT: M7 mother share is 3.70%.
- WARNING PERSONA_ZERO_HIT: P27 has zero final hits.
- WARNING PERSONA_ZERO_HIT: P26 has zero final hits.
- WARNING PERSONA_ZERO_HIT: P29 has zero final hits.
- WARNING PERSONA_ZERO_HIT: P04 has zero final hits.
- WARNING PERSONA_ZERO_HIT: P32 has zero final hits.
- WARNING PERSONA_ZERO_HIT: P24 has zero final hits.
- WARNING MANY_CLOSE_TOP1_TOP2: 33 samples have Top1/Top2 gap < 0.15.
- WARNING ADJACENT_PAIR_ZERO_TRIGGER: P05/P07 did not trigger in final match output; check sample coverage before treating this as a rule issue.
- WARNING ADJACENT_PAIR_ZERO_TRIGGER: P25/P33 did not trigger in final match output; check sample coverage before treating this as a rule issue.

## Notes

- A zero-hit adjacent pair can mean the fixture set does not produce a close score under current discrete rule granularity; it is not automatically a rule bug.
- Warnings are inputs for Stage 3J/3K review. Stage 3I does not change V4.2 scoring or adjacent thresholds.

