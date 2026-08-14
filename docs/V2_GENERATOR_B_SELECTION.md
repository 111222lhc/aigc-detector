# V2 第二生成器选择记录

**状态：已冻结；V2 第二生成器为 Microsoft 官方 Phi-3.5 ONNX CPU INT4 AWQ。**

V2 协议要求第二生成器与已使用的本地 `Qwen2.5-0.5B-Instruct` 不同，并在生成任何盲测文本前冻结模型名、修订版本、许可证、权重哈希、提示哈希与显存预检结果。现阶段尚未下载或生成任何 V2 文本。

| 候选 | 已核验信息 | 是否可直接选用 | 结论 |
|---|---|---|---|
| `internlm/internlm2_5-1_8b-chat` | 模型卡标记为约 2B 参数，但许可证字段为 `other` | 否 | 许可证不是项目当前要求的清晰、可审计开源许可，因此不作为默认 V2 生成器。[1] |
| `openbmb/MiniCPM3-4B` | 模型卡标记 `apache-2.0`、中文、4B；同时载明商业免费使用需要填写登记问卷 | 暂否 | 8GB 显存可作为量化推理候选，但由于网站可能涉及商业使用，在没有明确完成相关登记并记录前不下载、不生成 V2 盲测文本。[2] |
| `microsoft/Phi-3.5-mini-instruct` | 官方模型卡标记 MIT、约 3.8B/4B 参数、多语言且包含中文；支持 Transformers 本地推理 | 是，先预检 | 与 Qwen 为不同模型系列，许可证清晰；须先用 4-bit 量化在用户授权的 RTX 4060 上完成最小前向与生成预检，确认 8GB 显存余量后才可冻结。[3] |

> **冻结决定：**不为了推进速度而使用许可证标注为 `other` 的权重，也不默认把“需商业登记”的模型当作已经取得商业权限。V2 的第二生成器锁定为 Microsoft 发布的 `microsoft/Phi-3.5-mini-instruct-onnx`，采用其官方 `cpu_and_mobile/cpu-int4-awq-block-128-acc-level-4` 变体。本地 PyTorch 4-bit 加载曾因 `torch_cpu.dll` 访问冲突停止；该失败不改变模型选择，也不作为成功证据。随后完成的官方 ONNX CPU INT4 AWQ 最小生成预检通过，因而该本机 CPU 运行时成为冻结的 V2 生成实现。

## 2026-08-14 官方模型卡复核

已重新读取 Microsoft 发布的 [官方模型卡][3]。该页将 `microsoft/Phi-3.5-mini-instruct` 标记为 **MIT** 许可证，并说明该模型面向多语言的商业和研究使用；页面同时给出了基于 Transformers 的本地加载示例。此复核仅确认了预筛选的来源、许可证和加载路径，**不构成生成器冻结**。冻结仍取决于隔离环境中的显存预检、实际下载快照 SHA-256 和本地最小生成记录。

2026-08-14 还复核了 Microsoft 发布的 [ONNX 优化模型卡][4]。该仓库同样标记为 **MIT**，提供针对 CPU 与 GPU 的 INT4 ONNX 变体，并明确将 Windows 列为支持平台。由于本机 PyTorch 路径在加载原始权重时发生 `torch_cpu.dll` 访问冲突，该官方 ONNX 路线可以作为**同一 Phi-3.5 生成器的替代本机运行时**进行独立预检；只有完成其精确修订、文件哈希和最小生成审计后，才可取代失败的 PyTorch 预检记录。

官方文件树在 2026-08-14 复核时确认 CPU 变体的精确路径为 `cpu_and_mobile/cpu-int4-awq-block-128-acc-level-4`，总目录页标示约 2.78 GB。此前模型卡示例中省略了 `-acc-level-4` 后缀，导致首次受控下载只匹配到根目录的 `LICENSE` 与 `README.md`，未形成有效模型目录；该无效目录不作为预检结果或模型产物使用。

该目录的官方文件页列出了 52.2 MB 的 `.onnx` 图文件、2.73 GB 的 `.onnx.data` 权重文件以及 `config.json`、`genai_config.json`、`tokenizer.json`、`tokenizer_config.json` 和 `special_tokens_map.json`。为绕开 Xet 快照下载在 90% 阶段的停滞，使用 [hf-mirror][5] 的同一官方仓库 `resolve/main` 路径对权重 `.data` 文件实施可恢复范围下载；响应经重定向后的 `Content-Length` 为 `2,728,144,896` bytes，文件仅在该精确字节数下载完成后才原子改名为正式 `.data` 文件。模型身份、许可证和最终 SHA-256 仍以 Microsoft 官方仓库元数据及本地审计为准，镜像仅承担网络传输。

## 冻结预检记录

2026-08-14，本机隔离环境对冻结实现完成了成功的最小预检。预检不读取训练、校准或 V2 盲测文本；它使用一条专门编写的两句提示、确定性解码和最多 64 个生成 token。原始 PyTorch 4-bit 路径没有被用作 V2 生成路径，且预检成功的 ONNX 路径只使用 CPU，不占用用户游戏显卡。

| 冻结字段 | 记录值 |
| --- | --- |
| 模型仓库 | `microsoft/Phi-3.5-mini-instruct-onnx` |
| 官方解析修订 | `7230dcd6c1dd28aab70f263ecc8734ec9d9bcb70` |
| 许可证 | MIT，见 [官方模型卡][4] |
| 本地运行时 | `onnxruntime-genai 0.15.2`，CPU execution provider |
| 量化变体 | `cpu_and_mobile/cpu-int4-awq-block-128-acc-level-4` |
| 主权重文件 | `phi-3.5-mini-instruct-cpu-int4-awq-block-128-acc-level-4.onnx.data` |
| 主权重大小 | `2,728,144,896` bytes |
| 主权重 SHA-256 | `3351fe9cc669eba43e07fb3cec436078629d5145531a28bc36fe6d5ad7683eb8` |
| 最小生成 | 通过；确定性、64 token 上限、响应 17 个字符 |
| 最小生成响应哈希 | `3f5b39f6edb194735837f888429f857d7628af952b5cc3345fa796f30be50c3c` |
| 本地审计文件 | `aigc_detector_training/runs/v2_phi35_onnx_generator_b_preflight.json` |

从本节生效起，模型名称、修订、量化变体、运行时、提示模板版本和生成参数均不得因查看任何 V2 校准或盲测结果而改变。V2 的第二生成器文本将在独立的原子写入流程中建立；完成冻结前，尚未生成任何 V2 校准或盲测文档。

## 选择后的必做验证

选择一项候选不等于可使用。下载前应以隔离环境完成 CUDA、显存和最小前向推理预检；下载后记录精确模型修订、文件 SHA-256、许可证副本/链接和来源 URL。只有这些记录与 V2 预注册协议一起冻结后，才能开始生成第二生成器的盲测分区。

## References

[1]: https://huggingface.co/internlm/internlm2_5-1_8b-chat "internlm/internlm2_5-1_8b-chat model card"
[2]: https://huggingface.co/openbmb/MiniCPM3-4B "openbmb/MiniCPM3-4B model card"
[3]: https://huggingface.co/microsoft/Phi-3.5-mini-instruct "microsoft/Phi-3.5-mini-instruct model card"
[4]: https://huggingface.co/microsoft/Phi-3.5-mini-instruct-onnx "microsoft/Phi-3.5-mini-instruct-onnx model card"
[5]: https://hf-mirror.com/microsoft/Phi-3.5-mini-instruct-onnx "HF Mirror repository proxy for Microsoft Phi-3.5 ONNX"
