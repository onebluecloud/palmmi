from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from tools.build_human_review_pack import build_review_item, canonical_image_file, unstable_fields


def _sample_result() -> dict:
    return {
        "image_file": "samples/palms/demo-left.jpg",
        "person_id": "demo",
        "hand_side": "left",
        "vision_vote": {
            "passes": [
                {"HEAD_LINE_DEPTH": 1, "SIMIAN_LINE": 0},
                {"HEAD_LINE_DEPTH": 2, "SIMIAN_LINE": 0},
                {"HEAD_LINE_DEPTH": 2, "SIMIAN_LINE": 0},
            ],
            "final_features": {"HEAD_LINE_DEPTH": 2, "SIMIAN_LINE": 0},
            "field_confidence": {"HEAD_LINE_DEPTH": "medium", "SIMIAN_LINE": "high"},
        },
        "engine_result": {
            "primary_mother": "M1",
            "secondary_mother": None,
            "persona_id": "P31",
            "persona_name": "留一手",
            "score_trace": {
                "resolver_used": False,
                "resolver_trace": {"before": "P31", "after": "P31"},
            },
            "display_content": {
                "hook": "hook",
                "quote": "quote",
                "final_judgement": "judgement",
            },
        },
    }


def test_unstable_fields_detects_three_pass_variation() -> None:
    assert unstable_fields(_sample_result()["vision_vote"]["passes"]) == ["HEAD_LINE_DEPTH"]


def test_build_review_item_contains_required_summary_fields() -> None:
    item = build_review_item(_sample_result())

    assert item["image_file"] == "samples/palms/demo-left.jpg"
    assert item["final_features"]["HEAD_LINE_DEPTH"] == 2
    assert item["primary_mother"] == "M1"
    assert item["persona_id"] == "P31"
    assert item["persona_name"] == "留一手"
    assert item["display_content"]["hook"] == "hook"
    assert item["low_confidence_fields"] == ["HEAD_LINE_DEPTH"]


def test_canonical_image_file_uses_samples_copy_when_available() -> None:
    assert canonical_image_file("outputs/model_compare_missing_qwen3_6_plus/qing-right.jpg") == (
        "samples\\palms\\qing-right.jpg"
    )
