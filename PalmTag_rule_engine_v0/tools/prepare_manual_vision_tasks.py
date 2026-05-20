from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DEFAULT_IMAGE_DIR = Path(r"E:\其他\Palmmi\测试图片")


def parse_image_filename(path: Path) -> dict[str, str | None]:
    stem = path.stem
    tokens = [token for token in re.split(r"[-_\s]+", stem) if token]
    side = ""
    person_tokens = tokens[:]
    for index, token in enumerate(tokens):
        lowered = token.lower()
        if lowered in {"left", "l", "左"}:
            side = "left"
            person_tokens.pop(index)
            break
        if lowered in {"right", "r", "右"}:
            side = "right"
            person_tokens.pop(index)
            break
    person_id = "_".join(person_tokens) if person_tokens else stem
    issues = []
    if not person_id:
        issues.append("person_id missing")
    if not side:
        issues.append("hand side missing")
    return {
        "person_id": person_id,
        "hand_side": side,
        "naming_issue": "; ".join(issues) if issues else None,
    }


def list_images(image_dir: Path = DEFAULT_IMAGE_DIR, limit: int = 10) -> tuple[list[Path], list[Path]]:
    files = sorted([path for path in image_dir.iterdir() if path.is_file()], key=lambda path: path.name.lower())
    images = [path for path in files if path.suffix.lower() in IMAGE_EXTENSIONS]
    non_images = [path for path in files if path.suffix.lower() not in IMAGE_EXTENSIONS]
    return images[:limit], non_images


def field_json_template() -> str:
    lines = ["{"] 
    fields = load_field_schema()
    for index, field in enumerate(fields):
        comma = "," if index < len(fields) - 1 else ""
        lines.append(f'  "{field["field_key"]}": null{comma}')
    lines.append("}")
    return "\n".join(lines)


def create_prompt_file(prompt_path: Path = PROJECT_ROOT / "prompts" / "palm_feature_extraction_prompt.md") -> None:
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    fields = load_field_schema()
    binary = [field["field_key"] for field in fields if field["value_range"] == "0/1"]
    range_02 = [field["field_key"] for field in fields if field["value_range"] == "0-2"]
    range_03 = [field["field_key"] for field in fields if str(field["value_range"]).startswith("0-3")]
    content = f"""# Palm Feature Extraction Prompt

你是一个只做掌纹形态标注的视觉识别模型。请只根据图片中可见的手掌形态和掌纹状态，输出严格 JSON。

禁止输出人格名称、命运、婚姻、健康、财运、寿命判断。禁止输出解释性文字。只输出 JSON。

## 取值规则

- 0/1 字段只能输出 0 或 1。
- 0-2 字段只能输出 0、1、2。
- 0-3 字段只能输出 0、1、2、3。
- 看不清、被遮挡、图片无法判断时输出 null。
- 不要新增字段，不要删除字段。

## 0/1 字段

{", ".join(binary)}

## 0-2 字段

{", ".join(range_02)}

## 0-3 字段

{", ".join(range_03)}

## 输出 JSON 模板

```json
{field_json_template()}
```
"""
    prompt_path.write_text(content, encoding="utf-8")


