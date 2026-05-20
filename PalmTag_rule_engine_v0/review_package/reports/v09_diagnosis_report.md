# PalmTag V0.9 Diagnosis Report

## 1. P31 是否过宽

- V0.8 中 P31 命中 4/9。
- P31 主要依赖 HEAD_LINE_LENGTH>=2、HEAD_LINE_DEPTH>=2、FATE_LINE_CLARITY<=1；当 HEAD_LIFE_GAP 全部为 0 时，P12 失去入口，P31 容易成为 M1 默认出口。

| sample | persona | mother | key features | P31 matched rules | M1 candidates |
|---|---|---|---|---|---|
| dayi-left | P31 | M1 | HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, HEAD_LINE_LENGTH=2, LIFE_LINE_DEPTH=2, LIFE_LINE_LENGTH=2, FATE_LINE_CLARITY=1, OVERALL_CLARITY=2, LINE_COMPLEXITY=2, THUMB_LENGTH_RATIO=2, CHUAN_PALM=0, SIMIAN_LINE=0 | HEAD_LINE_LENGTH >= 2 (value=2, weight=25); HEAD_LINE_DEPTH >= 2 (value=2, weight=20); FATE_LINE_CLARITY <= 1 (value=1, weight=15); THUMB_LENGTH_RATIO >= 1 (value=2, weight=10) | P01=58.0, P06=0, P12=0, P25=0, P31=70.0 |
| hua-left | P31 | M1 | HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, HEAD_LINE_LENGTH=2, LIFE_LINE_DEPTH=2, LIFE_LINE_LENGTH=2, FATE_LINE_CLARITY=1, OVERALL_CLARITY=1, LINE_COMPLEXITY=1, THUMB_LENGTH_RATIO=1, CHUAN_PALM=0, SIMIAN_LINE=0 | HEAD_LINE_LENGTH >= 2 (value=2, weight=25); HEAD_LINE_DEPTH >= 2 (value=2, weight=20); FATE_LINE_CLARITY <= 1 (value=1, weight=15); THUMB_LENGTH_RATIO >= 1 (value=1, weight=10); FINGER_SPREAD <= 1 (value=1, weight=5) | P01=58.0, P06=0, P12=0, P25=0, P31=75.0 |
| kai-left | P31 | M1 | HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, HEAD_LINE_LENGTH=2, LIFE_LINE_DEPTH=2, LIFE_LINE_LENGTH=2, FATE_LINE_CLARITY=1, OVERALL_CLARITY=2, LINE_COMPLEXITY=2, THUMB_LENGTH_RATIO=1, CHUAN_PALM=0, SIMIAN_LINE=0 | HEAD_LINE_LENGTH >= 2 (value=2, weight=25); HEAD_LINE_DEPTH >= 2 (value=2, weight=20); FATE_LINE_CLARITY <= 1 (value=1, weight=15); THUMB_LENGTH_RATIO >= 1 (value=1, weight=10); FINGER_SPREAD <= 1 (value=0, weight=5) | P01=0, P06=0, P12=0, P25=0, P31=75.0 |
| qing-left | P31 | M1 | HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, HEAD_LINE_LENGTH=2, LIFE_LINE_DEPTH=2, LIFE_LINE_LENGTH=2, FATE_LINE_CLARITY=1, OVERALL_CLARITY=2, LINE_COMPLEXITY=2, THUMB_LENGTH_RATIO=1, CHUAN_PALM=0, SIMIAN_LINE=0 | HEAD_LINE_LENGTH >= 2 (value=2, weight=25); HEAD_LINE_DEPTH >= 2 (value=2, weight=20); FATE_LINE_CLARITY <= 1 (value=1, weight=15); THUMB_LENGTH_RATIO >= 1 (value=1, weight=10) | P01=0, P06=0, P12=0, P25=0, P31=70.0 |

结论：P31 在 V0.8 中不是随机集中，而是由 M1 候选内 P25/P12 经常因 LINE_COMPLEXITY 或 HEAD_LIFE_GAP 未过 required 条件被清零后胜出。kai-left、qing-left 属于需要 V0.9 重点复查的 P31 风险样本。

