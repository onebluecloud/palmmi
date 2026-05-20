from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"


def _load_json(file_name: str) -> Any:
    return json.loads((DATA_DIR / file_name).read_text(encoding="utf-8"))


def load_field_schema() -> list[dict[str, Any]]:
    return _load_json("field_schema_33.json")


def load_mother_scoring() -> list[dict[str, Any]]:
    return _load_json("mother_scoring.json")


def load_persona_rules() -> list[dict[str, Any]]:
    return _load_json("persona_rules.json")


def load_adjacent_resolver() -> list[dict[str, Any]]:
    return _load_json("adjacent_resolver.json")


def load_scoring_constraints() -> dict[str, Any]:
    return _load_json("scoring_constraints.json")


def load_display_content() -> list[dict[str, Any]]:
    return _load_json("display_content.json")
