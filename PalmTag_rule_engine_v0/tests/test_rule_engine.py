from __future__ import annotations

import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.adjacent_resolver import resolve_adjacent
from src.loader import (
    load_adjacent_resolver,
    load_display_content,
    load_field_schema,
    load_mother_scoring,
    load_persona_rules,
    load_scoring_constraints,
)
from src.mother_scorer import score_mothers
from src.result_builder import build_result


def load_sample(name: str) -> dict:
    return json.loads((PROJECT_ROOT / "tests" / "sample_inputs" / name).read_text(encoding="utf-8"))


def test_json_data_loads() -> None:
    assert load_field_schema()
    assert load_mother_scoring()
    assert load_persona_rules()
    assert load_adjacent_resolver()
    assert load_scoring_constraints()
    assert load_display_content()


def test_33_fields_are_complete() -> None:
    fields = load_field_schema()
    assert len(fields) == 33
    assert all(item["field_key"] == item["field_key"].upper() for item in fields)


def test_8_mother_types_are_complete() -> None:
    mothers = {rule["mother_id"] for rule in load_mother_scoring()}
    assert mothers == {f"M{i}" for i in range(1, 9)}


def test_p01_to_p36_persona_rules_are_complete() -> None:
    rules = load_persona_rules()
    persona_ids = {rule["persona_id"] for rule in rules}
    assert persona_ids == {f"P{i:02d}" for i in range(1, 37)}
    for persona_id in persona_ids:
        executable_rules = [
            rule for rule in rules if rule["persona_id"] == persona_id and rule["operator"] != "unparsed"
        ]
        assert len(executable_rules) >= 2, persona_id


def test_p01_to_p36_display_content_is_complete() -> None:
    display_ids = {row["persona_id"] for row in load_display_content()}
    assert display_ids == {f"P{i:02d}" for i in range(1, 37)}


def test_mother_scoring_outputs_primary_mother() -> None:
    result = score_mothers(load_sample("sample_01_p01.json"))
    assert result["primary_mother"] == "M1"
    assert result["scores"]["M1"] > 0
    assert result["core_support_trace"]["M1"]["count"] >= 2


def test_primary_mother_requires_two_core_hits() -> None:
    result = score_mothers(load_sample("sample_10_low_confidence_noise.json"))
    primary = result["primary_mother"]
    assert primary is not None
    assert result["core_support_trace"][primary]["count"] >= 2


def test_low_confidence_fields_cannot_decide_primary_mother() -> None:
    fields = load_field_schema()
    features = {field["field_key"]: field["default_value"] for field in fields}
    features.update(
        {
            "MOUNT_LUNA": 3,
            "FINGERTIP_SHAPE": 3,
            "HEAD_LINE_SLOPE": 0,
            "HEART_LINE_DEPTH": 0,
            "OVERALL_CLARITY": 0,
            "THUMB_LENGTH_RATIO": 0,
        }
    )
    result = score_mothers(features)
    assert result["primary_mother"] != "M7"


def test_adjacent_resolver_triggers_only_when_close() -> None:
    features = load_sample("sample_07_simian_pressure.json")
    close_match = {
        "persona_id": "P05",
        "candidate_scores": {"P05": 50, "P07": 48},
        "match_trace": {},
    }
    resolved = resolve_adjacent(features, close_match)
    assert resolved["resolver_used"] is True
    assert resolved["before"] == "P05"
    assert resolved["after"] == "P07"
    assert "LIFE_LINE_DEPTH" in resolved["reason"]

    distant_match = {
        "persona_id": "P05",
        "candidate_scores": {"P05": 80, "P07": 30},
        "match_trace": {},
    }
    not_resolved = resolve_adjacent(features, distant_match)
    assert not_resolved["resolver_used"] is False
    assert not_resolved["after"] == "P05"


def test_final_result_reads_display_content() -> None:
    result = build_result(load_sample("sample_01_p01.json"))
    assert result["persona_id"].startswith("P")
    assert result["persona_name"]
    assert result["display_content"]["hook"]
    assert result["score_trace"]["mother_scores"]
    assert "resolver_used" in result["score_trace"]
