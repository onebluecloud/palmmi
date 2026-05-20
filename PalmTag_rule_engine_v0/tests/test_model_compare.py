from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from tools.run_model_compare import (
    average_absolute_error,
    model_suffix,
    summarize_model_results,
)


def test_model_suffix_is_filesystem_safe() -> None:
    assert model_suffix("qwen3.5-plus") == "qwen3_5_plus"
    assert model_suffix("qwen-vl-plus") == "qwen_vl_plus"


def test_average_absolute_error_uses_focus_fields() -> None:
    model_avg = {"HEAD_LINE_DEPTH": 2.0, "OVERALL_CLARITY": 1.0}
    manual_avg = {"HEAD_LINE_DEPTH": 1.0, "OVERALL_CLARITY": 1.5}

    assert average_absolute_error(model_avg, manual_avg, ["HEAD_LINE_DEPTH", "OVERALL_CLARITY"]) == 0.75


def test_summarize_model_results_counts_health_and_distribution() -> None:
    results = [
        {
            "passes_success": [True, True, True],
            "recognized_field_counts": [33, 33, 33],
            "vision_passes": [{"json_parse_failures": 0}, {"json_parse_failures": 0}, {"json_parse_failures": 0}],
            "engine_result": {"primary_mother": "M1", "persona_id": "P06"},
        },
        {
            "passes_success": [True, False, True],
            "recognized_field_counts": [33, 0, 33],
            "vision_passes": [{"json_parse_failures": 0}, {"json_parse_failures": 1}, {"json_parse_failures": 0}],
            "engine_result": {"primary_mother": "M3", "persona_id": "P28"},
        },
    ]

    summary = summarize_model_results("qwen-test", results, average_error=0.5, failure_reason="")

    assert summary["model"] == "qwen-test"
    assert summary["success"] is False
    assert summary["api_failed_count"] == 1
    assert summary["json_parse_failures"] == 1
    assert summary["field_complete_rate"] == 5 / 6
    assert summary["m1_count"] == 1
    assert summary["p06_count"] == 1
