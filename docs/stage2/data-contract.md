# PalmTag Stage 2 Data Contract

## 数据源

人格数据源只能是：

```text
data/personas/36-types.json
```

页面组件不得直接写死人格数据，不得复制人格文案到组件、路由或 mock 常量里。

## 读取层

需要建立读取层：

```text
/lib/personas.ts
```

读取层必须支持：

```text
getAllPersonas()
getPersonaById(id)
validatePersonaShape()
```

## 读取规则

P01-P36 必须能读取。

缺字段不报错。

缺字段统一显示：

```text
TODO：需要人工补充
```

不得硬编码人格内容。

不得在页面组件里直接写死人格数据。

不得自动补充缺失的人格字段。

不得修改 `data/personas/36-types.json` 中已有的人格内容。

## 建议职责划分

`getAllPersonas()` 负责返回全部人格数据，供列表、mock 选择或校验使用。

`getPersonaById(id)` 负责按 `P01` 到 `P36` 读取单个人格。找不到时应返回可控空状态，页面显示 `TODO：需要人工补充`，不得临时编造人格文案。

`validatePersonaShape()` 负责检查数据结构是否可被页面读取。它可以报告缺失字段，但不得因为非关键字段缺失导致页面崩溃。

页面只消费读取层提供的结构化结果，不直接 import 原始 JSON。

