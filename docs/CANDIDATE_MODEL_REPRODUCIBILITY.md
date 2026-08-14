# 微调候选：公开复现说明

**状态：已完成本地微调、锁定 V1 比较、ONNX 转换和本机 Node.js 一致性验证；尚未替换线上 Iter5。** 本文让研究者和维护者能够复现过程、检查产物边界并理解当前不切换网站检测引擎的原因。它不构成任何单篇文本、作者身份或正式学术检测结论。

> 本候选**确实经过本地微调**，并非将公开模型直接作为项目成果。训练在用户授权的 Windows 隔离环境中完成；使用的是项目目录下的 Python 环境和 RTX 4060 Laptop GPU。所有网页线上请求仍由 `iter5-char-2to4gram` 处理。

## 公开内容与刻意排除项

| 类别 | GitHub 中提供 | 不公开的内容 |
| --- | --- | --- |
| 过程记录 | 训练配置、随机种子、分区数量、去重规则、阈值原则、指标与拒绝结论 | 训练、校准、盲测的原始正文 |
| 程序 | ONNX 导出、Node.js 一致性验证、本地服务启动/测试/停止、Iter5 回滚脚本 | 用户论文、服务 API 密钥、机器本地配置 |
| 模型证明 | 来源模型标识、许可证、候选/ONNX 文件哈希和文件大小 | 409 MB ONNX 文件、原始微调权重、第三方权重副本 |
| 验证资料 | 锁定 V1 对比、V2 预注册、第二生成器冻结与部署限制 | V2 校准或盲测文本及其逐条预测 |

这样做的原因是：公开正文会破坏今后的盲测独立性，也可能违反来源语料的使用边界；提交大权重会让仓库失去可维护性。模型权重仍应从原始发布方获取，或由实验执行者在自己的受控存储中保管。

## 模型谱系与许可

候选的初始化权重是 [`yuchuantian/AIGC_detector_zhv2`][1]，其关联官方实现标注为 Apache-2.0。[2] 该权重以标准 `BertForSequenceClassification` 形式加载；本项目没有启用远程自定义代码。候选在下列目录中由微调运行产生：`runs/aigc_detector_zhv2_finetune_v1`。

本项目保存可验证的导出记录，而不是复制来源权重。已转换的 FP32 ONNX 文件为 `model_fp32.onnx`，大小为 **409,306,612 bytes**，SHA-256 为：

```text
9A2557637791C28F4DC5744AFCD5B40B012FEA5FAC7EADD8FCDA8891B14C3239
```

## 训练数据与隔离规则

训练不是用用户上传论文，也没有把用户文本发送到第三方服务。人类类来自按文档冻结的中文历史新闻分区；AI 类由本地 `Qwen/Qwen2.5-0.5B-Instruct` 依据固定的、抽象写作任务生成。训练、校准、盲测均使用文档规范化 SHA-256 去重，且在训练前建立隔离清单。

| 分区 | 人类 | AI | 唯一用途 |
| --- | ---: | ---: | --- |
| 训练 | 360 | 360 | 参数更新 |
| 校准 | 100 | 100 | 锁定运营阈值 |
| V1 锁定盲测 | 100 | 100 | 一次性候选与 Iter5 横向比较 |

外部 DetectRL/DetectRL-ZH 资料仅用于研究设计参考，未因许可证不明确而并入本轮数据。详情见[数据来源审计](./PRETRAINED_FINETUNE_DATA_SOURCE_AUDIT.md)。V1 盲测已经读出和评分，**不得**回流进训练、阈值调节或新的上线结论。

## 已实际使用的微调配置

| 参数 | 锁定值 |
| --- | ---: |
| 隔离 Python | 3.11.15 |
| PyTorch / CUDA | 2.9.1+cu126 |
| GPU | RTX 4060 Laptop GPU，8 GB 显存 |
| 初始化模型 | `yuchuantian/AIGC_detector_zhv2` |
| 随机种子 | `20260814` |
| 最大序列长度 | 512 |
| 冻结策略 | 冻结 BERT 底部 8 层；训练顶部 4 层与分类头 |
| 训练参数量 | 28,943,618 / 102,269,186 |
| 每卡批量 / 梯度累积 | 4 / 8 |
| 有效批量 | 32 |
| 学习率 / 轮数 | `2e-5` / 3 |
| 每轮平均训练损失 | 0.2385 / 0.0532 / 0.0347 |

