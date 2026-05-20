from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema
from src.qwen_vision_client import (
    DEFAULT_MODEL,
    MissingDashScopeApiKey,
    QwenVisionClient,
    image_to_data_url,
    normalize_feature_json,
    parse_json_object,
)
from src.result_builder import build_result
from tools.run_qwen_real_image_batch import run_qwen_batch


PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)
FAKE_API_KEY = "unit-test-token"


class _FakeMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _FakeChoice:
    def __init__(self, content: str) -> None:
        self.message = _FakeMessage(content)


class _FakeCompletion:
    def __init__(self, content: str) -> None:
        self.choices = [_FakeChoice(content)]


class _FakeCompletions:
    def __init__(self, responses: list[str]) -> None:
        self.responses = responses
        self.calls = 0

    def create(self, **_: object) -> _FakeCompletion:
        response = self.responses[min(self.calls, len(self.responses) - 1)]
        self.calls += 1
        return _FakeCompletion(response)


class _FakeChat:
    def __init__(self, responses: list[str]) -> None:
        self.completions = _FakeCompletions(responses)


class _FakeOpenAIClient:
    def __init__(self, responses: list[str]) -> None:
        self.chat = _FakeChat(responses)


def _full_feature_payload(value: int | None = 1) -> dict:
    return {field["field_key"]: value for field in load_field_schema()}


def test_missing_api_key_has_clear_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)

    with pytest.raises(MissingDashScopeApiKey, match="DASHSCOPE_API_KEY"):
        QwenVisionClient()


def test_model_uses_environment_when_not_passed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QWEN_VL_MODEL", "qwen3.5-plus")
    client = QwenVisionClient(api_key=FAKE_API_KEY, model=None, openai_client=_FakeOpenAIClient(["{}"]))

    assert client.model == "qwen3.5-plus"