def write_inventory(
    image_dir: Path = DEFAULT_IMAGE_DIR,
    output_path: Path = PROJECT_ROOT / "outputs" / "palm_image_inventory.md",
    limit: int = 10,
) -> list[Path]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    selected, non_images = list_images(image_dir, limit=limit)
    all_files = [path for path in image_dir.iterdir() if path.is_file()]
    naming_issues = []
    lines = [
        "# Palm Image Inventory",
        "",
        f"- Image directory: `{image_dir}`",
        f"- Total files: {len(all_files)}",
        f"- Total jpg/png images: {len([path for path in all_files if path.suffix.lower() in IMAGE_EXTENSIONS])}",
        f"- Images selected this round: {len(selected)}",
        f"- Requested limit: {limit}",
        f"- Non jpg/png files: {len(non_images)}",
        "",
        "## Selected Images",
        "",
        "| # | File | person_id | hand_side | Naming issue |",
        "|---:|---|---|---|---|",
    ]
    for index, path in enumerate(selected, start=1):
        parsed = parse_image_filename(path)
        if parsed["naming_issue"]:
            naming_issues.append(path.name)
        lines.append(
            f"| {index} | {path.name} | {parsed['person_id']} | {parsed['hand_side'] or 'N/A'} | "
            f"{parsed['naming_issue'] or 'None'} |"
        )
    lines.extend(
        [
            "",
            "## Checks",
            "",
            f"- Can infer person_id from filenames: {'Yes' if all(parse_image_filename(path)['person_id'] for path in selected) else 'No'}",
            f"- Can infer left/right from filenames: {'Yes' if all(parse_image_filename(path)['hand_side'] for path in selected) else 'No'}",
            f"- Non jpg/png images: {', '.join(path.name for path in non_images) if non_images else 'None'}",
            f"- Naming anomalies: {', '.join(naming_issues) if naming_issues else 'None'}",
        ]
    )
    if len(selected) < limit:
        lines.append(f"- Note: only {len(selected)} jpg/png images are available, so fewer than {limit} images were selected.")
    lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return selected


def create_manual_tasks(
    image_dir: Path = DEFAULT_IMAGE_DIR,
    output_dir: Path = PROJECT_ROOT / "outputs" / "manual_vision_tasks",
    limit: int = 10,
) -> list[Path]:
    create_prompt_file()
    selected, _ = list_images(image_dir, limit=limit)
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_file in output_dir.glob("*_prompt.md"):
        old_file.unlink()
    prompt_text = (PROJECT_ROOT / "prompts" / "palm_feature_extraction_prompt.md").read_text(encoding="utf-8")
    task_paths: list[Path] = []
    for index, image_path in enumerate(selected, start=1):
        parsed = parse_image_filename(image_path)
        person_id = parsed["person_id"] or f"person_{index:03d}"
        hand_side = parsed["hand_side"] or "unknown"
        task_name = f"{person_id}_{hand_side}_prompt.md"
        task_path = output_dir / task_name
        task_path.write_text(
            "\n".join(
                [
                    f"# Manual Vision Task {index:03d}",
                    "",
                    f"- image_path: `{image_path}`",
                    f"- person_id: `{person_id}`",
                    f"- hand_side: `{hand_side}`",
                    "",
                    "## Prompt",
                    "",
                    prompt_text,
                    "",
                    "## Required JSON Output",
                    "",
                    "```json",
                    field_json_template(),
                    "```",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        task_paths.append(task_path)
    return task_paths


def write_manual_mode_report(
    task_paths: list[Path],
    output_path: Path = PROJECT_ROOT / "outputs" / "manual_vision_mode_report.md",
) -> None:
    lines = [
        "# Manual Vision Mode Report",
        "",
        "当前 Codex 环境没有可编程的批量视觉模型接口，不能直接对目录内图片稳定执行三次视觉识别。",
        "",
        "已生成手动识别任务文件。请把每张图片和对应 Prompt 发给支持视觉输入的模型，拿到三次 33 字段 JSON 后，再用 `tools/run_real_image_batch.py --vision-json-dir <目录>` 继续投票融合和规则引擎测试。",
        "",
        f"- Manual task files generated: {len(task_paths)}",
        "",
        "## Task Files",
        "",
    ]
    lines.extend(f"- `{path}`" for path in task_paths)
    if len(task_paths) < 10:
        lines.append("")
        lines.append(f"Note: source image directory only provided {len(task_paths)} jpg/png images, so fewer than 10 manual tasks were generated.")
    lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare PalmTag manual vision tasks.")
    parser.add_argument("--image-dir", type=Path, default=DEFAULT_IMAGE_DIR)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    write_inventory(args.image_dir, limit=args.limit)
    task_paths = create_manual_tasks(args.image_dir, limit=args.limit)
    write_manual_mode_report(task_paths)
    print(f"Wrote inventory and {len(task_paths)} manual vision tasks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
