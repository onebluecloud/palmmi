from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_mother_scoring, load_persona_rules


def _candidate_diagnosis(results: list[dict[str, Any]], target_persona: str) -> dict[str, Any]:
    rows = [row for row in results if target_persona in row.get("persona_scores", {})]
    top_winners: Counter[str] = Counter()
    ranks: Counter[int] = Counter()
    deficits: list[float] = []
    for row in rows:
        scores = row["persona_scores"]
        ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
        top_winners[ranked[0][0]] += 1
        ranks[[persona_id for persona_id, _ in ranked].index(target_persona) + 1] += 1
        deficits.append(ranked[0][1] - scores[target_persona])
    return {
        "candidate_count": len(rows),
        "top_winners": top_winners,
        "ranks": ranks,
        "average_deficit": round(sum(deficits) / len(deficits), 2) if deficits else 0,
    }


def _rules_for_persona(persona_id: str) -> list[dict[str, Any]]:
    return [rule for rule in load_persona_rules() if rule["persona_id"] == persona_id]


def _rules_with_field(field_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    mother = [rule for rule in load_mother_scoring() if rule["field_key"] == field_key]
    persona = [rule for rule in load_persona_rules() if rule["field_key"] == field_key]
    return mother, persona


def write_diagnosis_report(
    results_path: Path = PROJECT_ROOT / "outputs" / "random_batch_results.json",
    output_path: Path = PROJECT_ROOT / "outputs" / "distribution_diagnosis_report.md",
) -> None:
    results = json.loads(results_path.read_text(encoding="utf-8"))
    p25 = _candidate_diagnosis(results, "P25")
    p29 = _candidate_diagnosis(results, "P29")
    m8_rows = [row for row in results if row.get("primary_mother") == "M8"]
    m7_rows = [row for row in results if row.get("primary_mother") == "M7"]
    m8_combos = Counter(tuple(row.get("dominant_fields", [])) for row in m8_rows)
    heart_personas = Counter(
        row.get("persona_id") for row in results if "HEART_LINE_DEPTH" in row.get("dominant_fields", [])
    )
    heart_mother_rules, heart_persona_rules = _rules_with_field("HEART_LINE_DEPTH")

    lines = [
        "# Distribution Diagnosis Report",
        "",
        "## P25 归因",
        "",
        f"- P25 出现在 M1 候选集次数: {p25['candidate_count']}",
        f"- P25 经常输给: {dict(p25['top_winners'].most_common())}",
        f"- P25 排名分布: {dict(sorted(p25['ranks'].items()))}",
        f"- P25 平均落后 Top1 分数: {p25['average_deficit']}",
        "- P25 当前规则:",
    ]
    lines.extend(f"  - {rule}" for rule in _rules_for_persona("P25"))
    lines.extend(
        [
            "",
            "## P29 归因",
            "",
            f"- P29 出现在 M7 候选集次数: {p29['candidate_count']}",
            f"- P29 经常输给: {dict(p29['top_winners'].most_common())}",
            f"- P29 排名分布: {dict(sorted(p29['ranks'].items()))}",
            f"- P29 平均落后 Top1 分数: {p29['average_deficit']}",
            "- P29 当前规则:",
        ]
    )
    lines.extend(f"  - {rule}" for rule in _rules_for_persona("P29"))
    lines.extend(
        [
            "",
            "## M8 归因",
            "",
            f"- M8 命中数: {len(m8_rows)}",
            "- M8 主要字段组合 Top 10:",
        ]
    )
    lines.extend(f"  - {count}: {combo}" for combo, count in m8_combos.most_common(10))
    lines.extend(
        [
            "",
            "## M7 归因",
            "",
            f"- M7 命中数: {len(m7_rows)}",
            "- M7 当前核心支持过窄：核心字段只有 HEAD_LINE_SLOPE 与 HEART_LINE_DEPTH；如果 HEART_LINE_DEPTH 不命中，M7 很难满足 2 个核心字段支撑。",
            "- M7 仍明显依赖低置信字段 MOUNT_LUNA 与 FINGERTIP_SHAPE 提供分数。",
            "",
            "## HEART_LINE_DEPTH 影响",
            "",
            f"- HEART_LINE_DEPTH 参与输出次数: {sum(heart_personas.values())}",
            f"- 涉及人格分布: {dict(heart_personas.most_common())}",
            "- 母型层规则:",
        ]
    )
    lines.extend(f"  - {rule}" for rule in heart_mother_rules)
    lines.append("- 人格层规则:")
    lines.extend(f"  - {rule}" for rule in heart_persona_rules)
    lines.extend(
        [
            "",
            "## 权重判断",
            "",
            "- 过高：M8 `[OTHER_M_SCORES>=60]` 触发门槛过低；P10/P04 对 P29 压制明显；P06/P01 对 P25 压制明显。",
            "- 过低：P25 三条核心规则总分只有 60，低于 M1 内多个 75 分候选；P29 三条核心规则总分只有 60，低于 M7 内 P04/P18 的 70 分上限。",
            "- 过高字段影响：HEART_LINE_DEPTH 同时进入 M2/M3/M7/M8 母型层和多个人格层，形成重复计权。",
            "",
        ]
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    write_diagnosis_report()
    print("Wrote outputs/distribution_diagnosis_report.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
