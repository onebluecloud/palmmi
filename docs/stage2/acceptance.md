# PalmTag Stage 2 Acceptance

## 验收标准

```text
所有页面可以打开
所有页面可以手机端浏览
首页可以跳转上传页
上传页可以选择图片并本地预览
点击分析后进入分析中页面
分析中页面 1-2 秒后跳转结果页
结果页可以读取 36-types.json 中的人格数据
缺失字段显示 TODO
结果页可以跳转海报页
海报页可以展示基础海报卡片
打赏页和隐私页可以打开
项目可以 build
项目可以 lint
不得出现真实 API 调用
不得出现硬编码人格内容
```

## Stage 2.0 文档验收

`/docs/stage2/context.md` 存在，并说明项目定位、Stage 2 目标、mock 边界、API 禁止项、人格内容禁止项和设计 skill 使用。

`/docs/stage2/scope.md` 存在，并明确本阶段必须做、禁止做和后续阶段预留。

`/docs/stage2/page-flow.md` 存在，并明确页面路由和用户路径。

`/docs/stage2/data-contract.md` 存在，并明确 `data/personas/36-types.json`、`/lib/personas.ts`、读取函数和缺字段规则。

`/docs/stage2/ui-guideline.md` 存在，并明确视觉关键词、页面风格、主要页面设计要求和禁止方向。

`/docs/stage2/acceptance.md` 存在，并记录 Stage 2 页面与工程验收标准。

`/docs/stage2/todo.md` 存在，并按 2.0 到 2.7 拆分后续任务。

## 禁止验收通过的情况

如果 Stage 2 实现中出现真实千问 API 调用、真实图片上传服务器、登录系统、真实支付、复杂后台、自动补人格文案、硬编码人格内容或删除已有校验脚本，本阶段不得验收通过。

如果人格字段缺失时页面编造内容，而不是显示 `TODO：需要人工补充`，本阶段不得验收通过。

