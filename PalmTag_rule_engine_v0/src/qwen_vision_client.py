from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
from pathlib import Path
from typing import Any

from src.loader import load_field_schema


BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DEFAULT_MODEL = "qwen3.6-plus"


class MissingDashScopeApiKey(RuntimeError):
    """Raised when DASHSCOPE_API_KEY is required but unavailable."""


class JsonParseError(ValueError):
    """Raised when a model response does not contain a JSON object."""


def image_to_data_url(image_path: Path) -> str:
    mime_type = mimetypes.guess_type(str(image_path))[0] or "image/jpeg"
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def parse_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    fence_match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    else:
        object_match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if object_match:
            cleaned = object_match.group(0)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise JsonParseError(str(exc)) from exc
    if not isinstance(parsed, dict):
        raise JsonParseError("Model output JSON is not an object")
    return parsed


def _field_options() -> dict[str, set[int]]:
    options: dict[str, set[int]] = {}
    for field in load_field_schema():
        value_range = str(field["value_range"])
        if value_range == "0/1":
            options[field["field_key"]] = {0, 1}
        elif value_range == "0-2":
            options[field["field_key"]] = {0, 1, 2}
        else:
            options[field["field_key"]] = {0, 1, 2, 3}
    return options


def _coerce_feature_value(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    if not text or text.lower() == "null":
        return None
    return int(float(text))


def normalize_feature_json(parsed: dict[str, Any]) -> dict[str, Any]:
    options = _field_options()
    features: dict[str, int | None] = {}
    errors: list[str] = []
    for field in load_field_schema():
        field_key = field["field_key"]
        if field_key not in parsed:
            features[field_key] = None
            errors.append(f"Missing field: {field_key}")
            continue
        try:
            value = _coerce_feature_value(parsed[field_key])
        except (TypeError, ValueError):
            features[field_key] = None
            errors.append(f"Invalid numeric value for {field_key}: {parsed[field_key]!r}")
            continue
        if value is not None and value not in options[field_key]:
            features[field_key] = None
            errors.append(f"Out-of-range value for {field_key}: {value}")
            continue
        features[field_key] = value
    confidence_notes = parsed.get("_confidence_notes")
    extra_fields = sorted(set(parsed) - set(options) - {"_confidence_notes"})
    errors.extend(f"Extra field ignored: {field_key}" for field_key in extra_fields)
    return {"features": features, "errors": errors, "confidence_notes": confidence_notes}


def count_non_null_features(features: dict[str, Any]) -> int:
    return sum(1 for value in features.values() if value is not None)


def _all_null_retry_prompt(prompt_text: str) -> str:
    return (
        prompt_text
        + "\n\n重要补充：上一轮输出中 33 个字段全部为 null。"
        + "如果图片中能看到手掌，请不要照抄模板的 null，占位符必须替换为可见形态对应的数值。"
        + "只有字段被遮挡、完全看不清或图片不是手掌时才输出 null。"
    )


def _load_dotenv_if_available() -> None:
    try:
        from dotenv import load_dotenv
    except Exception:
        return
    load_dotenv()


class QwenVisionClient:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str = BASE_URL,
        openai_client: Any | None = None,
    ) -> None:
        _load_dotenv_if_available()
        self.api_key = api_key or os.environ.get("DASHSCOPE_API_KEY")
        self.model = model or os.environ.get("QWEN_VL_MODEL") or DEFAULT_MODEL
        self.base_url = base_url
        self.client = openai_client
        if not self.api_key and self.client is None:
            raise MissingDashScopeApiKey("DASHSCOPE_API_KEY is required for Qwen vision API calls.")
        if self.client is None:
            from openai import OpenAI

            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

    def _completion_content(self, response: Any) -> str:
        content = response.choices[0].message.content
        if isinstance(content, list):
            return "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
        return str(content)

    def _call_model(self, image_path: Path, prompt_text: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {"type": "image_url", "image_url": {"url": image_to_data_url(image_path)}},
                    ],
                }
            ],
            temperature=0,
        )
        return self._completion_content(response)

    def extract_features(
        self,
        image_path: Path,
        prompt_text: str,
        max_retries: int = 1,
    ) -> dict[str, Any]:
        errors: list[str] = []
        json_parse_failures = 0
        raw_text = ""
        attempts = max_retries + 1
        current_prompt = prompt_text
        for attempt in range(attempts):
            try:
                raw_text = self._call_model(image_path, current_prompt)
            except Exception as exc:
                normalized = normalize_feature_json({})
                return {
                    "success": False,
                    "features": normalized["features"],
                    "raw_text": raw_text,
                    "errors": [f"API call failed: {exc}"],
                    "json_parse_failures": json_parse_failures,
                    "non_null_field_count": 0,
                    "null_field_count": len(normalized["features"]),
                    "confidence_notes": normalized.get("confidence_notes"),
                    "model": self.model,
                }
            try:
                parsed = parse_json_object(raw_text)
            except JsonParseError as exc:
                json_parse_failures += 1
                errors.append(f"JSON parse failed: {exc}")
                continue
            normalized = normalize_feature_json(parsed)
            non_null_field_count = count_non_null_features(normalized["features"])
            field_count = len(normalized["features"])
            result_errors = errors + normalized["errors"]
            if non_null_field_count == 0:
                result_errors.append("All 33 fields are null; visual extraction needs manual review.")
                if attempt < attempts - 1:
                    result_errors.append("Retrying once because all 33 fields were null.")
                    errors = result_errors
                    current_prompt = _all_null_retry_prompt(prompt_text)
                    continue
            return {
                "success": True,
                "features": normalized["features"],
                "raw_text": raw_text,
                "errors": result_errors,
                "json_parse_failures": json_parse_failures,
                "non_null_field_count": non_null_field_count,
                "null_field_count": field_count - non_null_field_count,
                "confidence_notes": normalized.get("confidence_notes"),
                "model": self.model,
            }
        normalized = normalize_feature_json({})
        return {
            "success": False,
            "features": normalized["features"],
            "raw_text": raw_text,
            "errors": errors,
            "json_parse_failures": json_parse_failures,
            "non_null_field_count": 0,
            "null_field_count": len(normalized["features"]),
            "confidence_notes": normalized.get("confidence_notes"),
            "model": self.model,
        }
