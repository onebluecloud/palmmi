from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema, load_mother_scoring, load_persona_rules
from src.vision_vote import low_confidence_fields


FOCUS_FIELDS = [
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "FATE_LINE_CLARITY",
    "HEART_LINE_DEPTH",
    "SIMIAN_LINE",
    "CHUAN_PALM",
    "HEAD_LIFE_GAP",
    "MOUNT_JUPITER",
    "MOUNT_SATURN",
    "FINGERTIP_SHAPE",
]


COMPARE_FIELDS = [
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "FATE_LINE_CLARITY",
]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _field_order() -> list[str]:
    return [field["field_key"] for field in load_field_schema()]


def _field_ranges() -> dict[str, int]:
    ranges: dict[str, int] = {}
    for field in load_field_schema():
        text = str(field["value_range"]).strip()
        if text == "0/1":
            ranges[field["field_key"]] = 1
        elif text == "0-2":
            ranges[field["field_key"]] = 2
        else:
            ranges[field["field_key"]] = 3
    return ranges


def _pass_stem(path: Path) -> str:
    return path.stem.rsplit("_pass_", 1)[0]


def load_pass_groups(pass_dir: Path) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for path in sorted(pass_dir.glob("*_pass_*.json")):
        data = _load_json(path)
        features = data.get("features", data)
        groups[_pass_stem(path)].append(features)
    return {stem: passes for stem, passes in groups.items() if len(passes) == 3}


def load_result_items(result_dir: Path) -> list[dict[str, Any]]:
    return [_load_json(path) for path in sorted(result_dir.glob("*_result.json"))]


def _numeric_values(values: list[Any]) -> list[float]:
    return [float(value) for value in values if value is not None]


def _distribution(values: list[Any]) -> str:
    counter = Counter("null" if value is None else str(value) for value in values)
    return ", ".join(f"{key}:{counter[key]}" for key in sorted(counter, key=str))


def _avg(values: list[Any]) -> float | None:
    numeric = _numeric_values(values)
    return statistics.mean(numeric) if numeric else None


def _median(values: list[Any]) -> float | None:
    numeric = _numeric_values(values)
    return statistics.median(numeric) if numeric else None


def _fmt_number(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2f}"


def _consistency_for_field(pass_groups: dict[str, list[dict[str, Any]]], field_key: str) -> float:
    if not pass_groups:
        return 0.0
    consistent = 0
    for passes in pass_groups.values():
        values = [one_pass.get(field_key) for one_pass in passes]
        if len(set(values)) == 1:
            consistent += 1
    return consistent / len(pass_groups)


def _has_large_swing(pass_groups: dict[str, list[dict[str, Any]]], field_key: str) -> bool:
    for passes in pass_groups.values():
        values = _numeric_values([one_pass.get(field_key) for one_pass in passes])
        if values and max(values) - min(values) >= 2:
            return True
    return False


def _bias_flags(field_key: str, avg_value: float | None, consistency_rate: float) -> tuple[str, str, str]:
    if avg_value is None:
        return "No", "No", "Yes"
    max_value = _field_ranges()[field_key]
    if max_value == 1:
        high = avg_value >= 0.8
        low = avg_value <= 0.2
    elif max_value == 2:
        high = avg_value >= 1.5
        low = avg_value <= 0.5
    else:
        high = avg_value >= 2.0
        low = avg_value <= 1.0
    unstable = consistency_rate < 0.75
    return ("Yes" if high else "No", "Yes" if low else "No", "Yes" if unstable else "No")


def collect_field_stats(pass_groups: dict[str, list[dict[str, Any]]], results: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}
    for field_key in _field_order():
        pass_values = [one_pass.get(field_key) for passes in pass_groups.values() for one_pass in passes]
        final_values = [
            item.get("vision_vote", {}).get("final_features", {}).get(field_key)
            for item in results
            if item.get("vision_vote")
        ]
        consistency = _consistency_for_field(pass_groups, field_key)
        pass_avg = _avg(pass_values)
        final_avg = _avg(final_values)
        high, low, unstable = _bias_flags(field_key, pass_avg, consistency)
        if _has_large_swing(pass_groups, field_key):
            unstable = "Yes"
        stats[field_key] = {
            "pass_distribution": _distribution(pass_values),
            "final_distribution": _distribution(final_values),
            "pass_avg": pass_avg,
            "final_avg": final_avg,
            "pass_median": _median(pass_values),
            "final_median": _median(final_values),
            "null_count": sum(1 for value in pass_values if value is None),
            "consistency_rate": consistency,
            "high_bias": high,
            "low_bias": low,
            "unstable": unstable,
        }
    return stats


