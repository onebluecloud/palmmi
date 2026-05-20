# PalmTag Rule Engine V0.1

这是一个只验证规则链路的最小原型：

手动输入 33 个掌纹字段 -> 计算 8 母型 -> 匹配 36 人格 -> 易混人格分流 -> 输出人格结果 -> 读取展示文案。

本版本不包含图片识别、VLM、网页 UI、上传页面或海报生成。

## 目录

- `data/`: 从 Excel 归一化出的规则 JSON。
- `src/`: 规则引擎代码。
- `tests/sample_inputs/`: 10 组完整 33 字段样本。
- `outputs/`: Excel 检查报告、验证待办、样本运行结果和总报告。
- `scripts/build_from_excel.py`: 从 Excel 重新生成规则 JSON 和检查报告。
- `scripts/generate_samples_and_report.py`: 重新生成样本、运行结果和总报告。

## 运行

```bash
python src/main.py --input tests/sample_inputs/sample_01_p01.json --output outputs/result_01.json
```

## 测试

```bash
pytest
```

## 重新从 Excel 生成数据

```bash
python scripts/build_from_excel.py --excel "E:\其他\Palmmi\PalmTag_三层数据总表_V3.xlsx" --project-root .
python scripts/generate_samples_and_report.py
```

## 当前限制

- Excel 里空白人格条件已归一化为 `>= 1`，并在规则 notes 中保留说明。
- 易混人格分流只在 Top1/Top2 得分差距小于 15% 且存在对应分流规则时触发。
- 主母型必须至少有 2 个核心支持命中，低置信字段不能单独决定主母型。
