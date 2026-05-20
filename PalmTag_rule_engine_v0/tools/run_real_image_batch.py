from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.result_builder import build_result
from src.vision_vote import load_three_pass_jsons, low_confidence_fields, merge_three_passes
from tools.prepare_manual_vision_tasks import (
    DEFAULT_IMAGE_DIR,
    create_manual_tasks,
    parse_image_filename,
    write_inventory,
    write_manual_mode_report,
)


WATCH_FIELDS = {
    "SIMIAN_LINE",
    "CHUAN_PALM",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "HEAD_LINE_DEPTH",
    "HEART_LINE_DEPTH",
    "FATE_LINE_CLARITY",
}


def _safe_name(path: Path) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", path.stem)


def _field_values(passes: list[dict[str, Any]], field_key: str) -> list[Any]:
    return [one_pass.get(field_key) for one_pass in passes]


def _manual_review_issues(vote_result: dict[str, Any], engine_result: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    passes = vote_result["passes"]
    for field_key in WATCH_FIELDS:
        values = _field_values(passes, field_key)
        non_null = [value for value in values if value is not None]
        if len(set(non_null)) > 1:
            issues.append(f"{field_key} 三次识别不一致: {values}")

    low_fields = set(low_confidence_fields(vote_result))
    dominant_fields = set()
    primary = engine_result.get("primary_mother")
    persona_id = engine_result.get("persona_id")
    score_trace = engine_result.get("score_trace", {})
    for item in score_trace.get("mother_score_trace", {}).get(primary, []):
        if item.get("score", 0) > 0:
            dominant_fields.add(item["field_key"])
    persona_trace = score_trace.get("persona_match_trace", {}).get(persona_id, {})
    for item in persona_trace.get("rules", []):
        if item.get("matched"):
            dominant_fields.add(item["field_key"])
    risky = sorted(low_fields & dominant_fields)
    if risky:
        issues.append(f"最终人格依赖低置信字段: {', '.join(risky)}")
    return issues


def run_with_vision_jsons(image_dir: Path, vision_json_dir: Path, limit: int = 10) -> list[dict[str, Any]] | None:
    selected = write_inventory(image_dir, limit=limit)
    output_dir = PROJECT_ROOT / "outputs" / "real_image_batch"
    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    missing_any = False

    for image_path in selected:
        passes = load_three_pass_jsons(image_path.stem, vision_json_dir)
        if passes is None:
            missing_any = True
            continue
        parsed = parse_image_filename(image_path)
        vote_result = merge_three_passes(
            image_file=str(image_path),
            person_id=parsed["person_id"] or image_path.stem,
            hand_side=parsed["hand_side"] or "",
            passes=passes,
        )
        engine_result = build_result(vote_result["final_features"])
        combined = {
            "image_file": str(image_path),
            "person_id": vote_result["person_id"],
            "hand_side": vote_result["hand_side"],
            "vision_vote": vote_result,
            "engine_result": engine_result,
            "manual_review_issues": _manual_review_issues(vote_result, engine_result),
        }
        output_path = output_dir / f"{_safe_name(image_path)}_result.json"
        output_path.write_text(json.dumps(combined, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        results.append(combined)

    if missing_any and not results:
        return None
    return results


def write_real_image_report(results: list[dict[str, Any]], output_path: Path = PROJECT_ROOT / "outputs" / "real_image_batch_report.md") -> None:
    lines = [
        "# Real Image Batch Report",
        "",
        f"- Tested images: {len(results)}",
        "",
        "| # | File | hand_side | Feature summary | Low confidence fields | Primary mother | Persona | Display copy | Resolver | Review issues |",
        "|---:|---|---|---|---|---|---|---|---|---|",
    ]
    for index, item in enumerate(results, start=1):
        vote = item["vision_vote"]
        engine = item["engine_result"]
        features = vote["final_features"]
        summary_keys = [
            "SIMIAN_LINE",
            "CHUAN_PALM",
            "OVERALL_CLARITY",
            "LINE_COMPLEXITY",
            "HEAD_LINE_DEPTH",
            "HEART_LINE_DEPTH",
            "FATE_LINE_CLARITY",
        ]
        feature_summary = ", ".join(f"{key}={features[key]}" for key in summary_keys)
        display_ok = "Yes" if engine.get("display_content", {}).get("hook") else "No"
        resolver_used = "Yes" if engine.get("score_trace", {}).get("resolver_used") else "No"
        issues = "; ".join(item["manual_review_issues"]) if item["manual_review_issues"] else "None"
        lines.append(
            f"| {index} | {Path(item['image_file']).name} | {item['hand_side']} | {feature_summary} | "
            f"{', '.join(low_confidence_fields(vote)) or 'None'} | {engine['primary_mother']} | "
            f"{engine['persona_id']} {engine['persona_name']} | {display_ok} | {resolver_used} | {issues} |"
        )
    lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run real PalmTag image batch or prepare manual vision tasks.")
    parser.add_argument("--image-dir", type=Path, default=DEFAULT_IMAGE_DIR)
    parser.add_argument("--vision-json-dir", type=Path, default=None)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    if args.vision_json_dir:
        results = run_with_vision_jsons(args.image_dir, args.vision_json_dir, limit=args.limit)
        if results:
            write_real_image_report(results)
            print(f"Wrote {len(results)} real image result JSON files and outputs/real_image_batch_report.md")
            return 0

    selected = write_inventory(args.image_dir, limit=args.limit)
    task_paths = create_manual_tasks(args.image_dir, limit=args.limit)
    write_manual_mode_report(task_paths)
    print(
        "No complete 3-pass vision JSON set was provided. "
        f"Prepared manual mode for {len(selected)} images."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
