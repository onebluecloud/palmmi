from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.result_builder import build_result
from tools.run_qwen_real_image_batch import _recognized_counts, _vision_review_issues, write_qwen_report
from tools.run_real_image_batch import _manual_review_issues


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def refresh_result_file(path: Path) -> dict[str, Any]:
    result = _load_json(path)
    vote_result = result["vision_vote"]
    engine_result = build_result(vote_result["final_features"])
    result["engine_result"] = engine_result
    result["manual_review_issues"] = (
        _vision_review_issues(result.get("vision_passes", []))
        + _manual_review_issues(vote_result, engine_result)
    )
    result["recognized_field_counts"] = _recognized_counts(result.get("vision_passes", []))
    _write_json(path, result)
    return result


def refresh_result_dir(result_dir: Path, report_path: Path) -> list[dict[str, Any]]:
    results = [refresh_result_file(path) for path in sorted(result_dir.glob("*_result.json"))]
    pass_results = [pass_result for result in results for pass_result in result.get("vision_passes", [])]
    api_failed_images = sorted(
        {
            Path(pass_result.get("image_file", "")).name
            for pass_result in pass_results
            if not pass_result.get("success")
        }
    )
    json_parse_failures = sum(int(pass_result.get("json_parse_failures", 0)) for pass_result in pass_results)
    write_qwen_report(results, api_failed_images, json_parse_failures, report_path)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh Qwen result JSONs using existing vision votes and current rules.")
    parser.add_argument("--result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v09")
    parser.add_argument("--report", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_report_v09.md")
    args = parser.parse_args()

    results = refresh_result_dir(args.result_dir, args.report)
    print(f"Refreshed {len(results)} result files in {args.result_dir}")
    print(f"Wrote {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
