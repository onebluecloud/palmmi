from __future__ import annotations

import operator as op
from collections import defaultdict
from typing import Any

from src.loader import load_persona_rules
from src.mother_scorer import complete_features, score_mothers


COMPARATORS = {
    ">=": op.ge,
    "<=": op.le,
    ">": op.gt,
    "<": op.lt,
    "==": op.eq,
    "=": op.eq,
}


def _as_number(value: Any) -> float:
    if value is None or value == "":
        return 0
    if isinstance(value, bool):
        return 1 if value else 0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def _matches(value: Any, operator_value: str, threshold: Any) -> bool:
    number = _as_number(value)
    if operator_value == "in":
        return number in set(threshold or [])
    comparator = COMPARATORS.get(operator_value)
    return bool(comparator and comparator(number, threshold))


def _condition_matches(features: dict[str, Any], condition: dict[str, Any]) -> bool:
    return _matches(
        features.get(condition["field_key"], 0),
        condition["operator"],
        condition["threshold"],
    )


def _evaluate_rule(features: dict[str, Any], rule: dict[str, Any]) -> tuple[bool, Any, list[dict[str, Any]]]:
    if rule.get("special_rule") == "at_least_conditions" or rule["operator"] == "at_least":
        condition_trace = []
        matched_count = 0
        for condition in rule.get("conditions", []):
            matched = _condition_matches(features, condition)
            matched_count += 1 if matched else 0
            condition_trace.append(
                {
                    **condition,
                    "value": features.get(condition["field_key"], 0),
                    "matched": matched,
                }
            )
        return matched_count >= int(rule["threshold"]), matched_count, condition_trace

    value = features.get(rule["field_key"], 0)
    return _matches(value, rule["operator"], rule["threshold"]), value, []


def match_persona(features: dict[str, Any], mother_result: dict[str, Any] | None = None) -> dict[str, Any]:
    features = complete_features(features)
    if mother_result is None:
        mother_result = score_mothers(features)

    primary_mother = mother_result["primary_mother"]
    rules = load_persona_rules()
    rules_by_persona: dict[str, list[dict[str, Any]]] = defaultdict(list)
    persona_names: dict[str, str] = {}
    for rule in rules:
        if primary_mother is None or rule["mother_id"] == primary_mother:
            rules_by_persona[rule["persona_id"]].append(rule)
            persona_names[rule["persona_id"]] = rule["persona_name"]

    candidate_scores: dict[str, float] = {}
    raw_scores: dict[str, float] = {}
    match_trace: dict[str, Any] = {}
    for persona_id, persona_rules in rules_by_persona.items():
        score = 0.0
        required_failed: list[str] = []
        rule_trace = []
        for rule in persona_rules:
            matched, value, condition_trace = _evaluate_rule(features, rule)
            if matched:
                score += _as_number(rule["weight"])
            elif rule["is_required"]:
                required_failed.append(rule["field_key"])
            trace_item = {
                "field_key": rule["field_key"],
                "operator": rule["operator"],
                "threshold": rule["threshold"],
                "value": value,
                "matched": matched,
                "weight": rule["weight"],
                "is_required": rule["is_required"],
            }
            if condition_trace:
                trace_item["conditions"] = condition_trace
            rule_trace.append(trace_item)
        raw_scores[persona_id] = round(score, 4)
        candidate_scores[persona_id] = 0 if required_failed else round(score, 4)
        match_trace[persona_id] = {
            "persona_name": persona_names.get(persona_id),
            "raw_score": raw_scores[persona_id],
            "final_score": candidate_scores[persona_id],
            "required_failed": required_failed,
            "rules": rule_trace,
        }

    if not candidate_scores:
        return {
            "persona_id": None,
            "persona_score": 0,
            "candidate_scores": {},
            "match_trace": {},
        }

    ranked = sorted(candidate_scores.items(), key=lambda item: (-item[1], item[0]))
    if ranked[0][1] == 0:
        ranked = sorted(raw_scores.items(), key=lambda item: (-item[1], item[0]))
    persona_id, persona_score = ranked[0]
    return {
        "persona_id": persona_id,
        "persona_score": persona_score,
        "candidate_scores": candidate_scores,
        "raw_candidate_scores": raw_scores,
        "match_trace": match_trace,
    }
