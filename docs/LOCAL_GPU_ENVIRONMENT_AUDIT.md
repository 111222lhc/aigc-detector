# Windows 本地训练环境与依赖来源审计（2026-08-14）

## 范围与结论

本记录覆盖用户专用训练目录 `aigc_detector_training/.conda/gpu` 的本地环境。它不修改系统 Python、不包含用户论文文本，也不将本地候选直接作为网站部署产物。

环境已完成一次端到端训练与推理。训练前的 PyTorch 预检确认 CUDA 可用并使用 RTX 4060 Laptop GPU；本次审计再次验证了核心 Python 包版本。一次后续 `nvidia-smi` 查询因 Windows 终端通道的 NVML 短暂不可用返回错误，**不**影响已经完成的训练记录，也不应被解释为 GPU 配置改变。每一次后续 GPU 作业前，仍需重新运行 PyTorch CUDA 预检。

| 项目 | 已记录值 | 验证方式 | 结论 |
|---|---|---|---|
| Python | 3.11.15 | 隔离环境解释器 | 可用 |
| PyTorch | 2.9.1+cu126 | `torch.__version__` | 可用 |
| PyTorch CUDA 运行时 | 12.6 | `torch.version.cuda` | 与该 PyTorch 构建匹配 |
| Transformers | 4.57.6 | 解释器导入 | 可用 |
| Datasets | 3.6.0 | 解释器导入 | 可用 |
| Accelerate | 1.14.0 | 解释器导入 | 可用 |
| Hugging Face Hub | 0.36.2 | 解释器导入 | 可用 |
| 已核验 GPU | NVIDIA GeForce RTX 4060 Laptop GPU，8GB 显存 | 训练前 PyTorch 预检 | 已用于本轮微调 |
| 已记录驱动 | NVIDIA 591.74，系统 CUDA 13.1 | 训练前环境预检 | 兼容 cu126 的实际训练 |

> `cu126` 是 PyTorch 轮子携带的 CUDA 12.6 用户态运行时标识，并不要求系统安装 CUDA Toolkit 12.6。实际可用性应以 `torch.cuda.is_available()` 和一次小型前向计算为准。[1]

## 来源可追溯性边界

Conda 环境历史记录显示基础 Python 环境使用 Anaconda `defaults/win-64` 软件包创建。关键 Python 包均位于项目私有目录，而不是系统级 Python 的 `site-packages`。

此前安装遵循“优先使用可信国内镜像”的要求，但现有 `pip` 安装元数据和 Conda 历史不会保存每一个历史下载请求的完整索引 URL；本次 `pip config list -v` 也未显示项目级固定 `index-url`。因此，**不能事后将具体国内镜像名称写成已证明事实**。

| 下载类别 | 当前可复核来源 | 不应作出的超出证据声明 |
|---|---|---|
| Conda 基础环境 | `conda-meta/history` 中的 `defaults/win-64` 条目 | 不推断每个 Conda 包的镜像代理路径 |
| CUDA PyTorch | 本地版本 `2.9.1+cu126` 与项目私有环境中的包元数据 | 不声称可从现有元数据还原历史 pip 索引 URL |
| Transformers 生态 | 已安装版本与本地导入验证 | 不将包元数据视为下载服务器日志 |
| 公开模型权重 | `yuchuantian/AIGC_detector_zhv2` 与 `Qwen/Qwen2.5-0.5B-Instruct` 的本地模型目录和已保存哈希 | 不以本记录替代上游许可证或发布完整性核验 |

后续任何依赖或模型下载都必须单独记录精确索引/镜像 URL、命令、包版本、SHA-256、许可证链接与 CUDA/PyTorch 预检输出。对 PyTorch CUDA 轮子，应优先使用官方发布说明与受支持的索引配置，而不是仅按“镜像更快”选择未经验证的二进制来源。[1]

## 归档与回滚工具

候选归档：`scripts/export-finetuned-candidate.py`。输入为完整候选目录与一个尚不存在的目标目录；它要求 `config.json`、`finetune_manifest.json` 和一种模型权重文件。输出为仅供离线审计的副本及 `archive_manifest.json`，逐文件写入 SHA-256。该工具先可用 `--dry-run` 只读预检；正式归档使用临时目录和原子重命名，失败时删除临时目录，且拒绝覆盖已有目标。本轮已用最小隔离夹具验证 `--dry-run` 会产生哈希清单而不写入归档目录。

线上 Iter5 回滚准备：`scripts/manage-iter5-rollback.mjs`。它仅操作 `server/detectionEngine.ts` 与 `server/models/iter5CharModel.ts` 的用户显式快照，绝不由网站运行时或部署流程自动触发。`snapshot` 拒绝覆盖并为两份文件写入哈希清单；`verify` 发现任一哈希不一致即拒绝；`restore` 必须显式提供 `--confirm-restore` 与一个不存在的 `--backup-dir`，先复制当前两份文件到恢复前备份，再通过临时文件与原子重命名写入经校验的快照。若恢复中断，错误信息会指向保留的恢复前备份。隔离夹具测试已验证：两份候选文件均恢复为 Iter5 内容，恢复前候选文件均保存到新备份目录，同时覆盖防护和快照篡改拒绝测试通过。

本轮**没有提供蒸馏或 ONNX 部署产物**：锁定盲测未通过人类误报保护门槛，候选不具备进入蒸馏或网站集成阶段的条件。归档脚本用于保存否决候选的离线审计证据，而不是绕过验收门槛部署该模型。

## References

[1] [PyTorch：Get Started / 安装与 CUDA 构建选择](https://pytorch.org/get-started/locally/)
