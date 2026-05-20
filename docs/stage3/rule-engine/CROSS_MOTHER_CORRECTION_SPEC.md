# Palmmi Stage 3G 跨母型补判规范

## 1. 目标

本文转写 V4.2 §4.5 的跨母型补判机制。

本轮只写规范，不实现具体代码。

## 2. 触发条件

跨母型补判允许跳转必须同时满足：

1. 跨母型搜索发现某个人格匹配度比当前主人格高 20% 以上。
2. 该人格所属母型分数 `>= 50`。

工程表达：

```text
cross_persona_score > current_primary_persona_score * 1.2
and cross_mother_score >= 50
```

## 3. 必须记录的信息

跨母型补判必须记录：

| 字段 | 说明 |
|---|---|
| `original_primary_mother` | 原主母型 |
| `original_primary_persona` | 原主人格 |
| `original_primary_persona_score` | 原主人格匹配度 |
| `cross_mother` | 新母型 |
| `cross_persona` | 新人格 |
| `cross_persona_score` | 新人格匹配度 |
| `cross_mother_score` | 新母型分数 |
| `reason` | 跳转原因 |

## 4. 工程限制

- 跨母型补判不能绕过 3E Schema 校验。
- 跨母型补判不能绕过主母型硬约束的工程解释。
- 跨母型补判必须记录 `reason`。
- 跨母型补判不能修改 8 母型评分公式。
- 跨母型补判不能修改母型到人格候选池。

## 5. 与主母型硬约束的关系

主母型硬约束决定初始主母型是否可靠。

跨母型补判用于防止主人格被困在错母型里，但它仍然必须在已通过 Schema、字段校验和母型评分的基础上运行。

如果输入字段质量不足或没有 eligible primary，应先进入 `RETRY_REQUIRED`，不应执行跨母型补判。
