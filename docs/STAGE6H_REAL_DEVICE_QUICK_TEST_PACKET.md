# Palmmi Stage 6H 真机测试速查包

Date: 2026-05-31

Status: `USER_ACTION_REQUIRED`

这个文件给非技术用户执行真机验收用。只要按下面顺序测试，把结果复制给 Codex 即可。不要上传 API Key、Cloudflare Token、图片原图、base64、raw provider response 或包含隐私的信息。Codex 的回填检查器会对明显 key / base64 / raw response 做输出脱敏，但这只是兜底，不代表可以粘贴敏感内容。

## 1. 当前测试链接

```text
https://palmmi.onebluecloud723.workers.dev
```

Codex 已提供零成本命令确认线上部署 commit。优先使用命令，不需要手动打开 Cloudflare Dashboard：

```text
npm run preflight:stage6h -- --expect-commit <Codex 最终报告里的最新 commit>
```

如果该命令失败，再去 Cloudflare Dashboard 看最新部署；如果最新部署不是最终报告里的最新 commit，先不要做真机结论，只等部署成功后再测。

Codex 可在真机测试前先跑零成本线上预检：

```text
npm run preflight:stage6h
```

该命令只检查页面和无效 API 请求，不上传真实图片，不调用 Qwen。通过后仍然不能替代真机测试。

可用下面命令确认线上部署 commit：

```text
npm run preflight:stage6h -- --expect-commit <Codex 最终报告里的最新 commit>
```

## 2. 测试前准备

准备这些设备和图片：

- iPhone：Safari 和微信。
- Android 手机：Chrome 和微信。
- 清晰掌心照片 2 张。
- 模糊或偏暗掌心照片 1 张。
- 非手掌图片 1 张。
- 如果方便，再准备一张很大的图片或非图片文件。

真实清晰掌纹分析会消耗 Qwen 额度。建议总共只测 2-4 次清晰掌纹，不要反复刷。

## 3. 每台设备的最小测试步骤

对下面 4 个环境各测一遍：

- iPhone Safari
- iPhone 微信
- Android Chrome
- Android 微信

每个环境执行：

1. 打开首页。
2. 进入上传页。
3. 从相册选一张清晰掌心照片。
4. 等待分析完成。
5. 查看结果页是否正常显示。
6. 进入海报页。
7. 尝试保存或长按保存海报。
8. 返回上一页，确认不白屏、不死循环。
9. 再测试一次非手掌图片，确认不会生成人格结果。
10. 如果方便，测试模糊或偏暗掌心照片，确认提示能看懂。

## 4. 结果回填模板

把下面这段复制给 Codex，并把 `待填` 改成实际情况。

```text
线上部署确认：
- Codex 是否已确认 `/build-meta.json` 匹配最终报告中的最新 commit：待填
- 如果 Codex 无法确认，Cloudflare Dashboard 部署状态是否 Success：待填

iPhone Safari：
- 首页 / 上传页是否打开：待填
- 相册上传清晰掌心是否成功：待填
- 拍照上传是否成功：待填
- 结果页是否显示：待填
- 海报页是否显示：待填
- 是否能保存海报：待填
- 非手掌图片是否被拒绝：待填
- 模糊 / 偏暗图片提示是否可读：待填
- 是否白屏 / 卡死 / 无限加载：待填
- 是否看到 key、base64、英文堆栈或 raw response：待填

iPhone 微信：
- 首页 / 上传页是否打开：待填
- 相册上传清晰掌心是否成功：待填
- 拍照上传是否成功：待填
- 结果页是否显示：待填
- 海报页是否显示：待填
- 是否能保存海报：待填
- 非手掌图片是否被拒绝：待填
- 模糊 / 偏暗图片提示是否可读：待填
- 是否白屏 / 卡死 / 无限加载：待填
- 是否看到 key、base64、英文堆栈或 raw response：待填

Android Chrome：
- 首页 / 上传页是否打开：待填
- 相册上传清晰掌心是否成功：待填
- 拍照上传是否成功：待填
- 结果页是否显示：待填
- 海报页是否显示：待填
- 是否能保存海报：待填
- 非手掌图片是否被拒绝：待填
- 模糊 / 偏暗图片提示是否可读：待填
- 是否白屏 / 卡死 / 无限加载：待填
- 是否看到 key、base64、英文堆栈或 raw response：待填

Android 微信：
- 首页 / 上传页是否打开：待填
- 相册上传清晰掌心是否成功：待填
- 拍照上传是否成功：待填
- 结果页是否显示：待填
- 海报页是否显示：待填
- 是否能保存海报：待填
- 非手掌图片是否被拒绝：待填
- 模糊 / 偏暗图片提示是否可读：待填
- 是否白屏 / 卡死 / 无限加载：待填
- 是否看到 key、base64、英文堆栈或 raw response：待填

真实清晰掌纹分析次数：
- 大约调用次数：待填
- 是否接受这次额度消耗：待填

其他问题：
- 待填
```

## 5. 判定规则

可以继续进入 Stage 6I 正式收口的最低条件：

- Cloudflare 最新部署是 Codex 最终报告中的最新 commit 且 Success。
- 至少 iPhone 微信和 Android 微信各完成 1 轮真实清晰掌纹测试。
- 没有白屏、卡死、上传完全不可用、结果页完全不可用、海报页完全不可用。
- 错误提示没有暴露 key、base64、raw response 或英文堆栈。

如果任一微信环境上传完全失败、结果页打不开、海报页打不开，或出现敏感信息泄露，不进入 Stage 6I，先开 Stage 6H-Fix。

Codex 收到你回填的文本后，会先用下面的零成本检查器做格式和门禁初筛：

```text
npm run check:stage6h:manual -- --file <Codex 保存的回填文本>
```

该命令只读取文字，不上传图片，不调用 Qwen，不消耗额度。检查器输出前会脱敏明显 API key / token / secret / `sk-...`、`data:image/...;base64,...`、raw response payload 和超长 base64-like payload。检查器只能帮助发现漏填和明显阻塞项，不能替代真实手机测试，也不能证明回填内容一定真实。

检查器输出里：

- `can_enter_stage6i=true`：表示 iPhone 微信 + Android 微信最低门槛已满足，且没有明显 P0 / P1 阻塞；可以进入 Stage 6I 条件收口。
- `missing_required` 不为空：表示仍有 iPhone Safari / Android Chrome 或其他项目没测，必须继续记录为 `MANUAL_REQUIRED`，不能写成 PASS。
