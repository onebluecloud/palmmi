# Vision Compare V0.5 / V0.6 / Manual

| 字段 | V0.5 | V0.6 | 人工基准 | V0.6是否更接近人工 |
|---|---:|---:|---:|---|
| OVERALL_CLARITY | 2.00 | 1.78 | 1.78 | Yes |
| FATE_LINE_CLARITY | 0.11 | 1.00 | 1.44 | Yes |
| HEAD_LINE_DEPTH | 1.56 | 1.78 | 1.78 | Yes |
| HEAD_LINE_LENGTH | 1.56 | 2.00 | 2.33 | Yes |
| LINE_COMPLEXITY | 1.78 | 1.56 | 1.78 | No |
| HEART_LINE_DEPTH | 1.56 | 1.00 | 1.33 | No |

## Distribution Summary

- V0.5 人格分布: {'P12': 4, 'P28': 2, 'P31': 1, 'P06': 2}
- V0.6 人格分布: {'P31': 6, 'P12': 1, 'P06': 2}
- V0.5 母型分布: {'M1': 7, 'M3': 2}
- V0.6 母型分布: {'M1': 9}
- 人工基准跑规则后的母型分布: {'M1': 7, 'M8': 1, 'M3': 1}
- 人工基准跑规则后的人格分布: {'P31': 4, 'P32': 1, 'P06': 2, 'P20': 1, 'P01': 1}
- V0.6 是否仍然 M1 过度集中: Yes (9/9)
- V0.6 是否恢复 M6 / M5 / M7 等非 M1 母型: No

## Notes

- V0.6 should be judged against the manual baseline before touching any rule weights.
- If FATE_LINE_CLARITY remains below manual average, the visual prompt is still too strict on shallow vertical lines.
- If OVERALL_CLARITY remains fixed at 2, the model is still treating photo visibility as palm-line clarity.
