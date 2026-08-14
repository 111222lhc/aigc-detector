# 本地微调复现运行手册

本手册配合 `scripts/train-finetuned-candidate.py` 使用，用于在拥有合法来源文本、CUDA 环境和足够存储空间的受控机器上复现 V1 候选训练流程。它**不提供**训练、校准或盲测正文；执行者必须自行取得符合来源许可的文档，并按相同隔离规则建立冻结分区。

## 分区文件格式

每个分区都是 UTF-8 JSONL，每行必须包含 `text`、`label` 和可选 `document_sha256`。其中 `label: 0` 是人类文本，`label: 1` 是 AI 文本。脚本会将空白标准化后重新计算 SHA-256：若提供的哈希不一致、同一分区存在重复文本，或任意两个分区重叠，都会立即停止。

```json
{"text":"受许可并已清洗的文档正文", "label":0, "document_sha256":"<normalized-text-sha256>"}
```

V1 的固定数量为：训练集各类 360 条，校准集各类 100 条，盲测集各类 100 条。盲测路径必须提供以便脚本检查隔离，但它不会进入训练 DataLoader、优化器或阈值过程。

## 先执行只读校验

```powershell
$python = 'C:\path\to\isolated\python.exe'
& $python .\scripts\train-finetuned-candidate.py `
  --train .\private-data\train.jsonl `
  --calibration .\private-data\calibration.jsonl `
  --blind-test .\private-data\blind-test.jsonl `
  --output-dir .\runs\candidate_check_only `
  --dry-run
```

预期为 JSON `status: ok`。在该步骤通过前不要下载模型、使用 GPU 或创建输出目录。

## 执行训练

```powershell
& $python .\scripts\train-finetuned-candidate.py `
  --train .\private-data\train.jsonl `
  --calibration .\private-data\calibration.jsonl `
  --blind-test .\private-data\blind-test.jsonl `
  --output-dir .\runs\aigc_detector_zhv2_finetune_v1
```

训练配置固定为：`seed=20260814`、最大长度 512、底部 8 层 BERT 冻结、顶部 4 层与分类头训练、批量 4、梯度累积 8、学习率 `2e-5`、3 个 epoch。训练结束会写入 `finetune_manifest.json`，其中包含配置、实际损失、分区文件哈希和明确的 `blind_test_used_for_training: false`。

训练完成后，必须先在独立校准集锁定阈值；再执行一次盲测评分。不要根据盲测结果回过头调训练参数、阈值、文本选择或模型版本。ONNX 转换与 Node.js 一致性检查见[候选复现说明](./CANDIDATE_MODEL_REPRODUCIBILITY.md)。
