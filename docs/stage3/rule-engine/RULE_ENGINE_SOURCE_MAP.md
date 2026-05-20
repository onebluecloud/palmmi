# Palmmi Stage 3G Rule Engine Source Map

## 1. 目标

本文建立 V4.2 到 Palmmi 规则引擎工程规范的来源映射。

Stage 3G 只做工程转写，不重新设计规则、不调权重、不改阈值、不写业务代码、不实现规则引擎代码。

## 2. 唯一规则源

V4.2 是 Palmmi Stage 3 规则引擎唯一规则源。

规则引擎不得从主观理解、旧版本聊天记录、UI 文案或未冻结代码中补充规则。

## 3. 来源映射

| 工程规范内容 | V4.2 来源章节 | Stage 3G 输出文件 |
|---|---|---|
| 8 母型评分公式 | V4.2 §4.2 | `MOTHER_TYPE_SCORE_FUNCTIONS_SPEC.md` |
| 主母型 / 副母型选择 | V4.2 §4.3 | `MOTHER_TYPE_SELECTION_CONTRACT.md` |
| 主母型核心字段硬约束 | V4.2 §4.3.1 | `MOTHER_TYPE_FIELD_SUPPORT_SPEC.md` |
| 主母型内人格候选 | V4.2 §4.4 / §5.3 / 附录 B | `MOTHER_TO_PERSONA_MAPPING_SPEC.md` |
| 跨母型补判 | V4.2 §4.5 | `CROSS_MOTHER_CORRECTION_SPEC.md` |
| 完整双层流程 | V4.2 §4.6 | `RULE_ENGINE_INPUT_OUTPUT_CONTRACT.md` |
| 8 母型总览 | V4.2 §5.2 | `MOTHER_TYPE_SCORE_FUNCTIONS_SPEC.md` |
| 8 母型衍生 36 人格归属 | V4.2 §5.3 / 附录 B | `MOTHER_TO_PERSONA_MAPPING_SPEC.md` |
| 相邻人格区分 | V4.2 §7.1 / §7.2 | `ADJACENT_PERSONA_RULES_SPEC.md` |

## 4. 禁止事项

- 不重新设计 8 母型。
- 不新增母型。
- 不删除母型。
- 不修改母型名称。
- 不修改 36 人格归属。
- 不修改评分字段、阈值或权重系数。
- 不新增 V4.2 33 字段表外字段。
- 不把规则引擎简化成“33 字段直接逐型打分到 36 人格”。

## 5. 双层结构

Palmmi 规则引擎必须保留 V4.2 双层评分结构：

```text
33 字段
  -> 8 母型评分
  -> 主母型 / 副母型
  -> 主母型内人格候选
  -> 相邻人格区分
  -> 跨母型补判
```

规则引擎输入必须来自 Stage 3E 校验后的标准化 33 字段对象。
