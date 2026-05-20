# PalmTag V0.10 Boundary Diagnosis

## 1. dayi-left 为什么被 P25 吃掉

- V0.9 输出：P25 老干部
- P25 final/raw/failed：0 / 62.0 / ['LINE_COMPLEXITY']
- P31 final/raw/failed：0 / 41.0 / ['FATE_LINE_CLARITY']
- raw 差距：21.0
- P25 命中字段：OVERALL_CLARITY >= 2 (value=2, weight=32); HEAD_LINE_DEPTH >= 2 (value=2, weight=20); CHUAN_PALM == 0 (value=0, weight=5); SIMIAN_LINE == 0 (value=0, weight=5)
- P31 命中字段：HEAD_LINE_LENGTH >= 2 (value=2, weight=22); HEAD_LINE_DEPTH >= 2 (value=2, weight=18); THUMB_LENGTH_RATIO >= 1 (value=1, weight=4); FINGER_SPREAD <= 1 (value=1, weight=3); LINE_COMPLEXITY <= 2 (value=2, weight=6); CHUAN_PALM == 0 (value=0, weight=3); SIMIAN_LINE == 0 (value=0, weight=3); FATE_LINE_CLARITY >= 2 (value=2, weight=-18)

判断：dayi-left 的 P25 并不是完整过线，P25 因 LINE_COMPLEXITY=2 required 失败；P31 因 FATE_LINE_CLARITY=2 required 失败。所有 M1 候选失败后，旧兜底按 raw score 选择 P25。V0.10 需要让 HEAD_LIFE_GAP>=1 成为 P31 的“留后手/观察”支撑，避免被 P25 raw score 误吞。

## 2. grand-right 为什么从 P20 掉到 P31

- V0.9 输出：P31 留一手
- M1 分数：81.0
- M3 分数：57.0
- P31 final/raw/failed：60.0 / 60.0 / []
- P20 final/raw/failed：None / None / []
- LINE_COMPLEXITY：2
- HEART_LINE_DEPTH：2
- HEAD_LINE_DEPTH：2
- OVERALL_CLARITY：2

判断：grand-right 的核心字段是 HEAD_LINE_DEPTH>=2、HEAD_LINE_LENGTH=3、HEART_LINE_DEPTH>=2、HEART_LINE_LENGTH=3、LINE_COMPLEXITY>=2。V0.9 中 primary_mother 为 M1，P20 只在 M3 下，导致 P20 没进入候选。V0.10 需要给 P20 一个极窄的 M1 高复盘入口，并增加 P20/P31 分流规则。
