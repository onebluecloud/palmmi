from __future__ import annotations

from typing import Any

from src.adjacent_resolver import resolve_adjacent
from src.loader import load_display_content
from src.mother_scorer import complete_features, score_mothers
from src.persona_matcher import match_persona


DISPLAY_KEYS = [
    "persona_code",
    "hook",
    "quote",
    "final_judgement",
    "poster_title",
    "poster_subtitle",
    "three_keywords",
    "share_copy",
]


def _display_lookup() -> dict[str, dict[str, Any]]:
    return {row["persona_id"]: row for row in load_display_content()}


def build_result(features: dict[str, Any]) -> dict[str, Any]:
    completed_features = complete_features(features)
    mother_result = score_mothers(completed_features)
    persona_match = match_persona(completed_features, mother_result)
    resolver_trace = resolve_adjacent(completed_features, persona_match)
    persona_id = resolver_trace["after"] or persona_match["persona_id"]

    display = _display_lookup().get(persona_id, {})
    display_content = {key: display.get(key, "") for key in DISPLAY_KEYS}

    return {
        "input_features": completed_features,
        "primary_mother": mother_result["primary_mother"],
        "secondary_mother": mother_result["secondary_mother"],
        "persona_id": persona_id,
        "persona_name": display.get("persona_name", ""),
        "score_trace": {
            "mother_scores": mother_result["scores"],
            "core_support_trace": mother_result["core_support_trace"],
            "mother_score_trace": mother_result["score_trace"],
            "persona_scores": persona_match["candidate_scores"],
            "persona_match_trace": persona_match["match_trace"],
            "resolver_used": resolver_trace["resolver_used"],
            "resolver_trace": resolver_trace,
        },
        "display_content": display_content,
    }
