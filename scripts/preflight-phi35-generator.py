"""Download and preflight Phi-3.5 Mini locally for the V2 Generator-B decision.

This script is intentionally separate from every detector training, calibration,
and blind-test path.  It writes only a public-safe audit record containing source
revision, file hashes, software versions, GPU-memory statistics, and a short
non-evaluation Chinese smoke-generation.  It does not read or create any V2 text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import shutil
import sys
import time
from pathlib import Path
from typing import Any

import torch
from huggingface_hub import HfApi, snapshot_download
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


MODEL_ID = "microsoft/Phi-3.5-mini-instruct"
SMOKE_PROMPT = "请用两句中文说明：为什么做实验时要区分训练集和测试集？"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def atomic_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def progress(stage: str, **details: Any) -> None:
    print(json.dumps({"stage": stage, **details}, ensure_ascii=False), flush=True)


def gpu_snapshot() -> dict[str, Any]:
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is unavailable in the isolated PyTorch environment.")
    free_bytes, total_bytes = torch.cuda.mem_get_info(0)
    return {
        "device": torch.cuda.get_device_name(0),
        "free_mib": round(free_bytes / 1024**2, 2),
        "total_mib": round(total_bytes / 1024**2, 2),
        "allocated_mib": round(torch.cuda.memory_allocated(0) / 1024**2, 2),
        "reserved_mib": round(torch.cuda.memory_reserved(0) / 1024**2, 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training-root", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--model-id", default=MODEL_ID)
    parser.add_argument("--revision", default="main")
    parser.add_argument("--model-dir", type=Path, default=None)
    parser.add_argument("--audit-output", type=Path, default=None)
    parser.add_argument("--precheck-only", action="store_true", help="Report CUDA availability and memory without downloading or loading a model.")
    args = parser.parse_args()

    root = args.training_root.resolve()
    model_dir = (args.model_dir or root / "models" / "phi35_mini_instruct").resolve()
    audit_output = (args.audit_output or root / "runs" / "v2_phi35_generator_b_preflight.json").resolve()
    cache_dir = (root / ".hf_cache_phi35").resolve()
    os.environ["HF_HOME"] = str(cache_dir)
    os.environ["TRANSFORMERS_CACHE"] = str(cache_dir)

    started_at = int(time.time())
    before = gpu_snapshot()
    if args.precheck_only:
        progress("precheck_ok", gpu_memory_mib=before, model_downloaded=False)
        return 0
    progress("gpu_precheck_complete", gpu_memory_mib=before)
    api = HfApi()
    info = api.model_info(args.model_id, revision=args.revision)
    card_data = getattr(info, "cardData", {}) or {}
    license_value = getattr(info, "license", None)
    if not license_value and hasattr(card_data, "get"):
        license_value = card_data.get("license")
    if str(license_value or "").lower() != "mit":
        raise RuntimeError(f"Model card license was not MIT: {license_value!r}")
    resolved_revision = str(info.sha)
    progress("license_verified", model_id=args.model_id, resolved_revision=resolved_revision, license=license_value)

    # This is an official Hugging Face download into the user-approved project root.
    # `local_dir` keeps it isolated from global caches and personal files.
    progress("snapshot_download_started", local_dir=str(model_dir))
    snapshot_download(
        repo_id=args.model_id,
        revision=resolved_revision,
        local_dir=str(model_dir),
        local_dir_use_symlinks=False,
        resume_download=True,
    )
    progress("snapshot_download_complete")

    license_file = model_dir / "LICENSE"
    if not license_file.is_file():
        raise RuntimeError("Downloaded model snapshot did not contain a LICENSE file for audit.")
    if "MIT License" not in license_file.read_text(encoding="utf-8", errors="replace"):
        raise RuntimeError("Downloaded LICENSE did not contain the expected MIT License text.")

    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats(0)
    compute_dtype = torch.float16
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )
    progress("tokenizer_loading")
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    progress("model_4bit_loading")
    model = AutoModelForCausalLM.from_pretrained(
        model_dir,
        local_files_only=True,
        quantization_config=quantization_config,
        torch_dtype=compute_dtype,
        device_map="auto",
        max_memory={0: "7200MiB", "cpu": "12GiB"},
        trust_remote_code=False,
        low_cpu_mem_usage=True,
    )
    model.eval()
    after_load = gpu_snapshot()
    progress("model_4bit_loaded", gpu_memory_mib=after_load)
    messages = [{"role": "user", "content": SMOKE_PROMPT}]
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(model.device)
    with torch.inference_mode():
        progress("smoke_generation_started", max_new_tokens=64)
        output_ids = model.generate(
            inputs,
            max_new_tokens=64,
            do_sample=False,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    response = tokenizer.decode(output_ids[0][inputs.shape[-1] :], skip_special_tokens=True).strip()
    after_generate = gpu_snapshot()
    progress("smoke_generation_complete", gpu_memory_mib=after_generate)

    files = []
    for file_path in sorted(model_dir.rglob("*")):
        if file_path.is_file() and ".cache" not in file_path.parts:
            files.append({"relative_path": str(file_path.relative_to(model_dir)).replace("\\", "/"), "bytes": file_path.stat().st_size, "sha256": sha256(file_path)})
    audit = {
        "schema_version": 1,
        "status": "passed",
        "purpose": "V2 Generator-B selection preflight only; no calibration or blind-test text was read, generated, or scored.",
        "model": {
            "id": args.model_id,
            "requested_revision": args.revision,
            "resolved_revision": resolved_revision,
            "model_card_license": str(license_value),
            "license_file_sha256": sha256(license_file),
        },
        "software": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "torch": torch.__version__,
            "transformers": __import__("transformers").__version__,
            "bitsandbytes": __import__("bitsandbytes").__version__,
        },
        "quantization": {"mode": "4bit", "type": "nf4", "double_quant": True, "compute_dtype": "float16"},
        "gpu_memory_mib": {"before": before, "after_load": after_load, "after_generate": after_generate},
        "device_map": getattr(model, "hf_device_map", {}),
        "smoke_test": {"prompt": SMOKE_PROMPT, "response": response, "max_new_tokens": 64},
        "files": files,
        "started_at_unix": started_at,
        "completed_at_unix": int(time.time()),
    }
    atomic_json(audit_output, audit)
    progress("passed", audit_output=str(audit_output), resolved_revision=resolved_revision, after_load=after_load)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
