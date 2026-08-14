"""Safely archive a fine-tuned candidate for offline audit only.

This utility never changes website code or the production model. It copies a
completed local candidate into a fresh destination, writes SHA-256 metadata,
and uses an atomic directory rename. Existing archives are refused.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_METADATA = ("config.json", "finetune_manifest.json")
MODEL_WEIGHT_CANDIDATES = ("pytorch_model.bin", "model.safetensors")
OPTIONAL_ARTIFACTS = (
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "vocab.txt",
    "training_args.bin",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def files_to_archive(model_dir: Path) -> list[Path]:
    missing = [name for name in REQUIRED_METADATA if not (model_dir / name).is_file()]
    weights = next((model_dir / name for name in MODEL_WEIGHT_CANDIDATES if (model_dir / name).is_file()), None)
    if missing or weights is None:
        expected = ", ".join((*REQUIRED_METADATA, "one of " + "/".join(MODEL_WEIGHT_CANDIDATES)))
        raise ValueError(f"candidate is incomplete; expected {expected}; missing={missing}")
    selected = [model_dir / name for name in REQUIRED_METADATA]
    selected.append(weights)
    selected.extend(model_dir / name for name in OPTIONAL_ARTIFACTS if (model_dir / name).is_file())
    return selected


def export_candidate(model_dir: Path, output_dir: Path, dry_run: bool) -> dict:
    model_dir = model_dir.resolve()
    output_dir = output_dir.resolve()
    if not model_dir.is_dir():
        raise ValueError(f"model directory does not exist: {model_dir}")
    if output_dir.exists():
        raise FileExistsError(f"refusing to overwrite existing archive: {output_dir}")
    selected = files_to_archive(model_dir)
    manifest = {
        "schema": "aigc-detector.finetuned-candidate-archive.v1",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "purpose": "offline audit archive only; not a production deployment artifact",
        "source_model_dir": str(model_dir),
        "files": [
            {"name": source.name, "bytes": source.stat().st_size, "sha256": sha256_file(source)}
            for source in selected
        ],
    }
    if dry_run:
        return {"dry_run": True, "output_dir": str(output_dir), "manifest": manifest}

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    temporary_dir = Path(tempfile.mkdtemp(prefix=f".{output_dir.name}.tmp-", dir=output_dir.parent))
    try:
        for source in selected:
            shutil.copy2(source, temporary_dir / source.name)
        (temporary_dir / "archive_manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        os.replace(temporary_dir, output_dir)
    except Exception:
        shutil.rmtree(temporary_dir, ignore_errors=True)
        raise
    return {"dry_run": False, "output_dir": str(output_dir), "manifest": manifest}


def main() -> int:
    parser = argparse.ArgumentParser(description="Atomically archive a completed fine-tuned candidate for offline audit.")
    parser.add_argument("--model", required=True, type=Path, help="completed fine-tuned candidate directory")
    parser.add_argument("--output", required=True, type=Path, help="new archive directory; it must not already exist")
    parser.add_argument("--dry-run", action="store_true", help="validate and display the manifest without writing files")
    args = parser.parse_args()
    try:
        print(json.dumps(export_candidate(args.model, args.output, args.dry_run), ensure_ascii=False, indent=2))
        return 0
    except (ValueError, FileExistsError, OSError) as exc:
        print(f"ARCHIVE_REFUSED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