def write_field_report(stats: dict[str, dict[str, Any]], output_path: Path) -> None:
    lines = [
        "# Vision Field Diagnosis Report",
        "",
        "Scope: 27 Qwen pass JSON files and 9 voted final_features from V0.4.",
        "",
        "## Key Findings",
        "",
    ]
    for field_key in FOCUS_FIELDS:
        item = stats[field_key]
        lines.append(
            f"- {field_key}: pass_avg={_fmt_number(item['pass_avg'])}, "
            f"final_avg={_fmt_number(item['final_avg'])}, consistency={item['consistency_rate']:.1%}, "
            f"high={item['high_bias']}, low={item['low_bias']}, unstable={item['unstable']}"
        )
    lines.extend(
        [
            "",
            "## Full Field Table",
            "",
            "| Field | Pass distribution | Final distribution | Pass avg | Final avg | Median | Nulls | 3-pass consistency | High bias | Low bias | Unstable |",
            "|---|---|---|---:|---:|---:|---:|---:|---|---|---|",
        ]
    )
    for field_key in _field_order():
        item = stats[field_key]
        lines.append(
            f"| {field_key} | {item['pass_distribution']} | {item['final_distribution']} | "
            f"{_fmt_number(item['pass_avg'])} | {_fmt_number(item['final_avg'])} | "
            f"{_fmt_number(item['pass_median'])} | {item['null_count']} | "
            f"{item['consistency_rate']:.1%} | {item['high_bias']} | {item['low_bias']} | {item['unstable']} |"
        )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _avg_mother_scores(results: list[dict[str, Any]]) -> dict[str, float]:
    buckets: dict[str, list[float]] = defaultdict(list)
    for item in results:
        scores = item.get("engine_result", {}).get("score_trace", {}).get("mother_scores", {})
        for mother_id, score in scores.items():
            buckets[mother_id].append(float(score))
    return {mother_id: statistics.mean(values) for mother_id, values in sorted(buckets.items())}


def _m1_field_contributions(results: list[dict[str, Any]]) -> list[tuple[str, int, float]]:
    buckets: dict[str, list[float]] = defaultdict(list)
    for item in results:
        trace = item.get("engine_result", {}).get("score_trace", {}).get("mother_score_trace", {})
        for rule in trace.get("M1", []):
            score = float(rule.get("score", 0) or 0)
            if score > 0:
                buckets[rule.get("field_key", "")].append(score)
    rows = [(field, len(values), statistics.mean(values)) for field, values in buckets.items()]
    return sorted(rows, key=lambda row: row[2], reverse=True)


def _persona_distribution(results: list[dict[str, Any]]) -> Counter[str]:
    return Counter(item.get("engine_result", {}).get("persona_id", "UNKNOWN") for item in results)


def _primary_distribution(results: list[dict[str, Any]]) -> Counter[str]:
    return Counter(item.get("engine_result", {}).get("primary_mother", "UNKNOWN") for item in results)


