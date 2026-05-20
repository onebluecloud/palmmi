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

from src.qwen_vision_client import QwenVisionClient
from src.result_builder import build_result
from src.vision_postprocess import apply_vision_postprocess
from src.vision_vote import low_confidence_fields, merge_three_passes
from tools.prepare_manual_vision_tasks import IMAGE_EXTENSIONS, parse_image_filename
from tools.run_real_image_batch import _manual_review_issues


WATCH_SUMMARY_FIELDS = [
    "SIMIAN_LINE",
    "CHUAN_PALM",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "HEAD_LINE_DEPTH",
    "HEART_LINE_DEPTH",
    "FATE_LINE_CLARITY",
]


def _safe_name(path: Path) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", path.stem)


def _list_images(input_dir: Path, limit: int) -> list[Path]:
    if not input_dir.exists():
        return []
    images = [
        path
        for path in sorted(input_dir.iterdir(), key=lambda item: item.name.lower())
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    return images[:limit]


def _load_prompt(prompt_path: Path | None = None, prompt_text: str | None = None) -> str:
    if prompt_text is not None:
        return prompt_text
    path = prompt_path or PROJECT_ROOT / "prompts" / "palm_feature_extraction_prompt.md"
    return path.read_text(encoding="utf-8")


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _pass_features(pass_result: dict[str, Any]) -> dict[str, Any]:
    return pass_result.get("features", {})


def _non_null_field_count(features: dict[str, Any]) -> int:
    return sum(1 for value in features.values() if value is not None)


def _recognized_counts(pass_results: list[dict[str, Any]]) -> list[int]:
    return [
        int(item.get("non_null_field_count", _non_null_field_count(_pass_features(item))))
        for item in pass_results
    ]


def _vision_review_issues(pass_results: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    counts = _recognized_counts(pass_results)
    if counts and all(count == 0 for count in counts):
        issues.append("三次视觉识别均为全 null，最终结果来自 default_value，不可作为真实掌纹判断")
    elif any(count < 10 for count in counts):
        issues.append(f"视觉有效字段数偏低: {counts}")

    pass_errors: list[str] = []
    for index, item in enumerate(pass_results, start=1):
        errors = item.get("errors") or []
        if errors:
            pass_errors.append(f"pass_{index}: {'; '.join(str(error) for error in errors[:3])}")
    if pass_errors:
        issues.append("视觉识别错误/告警: " + " | ".join(pass_errors))
    return issues


def run_qwen_batch(
    input_dir: Path,
    limit: int = 10,
    model: str | None = None,
    client: Any | None = None,
    output_root: Path = PROJECT_ROOT / "outputs",
    prompt_text: str | None = None,
    prompt_path: Path | None = None,
    output_suffix: str = "",
    skip_existing: bool = False,
) -> dict[str, Any]:
    prompt = _load_prompt(prompt_path=prompt_path, prompt_text=prompt_text)
    extractor = client or QwenVisionClient(model=model)
    images = _list_images(input_dir, limit)
    suffix = f"_{output_suffix.strip('_')}" if output_suffix else ""
    pass_dir = output_root / f"qwen_vision_passes{suffix}"
    result_dir = output_root / f"qwen_real_image_batch{suffix}"
    pass_dir.mkdir(parents=True, exist_ok=True)
    result_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, Any]] = []
    api_failed_images: set[str] = set()
    json_parse_failures = 0

    for image_path in images:
        result_path = result_dir / f"{_safe_name(image_path)}_result.json"
        if skip_existing and result_path.exists():
            results.append(json.loads(result_path.read_text(encoding="utf-8")))
            continue

        parsed = parse_image_filename(image_path)
        pass_results: list[dict[str, Any]] = []
        for index in range(1, 4):
            pass_result = extractor.extract_features(image_path=image_path, prompt_text=prompt, max_retries=1)
            pass_result = {
                "image_file": str(image_path),
                "pass_index": index,
                **pass_result,
            }
            if not pass_result.get("success"):
                api_failed_images.add(image_path.name)
            json_parse_failures += int(pass_result.get("json_parse_failures", 0))
            _write_json(pass_dir / f"{image_path.stem}_pass_{index}.json", pass_result)
            pass_results.append(pass_result)

        vote_result = merge_three_passes(
            image_file=str(image_path),
            person_id=parsed["person_id"] or image_path.stem,
            hand_side=parsed["hand_side"] or "",
            passes=[_pass_features(item) for item in pass_results],
        )
        postprocess_result = apply_vision_postprocess(vote_result, vision_passes=pass_results)
        vote_result = postprocess_result["vote_result"]
        engine_result = build_result(vote_result["final_features"])
        review_issues = _vision_review_issues(pass_results) + _manual_review_issues(vote_result, engine_result)
        if postprocess_result["adjustments"]:
            review_issues.append(
                "Postprocess adjustments: "
                + "; ".join(
                    f"{item['field_key']} {item['before']}->{item['after']}"
                    for item in postprocess_result["adjustments"]
                )
            )
        combined = {
            "image_file": str(image_path),
            "person_id": vote_result["person_id"],
            "hand_side": vote_result["hand_side"],
            "passes_success": [bool(item.get("success")) for item in pass_results],
            "recognized_field_counts": _recognized_counts(pass_results),
            "vision_passes": pass_results,
            "vision_postprocess": postprocess_result,
            "vision_vote": vote_result,
            "engine_result": engine_result,
            "manual_review_issues": review_issues,
        }
        _write_json(result_path, combined)
        results.append(combined)

    report_path = output_root / f"qwen_real_image_batch_report{suffix}.md"
    write_qwen_report(
        results=results,
        api_failed_images=sorted(api_failed_images),
        json_parse_failures=json_parse_failures,
        output_path=report_path,
    )
    return {
        "images": images,
        "results": results,
        "api_failed_images": sorted(api_failed_images),
        "json_parse_failures": json_parse_failures,
        "report_path": report_path,
    }


