"""Reproduce the local fine-tuning recipe for the V1 Chinese AIGC candidate.

This program intentionally requires caller-supplied, previously frozen JSONL
partitions. It does not download or publish data and it refuses a split whose
document hashes overlap. The repository never contains those partitions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer, get_linear_schedule_with_warmup


BASE_MODEL = "yuchuantian/AIGC_detector_zhv2"
SEED = 20260814
MAX_LENGTH = 512
TRAIN_BATCH_SIZE = 4
GRADIENT_ACCUMULATION_STEPS = 8
EPOCHS = 3
LEARNING_RATE = 2e-5
FROZEN_BERT_LAYERS = 8


@dataclass(frozen=True)
class Example:
    text: str
    label: int
    document_sha256: str


class EncodedExamples(Dataset):
    def __init__(self, tokenizer: Any, examples: list[Example]):
        self.items = tokenizer(
            [example.text for example in examples],
            truncation=True,
            padding="max_length",
            max_length=MAX_LENGTH,
            return_tensors="pt",
        )
        self.labels = torch.tensor([example.label for example in examples], dtype=torch.long)

    def __len__(self) -> int:
        return self.labels.size(0)

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        item = {key: value[index] for key, value in self.items.items()}
        item["labels"] = self.labels[index]
        return item


def sha256_text(text: str) -> str:
    normalized = " ".join(text.replace("\r\n", "\n").split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def read_partition(path: Path) -> list[Example]:
    examples: list[Example] = []
    with path.open("r", encoding="utf-8") as source:
        for line_number, raw_line in enumerate(source, start=1):
            if not raw_line.strip():
                continue
            row = json.loads(raw_line)
            text = str(row.get("text", "")).strip()
            label = row.get("label")
            supplied_hash = str(row.get("document_sha256", "")).lower()
            if label not in (0, 1) or not text:
                raise ValueError(f"{path}:{line_number} requires nonempty text and label 0 or 1")
            computed_hash = sha256_text(text)
            if supplied_hash and supplied_hash != computed_hash:
                raise ValueError(f"{path}:{line_number} document_sha256 does not match normalized text")
            examples.append(Example(text=text, label=int(label), document_sha256=computed_hash))
    if not examples:
        raise ValueError(f"{path} contains no examples")
    return examples


def validate_partition(name: str, examples: list[Example], expected_per_label: int) -> set[str]:
    labels = {label: sum(item.label == label for item in examples) for label in (0, 1)}
    if labels != {0: expected_per_label, 1: expected_per_label}:
        raise ValueError(f"{name} label counts must be {{0: {expected_per_label}, 1: {expected_per_label}}}, got {labels}")
    hashes = {item.document_sha256 for item in examples}
    if len(hashes) != len(examples):
        raise ValueError(f"{name} contains duplicate normalized documents")
    return hashes


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def freeze_bottom_bert_layers(model: Any) -> int:
    encoder_layers = model.bert.encoder.layer
    if len(encoder_layers) < FROZEN_BERT_LAYERS:
        raise RuntimeError("source model has fewer BERT layers than the locked freezing strategy")
    for layer in encoder_layers[:FROZEN_BERT_LAYERS]:
        for parameter in layer.parameters():
            parameter.requires_grad = False
    return sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", type=Path, required=True, help="Frozen JSONL with 360 human and 360 AI texts.")
    parser.add_argument("--calibration", type=Path, required=True, help="Frozen JSONL with 100 human and 100 AI texts.")
    parser.add_argument("--blind-test", type=Path, required=True, help="Frozen JSONL with 100 human and 100 AI texts; validated but never used for updates.")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--dry-run", action="store_true", help="Validate partition shape and hash isolation without loading a model.")
    args = parser.parse_args()

    train = read_partition(args.train)
    calibration = read_partition(args.calibration)
    blind_test = read_partition(args.blind_test)
    train_hashes = validate_partition("train", train, 360)
    calibration_hashes = validate_partition("calibration", calibration, 100)
    blind_hashes = validate_partition("blind-test", blind_test, 100)
    if train_hashes & calibration_hashes or train_hashes & blind_hashes or calibration_hashes & blind_hashes:
        raise ValueError("frozen partitions overlap after normalized-document SHA-256 checking")
    if args.dry_run:
        print(json.dumps({"status": "ok", "mode": "dry-run", "train": len(train), "calibration": len(calibration), "blind_test": len(blind_test)}))
        return 0

    if args.output_dir.exists():
        raise FileExistsError(f"refusing to overwrite output directory: {args.output_dir}")
    set_seed(SEED)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(args.base_model, num_labels=2).to(device)
    trainable_parameters = freeze_bottom_bert_layers(model)
    dataset = EncodedExamples(tokenizer, train)
    loader = DataLoader(dataset, batch_size=TRAIN_BATCH_SIZE, shuffle=True)
    optimizer = AdamW((parameter for parameter in model.parameters() if parameter.requires_grad), lr=LEARNING_RATE)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=0,
        num_training_steps=((len(loader) + GRADIENT_ACCUMULATION_STEPS - 1) // GRADIENT_ACCUMULATION_STEPS) * EPOCHS,
    )

    model.train()
    epoch_losses: list[float] = []
    for _epoch in range(EPOCHS):
        optimizer.zero_grad(set_to_none=True)
        total_loss = 0.0
        for step, batch in enumerate(loader, start=1):
            batch = {key: value.to(device) for key, value in batch.items()}
            loss = model(**batch).loss / GRADIENT_ACCUMULATION_STEPS
            loss.backward()
            total_loss += float(loss.detach().cpu()) * GRADIENT_ACCUMULATION_STEPS
            if step % GRADIENT_ACCUMULATION_STEPS == 0 or step == len(loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)
        epoch_losses.append(total_loss / len(loader))

    args.output_dir.mkdir(parents=True, exist_ok=False)
    model.save_pretrained(args.output_dir, safe_serialization=True)
    tokenizer.save_pretrained(args.output_dir)
    manifest = {
        "schema_version": 1,
        "base_model": args.base_model,
        "seed": SEED,
        "max_length": MAX_LENGTH,
        "epochs": EPOCHS,
        "learning_rate": LEARNING_RATE,
        "train_batch_size": TRAIN_BATCH_SIZE,
        "gradient_accumulation_steps": GRADIENT_ACCUMULATION_STEPS,
        "frozen_bert_layers": FROZEN_BERT_LAYERS,
        "trainable_parameters": trainable_parameters,
        "device": str(device),
        "epoch_losses": epoch_losses,
        "partitions": {"train": len(train), "calibration": len(calibration), "blind_test": len(blind_test)},
        "partition_hashes": {
            "train_manifest_sha256": file_sha256(args.train),
            "calibration_manifest_sha256": file_sha256(args.calibration),
            "blind_test_manifest_sha256": file_sha256(args.blind_test),
        },
        "blind_test_used_for_training": False,
    }
    (args.output_dir / "finetune_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "ok", "output_dir": str(args.output_dir), "epoch_losses": epoch_losses}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