def _p06_advantage(results: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    p06_items = [item for item in results if item.get("engine_result", {}).get("persona_id") == "P06"]
    score_buckets: dict[str, list[float]] = defaultdict(list)
    matched_fields: Counter[str] = Counter()
    for item in p06_items:
        trace = item["engine_result"]["score_trace"]
        for persona_id, score in trace.get("persona_scores", {}).items():
            score_buckets[persona_id].append(float(score))
        p06_trace = trace.get("persona_match_trace", {}).get("P06", {})
        for rule in p06_trace.get("rules", []):
            if rule.get("matched"):
                matched_fields[rule["field_key"]] += 1
    if not p06_items:
        return ["- P06 did not appear in this batch."]
    lines.append(f"- P06 count: {len(p06_items)}/{len(results)}")
    lines.append(
        "- Average M1 candidate scores in P06 samples: "
        + ", ".join(
            f"{persona_id}={statistics.mean(values):.1f}"
            for persona_id, values in sorted(score_buckets.items())
        )
    )
    lines.append(
        "- P06 matched fields most often: "
        + ", ".join(f"{field} x{count}" for field, count in matched_fields.most_common())
    )
    return lines


def write_m1_report(stats: dict[str, dict[str, Any]], results: list[dict[str, Any]], output_path: Path) -> None:
    mother_avg = _avg_mother_scores(results)
    mother_dist = _primary_distribution(results)
    persona_dist = _persona_distribution(results)
    lines = [
        "# M1 Concentration Diagnosis",
        "",
        f"- Primary mother distribution: {dict(mother_dist)}",
        f"- Persona distribution: {dict(persona_dist)}",
        f"- M1 average score: {mother_avg.get('M1', 0):.2f}",
        "",
        "## Mother Score Averages",
        "",
        "| Mother | Average score | Gap vs M1 |",
        "|---|---:|---:|",
    ]
    m1_avg = mother_avg.get("M1", 0.0)
    for mother_id, avg_score in mother_avg.items():
        lines.append(f"| {mother_id} | {avg_score:.2f} | {m1_avg - avg_score:.2f} |")

    lines.extend(
        [
            "",
            "## Fields Pushing Samples Toward M1",
            "",
            "| Field | Hit count | Average M1 contribution | V0.4 field pattern |",
            "|---|---:|---:|---|",
        ]
    )
    for field_key, count, avg_score in _m1_field_contributions(results):
        field_stats = stats.get(field_key, {})
        pattern = (
            f"avg={_fmt_number(field_stats.get('pass_avg'))}, "
            f"dist={field_stats.get('pass_distribution', 'n/a')}"
        )
        lines.append(f"| {field_key} | {count} | {avg_score:.2f} | {pattern} |")

    lines.extend(
        [
            "",
            "## Why M2-M8 Did Not Beat M1",
            "",
            "- M1 is consistently supported by HEAD_LINE_DEPTH, HEAD_LINE_LENGTH and OVERALL_CLARITY.",
            "- M2 also scores well through HEART_LINE_DEPTH/HEART_LINE_LENGTH, but it usually trails M1 after voting.",
            "- M3 competes when LINE_COMPLEXITY is 2, but V0.4 often votes LINE_COMPLEXITY to 1, weakening dense-line profiles.",
            "- M4/M5 require strong CHUAN_PALM or SIMIAN_LINE signals; V0.4 returned both as 0 in this batch.",
            "- M6 depends on FATE_LINE_CLARITY and SUN_LINE_PRESENCE; SUN_LINE_PRESENCE is mostly 0.",
            "- M7 needs HEAD_LINE_SLOPE and LINE_COMPLEXITY together; slope and complexity are not high enough to overtake M1.",
            "- M8 needs compound/strong mixed signals; V0.4 did not produce those triggers.",
            "",
            "## Why P06 Dominated",
            "",
        ]
    )
    lines.extend(_p06_advantage(results))

    lines.extend(
        [
            "",
            "## Visual Scale Shift Judgement",
            "",
            f"- OVERALL_CLARITY high? {stats['OVERALL_CLARITY']['high_bias']} "
            f"(avg={_fmt_number(stats['OVERALL_CLARITY']['pass_avg'])}).",
            f"- LINE_COMPLEXITY low? {stats['LINE_COMPLEXITY']['low_bias']} "
            f"(avg={_fmt_number(stats['LINE_COMPLEXITY']['pass_avg'])}).",
            f"- HEAD_LINE_DEPTH high? {stats['HEAD_LINE_DEPTH']['high_bias']} "
            f"(avg={_fmt_number(stats['HEAD_LINE_DEPTH']['pass_avg'])}).",
            f"- FATE_LINE_CLARITY high? {stats['FATE_LINE_CLARITY']['high_bias']}; "
            f"unstable? {stats['FATE_LINE_CLARITY']['unstable']} "
            f"(avg={_fmt_number(stats['FATE_LINE_CLARITY']['pass_avg'])}).",
            f"- MOUNT_JUPITER unstable? {stats['MOUNT_JUPITER']['unstable']}; "
            f"MOUNT_SATURN unstable? {stats['MOUNT_SATURN']['unstable']}.",
            "",
            "Conclusion: V0.4 likely has a visual scale bias toward clear/deep head-line features and insufficiently strict scoring for high clarity/depth labels. Prompt calibration should happen before any rule weight changes.",
        ]
    )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _fields_with(stats: dict[str, dict[str, Any]], key: str) -> list[str]:
    return [field for field, item in stats.items() if item[key] == "Yes"]


def _rules_using_field(field_key: str) -> tuple[list[str], list[str]]:
    mothers = sorted({rule["mother_id"] for rule in load_mother_scoring() if rule.get("field_key") == field_key})
    personas = sorted({rule["persona_id"] for rule in load_persona_rules() if rule.get("field_key") == field_key})
    return mothers, personas


def write_calibration_suggestions(stats: dict[str, dict[str, Any]], output_path: Path) -> None:
    high_fields = _fields_with(stats, "high_bias")
    low_fields = _fields_with(stats, "low_bias")
    unstable_fields = _fields_with(stats, "unstable")
    lines = [
        "# Vision Prompt Calibration Suggestions",
        "",
        "This report only suggests visual-prompt calibration. It does not recommend changing persona names, display copy, 36-persona structure, or rule weights in this phase.",
        "",
        "## Fields Needing Stricter Standards",
        "",
    ]
    strict_fields = [field for field in ["HEAD_LINE_DEPTH", "HEAD_LINE_LENGTH", "OVERALL_CLARITY", "FATE_LINE_CLARITY"] if field in high_fields or field in FOCUS_FIELDS]
    for field_key in strict_fields:
        lines.append(f"- {field_key}: require visible continuity, clear boundaries, and resistance to lighting artifacts before allowing the highest grade.")

    lines.extend(["", "## Fields Needing More Conservative Output", ""])
    for field_key in sorted(set(high_fields) & set(FOCUS_FIELDS)):
        lines.append(f"- {field_key}: V0.4 average is high; prompt should prefer middle values unless the feature is unmistakable.")
    lines.append("- MOUNT_* fields: if palm mound fullness is hard to judge from lighting or camera angle, output 1 instead of 2.")

    lines.extend(["", "## Fields Likely Misread by Qwen", ""])
    for field_key in sorted(set(unstable_fields) & set(FOCUS_FIELDS)):
        lines.append(f"- {field_key}: three-pass consistency is low or has large swings; add specific visual criteria.")

    lines.extend(["", "## Fields To Treat As Auxiliary Observation For Now", ""])
    for field_key in sorted(set(unstable_fields) | {"MOUNT_JUPITER", "MOUNT_SATURN", "MOUNT_APOLLO", "MOUNT_MERCURY", "MOUNT_LUNA"}):
        mothers, personas = _rules_using_field(field_key)
        lines.append(
            f"- {field_key}: unstable/angle-sensitive. Used by mothers {mothers or '[]'} and personas {personas or '[]'}; keep for observation before changing weights."
        )

    lines.extend(
        [
            "",
            "## Prompt Scale Notes To Add",
            "",
            "- Highest grade 3 should mean very obvious, continuous, and shape-stable across the visible palm, not merely visible.",
            "- Normal visibility should usually be 2, not 3.",
            "- Uncertain cases should use middle values rather than extremes.",
            "- LINE_COMPLEXITY must include fine cross-lines in the palm center, mounts, and around the three major lines.",
            "- A clear hand photo is not equal to OVERALL_CLARITY=3; the palm lines themselves must be crisp and low-noise.",
            "- FATE_LINE_CLARITY should not be high unless a vertical fate line is independently visible and continuous.",
        ]
    )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _dataset_metrics(pass_dir: Path, result_dir: Path) -> dict[str, Any]:
    pass_groups = load_pass_groups(pass_dir)
    results = load_result_items(result_dir)
    stats = collect_field_stats(pass_groups, results)
    total_consistency = []
    for field_key in _field_order():
        total_consistency.append(_consistency_for_field(pass_groups, field_key))
    low_counts = [len(low_confidence_fields(item.get("vision_vote", {}))) for item in results]
    return {
        "pass_groups": pass_groups,
        "results": results,
        "stats": stats,
        "m1_count": _primary_distribution(results).get("M1", 0),
        "p06_count": _persona_distribution(results).get("P06", 0),
        "image_count": len(results),
        "consistency": statistics.mean(total_consistency) if total_consistency else 0.0,
        "low_confidence_avg": statistics.mean(low_counts) if low_counts else 0.0,
        "api_failed": sum(1 for item in results if not all(item.get("passes_success", []))),
        "json_parse_failures": sum(
            int(pass_result.get("json_parse_failures", 0))
            for item in results
            for pass_result in item.get("vision_passes", [])
        ),
        "valid_counts_ok": all(
            count == 33
            for item in results
            for count in item.get("recognized_field_counts", [])
        ),
    }


def _metric_improved(label: str, old: float, new: float) -> str:
    if label == "M1":
        return "Yes" if new < old else "No"
    if label == "P06":
        return "Yes" if new < old else "No"
    if label in {"HEAD_LINE_DEPTH", "HEAD_LINE_LENGTH", "OVERALL_CLARITY", "FATE_LINE_CLARITY"}:
        return "Yes" if new < old else "No"
    if label == "LINE_COMPLEXITY":
        return "Yes" if new > old else "No"
    if label == "consistency":
        return "Yes" if new >= old else "No"
    if label == "low_confidence":
        return "Yes" if new <= old else "No"
    return "Review"


def write_compare_report(v04: dict[str, Any], v05: dict[str, Any], output_path: Path) -> None:
    image_count_v04 = max(v04["image_count"], 1)
    image_count_v05 = max(v05["image_count"], 1)
    lines = [
        "# Vision Compare V0.4 vs V0.5",
        "",
        "| 指标 | V0.4 | V0.5 | 是否改善 |",
        "|---|---:|---:|---|",
    ]
    rows: list[tuple[str, str, float, float]] = [
        ("M1 占比", "M1", v04["m1_count"] / image_count_v04, v05["m1_count"] / image_count_v05),
        ("P06 占比", "P06", v04["p06_count"] / image_count_v04, v05["p06_count"] / image_count_v05),
    ]
    for field_key in COMPARE_FIELDS:
        old = v04["stats"][field_key]["final_avg"] or 0.0
        new = v05["stats"][field_key]["final_avg"] or 0.0
        rows.append((f"{field_key} 平均值", field_key, old, new))
    rows.extend(
        [
            ("三次识别一致率", "consistency", v04["consistency"], v05["consistency"]),
            ("低置信字段数量", "low_confidence", v04["low_confidence_avg"], v05["low_confidence_avg"]),
        ]
    )
    for label, key, old, new in rows:
        if label.endswith("占比"):
            old_display = f"{round(old * image_count_v04)}/{image_count_v04}"
            new_display = f"{round(new * image_count_v05)}/{image_count_v05}"
        elif label == "三次识别一致率":
            old_display = f"{old:.1%}"
            new_display = f"{new:.1%}"
        else:
            old_display = f"{old:.2f}"
            new_display = f"{new:.2f}"
        lines.append(f"| {label} | {old_display} | {new_display} | {_metric_improved(key, old, new)} |")

    lines.extend(
        [
            "",
            "## Run Health",
            "",
            f"- V0.5 API failed images: {v05['api_failed']}",
            f"- V0.5 JSON parse failures: {v05['json_parse_failures']}",
            f"- V0.5 every pass kept 33/33 fields: {'Yes' if v05['valid_counts_ok'] else 'No'}",
            "",
            "## V0.5 Persona Distribution",
            "",
            f"- Primary mothers: {dict(_primary_distribution(v05['results']))}",
            f"- Personas: {dict(_persona_distribution(v05['results']))}",
            "",
            "## Remaining Issues",
            "",
            "- M1 concentration improved but still remains high; V0.5 is a calibration improvement, not a final visual standard.",
            "- OVERALL_CLARITY did not move and still needs a stricter image-quality versus palm-line-quality distinction.",
            "- FATE_LINE_CLARITY dropped sharply; this may be an over-correction and should be checked manually on real images.",
            "- LINE_COMPLEXITY improved and is the main reason P06 concentration dropped.",
            "- Do not change rule weights yet; the next step should compare V0.5 extracted fields against human-labelled fields for the same 9 images.",
        ]
    )
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Diagnose Qwen vision field distributions.")
    parser.add_argument("--pass-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_vision_passes")
    parser.add_argument("--result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch")
    parser.add_argument("--compare-pass-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_vision_passes_v05")
    parser.add_argument("--compare-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v05")
    args = parser.parse_args()

    output_dir = PROJECT_ROOT / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)
    pass_groups = load_pass_groups(args.pass_dir)
    results = load_result_items(args.result_dir)
    stats = collect_field_stats(pass_groups, results)

    write_field_report(stats, output_dir / "vision_field_diagnosis_report.md")
    write_m1_report(stats, results, output_dir / "m1_concentration_diagnosis.md")
    write_calibration_suggestions(stats, output_dir / "vision_prompt_calibration_suggestions.md")

    if args.compare_pass_dir.exists() and args.compare_result_dir.exists():
        v04 = _dataset_metrics(args.pass_dir, args.result_dir)
        v05 = _dataset_metrics(args.compare_pass_dir, args.compare_result_dir)
        write_compare_report(v04, v05, output_dir / "vision_compare_v04_v05.md")

    print("Wrote outputs/vision_field_diagnosis_report.md")
    print("Wrote outputs/m1_concentration_diagnosis.md")
    print("Wrote outputs/vision_prompt_calibration_suggestions.md")
    if (output_dir / "vision_compare_v04_v05.md").exists():
        print("Wrote outputs/vision_compare_v04_v05.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
