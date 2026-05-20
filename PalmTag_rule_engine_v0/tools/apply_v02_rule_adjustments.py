from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"


def _read_json(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def _write_json(name: str, data: Any) -> None:
    (DATA_DIR / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _note(rule: dict[str, Any], text: str) -> None:
    current = rule.get("notes")
    rule["notes"] = f"{current}; {text}" if current else text


def _set_persona_weight(
    rules: list[dict[str, Any]],
    persona_id: str,
    field_key: str,
    weight: int,
    note: str,
) -> None:
    for rule in rules:
        if rule["persona_id"] == persona_id and rule["field_key"] == field_key:
            rule["weight"] = weight
            _note(rule, note)
            return
    raise ValueError(f"Persona rule not found: {persona_id} {field_key}")


def _set_mother_weight(
    rules: list[dict[str, Any]],
    mother_id: str,
    field_key: str,
    weight: int,
    note: str,
) -> None:
    for rule in rules:
        if rule["mother_id"] == mother_id and rule["field_key"] == field_key:
            rule["weight"] = weight
            if isinstance(rule.get("operator"), str) and rule["operator"].startswith("*"):
                rule["operator"] = f"*{weight}"
            _note(rule, note)
            return
    raise ValueError(f"Mother rule not found: {mother_id} {field_key}")


def apply_persona_adjustments() -> None:
    rules = _read_json("persona_rules.json")

    # P25 needs enough signal to beat generic M1 high-score personas when its
    # stable/clear/low-noise pattern is present.
    _set_persona_weight(rules, "P25", "OVERALL_CLARITY", 28, "V0.2: strengthen P25 clarity signal without over-concentrating.")
    _set_persona_weight(rules, "P25", "LINE_COMPLEXITY", 22, "V0.2: strengthen P25 low-complexity signal without over-concentrating.")
    _set_persona_weight(rules, "P25", "HEAD_LINE_DEPTH", 18, "V0.2: strengthen P25 stable-head-line signal without over-concentrating.")

    # P29 needs to compete in M7 without relying on low-confidence lunar/fingertip fields.
    _set_persona_weight(rules, "P29", "HEAD_LINE_LENGTH", 34, "V0.2: strengthen P29 long-head-line signal.")
    _set_persona_weight(rules, "P29", "LINE_COMPLEXITY", 30, "V0.2: strengthen P29 multi-layer-thinking signal.")
    for rule in rules:
        if rule["persona_id"] == "P29" and rule["field_key"] == "THUMB_LENGTH_RATIO":
            rule["operator"] = "in"
            rule["threshold"] = [1, 2]
            rule["weight"] = 20
            _note(rule, "V0.2: make P29 prefer mid thumb ratio instead of any non-zero value.")

    # Reduce HEART_LINE_DEPTH where it is not the defining emotional signal.
    heart_weight_updates = {
        "P01": 8,
        "P04": 12,
        "P08": 16,
        "P15": 18,
        "P16": 10,
        "P17": 10,
        "P19": 15,
        "P20": 18,
        "P21": 16,
        "P27": 22,
        "P30": 18,
        "P33": 5,
        "P34": 10,
        "P35": 22,
    }
    for persona_id, weight in heart_weight_updates.items():
        _set_persona_weight(
            rules,
            persona_id,
            "HEART_LINE_DEPTH",
            weight,
            "V0.2: reduce duplicated HEART_LINE_DEPTH influence.",
        )

    _write_json("persona_rules.json", rules)


def apply_mother_adjustments() -> None:
    rules = _read_json("mother_scoring.json")

    # M7: less low-confidence dependence, more head-slope/complexity support.
    _set_mother_weight(rules, "M7", "MOUNT_LUNA", 10, "V0.2: reduce low-confidence M7 dependency.")
    _set_mother_weight(rules, "M7", "HEAD_LINE_SLOPE", 16, "V0.2: strengthen M7 core entry.")
    _set_mother_weight(rules, "M7", "FINGERTIP_SHAPE", 8, "V0.2: reduce low-confidence M7 dependency.")
    _set_mother_weight(rules, "M7", "HEART_LINE_DEPTH", 2, "V0.2: reduce duplicated HEART_LINE_DEPTH influence.")
    for rule in rules:
        if rule["mother_id"] == "M7" and rule["field_key"] == "HEART_LINE_DEPTH":
            rule["confidence_tier"] = "auxiliary"
            rule["is_core_support"] = False
            _note(rule, "V0.2: no longer counts as M7 core support.")
    if not any(rule["mother_id"] == "M7" and rule["field_key"] == "LINE_COMPLEXITY" for rule in rules):
        insert_at = max(index for index, rule in enumerate(rules) if rule["mother_id"] == "M7") + 1
        rules.insert(
            insert_at,
            {
                "mother_id": "M7",
                "mother_name": "月相型",
                "field_key": "LINE_COMPLEXITY",
                "operator": "*6",
                "threshold": None,
                "weight": 6,
                "confidence_tier": "core",
                "is_core_support": True,
                "notes": "V0.2: allow HEAD_LINE_SLOPE + LINE_COMPLEXITY to support M7 without HEART_LINE_DEPTH.",
            },
        )

    # M8: require stronger multi-mother evidence and reduce one-off bonuses.
    for rule in rules:
        if rule["mother_id"] == "M8" and rule.get("special_rule") == "other_m_scores_ge_60":
            rule["threshold"] = 3
            _note(rule, "V0.2: require at least three strong mother scores before M8 base trigger.")
        if rule["mother_id"] == "M8" and rule["field_key"] == "CHUAN_PALM & HEART_LINE_DEPTH":
            rule["weight"] = 8
            for condition in rule.get("conditions", []):
                if condition["field_key"] == "HEART_LINE_DEPTH":
                    condition["threshold"] = 3
            _note(rule, "V0.2: reduce M8 compound bonus and require stronger heart-line signal.")
    _set_mother_weight(rules, "M8", "HEAD_LINE_END_FORK", 6, "V0.2: reduce one-off fork bonus.")

    # Keep emotional mother types meaningful but reduce global duplicate weighting.
    _set_mother_weight(rules, "M2", "HEART_LINE_DEPTH", 10, "V0.2: mild HEART_LINE_DEPTH reduction.")
    _set_mother_weight(rules, "M3", "HEART_LINE_DEPTH", 5, "V0.2: mild HEART_LINE_DEPTH reduction.")

    _write_json("mother_scoring.json", rules)


def main() -> int:
    apply_persona_adjustments()
    apply_mother_adjustments()
    print("Applied V0.2 rule adjustments to data/persona_rules.json and data/mother_scoring.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