def write_qwen_report(
    results: list[dict[str, Any]],
    api_failed_images: list[str],
    json_parse_failures: int,
    output_path: Path,
) -> None:
    all_null_images = [
        Path(item["image_file"]).name
        for item in results
        if item.get("recognized_field_counts") and all(count == 0 for count in item["recognized_field_counts"])
    ]
    lines = [
        "# Qwen Real Image Batch Report",
        "",
        f"- Tested images: {len(results)}",
        f"- API call failed images: {', '.join(api_failed_images) if api_failed_images else 'None'}",
        f"- JSON parse failure count: {json_parse_failures}",
        f"- Images with all-null visual passes: {', '.join(all_null_images) if all_null_images else 'None'}",
        "",
        "| # | File | person_id | hand_side | Pass success | Valid fields | Low confidence fields | Final features summary | Primary | Secondary | Persona | Display | Resolver | Review issues |",
        "|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for index, item in enumerate(results, start=1):
        vote = item["vision_vote"]
        engine = item["engine_result"]
        features = vote["final_features"]
        feature_summary = ", ".join(f"{key}={features[key]}" for key in WATCH_SUMMARY_FIELDS)
        counts = item.get("recognized_field_counts") or _recognized_counts(item.get("vision_passes", []))
        valid_fields = ", ".join(f"{count}/33" for count in counts) if counts else "Unknown"
        display_ok = "Yes" if engine.get("display_content", {}).get("hook") else "No"
        resolver_used = "Yes" if engine.get("score_trace", {}).get("resolver_used") else "No"
        issues = "; ".join(item["manual_review_issues"]) if item["manual_review_issues"] else "None"
        lines.append(
            f"| {index} | {Path(item['image_file']).name} | {item['person_id']} | {item['hand_side']} | "
            f"{item['passes_success']} | {valid_fields} | {', '.join(low_confidence_fields(vote)) or 'None'} | "
            f"{feature_summary} | {engine['primary_mother']} | {engine['secondary_mother']} | "
            f"{engine['persona_id']} {engine['persona_name']} | {display_ok} | {resolver_used} | {issues} |"
        )
    lines.append("")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Qwen VL real palm image batch.")
    parser.add_argument("--input-dir", type=Path, default=PROJECT_ROOT / "samples" / "palms")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--model", default=None)
    parser.add_argument("--prompt", type=Path, default=None)
    parser.add_argument("--output-suffix", default="")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    summary = run_qwen_batch(
        input_dir=args.input_dir,
        limit=args.limit,
        model=args.model,
        prompt_path=args.prompt,
        output_suffix=args.output_suffix,
        skip_existing=args.skip_existing,
    )
    suffix = f"_{args.output_suffix.strip('_')}" if args.output_suffix else ""
    print(f"Processed {len(summary['results'])} images.")
    print(f"Wrote outputs/qwen_vision_passes{suffix}/*_pass_*.json")
    print(f"Wrote outputs/qwen_real_image_batch{suffix}/*_result.json")
    print(f"Wrote outputs/qwen_real_image_batch_report{suffix}.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
