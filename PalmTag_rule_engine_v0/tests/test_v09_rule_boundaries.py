from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_adjacent_resolver, load_mother_scoring, load_persona_rules
from src.result_builder import build_result
from src.persona_matcher import match_persona


def test_persona_matcher_supports_at_least_condition_group(monkeypatch) -> None:
    rules = [
        {
            "persona_id": "P32",
            "persona_name": "大招捏手党",
            "mother_id": "M8",
            "field_key": "[P32_STRONG_SUPPORT]",
            "operator": "at_least",
            "threshold": 2,
            "weight": 30,
            "is_required": True,
            "conditions": [
                {"field_key": "LIFE_LINE_DEPTH", "operator": ">=", "threshold": 2},
                {"field_key": "HEAD_LINE_DEPTH", "operator": ">=", "threshold": 2},
                {"field_key": "THUMB_LENGTH_RATIO", "operator": ">=", "threshold": 2},
                {"field_key": "FATE_LINE_CLARITY", "operator": ">=", "threshold": 2},
            ],
            "notes": "V0.9: P32 requires at least two strong-action supports.",
        }
    ]
    monkeypatch.setattr("src.persona_matcher.load_persona_rules", lambda: rules)

    passed = match_persona(
        {
            "LIFE_LINE_DEPTH": 2,
            "HEAD_LINE_DEPTH": 2,
            "THUMB_LENGTH_RATIO": 1,
            "FATE_LINE_CLARITY": 1,
        },
        {"primary_mother": "M8"},
    )
    failed = match_persona(
        {
            "LIFE_LINE_DEPTH": 2,
            "HEAD_LINE_DEPTH": 1,
            "THUMB_LENGTH_RATIO": 1,
            "FATE_LINE_CLARITY": 1,
        },
        {"primary_mother": "M8"},
    )

    assert passed["candidate_scores"]["P32"] == 30
    assert failed["candidate_scores"]["P32"] == 0
    assert failed["match_trace"]["P32"]["required_failed"] == ["[P32_STRONG_SUPPORT]"]


def test_v09_p31_p25_p32_boundaries_are_present() -> None:
    rules = load_persona_rules()
    p31 = [rule for rule in rules if rule["persona_id"] == "P31"]
    p25 = [rule for rule in rules if rule["persona_id"] == "P25"]
    p32 = [rule for rule in rules if rule["persona_id"] == "P32"]
    resolvers = load_adjacent_resolver()
    m8_rules = [rule for rule in load_mother_scoring() if rule["mother_id"] == "M8"]

    assert any(rule["field_key"] == "CHUAN_PALM" and rule["is_required"] for rule in p31)
    assert any(rule["field_key"] == "SIMIAN_LINE" and rule["is_required"] for rule in p31)
    assert any(rule["field_key"] == "LINE_COMPLEXITY" and rule["operator"] == "<=" for rule in p31)
    assert any(rule["weight"] < 0 for rule in p31)

    assert any(rule["field_key"] == "CHUAN_PALM" and rule["is_required"] for rule in p25)
    assert any(rule["field_key"] == "SIMIAN_LINE" and rule["is_required"] for rule in p25)

    assert any(rule["field_key"] == "[P32_STRONG_SUPPORT]" for rule in p32)
    assert any({rule["persona_a"], rule["persona_b"]} == {"P25", "P31"} for rule in resolvers)

    other_m_rule = next(rule for rule in m8_rules if rule["field_key"] == "[OTHER_M_SCORES>=60]")
    assert other_m_rule["threshold"] >= 3


def test_v09_key_sample_boundaries_preserve_p32_and_p29() -> None:
    zheng_left = {
        "PALM_LENGTH_RATIO": 2,
        "INDEX_RING_RATIO": 1,
        "HEAD_LINE_DEPTH": 2,
        "HEAD_LINE_LENGTH": 2,
        "HEAD_LINE_SLOPE": 1,
        "HEAD_LIFE_GAP": 0,
        "LINE_COMPLEXITY": 2,
        "THUMB_LENGTH_RATIO": 1,
        "FINGER_SPREAD": 2,
        "FATE_LINE_CLARITY": 2,
        "LIFE_LINE_DEPTH": 2,
        "LIFE_LINE_LENGTH": 3,
        "LIFE_LINE_CURVE": 2,
        "OVERALL_CLARITY": 2,
        "HEART_LINE_DEPTH": 2,
        "HEART_LINE_LENGTH": 2,
        "HEART_LINE_CURVE": 1,
        "HEART_LINE_END_FORK": 1,
        "SUN_LINE_PRESENCE": 1,
        "MOUNT_VENUS": 2,
        "MOUNT_JUPITER": 1,
        "MOUNT_SATURN": 1,
        "MOUNT_APOLLO": 1,
        "MOUNT_MERCURY": 1,
        "MOUNT_LUNA": 1,
        "CHUAN_PALM": 0,
        "SIMIAN_LINE": 0,
    }
    zheng_right = {
        "HEAD_LINE_DEPTH": 1,
        "HEAD_LINE_LENGTH": 3,
        "HEAD_LINE_SLOPE": 2,
        "HEAD_LIFE_GAP": 0,
        "LINE_COMPLEXITY": 2,
        "THUMB_LENGTH_RATIO": 2,
        "FATE_LINE_CLARITY": 1,
        "LIFE_LINE_DEPTH": 1,
        "LIFE_LINE_LENGTH": 3,
        "OVERALL_CLARITY": 1,
        "HEART_LINE_DEPTH": 1,
        "CHUAN_PALM": 0,
        "SIMIAN_LINE": 0,
    }
    kai_left = {
        "HEAD_LINE_DEPTH": 2,
        "HEAD_LINE_LENGTH": 2,
        "HEAD_LINE_SLOPE": 1,
        "HEAD_LIFE_GAP": 0,
        "LINE_COMPLEXITY": 1,
        "THUMB_LENGTH_RATIO": 1,
        "FATE_LINE_CLARITY": 2,
        "LIFE_LINE_DEPTH": 2,
        "LIFE_LINE_LENGTH": 3,
        "OVERALL_CLARITY": 2,
        "HEART_LINE_DEPTH": 2,
        "CHUAN_PALM": 0,
        "SIMIAN_LINE": 0,
    }
    lan_right = {
        "HEAD_LINE_DEPTH": 2,
        "HEAD_LINE_LENGTH": 2,
        "HEAD_LINE_SLOPE": 2,
        "HEAD_LIFE_GAP": 0,
        "LINE_COMPLEXITY": 2,
        "THUMB_LENGTH_RATIO": 1,
        "FINGER_SPREAD": 1,
        "FATE_LINE_CLARITY": 2,
        "LIFE_LINE_DEPTH": 2,
        "LIFE_LINE_LENGTH": 2,
        "LIFE_LINE_CURVE": 1,
        "OVERALL_CLARITY": 2,
        "HEART_LINE_DEPTH": 2,
        "HEART_LINE_LENGTH": 2,
        "HEART_LINE_CURVE": 1,
        "HEAD_LINE_END_FORK": 1,
        "MOUNT_LUNA": 1,
        "CHUAN_PALM": 0,
        "SIMIAN_LINE": 0,
    }

    assert build_result(zheng_left)["persona_id"] == "P32"
    assert build_result(zheng_right)["persona_id"] == "P29"
    assert build_result(lan_right)["persona_id"] == "P29"
    assert build_result(kai_left)["persona_id"] != "P31"
