# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6C-Prep：GitHub remote / 首次 commit / Cloudflare Pages 预部署前置适配

## 已完成

- Stage 1–5 已完成 / 冻结
- Stage 6A：部署方案确认已完成
- Stage 6B：环境变量与密钥管理已完成
- Stage 6C-Prep：GitHub remote 已配置
- Stage 6C-Prep：Cloudflare Pages 静态构建命令已补齐
- Stage 6C-Prep：Cloudflare Pages Functions API 入口已新增
- Stage 6C-Prep：提交前安全检查已完成
- Stage 6C-Prep：掌纹样本原图、测试结果和真实 Qwen 批测 raw text 输出已排除在 Git 提交之外

## 当前禁止修改

- Stage 3 人格规则
- Stage 3 权重阈值
- Stage 4 UI 主风格
- Stage 5 Qwen / VLM 识别主逻辑
- 支付 / 打赏
- 登录系统
- 宣发功能
- 正式域名绑定
- Cloudflare DNS
- 正式部署
- 真实 Qwen API Key / Cloudflare Token / GitHub Token

## 当前阻塞项

- Cloudflare Pages Preview 尚未创建
- Cloudflare / GitHub 页面授权尚未在浏览器中完成
- 真实 Qwen / VLM 线上链路尚未验证
- 图片上传 body size 和 serverless timeout 风险尚未在线验证

## 下一步是否进入 6C

可以进入 Stage 6C：Preview 部署 Dry Run。

Stage 6C 仍必须保持：

- 先使用 mock 链路
- 不公开发布
- 不绑定正式域名
- 不配置真实 Qwen Key 到聊天或代码
- 不接支付 / 打赏 / 登录

## 人工待办

- 保持 GitHub 账号已登录
- 保持 Cloudflare 账号已登录
- 如 Cloudflare 需要连接 GitHub，用户在浏览器中确认授权
- 后续在 Cloudflare 页面手动配置环境变量，不把真实 Key 发到聊天
- 准备 3–10 张测试图片
- 准备 iPhone / 安卓微信测试设备

## 当前风险

- Qwen API Key 泄露风险
- base64 / 图片 data URL 日志泄露风险
- provider raw response 泄露风险
- 真实图片批测输出泄露风险
- Cloudflare Pages Functions runtime 兼容风险
- 图片上传 body size 风险
- 真实 Qwen 请求 serverless timeout 风险
- Cloudflare Preview 配置错误风险
- 测试链接外泄导致成本失控风险

## 下一步

Stage 6C：Preview 部署 Dry Run。
