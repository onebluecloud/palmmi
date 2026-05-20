from __future__ import annotations

import operator as op
from collections import defaultdict
from typing import Any

from src.loader import load_field_schema, load_mother_scoring, load_scoring_constraints


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


def complete_features(features: dict[str, Any]) -> dict[str, Any]:
    schema = load_field_schema()
    completed = {item["field_key"]: item["default_value"] for item in schema}
    completed.update({str(key).upper(): value for key, value in features.items()})
    return completed


def _condition_matches(features: dict[str, Any], condition: dict[str, Any]) -> bool:
    value = _as_number(features.get(condition["field_key"], 0))
    operator_value = condition["operator"]
    threshold = condition["threshold"]
    if operator_value == "in":
        return value in set(threshold or [])
    comparator = COMPARATORS.get(operator_value)
    return bool(comparator and comparator(value, threshold))


def _score_regular_rule(rule: dict[str, Any], features: dict[str, Any]) -> tuple[float, Any, str]:
    value = _as_number(features.get(rule["field_key"], 0))
    operator_value = rule["operator"]
    weight = _as_number(rule["weight"])

    if operator_value and str(operator_value).startswith("*"):
        return value * weight, value, f"{rule['field_key']} * {weight:g}"
    if operator_value and str(operator_value).startswith("(3-f)*"):
        return max(0, 3 - value) * weight, value, f"(3 - {rule['field_key']}) * {weight:g}"
    if operator_value == "if_eq_1_bonus":
        matched = value == _as_number(rule.get("threshold", 1))
        return (weight if matched else 0), value, f"{rule['field_key']} == 1"
    if operator_value == "in_set_2_3_bonus_15":
        matched = value in set(rule.get("allowed_values", [2, 3]))
        return (weight if matched else 0), value, f"{rule['field_key']} in {rule.get('allowed_values', [2, 3])}"
    return 0, value, f"Unsupported operator {operator_value}"


def _score_special_rule(
    rule: dict[str, Any],
    features: dict[str, Any],
    scores: dict[str, float],
) -> tuple[float, Any, str, int]:
    if rule.get("special_rule") == "other_m_scores_ge_60":
        count = sum(1 for mother_id, score in scores.items() if mother_id != "M8" and score >= 60)
        if count >= _as_number(rule.get("threshold", 2)):
            score = 50 + (count - 2) * 15
            return score, count, "count(other mother scores >= 60)", count
        return 0, count, "count(other mother scores >= 60)", 0

    if rule.get("special_rule") == "compound":
        conditions = rule.get("conditions", [])
        matched = all(_condition_matches(features, condition) for condition in conditions)
        return (
            _as_number(rule["weight"]) if matched else 0,
            matched,
            " AND ".join(
                f"{item['field_key']} {item['operator']} {item['threshold']}" for item in conditions
            ),
            1 if matched else 0,
        )

    return 0, None, "Unsupported special rule", 0


def _empty_trace_for_mothers(rules_by_mother: dict[str, list[dict[str, Any]]]) -> dict[str, dict[str, Any]]:
    return {
        mother_id: {"count": 0, "fields": [], "details": []}
        for mother_id in sorted(rules_by_mother, key=lambda item: int(item[1:]))
    }


def score_mothers(features: dict[str, Any]) -> dict[str, Any]:
    features = complete_features(features)
    rules = load_mother_scoring()
    constraints = load_scoring_constraints()
    score_cap = _as_number(constraints.get("mother_score_cap", 100))
    min_core_support = int(constraints.get("primary_mother_min_core_support", 2))
    secondary_gap = _as_number(constraints.get("secondary_mother_gap", 15))

    rules_by_mother: dict[str, list[dict[str, Any]]] = defaultdict(list)
    mother_names: dict[str, str] = {}
    for rule in rules:
        rules_by_mother[rule["mother_id"]].append(rule)
        mother_names[rule["mother_id"]] = rule["mother_name"]

    raw_scores = {mother_id: 0.0 for mother_id in rules_by_mother}
    score_trace: dict[str, list[dict[str, Any]]] = {mother_id: [] for mother_id in rules_by_mother}
    core_support_trace = _empty_trace_for_mothers(rules_by_mother)

    for mother_id, mother_rules in rules_by_mother.items():
        if mother_id == "M8":
            continue
        for rule in mother_rules:
            if rule.get("special_rule"):
                score, value, expression, support_count = _score_special_rule(rule, features, raw_scores)
            else:
                score, value, expression = _score_regular_rule(rule, features)
                support_count = 1 if rule["is_core_support"] and score > 0 else 0
            raw_scores[mother_id] += score
            if rule["is_core_support"] and support_count > 0:
                core_support_trace[mother_id]["count"] += support_count
                core_support_trace[mother_id]["fields"].append(rule["field_key"])
            score_trace[mother_id].append(
                {
                    "field_key": rule["field_key"],
                    "value": value,
                    "operator": rule["operator"],
                    "weight": rule["weight"],
                    "score": round(score, 4),
                    "is_core_support": rule["is_core_support"],
                    "expression": expression,
                }
            )

    if "M8" in rules_by_mother:
        for rule in rules_by_mother["M8"]:
            if rule.get("special_rule"):
                score, value, expression, support_count = _score_special_rule(rule, features, raw_scores)
            else:
                score, value, expression = _score_regular_rule(rule, features)
                support_count = 1 if rule["is_core_support"] and score > 0 else 0
            raw_scores["M8"] += score
            if rule["is_core_support"] and support_count > 0:
                core_support_trace["M8"]["count"] += support_count
                core_support_trace["M8"]["fields"].append(rule["field_key"])
            score_trace["M8"].append(
                {
                    "field_key": rule["field_key"],
                    "value": value,
                    "operator": rule["operator"],
                    "weight": rule["weight"],
                    "score": round(score, 4),
                    "is_core_support": rule["is_core_support"],
                    "expression": expression,
                }
            )

    capped_scores = {
        mother_id: min(score_cap, round(score, 4)) for mother_id, score in raw_scores.items()
    }
    for mother_id, score in capped_scores.items():
        core_support_trace[mother_id]["details"] = [
            item for item in score_trace[mother_id] if item["is_core_support"] and item["score"] > 0
        ]
        core_support_trace[mother_id]["eligible_for_primary"] = (
            score > 0 and core_support_trace[mother_id]["count"] >= min_core_support
        )
        core_support_trace[mother_id]["mother_name"] = mother_names.get(mother_id)

    ranked = sorted(capped_scores.items(), key=lambda item: (-item[1], item[0]))
    eligible_ranked = [
        item for item in ranked if core_support_trace[item[0]]["eligible_for_primary"]
    ]
    primary_mother = eligible_ranked[0][0] if eligible_ranked else None

    secondary_mother = None
    if primary_mother:
        lower_ranked = [item for item in ranked if item[0] != primary_mother]
        if lower_ranked and capped_scores[primary_mother] - lower_ranked[0][1] < secondary_gap:
            secondary_mother = lower_ranked[0][0]

    return {
        "scores": capped_scores,
        "primary_mother": primary_mother,
        "secondary_mother": secondary_mother,
        "core_support_trace": core_support_trace,
        "score_trace": score_trace,
    }
