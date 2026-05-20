from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema
from src.vision_postprocess import apply_vision_postprocess


def _features(value: int = 2) -> dict[str, int]:
    return {field["field_key"]: value for field in load_field_schema()}


def _passes() -> list[dict[str, int]]:
    return [_features(), _features(), _features()]


def _vote_result() -> dict:
    return {
        "image_file": "sample.jpg",
        "person_id": "sample",
        "hand_side": "left",
        "passes": _passes(),
        "final_features": _features(),
        "field_confidence": {field["field_key"]: "high" for field in load_field_schema()},
    }


def test_caps_overall_clarity_when_all_major_depths_are_shallow() -> None:
    vote = _vote_result()
    vote["final_features"]["OVERALL_CLARITY"] = 2
    vote["final_features"]["HEAD_LINE_DEPTH"] = 1
    vote["final_features"]["HEART_LINE_DEPTH"] = 1
    vote["final_features"]["LIFE_LINE_DEPTH"] = 1

    result = apply_vision_postprocess(vote)

    assert result["vote_result"]["final_features"]["OVERALL_CLARITY"] == 1
    assert any(item["field_key"] == "OVERALL_CLARITY" for item in result["adjustments"])


def test_caps_overall_clarity_when_confidence_notes_flag_multiple_main_lines() -> None:
    vote = _vote_result()
    vote["final_features"]["OVERALL_CLARITY"] = 2
    vision_passes = [
        {"confidence_notes": {"low_confidence_fields": ["HEAD_LINE_DEPTH", "HEART_LINE_LENGTH"]}},
        {"confidence_notes": {"low_confidence_fields": ["HEAD_LINE_LENGTH", "HEART_LINE_CURVE"]}},
        {"confidence_notes": {"low_confidence_fields": []}},
    ]

    result = apply_vision_postprocess(vote, vision_passes=vision_passes)

    assert result["vote_result"]["final_features"]["OVERALL_CLARITY"] == 1


def test_keeps_shallow_fate_line_when_any_pass_saw_it() -> None:
    vote = _vote_result()
    vote["final_features"]["FATE_LINE_CLARITY"] = 0
    vote["passes"][0]["FATE_LINE_CLARITY"] = 0
    vote["passes"][1]["FATE_LINE_CLARITY"] = 1
    vote["passes"][2]["FATE_LINE_CLARITY"] = 0

    result = apply_vision_postprocess(vote)

    assert result["vote_result"]["final_features"]["FATE_LINE_CLARITY"] == 1


def test_inconsistent_mount_fields_default_to_middle_value() -> None:
    vote = _vote_result()
    vote["final_features"]["MOUNT_JUPITER"] = 2
    vote["passes"][0]["MOUNT_JUPITER"] = 0
    vote["passes"][1]["MOUNT_JUPITER"] = 2
    vote["passes"][2]["MOUNT_JUPITER"] = 1

    result = apply_vision_postprocess(vote)

    assert result["vote_result"]["final_features"]["MOUNT_JUPITER"] == 1


def test_special_lines_require_two_positive_passes() -> None:
    vote = _vote_result()
    vote["final_features"]["SIMIAN_LINE"] = 1
    vote["passes"][0]["SIMIAN_LINE"] = 1
    vote["passes"][1]["SIMIAN_LINE"] = 0
    vote["passes"][2]["SIMIAN_LINE"] = 0
    vote["final_features"]["CHUAN_PALM"] = 1
    vote["passes"][0]["CHUAN_PALM"] = 1
    vote["passes"][1]["CHUAN_PALM"] = 1
    vote["passes"][2]["CHUAN_PALM"] = 0

    result = apply_vision_postprocess(vote)

    assert result["vote_result"]["final_features"]["SIMIAN_LINE"] == 0
    assert result["vote_result"]["final_features"]["CHUAN_PALM"] == 1
