# Palmmi V4.2 Summary Index

## V4.2 核心结论

Palmmi 识别系统不是让 VLM 直接判断人格，而是：

图片 → 33字段 → 8母型评分 → 主母型内人格匹配 → 跨母型补判 → 相邻人格区分 → 最终 36 人格。

VLM 的职责只到掌纹特征 JSON 提取，不能输出人格、命运、健康、婚姻、寿命等解释。

## 33字段摘要

### 组 A：MediaPipe 几何字段

| 字段名 | 中文名 | 取值范围 |
|---|---|---|
| `PALM_LENGTH_RATIO` | 掌长比 | 0-3 |
| `INDEX_RING_RATIO` | 食指无名指比 (2D:4D) | 0-3 |
| `THUMB_LENGTH_RATIO` | 拇指相对长度 | 0-3 |
| `INDEX_LENGTH_RATIO` | 食指相对长度 | 0-3 |
| `PINKY_LENGTH_RATIO` | 小指相对长度 | 0-3 |
| `FINGER_SPREAD` | 手指自然张开度 | 0-3 |
| `HAND_ASPECT_RATIO` | 手掌整体长宽比 | 0-3 |
| `OVERALL_PROPORTION_FLAG` | 整体协调度标记 | 0/1 |
| `FINGERTIP_SHAPE` | 指尖形态 | 0-3 离散类 |

### 组 B1：VLM 主线 + 特殊纹

| 字段名 | 中文名 | 取值范围 |
|---|---|---|
| `LIFE_LINE_DEPTH` | 生命线深度 | 0-3 |
| `LIFE_LINE_LENGTH` | 生命线长度 | 0-3 |
| `LIFE_LINE_CURVE` | 生命线弧度 | 0-3 |
| `HEAD_LINE_LENGTH` | 智慧线长度 | 0-3 |
| `HEAD_LINE_DEPTH` | 智慧线深度 | 0-3 |
| `HEAD_LINE_SLOPE` | 智慧线下垂度 | 0-3 |
| `HEAD_LIFE_GAP` | 智慧线生命线分离度 | 0-3 |
| `HEAD_LINE_END_FORK` | 智慧线末端分叉 | 0/1 |
| `HEART_LINE_DEPTH` | 感情线深度 | 0-3 |
| `HEART_LINE_LENGTH` | 感情线长度 | 0-3 |
| `HEART_LINE_CURVE` | 感情线弧度 | 0-3 |
| `HEART_LINE_END_FORK` | 感情线末端分叉 | 0/1 |
| `SIMIAN_LINE` | 断掌 | 0/1 |
| `CHUAN_PALM` | 川字掌 | 0/1 |
| `LINE_COMPLEXITY` | 整体纹路复杂度 | 0-3 |

### 组 B2：VLM 命运 + 太阳线 + 整体清晰

| 字段名 | 中文名 | 取值范围 |
|---|---|---|
| `OVERALL_CLARITY` | 主线整体清晰度 | 0-3 |
| `FATE_LINE_CLARITY` | 命运线清晰度 | 0-3 |
| `SUN_LINE_PRESENCE` | 太阳线存在 | 0/1 |

### 组 B3：VLM 掌丘

| 字段名 | 中文名 | 取值范围 |
|---|---|---|
| `MOUNT_VENUS` | 金星丘饱满度 | 0-2 |
| `MOUNT_JUPITER` | 木星丘饱满度 | 0-2 |
| `MOUNT_SATURN` | 土星丘饱满度 | 0-2 |
| `MOUNT_APOLLO` | 太阳丘饱满度 | 0-2 |
| `MOUNT_MERCURY` | 水星丘饱满度 | 0-2 |
| `MOUNT_LUNA` | 月丘饱满度 | 0-2 |

## 字段置信度三档

### 核心字段 21 个

`LIFE_LINE_DEPTH`、`LIFE_LINE_LENGTH`、`LIFE_LINE_CURVE`、`HEAD_LINE_DEPTH`、`HEAD_LINE_LENGTH`、`HEAD_LINE_SLOPE`、`HEART_LINE_DEPTH`、`HEART_LINE_LENGTH`、`HEART_LINE_CURVE`、`SIMIAN_LINE`、`CHUAN_PALM`、`OVERALL_CLARITY`、`LINE_COMPLEXITY`、`PALM_LENGTH_RATIO`、`INDEX_RING_RATIO`、`THUMB_LENGTH_RATIO`、`INDEX_LENGTH_RATIO`、`PINKY_LENGTH_RATIO`、`FINGER_SPREAD`、`HAND_ASPECT_RATIO`、`OVERALL_PROPORTION_FLAG`

### 辅助字段 4 个

`FATE_LINE_CLARITY`、`SUN_LINE_PRESENCE`、`HEART_LINE_END_FORK`、`HEAD_LIFE_GAP`

### 低置信字段 8 个

`HEAD_LINE_END_FORK`、`FINGERTIP_SHAPE`、`MOUNT_VENUS`、`MOUNT_JUPITER`、`MOUNT_SATURN`、`MOUNT_APOLLO`、`MOUNT_MERCURY`、`MOUNT_LUNA`

## VLM Prompt 输出结构摘要

- `image_quality`：整体质量、光照、对焦、手掌可见度、问题列表
- `main_lines`：生命线、智慧线、感情线、命运线、太阳线等主线字段
- `special_patterns`：断掌、川字掌
- `mounts`：金星丘、木星丘、土星丘、太阳丘、水星丘、月丘
- `overall`：整体纹路复杂度、主线整体清晰度
- `confidence`：主线、特殊纹、掌丘、整体字段的置信度

## 降级策略摘要

VLM 原值

↓

二档退化

↓

默认中位数

↓

连续 5 个字段降级触发重拍

## 8母型评分摘要

- M1 钢线型
- M2 暖纹型
- M3 密纹型
- M4 川字型
- M5 贯纹型
- M6 轨道型
- M7 月相型
- M8 复纹型

## 双层评分流程摘要

33字段

↓

8母型评分

↓

主母型核心字段硬约束

↓

主母型内人格匹配

↓

跨母型补判

↓

相邻人格区分

↓

最终人格

## 36人格归属摘要

- M1 钢线型：P01 人生排位赛选手、P12 低调战略家、P25 老干部、P06 混乱过敏体、P31 留一手
- M2 暖纹型：P35 情感满仓者、P14 恒温热源、P27 本色出演、P30 温柔排版师
- M3 密纹型：P02 情绪预警机、P22 情绪共振体、P20 深夜复盘脑、P28 感知偏科生
- M4 川字型：P09 关系分层大师、P34 社交小饭桌、P33 自我闭环怪、P15 情绪自理人、P17 关系试用期
- M5 贯纹型：P05 藏进度条型、P03 人生不代驾、P36 自带推进器、P07 压力通电体
- M6 轨道型：P13 慢牛型选手、P26 深根型选手、P16 PPT过敏体、P19 低调高光型
- M7 月相型：P10 先觉者、P29 多线程玩家、P18 情绪缝合怪、P04 已读观望型
- M8 复纹型：P11 双面行者、P21 反差克制系、P08 软钉子、P32 大招捏手党、P23 身份自定义、P24 节奏掌控者

## V4.2 文案冻结说明

36人格名称、标语、解释链已冻结。

Stage 3 不重新创作文案。

只做工程引用与版本一致性检查。
