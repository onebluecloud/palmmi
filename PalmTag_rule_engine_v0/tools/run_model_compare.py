from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tools.compare_manual_baseline import average_features, load_manual_annotations
from tools.run_qwen_real_image_batch import run_qwen_batch


DEFAULT_MODELS = [
    "qwen-vl-plus",
    "qwen3-vl-plus",
    "qwen3.5-plus",
    "qwen3.5-flash",
    "qwen3.6-plus",
    "qwen3.6-flash",
]

FOCUS_FIELDS = [
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "FATE_LINE_CLARITY",
    "HEART_LINE_DEPTH",
    "LIFE_LINE_DEPTH",
    "LIFE_LINE_LENGTH",
    "SIMIAN_LINE",
    "CHUAN_PALM",
]


def model_suffix(model: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", model).strip("_").lower()


def _fmt(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2f}"


def average_absolute_error(model_avg: dict[str, float], manual_avg: dict[str, float], fields: list[str]) -> float:
    errors = [
        abs(float(model_avg[field_key]) - float(manual_avg[field_key]))
        for field_key in fields
        if field_key in model_avg and field_key in manual_avg
    ]
    return statistics.mean(errors) if errors else float("inf")


def _persona_distribution(results: list[dict[str, Any]]) -> Counter[str]:
    return Counter(item.get("engine_result", {}).get("persona_id", "UNKNOWN") for item in results)


def _mother_distribution(results: list[dict[str, Any]]) -> Counter[str]:
    return Counter(item.get("engine_result", {}).get("primary_mother", "UNKNOWN") for item in results)


def _failure_reason(results: list[dict[str, Any]], fallback: str = "") -> str:
    if fallback:
        return fallback
    for item in results:
        for pass_result in item.get("vision_passes", []):
            errors = pass_result.get("errors") or []
            if errors:
                return str(errors[0])
    return ""


def summarize_model_results(
    model: str,
    results: list[dict[str, Any]],
    average_error: float,
    failure_reason: str,
) -> dict[str, Any]:
    total_passes = sum(len(item.get("passes_success", [])) for item in results)
    failed_passes = sum(
        1
        for item in results
        for success in item.get("passes_success", [])
        if not success
    )
    complete_passes = sum(
        1
        for item in results
        for count in item.get("recognized_field_counts", [])
        if int(count) == 33
    )
    json_parse_failures = sum(
        int(pass_result.get("json_parse_failures", 0))
        for item in results
        for pass_result in item.get("vision_passes", [])
    )
    mothers = _mother_distribution(results)
    personas = _persona_distribution(results)
    image_count = len(results)
    api_failed_count = sum(1 for item in results if not all(item.get("passes_success", [])))
    return {
        "model": model,
        "success": image_count == 9 and api_failed_count == 0 and total_passes > 0,
        "image_count": image_count,
        "api_failed_count": api_failed_count,
        "failed_passes": failed_passes,
        "json_parse_failures": json_parse_failures,
        "field_complete_rate": complete_passes / total_passes if total_passes else 0.0,
        "average_error": average_error,
        "m1_count": mothers.get("M1", 0),
        "p06_count": personas.get("P06", 0),
        "persona_distribution": dict(personas),
        "mother_distribution": dict(mothers),
        "failure_reason": _failure_reason(results, failure_reason),
    }


def write_field_compare(
    model: str,
    results: list[dict[str, Any]],
    manual_avg: dict[str, float],
    output_path: Path,
    failure_reason: str = "",
) -> dict[str, float]:
    model_avg = average_features(results) if results else {}
    lines = [
        f"# Field Compare: {model}",
        "",
        f"- Status: {'failed' if failure_reason else 'completed'}",
    ]
    if failure_reason:
        lines.append(f"- Failure reason: {failure_reason}")
    lines.extend(
        [
            "",
            "| 字段 | 模型平均值 | 人工平均值 | 偏差 |",
            "|---|---:|---:|---:|",
        ]
    )
    for field_key in FOCUS_FIELDS:
        model_value = model_avg.get(field_key)
        manual_value = manual_avg.get(field_key)
        delta = None if model_value is None or manual_value is None else model_value - manual_value
        lines.append(f"| {field_key} | {_fmt(model_value)} | {_fmt(manual_value)} | {_fmt(delta)} |")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return model_avg


def _recommend_model(summaries: list[dict[str, Any]]) -> str:
    successful = [item for item in summaries if item["success"]]
    if not successful:
        return "None; no model completed the 9-image batch without API failures."

    def score(item: dict[str, Any]) -> float:
        image_count = max(item["image_count"], 1)
        m1_share = item["m1_count"] / image_count
        p06_share = item["p06_count"] / image_count
        incomplete_penalty = 1.0 - item["field_complete_rate"]
        return item["average_error"] + 0.05 * m1_share + 0.03 * p06_share + incomplete_penalty

    ranked = sorted(
        successful,
        key=score,
    )
    best = ranked[0]
    return (
        f"{best['model']} (best balanced score: {score(best):.3f}; "
        f"manual-baseline average error={best['average_error']:.2f}; "
        f"M1={best['m1_count']}/{best['image_count']}, "
        f"P06={best['p06_count']}/{best['image_count']}, "
        f"33-field complete rate={best['field_complete_rate']:.1%})"
    )


def write_summary(summaries: list[dict[str, Any]], output_path: Path) -> None:
    lines = [
        "# Model Compare Summary",
        "",
        "| Model | Success | API failed images | JSON parse failures | 33-field complete rate | Avg manual error | M1 share | P06 share | Persona distribution | Failure reason |",
        "|---|---|---:|---:|---:|---:|---:|---:|---|---|",
    ]
    for item in summaries:
        image_count = max(item["image_count"], 1)
        lines.append(
            f"| {item['model']} | {'Yes' if item['success'] else 'No'} | "
            f"{item['api_failed_count']} | {item['json_parse_failures']} | "
            f"{item['field_complete_rate']:.1%} | "
            f"{_fmt(None if item['average_error'] == float('inf') else item['average_error'])} | "
            f"{item['m1_count']}/{image_count} | {item['p06_count']}/{image_count} | "
            f"{json.dumps(item['persona_distribution'], ensure_ascii=False)} | "
            f"{item['failure_reason'] or 'None'} |"
        )
    lines.extend(
        [
            "",
            "## Recommendation",
            "",
            f"- Most recommended for PalmTag: {_recommend_model(summaries)}",
        ]
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def load_existing_results(output_root: Path, model: str) -> list[dict[str, Any]]:
    result_dir = output_root / f"qwen_real_image_batch_{model_suffix(model)}"
    if not result_dir.exists():
        return []
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(result_dir.glob("*_result.json"))
    ]


def run_model_compare(
    models: list[str],
    input_dir: Path,
    limit: int,
    prompt_path: Path,
    manual_path: Path,
    output_root: Path = PROJECT_ROOT / "outputs",
    reuse_existing: bool = False,
    summary_only: bool = False,
) -> list[dict[str, Any]]:
    manual_avg = average_features(load_manual_annotations(manual_path))
    compare_dir = output_root / "model_compare"
    summaries: list[dict[str, Any]] = []

    for model in models:
        suffix = model_suffix(model)
        results: list[dict[str, Any]] = load_existing_results(output_root, model) if (reuse_existing or summary_only) else []
        failure_reason = ""
        if summary_only:
            if len(results) < limit:
                failure_reason = f"Only {len(results)}/{limit} existing result files found."
        elif reuse_existing and len(results) >= limit:
            results = results[:limit]
        else:
            try:
                batch = run_qwen_batch(
                    input_dir=input_dir,
                    limit=limit,
                    model=model,
                    prompt_path=prompt_path,
                    output_suffix=suffix,
                    output_root=output_root,
                )
                results = batch["results"]
            except Exception as exc:
                failure_reason = f"Batch failed: {exc}"
        model_avg = write_field_compare(
            model=model,
            results=results,
            manual_avg=manual_avg,
            output_path=compare_dir / f"{suffix}_field_compare.md",
            failure_reason=failure_reason,
        )
        average_error = average_absolute_error(model_avg, manual_avg, FOCUS_FIELDS)
        summaries.append(
            summarize_model_results(
                model=model,
                results=results,
                average_error=average_error,
                failure_reason=failure_reason,
            )
        )
        write_summary(summaries, compare_dir / "model_compare_summary.md")

    write_summary(summaries, compare_dir / "model_compare_summary.md")
    return summaries


def _parse_models(text: str | None) -> list[str]:
    if not text:
        return DEFAULT_MODELS
    return [item.strip() for item in text.split(",") if item.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare Qwen vision models on PalmTag palm images.")
    parser.add_argument("--input-dir", type=Path, default=PROJECT_ROOT / "samples" / "palms")
    parser.add_argument("--limit", type=int, default=9)
    parser.add_argument("--prompt", type=Path, default=PROJECT_ROOT / "prompts" / "palm_feature_extraction_prompt_v06.md")
    parser.add_argument(
        "--manual",
        type=Path,
        default=PROJECT_ROOT / "data" / "manual_baseline" / "PalmTag_manual_annotations_v01.json",
    )
    parser.add_argument("--models", default=None, help="Comma-separated model list. Defaults to required plus optional candidates.")
    parser.add_argument("--reuse-existing", action="store_true", help="Reuse complete existing model outputs instead of rerunning them.")
    parser.add_argument("--summary-only", action="store_true", help="Only summarize existing model outputs; do not call the API.")
    args = parser.parse_args()

    summaries = run_model_compare(
        models=_parse_models(args.models),
        input_dir=args.input_dir,
        limit=args.limit,
        prompt_path=args.prompt,
        manual_path=args.manual,
        reuse_existing=args.reuse_existing,
        summary_only=args.summary_only,
    )
    completed = sum(1 for item in summaries if item["success"])
    print(f"Compared {len(summaries)} models; {completed} completed without API failures.")
    print("Wrote outputs/model_compare/model_compare_summary.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
