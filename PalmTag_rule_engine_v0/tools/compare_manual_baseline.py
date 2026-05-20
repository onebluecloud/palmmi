from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema
from src.result_builder import build_result
from src.vision_vote import low_confidence_fields


FOCUS_FIELDS = [
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "FATE_LINE_CLARITY",
    "HEART_LINE_DEPTH",
    "LIFE_LINE_DEPTH",
    "LIFE_LINE_LENGTH",
    "HEAD_LINE_SLOPE",
    "SIMIAN_LINE",
    "CHUAN_PALM",
]

THREE_WAY_FIELDS = [
    "OVERALL_CLARITY",
    "FATE_LINE_CLARITY",
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "LINE_COMPLEXITY",
    "HEART_LINE_DEPTH",
]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _field_keys() -> list[str]:
    return [field["field_key"] for field in load_field_schema()]


def load_manual_annotations(path: Path) -> list[dict[str, Any]]:
    data = _load_json(path)
    annotations = data.get("annotations", data)
    if isinstance(annotations, dict):
        annotations = list(annotations.values())
    if not isinstance(annotations, list):
        raise ValueError("Manual baseline must contain an annotations list or mapping.")
    return annotations


def average_features(items: list[dict[str, Any]]) -> dict[str, float]:
    values: dict[str, list[float]] = {field_key: [] for field_key in _field_keys()}
    for item in items:
        features = item.get("features", item.get("vision_vote", {}).get("final_features", {}))
        for field_key in values:
            value = features.get(field_key)
            if value is not None:
                values[field_key].append(float(value))
    return {
        field_key: statistics.mean(field_values)
        for field_key, field_values in values.items()
        if field_values
    }


def load_result_items(result_dir: Path) -> list[dict[str, Any]]:
    return [_load_json(path) for path in sorted(result_dir.glob("*_result.json"))]


def closer_to_manual(v05_value: float, v06_value: float, manual_value: float) -> str:
    old_error = abs(v05_value - manual_value)
    new_error = abs(v06_value - manual_value)
    if abs(old_error - new_error) < 1e-9:
        return "Tie"
    return "Yes" if new_error < old_error else "No"


def _judgement(delta: float) -> str:
    if abs(delta) <= 0.25:
        return "接近人工"
    return "偏高" if delta > 0 else "偏低"


def _fmt(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2f}"


def write_v05_manual_report(manual_items: list[dict[str, Any]], v05_results: list[dict[str, Any]], output_path: Path) -> None:
    manual_avg = average_features(manual_items)
    v05_avg = average_features(v05_results)
    lines = [
        "# Manual Baseline Compare V0.5",
        "",
        "| 字段 | V0.5 平均值 | 人工平均值 | 偏差 | 判断 |",
        "|---|---:|---:|---:|---|",
    ]
    for field_key in FOCUS_FIELDS:
        old = v05_avg.get(field_key)
        manual = manual_avg.get(field_key)
        delta = None if old is None or manual is None else old - manual
        lines.append(
            f"| {field_key} | {_fmt(old)} | {_fmt(manual)} | {_fmt(delta)} | "
            f"{'n/a' if delta is None else _judgement(delta)} |"
        )
    lines.extend(
        [
            "",
            "## Diagnosis",
            "",
            "- OVERALL_CLARITY in V0.5 stays fixed at 2 and is above the manual average when image quality is not uniformly high.",
            "- FATE_LINE_CLARITY is much lower than manual baseline, so V0.5 over-corrected this field.",
            "- LINE_COMPLEXITY is close to manual baseline and should keep the V0.5 counting logic.",
            "- HEAD_LINE_LENGTH being high is supported by manual baseline and should not be forced down.",
        ]
    )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _persona_distribution(results: list[dict[str, Any]]) -> Counter[str]:
    return Counter(item.get("engine_result", {}).get("persona_id", "UNKNOWN") for item in results)


