from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema
from src.vision_vote import merge_three_passes
from tools.prepare_manual_vision_tasks import parse_image_filename


def _base_pass(value: int | None = 1) -> dict:
    return {field["field_key"]: value for field in load_field_schema()}


def test_parse_image_filename_extracts_person_and_side() -> None:
    parsed = parse_image_filename(Path("zheng-left.jpg"))

    assert parsed["person_id"] == "zheng"
    assert parsed["hand_side"] == "left"
    assert parsed["naming_issue"] is None


def test_parse_image_filename_flags_unknown_side() -> None:
    parsed = parse_image_filename(Path("unknown.jpg"))

    assert parsed["person_id"] == "unknown"
    assert parsed["hand_side"] == ""
    assert "hand side" in parsed["naming_issue"]


def test_merge_three_passes_votes_and_marks_confidence() -> None:
    pass_1 = _base_pass()
    pass_2 = _base_pass()
    pass_3 = _base_pass()
    pass_1.update({"SIMIAN_LINE": 1, "HEAD_LINE_DEPTH": 0, "OVERALL_CLARITY": None})
    pass_2.update({"SIMIAN_LINE": 1, "HEAD_LINE_DEPTH": 2, "OVERALL_CLARITY": 2})
    pass_3.update({"SIMIAN_LINE": 0, "HEAD_LINE_DEPTH": 3, "OVERALL_CLARITY": 2})

    merged = merge_three_passes(
        image_file="sample.jpg",
        person_id="sample",
        hand_side="left",
        passes=[pass_1, pass_2, pass_3],
    )

    assert len(merged["final_features"]) == 33
    assert merged["final_features"]["SIMIAN_LINE"] == 1
    assert merged["field_confidence"]["SIMIAN_LINE"] == "medium"
    assert merged["final_features"]["HEAD_LINE_DEPTH"] == 2
    assert merged["field_confidence"]["HEAD_LINE_DEPTH"] == "low"
    assert merged["final_features"]["OVERALL_CLARITY"] == 2
    assert merged["field_confidence"]["OVERALL_CLARITY"] == "medium"


def test_merge_three_passes_falls_back_when_two_nulls() -> None:
    pass_1 = _base_pass()
    pass_2 = _base_pass()
    pass_3 = _base_pass()
    pass_1["MOUNT_VENUS"] = None
    pass_2["MOUNT_VENUS"] = None
    pass_3["MOUNT_VENUS"] = 2

    merged = merge_three_passes(
        image_file="sample.jpg",
        person_id="sample",
        hand_side="right",
        passes=[pass_1, pass_2, pass_3],
    )

    default_by_field = {field["field_key"]: field["default_value"] for field in load_field_schema()}
    assert merged["final_features"]["MOUNT_VENUS"] == default_by_field["MOUNT_VENUS"]
    assert merged["field_confidence"]["MOUNT_VENUS"] == "fallback"