def test_default_model_is_qwen36_plus(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("QWEN_VL_MODEL", raising=False)
    client = QwenVisionClient(api_key=FAKE_API_KEY, model=None, openai_client=_FakeOpenAIClient(["{}"]))

    assert DEFAULT_MODEL == "qwen3.6-plus"
    assert client.model == "qwen3.6-plus"


def test_model_argument_overrides_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("QWEN_VL_MODEL", "qwen3.5-plus")
    client = QwenVisionClient(api_key=FAKE_API_KEY, model="qwen3-vl-plus", openai_client=_FakeOpenAIClient(["{}"]))

    assert client.model == "qwen3-vl-plus"


def test_image_to_base64_data_url(tmp_path: Path) -> None:
    image_path = tmp_path / "palm.png"
    image_path.write_bytes(PNG_1X1)

    data_url = image_to_data_url(image_path)

    assert data_url.startswith("data:image/png;base64,")
    assert base64.b64decode(data_url.split(",", 1)[1])


def test_parse_model_json_and_fill_missing_fields() -> None:
    parsed = parse_json_object('```json\n{"SIMIAN_LINE": 1}\n```')
    normalized = normalize_feature_json(parsed)

    assert normalized["features"]["SIMIAN_LINE"] == 1
    assert normalized["features"]["PALM_LENGTH_RATIO"] is None
    assert "Missing field: PALM_LENGTH_RATIO" in normalized["errors"]
    assert len(normalized["features"]) == 33


def test_non_json_response_retries_once(tmp_path: Path) -> None:
    image_path = tmp_path / "palm.png"
    image_path.write_bytes(PNG_1X1)
    good_payload = _full_feature_payload(1)
    fake = _FakeOpenAIClient(["not json", json.dumps(good_payload)])
    client = QwenVisionClient(api_key=FAKE_API_KEY, openai_client=fake)

    result = client.extract_features(image_path=image_path, prompt_text="return json", max_retries=1)

    assert result["success"] is True
    assert result["json_parse_failures"] == 1
    assert result["features"]["SIMIAN_LINE"] == 1
    assert fake.chat.completions.calls == 2


def test_all_null_json_retries_once(tmp_path: Path) -> None:
    image_path = tmp_path / "palm.png"
    image_path.write_bytes(PNG_1X1)
    null_payload = _full_feature_payload(None)
    good_payload = _full_feature_payload(1)
    fake = _FakeOpenAIClient([json.dumps(null_payload), json.dumps(good_payload)])
    client = QwenVisionClient(api_key=FAKE_API_KEY, openai_client=fake)

    result = client.extract_features(image_path=image_path, prompt_text="return json", max_retries=1)

    assert result["success"] is True
    assert result["non_null_field_count"] == 33
    assert any("All 33 fields are null" in error for error in result["errors"])
    assert fake.chat.completions.calls == 2


def test_non_json_response_returns_error_after_retry(tmp_path: Path) -> None:
    image_path = tmp_path / "palm.png"
    image_path.write_bytes(PNG_1X1)
    fake = _FakeOpenAIClient(["not json", "still not json"])
    client = QwenVisionClient(api_key=FAKE_API_KEY, openai_client=fake)

    result = client.extract_features(image_path=image_path, prompt_text="return json", max_retries=1)

    assert result["success"] is False
    assert result["json_parse_failures"] == 2
    assert len(result["features"]) == 33


class _FakeExtractor:
    def __init__(self) -> None:
        self.calls = 0

    def extract_features(self, image_path: Path, prompt_text: str, max_retries: int = 1) -> dict:
        self.calls += 1
        if image_path.stem == "bad-left" and self.calls % 3 == 1:
            return {
                "success": False,
                "features": _full_feature_payload(None),
                "errors": ["forced failure"],
                "json_parse_failures": 1,
                "raw_text": "bad",
            }
        return {
            "success": True,
            "features": _full_feature_payload(1),
            "errors": [],
            "json_parse_failures": 0,
            "raw_text": "{}",
        }


def test_batch_does_not_abort_when_one_pass_fails(tmp_path: Path) -> None:
    input_dir = tmp_path / "palms"
    input_dir.mkdir()
    for name in ["good-left.png", "bad-left.png"]:
        (input_dir / name).write_bytes(PNG_1X1)

    summary = run_qwen_batch(
        input_dir=input_dir,
        limit=2,
        client=_FakeExtractor(),
        output_root=tmp_path / "outputs",
        prompt_text="return json",
    )

    assert len(summary["results"]) == 2
    assert len(list((tmp_path / "outputs" / "qwen_vision_passes").glob("*_pass_*.json"))) == 6
    assert len(list((tmp_path / "outputs" / "qwen_real_image_batch").glob("*_result.json"))) == 2
    assert summary["api_failed_images"] == ["bad-left.png"]


def test_batch_can_skip_existing_results(tmp_path: Path) -> None:
    input_dir = tmp_path / "palms"
    input_dir.mkdir()
    for name in ["good-left.png", "bad-left.png"]:
        (input_dir / name).write_bytes(PNG_1X1)

    features = _full_feature_payload(1)
    result_dir = tmp_path / "outputs" / "qwen_real_image_batch"
    result_dir.mkdir(parents=True)
    (result_dir / "good-left_result.json").write_text(
        json.dumps(
            {
                "image_file": str(input_dir / "good-left.png"),
                "person_id": "good",
                "hand_side": "left",
                "passes_success": [True, True, True],
                "recognized_field_counts": [33, 33, 33],
                "vision_passes": [],
                "vision_vote": {
                    "image_file": str(input_dir / "good-left.png"),
                    "person_id": "good",
                    "hand_side": "left",
                    "passes": [features, features, features],
                    "final_features": features,
                    "field_confidence": {key: "high" for key in features},
                },
                "engine_result": build_result(features),
                "manual_review_issues": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    extractor = _FakeExtractor()
    summary = run_qwen_batch(
        input_dir=input_dir,
        limit=2,
        client=extractor,
        output_root=tmp_path / "outputs",
        prompt_text="return json",
        skip_existing=True,
    )

    assert len(summary["results"]) == 2
    assert extractor.calls == 3
    assert len(list((tmp_path / "outputs" / "qwen_vision_passes").glob("*_pass_*.json"))) == 3
