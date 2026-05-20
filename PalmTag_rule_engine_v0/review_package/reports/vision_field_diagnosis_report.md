# Vision Field Diagnosis Report

Scope: 27 Qwen pass JSON files and 9 voted final_features from V0.4.

## Key Findings

- HEAD_LINE_DEPTH: pass_avg=1.96, final_avg=2.00, consistency=88.9%, high=No, low=No, unstable=No
- HEAD_LINE_LENGTH: pass_avg=2.11, final_avg=2.11, consistency=100.0%, high=Yes, low=No, unstable=No
- OVERALL_CLARITY: pass_avg=2.00, final_avg=2.00, consistency=100.0%, high=Yes, low=No, unstable=No
- LINE_COMPLEXITY: pass_avg=1.33, final_avg=1.33, consistency=77.8%, high=No, low=No, unstable=No
- FATE_LINE_CLARITY: pass_avg=1.70, final_avg=1.89, consistency=44.4%, high=No, low=No, unstable=Yes
- HEART_LINE_DEPTH: pass_avg=2.00, final_avg=2.00, consistency=100.0%, high=Yes, low=No, unstable=No
- SIMIAN_LINE: pass_avg=0.00, final_avg=0.00, consistency=100.0%, high=No, low=Yes, unstable=No
- CHUAN_PALM: pass_avg=0.00, final_avg=0.00, consistency=100.0%, high=No, low=Yes, unstable=No
- HEAD_LIFE_GAP: pass_avg=1.26, final_avg=1.22, consistency=66.7%, high=No, low=No, unstable=Yes
- MOUNT_JUPITER: pass_avg=1.56, final_avg=1.56, consistency=55.6%, high=Yes, low=No, unstable=Yes
- MOUNT_SATURN: pass_avg=1.41, final_avg=1.33, consistency=55.6%, high=No, low=No, unstable=Yes
- FINGERTIP_SHAPE: pass_avg=1.00, final_avg=1.00, consistency=100.0%, high=No, low=Yes, unstable=No

## Full Field Table

