# Vision Compare V0.4 vs V0.5

| 指标 | V0.4 | V0.5 | 是否改善 |
|---|---:|---:|---|
| M1 占比 | 9/9 | 7/9 | Yes |
| P06 占比 | 6/9 | 2/9 | Yes |
| HEAD_LINE_DEPTH 平均值 | 2.00 | 1.56 | Yes |
| HEAD_LINE_LENGTH 平均值 | 2.11 | 1.56 | Yes |
| OVERALL_CLARITY 平均值 | 2.00 | 2.00 | No |
| LINE_COMPLEXITY 平均值 | 1.33 | 1.78 | Yes |
| FATE_LINE_CLARITY 平均值 | 1.89 | 0.11 | Yes |
| 三次识别一致率 | 86.2% | 88.6% | Yes |
| 低置信字段数量 | 0.00 | 0.00 | Yes |

## Run Health

- V0.5 API failed images: 0
- V0.5 JSON parse failures: 0
- V0.5 every pass kept 33/33 fields: Yes

## V0.5 Persona Distribution

- Primary mothers: {'M1': 7, 'M3': 2}
- Personas: {'P12': 4, 'P28': 2, 'P31': 1, 'P06': 2}

## Remaining Issues

- M1 concentration improved but still remains high; V0.5 is a calibration improvement, not a final visual standard.
- OVERALL_CLARITY did not move and still needs a stricter image-quality versus palm-line-quality distinction.
- FATE_LINE_CLARITY dropped sharply; this may be an over-correction and should be checked manually on real images.
- LINE_COMPLEXITY improved and is the main reason P06 concentration dropped.
- Do not change rule weights yet; the next step should compare V0.5 extracted fields against human-labelled fields for the same 9 images.
