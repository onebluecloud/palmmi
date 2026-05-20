# PalmTag Stage 2 Todo

## 2.0 建立 Stage 2 上下文包

- 创建 `/docs/stage2/context.md`
- 创建 `/docs/stage2/scope.md`
- 创建 `/docs/stage2/page-flow.md`
- 创建 `/docs/stage2/data-contract.md`
- 创建 `/docs/stage2/ui-guideline.md`
- 创建 `/docs/stage2/acceptance.md`
- 创建 `/docs/stage2/todo.md`
- 不写页面代码
- 不创建页面组件
- 不修改路由
- 不修改人格数据

## 2.1 建立页面路由

- 建立首页 `/`
- 建立上传页 `/upload`
- 建立分析中页面 `/analyzing`
- 建立结果页 `/result/[personaId]`
- 建立海报预览页 `/poster/[personaId]`
- 建立打赏页 `/donate`
- 建立隐私说明页 `/privacy`

## 2.2 建立人格数据读取层

- 建立 `/lib/personas.ts`
- 实现 `getAllPersonas()`
- 实现 `getPersonaById(id)`
- 实现 `validatePersonaShape()`
- 从 `data/personas/36-types.json` 读取数据
- 缺字段显示 `TODO：需要人工补充`
- 页面组件不得直接硬编码人格内容

## 2.3 建立 mock 分析流程

- 上传页选择本地图片
- 显示本地图片预览
- 点击开始分析进入 `/analyzing`
- 分析中页面停留 1-2 秒
- mock 输出一个 `personaId`
- 跳转结果页

## 2.4 建立结果页骨架

- 读取人格数据
- 展示人格名称
- 展示金句
- 展示最终判断
- 展示掌纹特征解释
- 缺失字段显示 `TODO：需要人工补充`
- 提供生成海报、重新测试、打赏按钮

## 2.5 建立海报预览页骨架

- 读取同一 `personaId`
- 展示竖版基础海报卡片
- 展示人格名称、金句、掌纹线条装饰、二维码占位和 PalmTag 品牌
- 不做正式 PNG 导出

## 2.6 建立打赏页和隐私页

- 打赏页轻量展示支持入口和二维码占位
- 不接真实支付
- 隐私页说明娱乐用途
- 隐私页说明图片不长期保存
- 隐私页说明最多缓存 24 小时
- 隐私页说明不用于严肃判断

## 2.7 总体验收

- 所有页面可以打开
- 所有页面可以手机端浏览
- 首页可以跳转上传页
- 上传页可以选择图片并本地预览
- 点击分析后进入分析中页面
- 分析中页面 1-2 秒后跳转结果页
- 结果页可以读取 `36-types.json`
- 缺失字段显示 `TODO：需要人工补充`
- 结果页可以跳转海报页
- 海报页可以展示基础海报卡片
- 打赏页和隐私页可以打开
- 项目可以 build
- 项目可以 lint
- 不出现真实 API 调用
- 不出现硬编码人格内容

