# Palmmi Stage 4 Route Map

## 1. 首页路径

```text
index.html
```

对应脚本：无页面专用脚本。

核心状态：静态首页。提供 Palmmi 品牌说明、上传入口、玩法说明和示意卡。

主要跳转：

- `upload/index.html`：开始上传掌纹。
- `#how`：查看玩法说明。
- `#sample`：查看示意卡。

## 2. 上传页路径

```text
upload/index.html
```

对应脚本：

```text
scripts/palmmi-upload.js
```

核心状态：

- 未选择图片。
- 已选择并可预览图片。
- 格式不支持。
- 文件超过 10MB。
- 本地预览读取失败。
- 本地状态写入成功，可进入分析页。
- 本地状态写入失败，停留在上传页并提示重新操作。

写入 key：

```text
palmmi:lastUpload
```

清理 key：

```text
palmmi:lastAnalysisResult
```

主要跳转：

- `../analyze/index.html`：开始分析。
- `../index.html`：返回首页。

## 3. 分析页路径

```text
analyze/index.html
```

对应脚本：

```text
scripts/palmmi-analyze.js
```

核心状态：

- `idle`
- `analyzing`
- `done`
- `missing-upload`
- `invalid-upload`
- `timeout`
- `error`

读取 key：

```text
palmmi:lastUpload
```

写入 key：

```text
palmmi:lastAnalysisResult
```

主要跳转：

- `../result/index.html`：查看结果。
- `../upload/index.html`：重新上传。
- `../index.html`：返回首页。

本地截图/测试 query：

```text
analyze/index.html?state=missing-upload
analyze/index.html?state=invalid-upload
analyze/index.html?state=timeout
analyze/index.html?state=error
```

## 4. 结果页路径

```text
result/index.html
```

对应脚本：

```text
scripts/palmmi-result.js
```

核心状态：

- `loading`
- `ready`
- `missing-result`
- `invalid-result`
- `partial-result`
- `error`

读取 key：

```text
palmmi:lastAnalysisResult
```

主要跳转：

- `../poster/index.html`：生成分享海报预览。
- `../upload/index.html`：重新测试。
- `../index.html`：返回首页。

本地截图/测试 query：

```text
result/index.html?state=missing-result
result/index.html?state=invalid-result
result/index.html?state=partial-result
result/index.html?state=error
```

## 5. 海报页路径

```text
poster/index.html
```

对应脚本：

```text
scripts/palmmi-poster.js
```

核心状态：

- `loading`
- `ready`
- `missing-result`
- `invalid-result`
- `partial-result`
- `error`

读取 key：

```text
palmmi:lastAnalysisResult
```

主要跳转：

- `../result/index.html`：返回结果页。
- `../upload/index.html`：重新测试 / 返回上传页。
- `../index.html`：返回首页。

本地截图/测试 query：

```text
poster/index.html?state=ready
poster/index.html?state=long-name
poster/index.html?state=missing-result
poster/index.html?state=invalid-result
poster/index.html?state=partial-result
poster/index.html?state=error
```

## 6. 页面主跳转关系

```text
index.html
-> upload/index.html
-> analyze/index.html
-> result/index.html
-> poster/index.html
```

重新测试路径：

```text
poster/index.html
-> upload/index.html
```

返回首页路径：

```text
upload/index.html -> index.html
analyze/index.html -> index.html
result/index.html -> index.html
poster/index.html -> index.html
```

返回结果页路径：

```text
poster/index.html
-> result/index.html
```

## 7. 异常状态恢复路径

上传异常：

- 未选择、格式不支持、文件过大、预览读取失败：停留在 `upload/index.html`，通过重新选择图片恢复。

分析异常：

- `missing-upload`：回到 `upload/index.html` 或 `index.html`。
- `invalid-upload`：回到 `upload/index.html` 或 `index.html`。
- `timeout`：回到 `upload/index.html` 或 `index.html`。
- `error`：回到 `upload/index.html` 或 `index.html`。

结果异常：

- `missing-result`：重新测试到 `upload/index.html`，或返回 `index.html`。
- `invalid-result`：重新测试到 `upload/index.html`，或返回 `index.html`。
- `partial-result`：允许查看兜底内容，也可以重新测试。
- `error`：重新测试到 `upload/index.html`，或返回 `index.html`。

海报异常：

- `missing-result`：返回 `result/index.html`、重新测试、返回上传页或首页。
- `invalid-result`：返回 `result/index.html`、重新测试、返回上传页或首页。
- `partial-result`：允许查看兜底海报，也可以重新测试。
- `error`：返回 `result/index.html`、重新测试、返回上传页或首页。
