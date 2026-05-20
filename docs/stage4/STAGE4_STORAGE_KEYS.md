# Palmmi Stage 4 Storage Keys

## 当前原则

Stage 4 使用浏览器 `sessionStorage` 承接前端状态。当前数据只服务本地 mock / 前端页面流转，不代表真实服务端 API、真实 VLM 返回结构或持久化缓存策略。

Stage 5 才处理真实 VLM 返回结构映射、服务端接口、图片缓存、图片删除、安全和成本控制。

## 1. `palmmi:lastUpload`

用途：保存上传页本次选择的图片基础信息，供分析页读取。

写入页面：

```text
upload/index.html
```

写入脚本：

```text
scripts/palmmi-upload.js
```

读取页面：

```text
analyze/index.html
```

读取脚本：

```text
scripts/palmmi-analyze.js
```

数据形状：

```js
{
  schemaVersion: "stage4d_upload_v1",
  fileName: "palm.jpg",
  fileType: "image/jpeg",
  fileSize: 512000,
  fileSizeLabel: "500 KB",
  previewDataUrl: "data:image/jpeg;base64,...",
  uploadedAt: "2026-05-17T00:00:00.000Z",
  handSide: null
}
```

缺失 key 时处理：

- 分析页进入 `missing-upload`。
- 页面显示“请先上传一张清晰的手掌照片”。
- 恢复入口：重新上传 / 返回首页。

JSON 损坏时处理：

- 分析页进入 `invalid-upload`。
- 页面显示“本次上传状态无法读取，请重新上传一张掌心照片”。
- 不继续分析，不写入结果 key。

字段不完整时处理：

- 分析页进入 `invalid-upload`。
- 不调用真实 API，不调用真实 VLM。

Stage 5 可能调整：

- `previewDataUrl` 可能被替换为服务端图片对象、临时 URL、blob id 或 image id。
- `uploadedAt` 可能改为服务端创建时间。
- 可能新增图片 hash、用户会话 id、上传状态、删除期限和安全扫描状态。
- 真实图片不应长期放在 `sessionStorage` 的 base64 字段里。

## 2. `palmmi:lastAnalysisResult`

用途：保存分析页生成的 RecognitionResult 形状结果，供结果页和海报页读取。

写入页面：

```text
analyze/index.html
```

写入脚本：

```text
scripts/palmmi-analyze.js
```

读取页面：

```text
result/index.html
poster/index.html
```

读取脚本：

```text
scripts/palmmi-result.js
scripts/palmmi-poster.js
```

数据形状：

```js
{
  status: "SUCCESS",
  cache: {
    file_hash: null,
    cache_key: null,
    cache_hit: false,
    cache_write: false
  },
  image_input: {
    file_name: "palm.jpg",
    mime_type: "image/jpeg",
    file_size: 512000,
    uploaded_at: "2026-05-17T00:00:00.000Z"
  },
  quality_gate: {
    status: "STAGE4D_STATIC_PASS",
    can_continue: true,
    reason_codes: []
  },
  schema: {
    status: "STAGE4D_THIN_ADAPTER",
    normalized_features: null,
    degraded_fields: [],
    missing_fields: [],
    schema_warnings: [],
    should_retry: false
  },
  mother_scores: null,
  primary_mother: {
    id: "STAGE4D_MOCK_MOTHER",
    name: "Stage 4D mock mother"
  },
  secondary_mother: null,
  is_dual_mother: false,
  primary_persona: {
    id: "STAGE4D_MOCK_PERSONA",
    name: "Stage 4D mock persona",
    mother_type: "STAGE4D_MOCK_MOTHER"
  },
  top3: [],
  recognition: null,
  error_codes: [],
  debug: {
    pipeline_version: "stage4d_static_browser_adapter_v1",
    mock_vlm_used: false
  },
  created_at: "2026-05-17T00:00:01.000Z"
}
```

缺失 key 时处理：

- 结果页进入 `missing-result`。
- 海报页进入 `missing-result`。
- 恢复入口：重新测试 / 返回首页 / 返回结果页 / 返回上传页。

JSON 损坏时处理：

- 结果页进入 `invalid-result`。
- 海报页进入 `invalid-result`。
- 不渲染 raw JSON，不暴露技术错误。

字段不完整时处理：

- 结果页进入 `partial-result` 或使用安全兜底文案。
- 海报页进入 `partial-result` 或使用安全兜底文案。
- 不发明新的 36 人格内容，不重算人格，不重排 Top3。

Stage 5 可能调整：

- 真实 VLM 返回需要先映射成 Stage 3 / Stage 4 可消费的 RecognitionResult。
- `quality_gate`、`schema`、`error_codes` 需要承接真实图片质量、非手掌、字段缺失、模型失败、超时等状态。
- `debug` 不应暴露给用户页面，生产环境应隔离或删减。
- `cache` 需要变成服务端缓存策略的一部分，而不是前端 mock 字段。
- `image_input` 需要与真实上传、缓存、删除策略一致。

## Stage 5 调整边界

Stage 5 可以替换 mock 写入来源，但不应破坏 Stage 4 页面读取约定：

- 结果页继续从一个稳定结果对象渲染用户可读字段。
- 海报页继续消费结果页同一份结果，不重新识别、不重新计算人格。
- `RETRY_REQUIRED` / `REJECTED` 继续走非结果分支，不展示 persona、mother 或 Top3。
- Top3 顺序继续来自上游结果，不在页面端重排。
