# Palmmi Stage 4 Forbidden Changes

Stage 4 是页面产品化阶段，不是识别规则阶段。

## 禁止改 3G/3H 规则

- 禁止修改 8 母型评分函数。
- 禁止修改主母型核心字段支撑规则。
- 禁止修改人格匹配规则。
- 禁止修改 Top3 生成逻辑。

## 禁止改 33 字段 schema

- 禁止新增字段。
- 禁止删除字段。
- 禁止重命名字段。
- 禁止把字段枚举改成页面自定义值。

## 禁止改 V4.2 人格名称

- 禁止重新设计 36 人格名称。
- 禁止修改人格与母型归属。
- 禁止把 Palmmi 改回 PalmTag。

## 禁止绕过 pipeline

页面不得绕过 `RecognitionResult` 直接读取 features、Schema、规则文件或 V4.2 原报告进行识别判断。

## 禁止接真实 VLM

Stage 4 不新增真实 VLM provider、API key、千问配置、后端代理、fetch 调用或计费逻辑。

## 禁止在页面层写人格判断逻辑

页面层不得：

- 自己判断母型。
- 自己判断人格。
- 自己处理相邻人格规则。
- 自己处理跨母型补判。
- 自己重排 Top3。
- 自己为了文案好看改识别结论。

## 禁止把 Palmmi 改回 PalmTag

PalmTag 只是原报告历史旧名。Stage 4 所有产品、页面、按钮、标题和用户可见文案必须使用 Palmmi。

## 禁止引入 perceptual_hash

Stage 4 不得引入 `perceptual_hash`、pHash、dHash、aHash、相似图片缓存或 embedding 相似缓存。缓存仍以 Stage 3 的 file_hash 与版本隔离策略为准。