完整的执行环境与访问边界见[本地 GPU 训练访问路径](./LOCAL_GPU_TRAINING_ACCESS_PATH.md)，逐项训练和锁定评分见[本地 GPU 微调记录](./LOCAL_GPU_FINETUNE_V1_RESULTS.md)。

## 阈值与 V1 锁定比较

候选与 Iter5 先分别在独立的 200 条校准集上评分；之后锁定阈值，才首次读取 200 条 V1 盲测集。候选阈值为 `99.968863`，Iter5 使用 50 分。V1 的综合指标并不意味着可直接上线：原部署规则当时要求人类误报“零退化”，而候选由 0% 增至 1%。

| V1 锁定盲测指标 | Iter5 | 微调候选 |
| --- | ---: | ---: |
| 总体准确率 | 69% | 96% |
| 平衡准确率 | 69% | 96% |
| 宏平均 F1 | 65.70% | 96% |
| AI 漏检率 | 62% | 7% |
| 人类误报率 | 0% | 1% |

因此历史 V1 门槛结论为**拒绝部署**。完整混淆矩阵、置信区间和对比说明在[综合锁定盲测比较](./COMPOSITE_LOCKED_BLIND_COMPARISON_V1.md)。项目之后冻结了新的 [V2 预注册协议](./COMPOSITE_VALIDATION_PREREGISTRATION_V2.md)：新的跨文体、跨生成器盲测将要求总体准确率、平衡准确率和宏平均 F1 各较 Iter5 至少提升 5 个百分点，同时人类误报绝对值不超过 2.5%。在 V2 完成前，禁止引用 V1 结果替换网站模型。

## ONNX、Node.js 与本地服务

候选已从 PyTorch 转换为 ONNX。20 条不属于任一训练、校准或盲测分区的固定夹具上，PyTorch→FP32 ONNX 的最大 AI 概率差为 `0.00000072`，ONNX→Node.js 的最大差为 `0.00000043`，均低于预先锁定的 `< 0.01` 门槛。两种动态 INT8 尝试分别出现 `0.66546` 与 `0.30923` 的最大概率差，因此被明确拒绝，而非为了压缩模型而放松精度条件。详见[ONNX 与 Node.js 验证](./ONNX_NODE_CONVERSION_VALIDATION_V1.md)。

已提供本地服务源码和 Windows 启动、检测、停止工具：

```text
scripts/local-onnx-inference-server.mjs
scripts/start-local-onnx-inference-service.ps1
scripts/test-local-onnx-inference-service.mjs
scripts/stop-local-onnx-inference-service.ps1
```

该服务只绑定 `127.0.0.1`，默认不开放公网，也不会让当前网站自动调用用户电脑。详细操作步骤见[本地模型服务操作指南](./LOCAL_MODEL_OPERATOR_GUIDE.md)。

## 为什么暂时仍用 Iter5

FP32 ONNX 文件虽可本机调用，但现有托管网站只有 512 MB 内存。Node.js 低内存会话加载候选后约占 **457.38 MB RSS**，没有为 Express、tRPC、文档解析和请求并发留下安全余量。标准会话约为 802.36 MB。当前 INT8 转换又不满足一致性门槛。因此网站继续运行轻量 Iter5，而不冒险让所有用户请求依赖用户电脑或挤爆线上内存。

未来只有以下条件同时满足，才可切换网页：V2 盲测通过、可部署服务具备足够内存、密钥和健康检查配置完成、超时或服务故障能自动回退 Iter5、并完成上线前的回归测试。

## 仓库复现入口

| 目标 | 入口 |
| --- | --- |
| 审计候选文件与生成 SHA-256 清单 | `scripts/export-finetuned-candidate.py` |
| 导出 ONNX 并生成固定夹具 | `export_and_validate_onnx_candidate.py`（在受控本地训练目录执行） |
| 复核 Node.js 概率一致性 | `scripts/validate-node-onnx-candidate.mjs` |
| 运行本机推理服务 | `scripts/start-local-onnx-inference-service.ps1` |
| 健康检查与接口契约测试 | `scripts/test-local-onnx-inference-service.mjs` |
| 立即停止本地服务 | `scripts/stop-local-onnx-inference-service.ps1` |
| 保留或恢复网页 Iter5 | `scripts/manage-iter5-rollback.mjs` |

所有命令均须在含有模型文件与本地密钥的受控机器上执行；公开 GitHub 仓库只保存源代码、配置、文档和可公开哈希。

## 参考资料

[1]: https://huggingface.co/yuchuantian/AIGC_detector_zhv2
[2]: https://github.com/YuchuanTian/AIGC_text_detector