| Field | Pass distribution | Final distribution | Pass avg | Final avg | Median | Nulls | 3-pass consistency | High bias | Low bias | Unstable |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| PALM_LENGTH_RATIO | 2:27 | 2:9 | 2.00 | 2.00 | 2.00 | 0 | 100.0% | Yes | No | No |
| INDEX_RING_RATIO | 1:27 | 1:9 | 1.00 | 1.00 | 1.00 | 0 | 100.0% | No | Yes | No |
| THUMB_LENGTH_RATIO | 2:27 | 2:9 | 2.00 | 2.00 | 2.00 | 0 | 100.0% | Yes | No | No |
| INDEX_LENGTH_RATIO | 1:23, 2:4 | 1:8, 2:1 | 1.15 | 1.11 | 1.00 | 0 | 88.9% | No | No | No |
| PINKY_LENGTH_RATIO | 0:10, 1:17 | 0:3, 1:6 | 0.63 | 0.67 | 1.00 | 0 | 66.7% | No | Yes | Yes |
| FINGER_SPREAD | 1:16, 2:11 | 1:6, 2:3 | 1.41 | 1.33 | 1.00 | 0 | 77.8% | No | No | No |
| HAND_ASPECT_RATIO | 1:16, 2:11 | 1:6, 2:3 | 1.41 | 1.33 | 1.00 | 0 | 55.6% | No | No | Yes |
| OVERALL_PROPORTION_FLAG | 1:27 | 1:9 | 1.00 | 1.00 | 1.00 | 0 | 100.0% | Yes | No | No |
| FINGERTIP_SHAPE | 1:27 | 1:9 | 1.00 | 1.00 | 1.00 | 0 | 100.0% | No | Yes | No |
| LIFE_LINE_DEPTH | 2:27 | 2:9 | 2.00 | 2.00 | 2.00 | 0 | 100.0% | Yes | No | No |
| LIFE_LINE_LENGTH | 2:22, 3:5 | 2:8, 3:1 | 2.19 | 2.11 | 2.00 | 0 | 77.8% | Yes | No | No |
| LIFE_LINE_CURVE | 1:24, 2:3 | 1:8, 2:1 | 1.11 | 1.11 | 1.00 | 0 | 100.0% | No | No | No |
| HEAD_LINE_LENGTH | 2:24, 3:3 | 2:8, 3:1 | 2.11 | 2.11 | 2.00 | 0 | 100.0% | Yes | No | No |
| HEAD_LINE_DEPTH | 1:1, 2:26 | 2:9 | 1.96 | 2.00 | 2.00 | 0 | 88.9% | No | No | No |
| HEAD_LINE_SLOPE | 1:27 | 1:9 | 1.00 | 1.00 | 1.00 | 0 | 100.0% | No | Yes | No |
| HEAD_LIFE_GAP | 1:20, 2:7 | 1:7, 2:2 | 1.26 | 1.22 | 1.00 | 0 | 66.7% | No | No | Yes |
| HEAD_LINE_END_FORK | 0:27 | 0:9 | 0.00 | 0.00 | 0.00 | 0 | 100.0% | No | Yes | No |
| HEART_LINE_DEPTH | 2:27 | 2:9 | 2.00 | 2.00 | 2.00 | 0 | 100.0% | Yes | No | No |
| HEART_LINE_LENGTH | 2:24, 3:3 | 2:8, 3:1 | 2.11 | 2.11 | 2.00 | 0 | 100.0% | Yes | No | No |
| HEART_LINE_CURVE | 1:24, 2:3 | 1:8, 2:1 | 1.11 | 1.11 | 1.00 | 0 | 100.0% | No | No | No |
| HEART_LINE_END_FORK | 0:27 | 0:9 | 0.00 | 0.00 | 0.00 | 0 | 100.0% | No | Yes | No |
| SIMIAN_LINE | 0:27 | 0:9 | 0.00 | 0.00 | 0.00 | 0 | 100.0% | No | Yes | No |
| CHUAN_PALM | 0:27 | 0:9 | 0.00 | 0.00 | 0.00 | 0 | 100.0% | No | Yes | No |
| LINE_COMPLEXITY | 1:18, 2:9 | 1:6, 2:3 | 1.33 | 1.33 | 1.00 | 0 | 77.8% | No | No | No |
| OVERALL_CLARITY | 2:27 | 2:9 | 2.00 | 2.00 | 2.00 | 0 | 100.0% | Yes | No | No |
| FATE_LINE_CLARITY | 0:1, 1:6, 2:20 | 1:1, 2:8 | 1.70 | 1.89 | 2.00 | 0 | 44.4% | No | No | Yes |
| SUN_LINE_PRESENCE | 0:27 | 0:9 | 0.00 | 0.00 | 0.00 | 0 | 100.0% | No | Yes | No |
| MOUNT_VENUS | 1:11, 2:16 | 1:4, 2:5 | 1.59 | 1.56 | 2.00 | 0 | 44.4% | Yes | No | Yes |
| MOUNT_JUPITER | 1:12, 2:15 | 1:4, 2:5 | 1.56 | 1.56 | 2.00 | 0 | 55.6% | Yes | No | Yes |
| MOUNT_SATURN | 1:16, 2:11 | 1:6, 2:3 | 1.41 | 1.33 | 1.00 | 0 | 55.6% | No | No | Yes |
| MOUNT_APOLLO | 0:13, 1:14 | 0:4, 1:5 | 0.52 | 0.56 | 1.00 | 0 | 44.4% | No | No | Yes |
| MOUNT_MERCURY | 1:27 | 1:9 | 1.00 | 1.00 | 1.00 | 0 | 100.0% | No | No | No |
| MOUNT_LUNA | 1:27 | 1:9 | 1.00 | 1.00 | 1.00 | 0 | 100.0% | No | No | No |
