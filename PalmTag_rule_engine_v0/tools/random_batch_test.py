from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema
from src.result_builder import build_result


DEFAULT_COUNT = 1000
DEFAULT_SEED = 20260511
MOTHER_IDS = [f"M{i}" for i in range(1, 9)]
PERSONA_IDS = [f"P{i:02d}" for i in range(1, 37)]


def options_for_value_range(value_range: str) -> list[int]:
    text = str(value_range or "").strip()
    slash_match = re.fullmatch(r"(\d+)\s*/\s*(\d+)", text)
    if slash_match:
        return [int(slash_match.group(1)), int(slash_match.group(2))]

    range_match = re.search(r"(\d+)\s*-\s*(\d+)", text)
    if range_match:
        start = int(range_match.group(1))
        end = int(range_match.group(2))
        if start > end:
            raise ValueError(f"Invalid descending value range: {value_range}")
        return list(range(start, end + 1))

    raise ValueError(f"Unsupported value range: {value_range}")


def _load_field_options() -> dict[str, list[int]]:
    return {
        row["field_key"]: options_for_value_range(row["value_range"])
        for row in load_field_schema()
    }


def generate_random_inputs(
    count: int = DEFAULT_COUNT,
    output_dir: Path | None = None,
    seed: int = DEFAULT_SEED,
) -> list[dict[str, Any]]:
    output_dir = output_dir or PROJECT_ROOT / "tests" / "random_inputs"
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_file in output_dir.glob("random_*.json"):
        old_file.unlink()

    rng = random.Random(seed)
    field_options = _load_field_options()
    records: list[dict[str, Any]] = []
    for index in range(1, count + 1):
        input_id = f"random_{index:04d}"
        features = {
            field_key: rng.choice(options)
            for field_key, options in field_options.items()
        }
        path = output_dir / f"{input_id}.json"
        path.write_text(json.dumps(features, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        records.append({"input_id": input_id, "features": features, "path": str(path)})
    return records


def _resolver_pair(result: dict[str, Any]) -> str | None:
    trace = result.get("score_trace", {}).get("resolver_trace", {})
    if not trace.get("resolver_used"):
        return None
    rule = trace.get("rule") or {}
    persona_a = rule.get("persona_a")
    persona_b = rule.get("persona_b")
    if persona_a and persona_b:
        return f"{persona_a}-{persona_b}"
    before = trace.get("before")
    after = trace.get("after")
    return f"{before}-{after}" if before and after else "unknown"


def _primary_core_support_count(result: dict[str, Any]) -> int:
    primary = result.get("primary_mother")
    trace = result.get("score_trace", {}).get("core_support_trace", {})
    if not primary or primary not in trace:
        return 0
    return int(trace[primary].get("count", 0))


def _dominant_fields(result: dict[str, Any]) -> list[str]:
    fields: list[str] = []
    primary = result.get("primary_mother")
    persona_id = result.get("persona_id")
    score_trace = result.get("score_trace", {})

    for item in score_trace.get("mother_score_trace", {}).get(primary, []):
        if item.get("score", 0) > 0 and item.get("is_core_support"):
            fields.append(item["field_key"])

    persona_trace = score_trace.get("persona_match_trace", {}).get(persona_id, {})
    for item in persona_trace.get("rules", []):
        if item.get("matched"):
            fields.append(item["field_key"])

    return sorted(set(fields))


def build_batch_results(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    batch_results: list[dict[str, Any]] = []
    for record in records:
        result = build_result(record["features"])
        display = result.get("display_content", {})
        batch_results.append(
            {
                "input_id": record["input_id"],
                "primary_mother": result.get("primary_mother"),
                "secondary_mother": result.get("secondary_mother"),
                "persona_id": result.get("persona_id"),
                "persona_name": result.get("persona_name"),
                "mother_scores": result.get("score_trace", {}).get("mother_scores", {}),
                "persona_scores": result.get("score_trace", {}).get("persona_scores", {}),
                "resolver_used": result.get("score_trace", {}).get("resolver_used", False),
                "resolver_pair": _resolver_pair(result),
                "core_support_count": _primary_core_support_count(result),
                "display_content_loaded": bool(display.get("hook") and result.get("persona_name")),
                "dominant_fields": _dominant_fields(result),
            }
        )
    return batch_results


def write_batch_results(results: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _percent(count: int, total: int) -> float:
    return round((count / total) * 100, 2) if total else 0.0


def _mother_status(percent: float) -> str:
    if percent > 35:
        return "严重偏斜"
    if percent > 25:
        return "警告"
    if percent < 5:
        return "可能过严"
    return "正常"


def _persona_status(count: int, percent: float) -> str:
    if count == 0:
        return "规则无法命中，必须检查"
    if percent > 10:
        return "警告"
    return "正常"


def _top_items(counter: Counter[str], limit: int = 8) -> str:
    if not counter:
        return "无"
    return ", ".join(f"{key}={value}" for key, value in counter.most_common(limit))


def analyze_distribution(results: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(results)
    mother_counts = Counter(item.get("primary_mother") or "EMPTY" for item in results)
    persona_counts = Counter(item.get("persona_id") or "EMPTY" for item in results)
    resolver_counts = Counter(
        item["resolver_pair"] for item in results if item.get("resolver_used")
    )
    no_persona = [item["input_id"] for item in results if not item.get("persona_id")]
    empty_output = [
        item["input_id"]
        for item in results
        if not item.get("primary_mother") or not item.get("persona_id") or not item.get("persona_name")
    ]
    weak_core = [
        item["input_id"]
        for item in results
        if item.get("primary_mother") and int(item.get("core_support_count", 0)) < 2
    ]
    missing_display = [
        item["input_id"] for item in results if not item.get("display_content_loaded")
    ]

    persona_percentages = {
        persona_id: _percent(persona_counts.get(persona_id, 0), total)
        for persona_id in PERSONA_IDS
    }
    mother_percentages = {
        mother_id: _percent(mother_counts.get(mother_id, 0), total)
        for mother_id in MOTHER_IDS
    }
    top_persona_share = sum(
        count for _, count in persona_counts.most_common(3)
    )
    extreme_concentration = total > 0 and (top_persona_share / total) > 0.45

    return {
        "total": total,
        "mother_counts": mother_counts,
        "mother_percentages": mother_percentages,
        "persona_counts": persona_counts,
        "persona_percentages": persona_percentages,
        "resolver_counts": resolver_counts,
        "resolver_total": sum(resolver_counts.values()),
        "no_persona": no_persona,
        "weak_core": weak_core,
        "empty_output": empty_output,
        "missing_display": missing_display,
        "extreme_concentration": extreme_concentration,
        "top_persona_share_percent": _percent(top_persona_share, total),
    }


def _field_influence_summary(results: list[dict[str, Any]]) -> list[str]:
    field_counts: Counter[str] = Counter()
    for item in results:
        field_counts.update(item.get("dominant_fields", []))

    if not field_counts:
        return ["- 暂无足够得分数据判断字段影响。"]
    total = len(results)
    top_fields = [
        f"{field}={count} ({_percent(count, total)}%)"
        for field, count in field_counts.most_common(12)
    ]
    oversized = [
        f"{field}={count} ({_percent(count, total)}%)"
        for field, count in field_counts.items()
        if _percent(count, total) > 45
    ]
    return [
        "- 高频影响字段："
        + ", ".join(top_fields)
        + "。",
        "- 可能影响过大的字段："
        + (", ".join(sorted(oversized)) if oversized else "未发现单字段参与超过 45% 输出。"),
    ]


def _recommendations(analysis: dict[str, Any]) -> list[str]:
    total = analysis["total"]
    mother_counts: Counter[str] = analysis["mother_counts"]
    persona_counts: Counter[str] = analysis["persona_counts"]
    resolver_counts: Counter[str] = analysis["resolver_counts"]

    high_mothers = [
        mother_id
        for mother_id in MOTHER_IDS
        if _percent(mother_counts.get(mother_id, 0), total) > 25
    ]
    low_mothers = [
        mother_id
        for mother_id in MOTHER_IDS
        if _percent(mother_counts.get(mother_id, 0), total) < 5
    ]
    zero_personas = [pid for pid in PERSONA_IDS if persona_counts.get(pid, 0) == 0]
    rare_personas = [
        pid
        for pid in PERSONA_IDS
        if 0 < _percent(persona_counts.get(pid, 0), total) < 1
    ]
    over_resolvers = [
        pair
        for pair, count in resolver_counts.items()
        if _percent(count, total) > 5
    ]

    lines = []
    lines.append(
        "- 可能过高的母型权重："
        + (", ".join(high_mothers) if high_mothers else "未发现超过 25% 的母型。")
    )
    lines.append(
        "- 可能过低或规则过严的母型："
        + (", ".join(low_mothers) if low_mothers else "未发现低于 5% 的母型。")
    )
    lines.append(
        "- 几乎无法命中的人格："
        + (", ".join(zero_personas) if zero_personas else "未发现 0 命中的人格。")
    )
    lines.append(
        "- 低命中人格（0-1%）："
        + (", ".join(rare_personas) if rare_personas else "未发现低于 1% 但非 0 的人格。")
    )
    lines.append(
        "- 可能过度触发的易混分流："
        + (", ".join(over_resolvers) if over_resolvers else "未发现单组分流超过总样本 5%。")
    )
    return lines


def write_distribution_report(results: list[dict[str, Any]], report_path: Path) -> dict[str, Any]:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    analysis = analyze_distribution(results)
    total = analysis["total"]
    mother_counts: Counter[str] = analysis["mother_counts"]
    persona_counts: Counter[str] = analysis["persona_counts"]
    resolver_counts: Counter[str] = analysis["resolver_counts"]

    lines = [
        "# Random Distribution Report",
        "",
        f"- Total random samples: {total}",
        f"- Adjacent resolver triggered: {analysis['resolver_total']} ({_percent(analysis['resolver_total'], total)}%)",
        "",
        "## 母型分布",
        "",
        "| Mother | Count | Percent | Status |",
        "|---|---:|---:|---|",
    ]
    for mother_id in MOTHER_IDS:
        count = mother_counts.get(mother_id, 0)
        percent = _percent(count, total)
        lines.append(f"| {mother_id} | {count} | {percent}% | {_mother_status(percent)} |")

    lines.extend(
        [
            "",
            "## 人格分布",
            "",
            "| Persona | Count | Percent | Status |",
            "|---|---:|---:|---|",
        ]
    )
    for persona_id in PERSONA_IDS:
        count = persona_counts.get(persona_id, 0)
        percent = _percent(count, total)
        lines.append(f"| {persona_id} | {count} | {percent}% | {_persona_status(count, percent)} |")

    lines.extend(
        [
            "",
            (
                f"- 人格分布极度集中：Top 3 人格合计 {analysis['top_persona_share_percent']}%。"
                if analysis["extreme_concentration"]
                else f"- 人格分布极度集中：未发现。Top 3 人格合计 {analysis['top_persona_share_percent']}%。"
            ),
        ]
    )

    lines.extend(
        [
            "",
            "## 易混分流统计",
            "",
            f"- adjacent_resolver 触发次数: {analysis['resolver_total']}",
            f"- 最常触发分流: {_top_items(resolver_counts, limit=12)}",
        ]
    )
    over_coverage = [
        f"{pair}={count} ({_percent(count, total)}%)"
        for pair, count in resolver_counts.items()
        if _percent(count, total) > 5
    ]
    lines.append(
        "- 是否存在过度覆盖: "
        + ("是，" + ", ".join(over_coverage) if over_coverage else "未发现单组分流超过总样本 5%。")
    )

    lines.extend(
        [
            "",
            "## 异常样本",
            "",
            f"- 无法输出人格的样本: {', '.join(analysis['no_persona'][:50]) if analysis['no_persona'] else '无'}",
            f"- 主母型不满足核心字段支撑的样本: {', '.join(analysis['weak_core'][:50]) if analysis['weak_core'] else '无'}",
            f"- 输出为空的样本: {', '.join(analysis['empty_output'][:50]) if analysis['empty_output'] else '无'}",
            f"- display_content 缺失的样本: {', '.join(analysis['missing_display'][:50]) if analysis['missing_display'] else '无'}",
            "",
            "## 规则调整建议",
            "",
        ]
    )
    recommendations = _recommendations(analysis)
    recommendations.extend(_field_influence_summary(results))
    lines.extend(recommendations)
    lines.append("")
    report_path.write_text("\n".join(lines), encoding="utf-8")
    return analysis


def _metric_summary(results: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(results)
    mother_counts = Counter(item.get("primary_mother") for item in results)
    persona_counts = Counter(item.get("persona_id") for item in results)
    heart_count = sum(
        1 for item in results if "HEART_LINE_DEPTH" in item.get("dominant_fields", [])
    )
    return {
        "total": total,
        "m8_percent": _percent(mother_counts.get("M8", 0), total),
        "m7_percent": _percent(mother_counts.get("M7", 0), total),
        "p25_count": persona_counts.get("P25", 0),
        "p29_count": persona_counts.get("P29", 0),
        "heart_line_depth_percent": _percent(heart_count, total),
    }


def _improved(metric: str, before: float | int, after: float | int) -> str:
    if metric == "m8_percent":
        return "是" if after <= 25 and after < before else "否"
    if metric == "m7_percent":
        return "是" if after >= 5 and after > before else "否"
    if metric in {"p25_count", "p29_count"}:
        return "是" if after > before and after > 0 else "否"
    if metric == "heart_line_depth_percent":
        return "是" if after < before else "否"
    return "否"


def compare_distribution_files(v01_path: Path, v02_path: Path, output_path: Path) -> dict[str, Any]:
    v01_results = json.loads(v01_path.read_text(encoding="utf-8"))
    v02_results = json.loads(v02_path.read_text(encoding="utf-8"))
    before = _metric_summary(v01_results)
    after = _metric_summary(v02_results)
    rows = [
        ("M8 占比", "m8_percent", "%"),
        ("M7 占比", "m7_percent", "%"),
        ("P25 命中", "p25_count", ""),
        ("P29 命中", "p29_count", ""),
        ("HEART_LINE_DEPTH 参与率", "heart_line_depth_percent", "%"),
    ]
    lines = [
        "# Distribution Compare V0.1 vs V0.2",
        "",
        "| 指标 | V0.1 | V0.2 | 是否改善 |",
        "|---|---:|---:|---|",
    ]
    for label, key, suffix in rows:
        before_value = before[key]
        after_value = after[key]
        lines.append(
            f"| {label} | {before_value}{suffix} | {after_value}{suffix} | "
            f"{_improved(key, before_value, after_value)} |"
        )
    lines.append("")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return {"v01": before, "v02": after}


def run_batch(
    count: int = DEFAULT_COUNT,
    seed: int = DEFAULT_SEED,
    inputs_dir: Path | None = None,
    results_output: Path | None = None,
    report_output: Path | None = None,
) -> dict[str, Any]:
    records = generate_random_inputs(
        count=count,
        output_dir=inputs_dir or PROJECT_ROOT / "tests" / "random_inputs",
        seed=seed,
    )
    results = build_batch_results(records)
    write_batch_results(results, results_output or PROJECT_ROOT / "outputs" / "random_batch_results.json")
    analysis = write_distribution_report(
        results,
        report_output or PROJECT_ROOT / "outputs" / "random_distribution_report.md",
    )
    return {"records": records, "results": results, "analysis": analysis}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run random batch tests for PalmTag rule engine.")
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--inputs-dir", type=Path, default=PROJECT_ROOT / "tests" / "random_inputs")
    parser.add_argument("--results-output", type=Path, default=PROJECT_ROOT / "outputs" / "random_batch_results_v02.json")
    parser.add_argument("--report-output", type=Path, default=PROJECT_ROOT / "outputs" / "random_distribution_report_v02.md")
    args = parser.parse_args()

    summary = run_batch(
        count=args.count,
        seed=args.seed,
        inputs_dir=args.inputs_dir,
        results_output=args.results_output,
        report_output=args.report_output,
    )
    print(
        "Generated "
        f"{len(summary['records'])} random inputs and {len(summary['results'])} batch results."
    )
    print(f"Wrote {args.results_output}")
    print(f"Wrote {args.report_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