## 2. P32 / M8 是否过宽

- V0.8 中 P32 命中 2/9。
- qing-right 与 zheng-left 都是 M8 主母型；M8 主要来自多个母型分数同时超过 60，而不是单个 HEAD_LINE_END_FORK。

| sample | persona | mother scores | key features | P32 matched rules | M8 candidates |
|---|---|---|---|---|---|
| qing-right | P32 | M1=63.0, M2=62.0, M3=57.0, M4=10.0, M5=32.0, M6=61.0, M7=66.0, M8=80.0 | HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, HEAD_LINE_LENGTH=2, LIFE_LINE_DEPTH=2, LIFE_LINE_LENGTH=2, FATE_LINE_CLARITY=2, OVERALL_CLARITY=1, LINE_COMPLEXITY=2, THUMB_LENGTH_RATIO=1, CHUAN_PALM=0, SIMIAN_LINE=0 | LIFE_LINE_DEPTH >= 2 (value=2, weight=25); LIFE_LINE_LENGTH <= 2 (value=2, weight=20); HEAD_LINE_DEPTH >= 2 (value=2, weight=10) | P08=0, P11=0, P21=0, P23=0, P24=0, P32=0 |
| zheng-left | P32 | M1=71.0, M2=70.0, M3=57.0, M4=10.0, M5=32.0, M6=67.0, M7=66.0, M8=80.0 | HEAD_LIFE_GAP=0, HEAD_LINE_DEPTH=2, HEAD_LINE_LENGTH=2, LIFE_LINE_DEPTH=2, LIFE_LINE_LENGTH=2, FATE_LINE_CLARITY=2, OVERALL_CLARITY=2, LINE_COMPLEXITY=2, THUMB_LENGTH_RATIO=1, CHUAN_PALM=0, SIMIAN_LINE=0 | LIFE_LINE_DEPTH >= 2 (value=2, weight=25); LIFE_LINE_LENGTH <= 2 (value=2, weight=20); HEAD_LINE_DEPTH >= 2 (value=2, weight=10) | P08=0, P11=0, P21=0, P23=0, P24=0, P32=0 |

结论：P32 的风险点是 M8 入口较宽，且旧规则中 P32 即使 THUMB_LENGTH_RATIO 未满足，也可能因为 M8 候选整体弱而被 raw score 兜底选中。V0.9 需要给 P32 增加强行动字段组合支撑。

## 3. HEAD_LIFE_GAP 是否长期偏低

- HEAD_LIFE_GAP 分布：{0: 9}
- V0.8 的 27 次 pass 和 9 个 final_features 均显示 HEAD_LIFE_GAP 长期为 0，说明 Prompt 对智慧线/生命线起点分离过度保守。

## 4. 强线条是否被压成中档

| field | average | distribution | diagnosis |
|---|---:|---|---|
| HEAD_LINE_DEPTH | 2.0 | {2: 9} | 存在中档集中 |
| LIFE_LINE_DEPTH | 2.0 | {2: 9} | 存在中档集中 |
| FATE_LINE_CLARITY | 1.22 | {1: 7, 2: 2} | 未见明显 2 档锁死 |
| OVERALL_CLARITY | 1.44 | {2: 4, 1: 5} | 存在中档集中 |

## 5. V0.9 修正方向

- Prompt：明确 HEAD_LIFE_GAP 只要可见空隙至少给 1；强主线允许给 3；FATE_LINE_CLARITY 不把浅但可见的纵向线压成 0；OVERALL_CLARITY 区分照片清晰与主线系统清晰。
- 规则：P31 增加 CHUAN_PALM=0、SIMIAN_LINE=0、LINE_COMPLEXITY<=2 边界，并降低泛化加分；P25 增加稳定低噪声出口；P32 增加强行动组合支撑；M8 入口从 3 个强母型收紧到 4 个强母型。
