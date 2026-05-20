# Palmmi Stage 3B Handoff

## 本轮完成内容

- 创建图片输入规范，冻结支持格式、原图限制、压缩策略、EXIF 去除、基础拒绝条件、微信 H5 风险和 3B/3C 边界。
- 创建图片输入契约，定义 `ImageInputStandardObject`、`processed_image` 读取规则、字段类型、必填性、允许值和错误状态枚举。
- 创建图片隐私与存储策略，明确原图默认不长期保存、识别图短期缓存、预览图不用于识别、后续 3F 只使用 `file_hash`。
- 创建 3B 测试计划，覆盖常见格式、异常文件、微信 H5、iPhone HEIC、安卓大图和弱网环境。
- 更新 Stage 3 决策日志。
- 更新 Stage 3 状态文件。

## 新增/修改文件列表

- 新增：`docs/stage3/IMAGE_INPUT_SPEC.md`
- 新增：`docs/stage3/IMAGE_INPUT_CONTRACT.md`
- 新增：`docs/stage3/IMAGE_PRIVACY_AND_STORAGE.md`
- 新增：`docs/stage3/IMAGE_INPUT_TEST_PLAN.md`
- 新增：`docs/stage3/HANDOFF_3B.md`
- 修改：`docs/stage3/DECISIONS.md`
- 修改：`docs/stage3/STAGE3_STATE.md`

## 3B 关键参数

- 原图最大大小：10MB。
- 原图最高容忍大小：15MB。
- 原图最小尺寸：短边不低于 600px。
- 识别图最长边：1280px - 1600px。
- 压缩质量：JPEG/WebP 质量 0.75 - 0.85。
- 识别图目标大小：300KB - 1.5MB。
- 是否去 EXIF：必须去除。
- 是否保存原图：默认不长期保存。
- 支持格式：MVP 优先 `jpg`、`jpeg`、`png`、`webp`；`heic` / `heif` 作为兼容风险项。
- 不支持格式：`gif` 动图、视频、`pdf`、压缩包、伪装成图片的非图片文件。

## 3B 和 3C 的边界

3B 只负责文件输入与标准化，包括格式检查、大小检查、尺寸检查、压缩、EXIF 去除、识别图和预览图区分、基础拒绝状态。

3C 才负责：

- 非手掌拦截
- 图片质量检测
- 掌心/手背判断
- 单手/多手判断
- 清晰度判断
- 掌纹可见性判断
- 是否低质量需要重拍

## 下一步 3C 应该做什么

下一步进入 3C：非手掌拦截 + 图片质量检测。

3C 应该基于 3B 输出的 `processed_image` 和输入元信息，定义并冻结进入 VLM 之前的质量门控规则。

## 3C 禁止做什么

- 不接千问完整识别 API
- 不做 33 字段识别
- 不做规则引擎
- 不改 UI
- 不重新设计 V4.2 字段
