# M1 Concentration Diagnosis

- Primary mother distribution: {'M1': 9}
- Persona distribution: {'P31': 1, 'P12': 1, 'P01': 1, 'P06': 6}
- M1 average score: 78.78

## Mother Score Averages

| Mother | Average score | Gap vs M1 |
|---|---:|---:|
| M1 | 78.78 | 0.00 |
| M2 | 62.44 | 16.33 |
| M3 | 47.00 | 31.78 |
| M4 | 27.22 | 51.56 |
| M5 | 39.22 | 39.56 |
| M6 | 54.00 | 24.78 |
| M7 | 38.00 | 40.78 |
| M8 | 0.00 | 78.78 |

## Fields Pushing Samples Toward M1

| Field | Hit count | Average M1 contribution | V0.4 field pattern |
|---|---:|---:|---|
| HEAD_LINE_DEPTH | 9 | 24.00 | avg=1.96, dist=1:1, 2:26 |
| HEAD_LINE_LENGTH | 9 | 21.11 | avg=2.11, dist=2:24, 3:3 |
| OVERALL_CLARITY | 9 | 16.00 | avg=2.00, dist=2:27 |
| MOUNT_JUPITER | 9 | 9.33 | avg=1.56, dist=1:12, 2:15 |
| LINE_COMPLEXITY | 9 | 8.33 | avg=1.33, dist=1:18, 2:9 |

## Why M2-M8 Did Not Beat M1

- M1 is consistently supported by HEAD_LINE_DEPTH, HEAD_LINE_LENGTH and OVERALL_CLARITY.
- M2 also scores well through HEART_LINE_DEPTH/HEART_LINE_LENGTH, but it usually trails M1 after voting.
- M3 competes when LINE_COMPLEXITY is 2, but V0.4 often votes LINE_COMPLEXITY to 1, weakening dense-line profiles.
- M4/M5 require strong CHUAN_PALM or SIMIAN_LINE signals; V0.4 returned both as 0 in this batch.
- M6 depends on FATE_LINE_CLARITY and SUN_LINE_PRESENCE; SUN_LINE_PRESENCE is mostly 0.
- M7 needs HEAD_LINE_SLOPE and LINE_COMPLEXITY together; slope and complexity are not high enough to overtake M1.
- M8 needs compound/strong mixed signals; V0.4 did not produce those triggers.

## Why P06 Dominated

- P06 count: 6/9
- Average M1 candidate scores in P06 samples: P01=0.0, P06=75.0, P12=12.5, P25=68.0, P31=0.0
- P06 matched fields most often: OVERALL_CLARITY x6, LINE_COMPLEXITY x6, HEAD_LINE_DEPTH x6, FINGERTIP_SHAPE x6, MOUNT_SATURN x6

## Visual Scale Shift Judgement

- OVERALL_CLARITY high? Yes (avg=2.00).
- LINE_COMPLEXITY low? No (avg=1.33).
- HEAD_LINE_DEPTH high? No (avg=1.96).
- FATE_LINE_CLARITY high? No; unstable? Yes (avg=1.70).
- MOUNT_JUPITER unstable? Yes; MOUNT_SATURN unstable? Yes.

Conclusion: V0.4 likely has a visual scale bias toward clear/deep head-line features and insufficiently strict scoring for high clarity/depth labels. Prompt calibration should happen before any rule weight changes.
