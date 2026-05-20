from __future__ import annotations

import operator as op
from typing import Any

from src.loader import load_adjacent_resolver, load_scoring_constraints


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


def _condition_matches(features: dict[str, Any], condition: dict[str, Any]) -> bool:
    value = _as_number(features.get(condition["field_key"], 0))
    operator_value = condition["operator"]
    threshold = condition["threshold"]
    if operator_value == "in":
        return value in set(threshold or [])
    comparator = COMPARATORS.get(operator_value)
    return bool(comparator and comparator(value, threshold))


def _condition_reason(features: dict[str, Any], conditions: list[dict[str, Any]]) -> str:
    chunks = []
    for condition in conditions:
        chunks.append(
            f"{condition['field_key']} {condition['operator']} {condition['threshold']} "
            f"(actual={features.get(condition['field_key'], 0)})"
        )
    return " AND ".join(chunks)


def resolve_adjacent(features: dict[str, Any], persona_match: dict[str, Any]) -> dict[str, Any]:
    candidate_scores = persona_match.get("candidate_scores", {})
    before = persona_match.get("persona_id")
    base = {
        "resolver_used": False,
        "before": before,
        "after": before,
        "reason": "Top candidates were not close enough or no resolver rule matched.",
    }
    ranked = sorted(candidate_scores.items(), key=lambda item: (-item[1], item[0]))
    if len(ranked) < 2 or ranked[0][1] <= 0:
        return base

    top1, top2 = ranked[0], ranked[1]
    constraints = load_scoring_constraints()
    threshold_percent = _as_number(constraints.get("adjacent_close_threshold_percent", 15))
    score_gap_percent = ((top1[1] - top2[1]) / max(top1[1], 1)) * 100
    if score_gap_percent >= threshold_percent:
        base["reason"] = f"Score gap {score_gap_percent:.2f}% >= {threshold_percent:g}%."
        return base

    pair = {top1[0], top2[0]}
    for resolver in load_adjacent_resolver():
        if {resolver["persona_a"], resolver["persona_b"]} != pair:
            continue
        conditions = resolver.get("conditions", [])
        matched = all(_condition_matches(features, condition) for condition in conditions)
        after = resolver["output_persona"] if matched else resolver.get("else_persona")
        return {
            "resolver_used": True,
            "before": top1[0],
            "after": after,
            "reason": _condition_reason(features, conditions),
            "matched": matched,
            "score_gap_percent": round(score_gap_percent, 4),
            "rule": resolver,
        }

    return base
