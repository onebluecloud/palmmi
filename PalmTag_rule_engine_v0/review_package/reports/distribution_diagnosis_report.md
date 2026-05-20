# Distribution Diagnosis Report

## P25 归因

- P25 出现在 M1 候选集次数: 166
- P25 经常输给: {'P01': 84, 'P06': 47, 'P31': 20, 'P12': 15}
- P25 排名分布: {2: 19, 3: 18, 4: 98, 5: 31}
- P25 平均落后 Top1 分数: 27.35
- P25 当前规则:
  - {'persona_id': 'P25', 'persona_name': '老干部', 'mother_id': 'M1', 'field_key': 'OVERALL_CLARITY', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P25', 'persona_name': '老干部', 'mother_id': 'M1', 'field_key': 'LINE_COMPLEXITY', 'operator': '<=', 'threshold': 1, 'weight': 20, 'is_required': True, 'notes': None}
  - {'persona_id': 'P25', 'persona_name': '老干部', 'mother_id': 'M1', 'field_key': 'HEAD_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 15, 'is_required': True, 'notes': None}

## P29 归因

- P29 出现在 M7 候选集次数: 43
- P29 经常输给: {'P10': 28, 'P04': 11, 'P18': 4}
- P29 排名分布: {2: 3, 4: 40}
- P29 平均落后 Top1 分数: 44.65
- P29 当前规则:
  - {'persona_id': 'P29', 'persona_name': '多线程玩家', 'mother_id': 'M7', 'field_key': 'HEAD_LINE_LENGTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P29', 'persona_name': '多线程玩家', 'mother_id': 'M7', 'field_key': 'LINE_COMPLEXITY', 'operator': '>=', 'threshold': 2, 'weight': 20, 'is_required': True, 'notes': None}
  - {'persona_id': 'P29', 'persona_name': '多线程玩家', 'mother_id': 'M7', 'field_key': 'THUMB_LENGTH_RATIO', 'operator': '>=', 'threshold': 1, 'weight': 15, 'is_required': True, 'notes': 'Blank Excel condition normalized to >= 1.'}

## M8 归因

- M8 命中数: 262
- M8 主要字段组合 Top 10:
  - 38: ('CHUAN_PALM', 'CHUAN_PALM & HEART_LINE_DEPTH', 'HEAD_LINE_DEPTH', 'HEART_LINE_DEPTH', '[OTHER_M_SCORES>=60]')
  - 25: ('CHUAN_PALM & HEART_LINE_DEPTH', 'FATE_LINE_CLARITY', 'HEART_LINE_DEPTH', 'HEART_LINE_LENGTH', 'THUMB_LENGTH_RATIO', '[OTHER_M_SCORES>=60]')
  - 19: ('CHUAN_PALM', 'CHUAN_PALM & HEART_LINE_DEPTH', 'HEAD_LINE_DEPTH', 'HEART_LINE_DEPTH', 'THUMB_LENGTH_RATIO', '[OTHER_M_SCORES>=60]')
  - 18: ('HEAD_LINE_END_FORK', 'INDEX_LENGTH_RATIO', 'MOUNT_APOLLO', 'SUN_LINE_PRESENCE', '[OTHER_M_SCORES>=60]')
  - 15: ('HEAD_LINE_END_FORK', 'MOUNT_APOLLO', 'SUN_LINE_PRESENCE', '[OTHER_M_SCORES>=60]')
  - 12: ('FATE_LINE_CLARITY', 'HEART_LINE_DEPTH', 'HEART_LINE_LENGTH', 'THUMB_LENGTH_RATIO', '[OTHER_M_SCORES>=60]')
  - 12: ('CHUAN_PALM & HEART_LINE_DEPTH', 'FATE_LINE_CLARITY', 'HEART_LINE_DEPTH', 'HEART_LINE_LENGTH', '[OTHER_M_SCORES>=60]')
  - 10: ('CHUAN_PALM & HEART_LINE_DEPTH', 'HEAD_LINE_END_FORK', 'MOUNT_APOLLO', 'SUN_LINE_PRESENCE', '[OTHER_M_SCORES>=60]')
  - 8: ('CHUAN_PALM & HEART_LINE_DEPTH', 'HEART_LINE_DEPTH', 'HEART_LINE_LENGTH', 'THUMB_LENGTH_RATIO', '[OTHER_M_SCORES>=60]')
  - 7: ('HEAD_LINE_DEPTH', 'LIFE_LINE_DEPTH', 'LIFE_LINE_LENGTH', 'THUMB_LENGTH_RATIO', '[OTHER_M_SCORES>=60]')

## M7 归因

- M7 命中数: 43
- M7 当前核心支持过窄：核心字段只有 HEAD_LINE_SLOPE 与 HEART_LINE_DEPTH；如果 HEART_LINE_DEPTH 不命中，M7 很难满足 2 个核心字段支撑。
- M7 仍明显依赖低置信字段 MOUNT_LUNA 与 FINGERTIP_SHAPE 提供分数。

## HEART_LINE_DEPTH 影响

- HEART_LINE_DEPTH 参与输出次数: 492
- 涉及人格分布: {'P08': 71, 'P21': 60, 'P01': 47, 'P34': 40, 'P15': 38, 'P14': 37, 'P10': 31, 'P35': 30, 'P02': 23, 'P27': 20, 'P30': 16, 'P33': 13, 'P28': 12, 'P19': 11, 'P16': 10, 'P20': 10, 'P18': 8, 'P17': 6, 'P22': 5, 'P04': 4}
- 母型层规则:
  - {'mother_id': 'M2', 'mother_name': '暖纹型', 'field_key': 'HEART_LINE_DEPTH', 'operator': '*12', 'threshold': None, 'weight': 12, 'confidence_tier': 'core', 'is_core_support': True, 'notes': '0-36'}
  - {'mother_id': 'M3', 'mother_name': '密纹型', 'field_key': 'HEART_LINE_DEPTH', 'operator': '*7', 'threshold': None, 'weight': 7, 'confidence_tier': 'core', 'is_core_support': True, 'notes': '0-21'}
  - {'mother_id': 'M7', 'mother_name': '月相型', 'field_key': 'HEART_LINE_DEPTH', 'operator': '*4', 'threshold': None, 'weight': 4, 'confidence_tier': 'core', 'is_core_support': True, 'notes': '0-12'}
- 人格层规则:
  - {'persona_id': 'P01', 'persona_name': '人生排位赛选手', 'mother_id': 'M1', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 15, 'is_required': True, 'notes': None}
  - {'persona_id': 'P35', 'persona_name': '情感满仓者', 'mother_id': 'M2', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P27', 'persona_name': '本色出演', 'mother_id': 'M2', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P30', 'persona_name': '温柔排版师', 'mother_id': 'M2', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 20, 'is_required': True, 'notes': None}
  - {'persona_id': 'P02', 'persona_name': '情绪预警机', 'mother_id': 'M3', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P22', 'persona_name': '情绪共振体', 'mother_id': 'M3', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 3, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P20', 'persona_name': '深夜复盘脑', 'mother_id': 'M3', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P28', 'persona_name': '感知偏科生', 'mother_id': 'M3', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 2, 'weight': 15, 'is_required': True, 'notes': None}
  - {'persona_id': 'P34', 'persona_name': '社交小饭桌', 'mother_id': 'M4', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 15, 'is_required': True, 'notes': None}
  - {'persona_id': 'P33', 'persona_name': '自我闭环怪', 'mother_id': 'M4', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 10, 'is_required': False, 'notes': None}
  - {'persona_id': 'P15', 'persona_name': '情绪自理人', 'mother_id': 'M4', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P17', 'persona_name': '关系试用期', 'mother_id': 'M4', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 15, 'is_required': True, 'notes': None}
  - {'persona_id': 'P16', 'persona_name': 'PPT过敏体', 'mother_id': 'M6', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 15, 'is_required': True, 'notes': None}
  - {'persona_id': 'P19', 'persona_name': '低调高光型', 'mother_id': 'M6', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P18', 'persona_name': '情绪缝合怪', 'mother_id': 'M7', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P04', 'persona_name': '已读观望型', 'mother_id': 'M7', 'field_key': 'HEART_LINE_DEPTH', 'operator': '<=', 'threshold': 1, 'weight': 20, 'is_required': True, 'notes': None}
  - {'persona_id': 'P21', 'persona_name': '反差克制系', 'mother_id': 'M8', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}
  - {'persona_id': 'P08', 'persona_name': '软钉子', 'mother_id': 'M8', 'field_key': 'HEART_LINE_DEPTH', 'operator': '>=', 'threshold': 2, 'weight': 25, 'is_required': True, 'notes': None}

## 权重判断

- 过高：M8 `[OTHER_M_SCORES>=60]` 触发门槛过低；P10/P04 对 P29 压制明显；P06/P01 对 P25 压制明显。
- 过低：P25 三条核心规则总分只有 60，低于 M1 内多个 75 分候选；P29 三条核心规则总分只有 60，低于 M7 内 P04/P18 的 70 分上限。
- 过高字段影响：HEART_LINE_DEPTH 同时进入 M2/M3/M7/M8 母型层和多个人格层，形成重复计权。
