# Manual Baseline Compare V0.5

| 字段 | V0.5 平均值 | 人工平均值 | 偏差 | 判断 |
|---|---:|---:|---:|---|
| HEAD_LINE_DEPTH | 1.56 | 1.78 | -0.22 | 接近人工 |
| HEAD_LINE_LENGTH | 1.56 | 2.33 | -0.78 | 偏低 |
| OVERALL_CLARITY | 2.00 | 1.78 | 0.22 | 接近人工 |
| LINE_COMPLEXITY | 1.78 | 1.78 | 0.00 | 接近人工 |
| FATE_LINE_CLARITY | 0.11 | 1.44 | -1.33 | 偏低 |
| HEART_LINE_DEPTH | 1.56 | 1.33 | 0.22 | 接近人工 |
| LIFE_LINE_DEPTH | 2.00 | 2.11 | -0.11 | 接近人工 |
| LIFE_LINE_LENGTH | 2.00 | 2.56 | -0.56 | 偏低 |
| HEAD_LINE_SLOPE | 1.00 | 1.44 | -0.44 | 偏低 |
| SIMIAN_LINE | 0.00 | 0.00 | 0.00 | 接近人工 |
| CHUAN_PALM | 0.00 | 0.00 | 0.00 | 接近人工 |

## Diagnosis

- OVERALL_CLARITY in V0.5 stays fixed at 2 and is above the manual average when image quality is not uniformly high.
- FATE_LINE_CLARITY is much lower than manual baseline, so V0.5 over-corrected this field.
- LINE_COMPLEXITY is close to manual baseline and should keep the V0.5 counting logic.
- HEAD_LINE_LENGTH being high is supported by manual baseline and should not be forced down.
