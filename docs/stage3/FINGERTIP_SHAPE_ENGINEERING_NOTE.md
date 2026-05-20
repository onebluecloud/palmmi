# Palmmi Stage 3D FINGERTIP_SHAPE 工程说明

## 1. 字段定位

`FINGERTIP_SHAPE` 是 V4.2 33 字段之一，属于 A 组 MediaPipe 几何字段。

它不是 VLM Prompt 字段。

它来自 MediaPipe 关键点 + 图像轮廓粗判。

它是低置信字段，不是核心字段。

## 2. 取值范围

`FINGERTIP_SHAPE` 取值范围为 0-3：

- `0`：方型
- `1`：圆型
- `2`：锥型
- `3`：尖型

后续 3E 若需要降级，默认值按四档字段中位数使用 `2`。

## 3. 工程限制

`FINGERTIP_SHAPE` 不作为核心母型判定字段。

`FINGERTIP_SHAPE` 不能单独决定主母型。

`FINGERTIP_SHAPE` 只能参与：

- 人格细化
- 文案润色
- 低权重加分

## 4. 稳定性说明

不能把 `FINGERTIP_SHAPE` 写成“100% 稳定字段”。

MediaPipe 21 关键点不包含完整指尖轮廓边缘，只能从指尖前几个关键点的相对位置和图像轮廓推断大致形态。

因此它必须保留为低置信字段，后续实现和测试不得把它升级为核心字段，除非经过变更请求流程。

## 5. 与 VLM 的边界

完整 VLM Prompt 不应要求输出 `FINGERTIP_SHAPE`。

VLM 输出映射表中不应出现 `main_lines.fingertip_shape`、`overall.fingertip_shape` 或任何类似字段。

后续 3E 做 Schema 校验时，应把 `FINGERTIP_SHAPE` 作为内部标准 33 字段的一部分校验，但不作为 VLM 原始 JSON 的必填字段。
