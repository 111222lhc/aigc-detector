# 中文 AIGC 检测预训练模型调研

## 目标与边界

本调研用于判断是否存在可合法获取的预训练模型或权重，可在中文 AIGC 检测任务上进一步微调、蒸馏或作为离线教师模型。候选必须同时通过四项核验：权重实际可下载、许可证允许预期用途、模型或数据来源可追溯、以及能在独立中文评测中与当前 Iter5 基线公平比较。未核验完成前，不下载、不接入生产网站，也不据此宣称能力提升。

## 初步候选与来源

| 候选 | 初步信号 | 仍待核验的关键问题 | 来源 |
| --- | --- | --- | --- |
| LLM-Detector | 论文明确针对中文 AI 生成文本检测；官方代码仓库与公开数据集页面均可检索到。 | 是否发布已训练检测权重；基础模型的权重许可是否允许微调与再分发；运行资源要求。 | [官方代码](https://github.com/QiYuan-tech/LLM-Detector)；[论文](https://arxiv.org/abs/2402.01158)；[数据集页](https://huggingface.co/datasets/QiYuan-tech/LLM-Detector) |
| AIGC_text_detector | 检索结果指向中文检测器及多尺度正负未标注检测方法。 | 是否有官方权重、许可证与可复现评测脚本；是否覆盖现代生成器与学术文本。 | [代码仓库](https://github.com/YuchuanTian/AIGC_text_detector) |
| multilingual-ai-human-detector | Hugging Face 条目声明其二分类器覆盖英语、中文与越南语。 | 训练数据、模型卡、许可证、中文跨域表现和可能的数据污染。 | [模型页](https://huggingface.co/bibbbu/multilingual-ai-human-detector_xlm-roberta-base) |
| LLMDet | 检索结果标注官方实现与 Apache-2.0 许可。 | 是否为中文检测模型、模型权重与训练数据是否足以支持本项目的中文论文目标。 | [模型页](https://huggingface.co/fushh7/LLMDet) |

> 初步检索只能说明“存在候选来源”，不构成模型可用性、准确率、授权许可或适合本项目的结论。后续将逐一阅读模型卡、代码仓库、许可证与论文全文。

## 已核验候选：LLM-Detector-Small-zh

官方 GitHub 仓库将自身标注为该论文的官方实现，并在 README 中列出 `LLM-Detector-Small-zh` 下载项；Hugging Face 上存在同名模型页。[2] [3] 因此，“可访问的中文检测权重”这一前提成立。模型卡将其标为 Transformers/PyTorch、Qwen 与 `custom_code`，示例通过 `AutoModelForCausalLM` 和 `trust_remote_code=True` 加载，并给出了 CPU 加载示例。[3]

但该候选**尚不适合直接接入网站或立即下载执行**。公开模型卡提示缺少 YAML 元数据，未在可见内容中给出许可证；官方 GitHub 的“License”章节也未列出许可证文本。[2] [3] 另外，`trust_remote_code=True` 表示加载前必须逐文件安全审计，且其因果语言模型推理方式不等同于当前网站的纯 Node.js 轻量分类器。基于这些事实，当前结论是：它可作为“待许可核验的离线教师模型候选”，但尚不能被视为可商用、可再分发或可安全部署的基础模型。

## 已核验候选：AIGC_text_detector 与多语种 XLM-RoBERTa

`AIGC_text_detector` 是 ICLR 2024 Spotlight 论文的官方代码仓库，仓库包含训练代码、依赖文件、中文 `Zh-v3` / `Zh-v3-short` 变体入口、模型下载入口以及明确的 Apache-2.0 许可。[4] 这使其成为当前调研中许可证最清晰的“可离线复现实验”候选。不过，其公开说明使用 HC3 作为核心数据来源，原始目标与现有项目已使用的 HC3 来源可能重叠。因此它不能作为独立最终盲测的唯一证据，也不能直接以其公开成绩证明对本项目论文语料的改善。其 PyTorch 训练实现还要求 Python 运行时；若采用，应该作为离线教师或基线，随后蒸馏为网站可部署的轻量模型。

`bibbbu/multilingual-ai-human-detector_xlm-roberta-base` 是 MIT 许可证、约 0.3B 参数的 XLM-RoBERTa 二分类器，模型卡明确标注中文支持，并说明其中文训练部分来自 HC3-Chinese `open_qa`；模型卡还提供了提示级 70/15/15 划分的复现命令。[5] 它的明确 MIT 许可、Safetensors 格式与编码器分类结构，使其比因果语言模型更容易微调或蒸馏。反面是其公开训练规模仅为 900 个问答对、AI 一侧仅说明使用 Qwen2.5-1.5B-Instruct，因此必须假定跨生成器与跨论文文体能力有限，不能未经新盲测直接替换 Iter5。该模型未由托管推理提供商部署，直接网站使用仍需要自建 Python/ONNX 推理服务或蒸馏。

`yuchuantian/AIGC_detector_zhv2` 是同一 ICLR 2024 官方项目明确提供的中文文本分类权重，模型卡标记为 BERT、Transformers/PyTorch 和 Apache-2.0 许可证。[6] 因为权重、训练代码与许可均可追溯，它是目前**最优先**的离线复现、重新微调和教师蒸馏候选。但仍须遵守 HC3 来源重叠限制：它只能用作初始化或附加教师信号，最终评估必须使用独立于 HC3/C-ReD 和模型公开训练集的文档级盲测集。

该模型的公开 API 元数据进一步确认其为 `BertForSequenceClassification`、`AutoModelForSequenceClassification` 兼容的非门控文本分类权重，包含标准 tokenizer 与 `pytorch_model.bin`；公开存储量约 818 MB。[8] 这意味着它可以下载到离线训练环境作为 BERT 分类初始化，而不必加载带自定义远程代码的生成模型。818 MB 是“权重存储量”，不是训练显存的完整估计；全量微调仍需要 GPU，且训练的峰值显存还取决于序列长度、批量、精度和优化器状态。

检索中出现的 `fushh7/LLMDet` 虽为 Apache-2.0，但模型卡实际标记为零样本**目标检测**，依赖视觉检测栈与图像数据；它不是 AIGC 文本检测器。[7] 已从所有文本模型候选中排除。

## 研究依据

面向中文检测的 LLM-Detector 论文摘要称其收集了人类专家与九类 LLM 对多领域问题的中文回答，并将指令微调用于句子与文档级检测。[1] 跨生成器、跨域和固定人类误报率的评测要求仍应沿用现有 Iteration11 协议，而非仅复现原论文中的单一汇总分数。

## 参考文献

[1] [Wang et al., *LLM-Detector: Improving AI-Generated Chinese Text Detection with Open-Source LLM Instruction Tuning*](https://arxiv.org/abs/2402.01158)

[2] [JichengTech/LLM-Detector official GitHub repository](https://github.com/JichengTech/LLM-Detector)

[3] [QiYuan-tech/LLM-Detector-Small-zh model card](https://huggingface.co/QiYuan-tech/LLM-Detector-Small-zh)

[4] [YuchuanTian/AIGC_text_detector official repository](https://github.com/YuchuanTian/AIGC_text_detector)

[5] [bibbbu/multilingual-ai-human-detector_xlm-roberta-base model card](https://huggingface.co/bibbbu/multilingual-ai-human-detector_xlm-roberta-base)

[6] [yuchuantian/AIGC_detector_zhv2 model card](https://huggingface.co/yuchuantian/AIGC_detector_zhv2)

[7] [fushh7/LLMDet model card](https://huggingface.co/fushh7/LLMDet)

[8] [AIGC_detector_zhv2 public Hugging Face model metadata](https://huggingface.co/api/models/yuchuantian/AIGC_detector_zhv2)
