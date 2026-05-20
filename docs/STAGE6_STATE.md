# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6D：图片上传与临时缓存策略

## Stage 6D 是否完成

已完成，当前状态：PASS。

## Cloudflare Pages 链接

- Pages 默认链接：`https://palmmi.pages.dev`
- Deployment 链接：`https://a980c977.palmmi.pages.dev`
- workers.dev 兼容链接：`https://palmmi.onebluecloud723.workers.dev`
- 链接用途：仅用于 Stage 6 内测，不公开传播

## Cloudflare 插件能力判断

- Cloudflare MCP / API 插件：可用
- 是否具备账号操作能力：具备，已创建 Pages 项目、触发构建、查询构建日志、替换错误 Worker 入口
- Pages 项目创建：PASS
- GitHub 仓库连接：PASS，使用 `onebluecloud/palmmi`
- Worker 修复：PASS，原 Hello World Worker 已替换为 Pages 兼容代理

## 构建结果

- 本地 `npm run build`：PASS
- Cloudflare 远端构建：PASS
- 构建命令：`npm run build`
- 输出目录：`dist`
- Functions 目录：`functions`
- 构建日志敏感信息检查：PASS，未发现 API Key、Token、`.env`、base64、provider raw response

## API / Function 验证结果

- 首页 `/`：PASS
- 上传页 `/upload/`：PASS
- 结果页 `/result/`：PASS
- 海报页 `/poster/`：PASS
- 静态资源：PASS
- 线上 `/api/analyze` POST：PASS，mock 返回 `ok: true`
- 线上超大图片：PASS，返回 `FILE_TOO_LARGE`
- 线上错误格式：PASS，返回 `FILE_TYPE_UNSUPPORTED`
- 真实 Qwen / VLM：未开启，未配置真实 Key

## 图片上传与缓存策略

- 原图服务端落盘：否
- 浏览器临时缓存：`sessionStorage` 的 `palmmi:lastUpload`
- 上传状态 TTL：最多 24 小时
- 分析成功后是否清理上传原图 data URL：是
- 长期图片 URL：无
- Cloudflare KV / R2 / D1 / Durable Object：未使用
- 海报服务端保存：否
- 结果页依赖长期图片存储：否
- 上传限制：JPG / PNG / WebP，最大 8MB

## 当前阻塞项

- Stage 6D：无阻塞
- Stage 6E：真实链路验证仍阻塞，需在平台环境变量中由用户手动配置真实 Qwen Key 后再验证

## 下一步

进入 Stage 6E 准备，但不要执行真实 Qwen 链路，直到用户在 Cloudflare 平台手动配置真实 Qwen Key。

## 人工待办

- 不要把 Qwen API Key、Cloudflare Token、GitHub Token 发到聊天
- 不要公开分享 `*.pages.dev` 或 `*.workers.dev` 链接
- 准备 3–10 张测试图片
- 准备 iPhone / 安卓微信测试设备
- 暂时不要买域名
- 暂时不要绑定正式域名
- 暂时不要修改 DNS
- 暂时不要接支付 / 打赏 / 登录

## 当前风险

- 图片上传 body size 风险尚需 Stage 6D 在线验证
- 图片 / base64 / provider raw response 日志泄露风险需持续复查
- Preview 链接外泄导致访问不可控风险
- 真实 Qwen API Key 泄露风险
- 真实 Qwen 成本失控风险
- 国内访问速度和备案策略尚未进入正式发布决策
