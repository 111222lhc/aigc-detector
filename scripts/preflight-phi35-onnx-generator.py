"""Audit the official Phi-3.5 ONNX CPU INT4 generator without importing PyTorch.

This is an isolated V2 Generator B preflight only. It downloads the official
Microsoft ONNX CPU INT4 subfolder to the user-approved training workspace,
checks its MIT model-card metadata, runs one deterministic short generation
with ONNX Runtime GenAI on CPU, and writes provenance without evaluation text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any

from huggingface_hub import HfApi, snapshot_download
import onnxruntime_genai as og


MODEL_ID = "microsoft/Phi-3.5-mini-instruct-onnx"
MODEL_SUBDIR = "cpu_and_mobile/cpu-int4-awq-block-128-acc-level-4"
PROMPT = "<|user|>请用两句话概述人工智能对日常学习的一个可能影响。<|end|><|assistant|>"


def progress(stage: str, **details: Any) -> None:
    print(json.dumps({"stage": stage, **details}, ensure_ascii=False), flush=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, value: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def extract_license(info: Any) -> str | None:
    card = getattr(info, "card_data", None)
    if isinstance(card, dict):
        return card.get("license")
    return getattr(card, "license", None)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training-root", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--model-id", default=MODEL_ID)
    parser.add_argument("--revision", default="main")
    args = parser.parse_args()

    root = args.training_root.resolve()
    model_dir = root / "models" / "phi35_mini_instruct_onnx_cpu_int4_awq_block128"
    audit_path = root / "runs" / "v2_phi35_onnx_generator_b_preflight.json"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    api = HfApi()

    progress("metadata_check_started", model_id=args.model_id, revision=args.revision)
    info = api.model_info(args.model_id, revision=args.revision)
    license_value = extract_license(info)
    if str(license_value or "").lower() != "mit":
        raise RuntimeError(f"Expected MIT license, found {license_value!r}")
    resolved_revision = str(info.sha)
    progress("license_verified", license=license_value, resolved_revision=resolved_revision)

    disk = shutil.disk_usage(root)
    if disk.free < 5 * 1024**3:
        raise RuntimeError("Less than 5 GiB free disk space remains in the approved training workspace.")

    runtime_dir = model_dir / MODEL_SUBDIR
    required_names = [
        "config.json",
        "genai_config.json",
        "phi-3.5-mini-instruct-cpu-int4-awq-block-128-acc-level-4.onnx",
        "phi-3.5-mini-instruct-cpu-int4-awq-block-128-acc-level-4.onnx.data",
        "special_tokens_map.json",
        "tokenizer.json",
        "tokenizer_config.json",
    ]
    if all((runtime_dir / name).is_file() for name in required_names):
        progress("snapshot_download_reused", local_dir=str(model_dir), required_file_count=len(required_names))
    else:
        progress("snapshot_download_started", local_dir=str(model_dir), path_prefix=MODEL_SUBDIR)
        snapshot_download(
            repo_id=args.model_id,
            revision=resolved_revision,
            local_dir=str(model_dir),
            allow_patterns=[f"{MODEL_SUBDIR}/**", "LICENSE", "README.md"],
            resume_download=True,
        )
        if not all((runtime_dir / name).is_file() for name in required_names):
            missing = [name for name in required_names if not (runtime_dir / name).is_file()]
            raise FileNotFoundError(f"Required ONNX generator files are missing after download: {missing}")
        progress("snapshot_download_complete")

    progress("onnx_model_loading", provider="cpu")
    model = og.Model(str(runtime_dir))
    tokenizer = og.Tokenizer(model)
    params = og.GeneratorParams(model)
    params.set_search_options(max_length=64, do_sample=False)
    generator = og.Generator(model, params)
    generator.append_tokens(tokenizer.encode(PROMPT))
    stream = tokenizer.create_stream()
    response_parts: list[str] = []
    progress("smoke_generation_started", max_length=64)
    while not generator.is_done():
        generator.generate_next_token()
        token = generator.get_next_tokens()[0]
        response_parts.append(stream.decode(token))
    response = "".join(response_parts).strip()
    del generator, params, tokenizer, model
    progress("smoke_generation_complete", response_character_count=len(response))

    files = []
    for path in sorted(runtime_dir.rglob("*")):
        if path.is_file():
            files.append({"relative_path": str(path.relative_to(model_dir)).replace("\\", "/"), "bytes": path.stat().st_size, "sha256": sha256(path)})
    audit = {
        "schema_version": 1,
        "status": "passed",
        "generator": "Phi-3.5-mini-instruct official ONNX CPU INT4 AWQ",
        "source": {"model_id": args.model_id, "requested_revision": args.revision, "resolved_revision": resolved_revision, "license": license_value},
        "runtime": {"python": sys.version.split()[0], "onnxruntime_genai": og.__version__, "execution_provider": "cpu"},
        "model_subdirectory": MODEL_SUBDIR,
        "prompt_policy": "A purpose-written preflight prompt only; no V2 calibration or blind-test text was supplied.",
        "smoke_generation": {"deterministic": True, "max_length": 64, "response_character_count": len(response), "response_sha256": hashlib.sha256(response.encode("utf-8")).hexdigest()},
        "files": files,
        "created_at_unix": int(time.time()),
    }
    write_json(audit_path, audit)
    progress("passed", audit_output=str(audit_path), file_count=len(files))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