def _mother_distribution(results: list[dict[str, Any]]) -> Counter[str]:
    return Counter(item.get("engine_result", {}).get("primary_mother", "UNKNOWN") for item in results)


def _manual_engine_results(manual_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {"image_id": item.get("image_id"), "engine_result": build_result(item.get("features", {}))}
        for item in manual_items
    ]


def _pass_consistency(pass_dir: Path) -> float:
    groups: dict[str, list[dict[str, Any]]] = {}
    for path in sorted(pass_dir.glob("*_pass_*.json")):
        stem = path.stem.rsplit("_pass_", 1)[0]
        groups.setdefault(stem, []).append(_load_json(path).get("features", {}))
    rates: list[float] = []
    for field_key in _field_keys():
        if not groups:
            continue
        consistent = 0
        for passes in groups.values():
            if len(passes) == 3 and len({one_pass.get(field_key) for one_pass in passes}) == 1:
                consistent += 1
        rates.append(consistent / len(groups))
    return statistics.mean(rates) if rates else 0.0


def _low_confidence_average(results: list[dict[str, Any]]) -> float:
    counts = [len(low_confidence_fields(item.get("vision_vote", {}))) for item in results]
    return statistics.mean(counts) if counts else 0.0


def write_v05_v06_report(
    v05_results: list[dict[str, Any]],
    v06_results: list[dict[str, Any]],
    v05_pass_dir: Path,
    v06_pass_dir: Path,
    output_path: Path,
) -> None:
    v05_avg = average_features(v05_results)
    v06_avg = average_features(v06_results)
    v05_mothers = _mother_distribution(v05_results)
    v06_mothers = _mother_distribution(v06_results)
    v05_personas = _persona_distribution(v05_results)
    v06_personas = _persona_distribution(v06_results)
    lines = [
        "# Vision Compare V0.5 vs V0.6",
        "",
        "| 指标 | V0.5 | V0.6 |",
        "|---|---:|---:|",
        f"| M1 占比 | {v05_mothers.get('M1', 0)}/{len(v05_results)} | {v06_mothers.get('M1', 0)}/{len(v06_results)} |",
        f"| P06 占比 | {v05_personas.get('P06', 0)}/{len(v05_results)} | {v06_personas.get('P06', 0)}/{len(v06_results)} |",
    ]
    for field_key in THREE_WAY_FIELDS:
        lines.append(f"| {field_key} 平均值 | {_fmt(v05_avg.get(field_key))} | {_fmt(v06_avg.get(field_key))} |")
    lines.extend(
        [
            f"| 三次识别一致率 | {_pass_consistency(v05_pass_dir):.1%} | {_pass_consistency(v06_pass_dir):.1%} |",
            f"| 低置信字段数量 | {_low_confidence_average(v05_results):.2f} | {_low_confidence_average(v06_results):.2f} |",
            "",
            "## Distribution",
            "",
            f"- V0.5 primary mothers: {dict(v05_mothers)}",
            f"- V0.6 primary mothers: {dict(v06_mothers)}",
            f"- V0.5 personas: {dict(v05_personas)}",
            f"- V0.6 personas: {dict(v06_personas)}",
        ]
    )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_three_way_report(
    manual_items: list[dict[str, Any]],
    v05_results: list[dict[str, Any]],
    v06_results: list[dict[str, Any]],
    output_path: Path,
) -> None:
    manual_avg = average_features(manual_items)
    v05_avg = average_features(v05_results)
    v06_avg = average_features(v06_results)
    v05_mothers = _mother_distribution(v05_results)
    v06_mothers = _mother_distribution(v06_results)
    v05_personas = _persona_distribution(v05_results)
    v06_personas = _persona_distribution(v06_results)
    manual_engine = _manual_engine_results(manual_items)
    manual_mothers = _mother_distribution(manual_engine)
    manual_personas = _persona_distribution(manual_engine)
    lines = [
        "# Vision Compare V0.5 / V0.6 / Manual",
        "",
        "| 字段 | V0.5 | V0.6 | 人工基准 | V0.6是否更接近人工 |",
        "|---|---:|---:|---:|---|",
    ]
    for field_key in THREE_WAY_FIELDS:
        old = v05_avg.get(field_key, 0.0)
        new = v06_avg.get(field_key, 0.0)
        manual = manual_avg.get(field_key, 0.0)
        lines.append(
            f"| {field_key} | {_fmt(old)} | {_fmt(new)} | {_fmt(manual)} | "
            f"{closer_to_manual(old, new, manual)} |"
        )

    non_m1_v06 = len(v06_results) - v06_mothers.get("M1", 0)
    recovered_targets = {key: v06_mothers.get(key, 0) for key in ["M5", "M6", "M7"] if v06_mothers.get(key, 0)}
    if recovered_targets:
        recovery_text = f"Yes: {recovered_targets}"
    elif non_m1_v06:
        recovery_text = f"Partial: non-M1 appeared {non_m1_v06}/{len(v06_results)}, but M5/M6/M7 did not appear"
    else:
        recovery_text = "No"

    lines.extend(
        [
            "",
            "## Distribution Summary",
            "",
            f"- V0.5 人格分布: {dict(v05_personas)}",
            f"- V0.6 人格分布: {dict(v06_personas)}",
            f"- V0.5 母型分布: {dict(v05_mothers)}",
            f"- V0.6 母型分布: {dict(v06_mothers)}",
            f"- 人工基准跑规则后的母型分布: {dict(manual_mothers)}",
            f"- 人工基准跑规则后的人格分布: {dict(manual_personas)}",
            f"- V0.6 是否仍然 M1 过度集中: {'Yes' if v06_mothers.get('M1', 0) >= 6 else 'No'} ({v06_mothers.get('M1', 0)}/{len(v06_results)})",
            f"- V0.6 是否恢复 M6 / M5 / M7 等非 M1 母型: {recovery_text}",
            "",
            "## Notes",
            "",
            "- V0.6 should be judged against the manual baseline before touching any rule weights.",
            "- If FATE_LINE_CLARITY remains below manual average, the visual prompt is still too strict on shallow vertical lines.",
            "- If OVERALL_CLARITY remains fixed at 2, the model is still treating photo visibility as palm-line clarity.",
        ]
    )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare Qwen vision outputs with manual baseline.")
    parser.add_argument(
        "--manual",
        type=Path,
        default=PROJECT_ROOT / "data" / "manual_baseline" / "PalmTag_manual_annotations_v01.json",
    )
    parser.add_argument("--v05-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v05")
    parser.add_argument("--v05-pass-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_vision_passes_v05")
    parser.add_argument("--v06-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v06")
    parser.add_argument("--v06-pass-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_vision_passes_v06")
    args = parser.parse_args()

    output_dir = PROJECT_ROOT / "outputs"
    manual_items = load_manual_annotations(args.manual)
    v05_results = load_result_items(args.v05_result_dir)
    write_v05_manual_report(manual_items, v05_results, output_dir / "manual_baseline_compare_v05.md")
    print("Wrote outputs/manual_baseline_compare_v05.md")

    if args.v06_result_dir.exists() and any(args.v06_result_dir.glob("*_result.json")):
        v06_results = load_result_items(args.v06_result_dir)
        write_v05_v06_report(
            v05_results,
            v06_results,
            args.v05_pass_dir,
            args.v06_pass_dir,
            output_dir / "vision_compare_v05_v06.md",
        )
        write_three_way_report(
            manual_items,
            v05_results,
            v06_results,
            output_dir / "vision_compare_v05_v06_manual.md",
        )
        print("Wrote outputs/vision_compare_v05_v06.md")
        print("Wrote outputs/vision_compare_v05_v06_manual.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
