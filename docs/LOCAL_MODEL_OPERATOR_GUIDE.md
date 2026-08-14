# 本地模型服务操作指南

本指南用于在**自己的 Windows 电脑**运行已经导出的候选 ONNX 模型。它适合本机验证、离线评分和未来独立服务器部署前的验收；并不会自动替换当前线上网页模型。

> 服务只绑定 `127.0.0.1`。也就是说，只有这台电脑自身可以调用它；不需要开放路由器端口，也不要用免费的公网隧道把它暴露给陌生访问者。

## 前置条件

| 项目 | 要求 |
| --- | --- |
| Node.js | 20+，已验证版本为 20.16.0 |
| 运行时 | `onnxruntime-node 1.19.2`，安装在隔离验证目录 |
| 模型 | 通过哈希核验的 `model_fp32.onnx`、`vocab.txt`、tokenizer 配置与固定夹具 |
| 内存 | 至少 2 GB 空闲内存更稳妥；实测服务约占 467 MB RSS |
| 网络 | 启动和推理均不需要联网 |

请先按[候选复现说明](./CANDIDATE_MODEL_REPRODUCIBILITY.md)核对模型文件和 SHA-256；不要从不明来源下载所谓“量化版”或“整合包”。

## 日常流程

服务脚本已在本次验证中使用的隔离目录中。以 PowerShell 进入训练根目录后执行下表操作。首次启动会生成仅保存在本机、隐藏的 `local_service.env`；它包含随机 API 密钥，**不得提交、发送或截图**。

公开 GitHub 仓库只保存脚本源码。使用者应先克隆仓库，再将 `scripts` 中的四个本地服务脚本复制到受控训练根目录下的 `scripts` 目录，并保留模型导出目录与 `node_onnx_validation` 目录在同一训练根目录中。不要把 `model_fp32.onnx`、`local_service.env` 或任何用户文本复制回 Git 仓库。

| 目的 | 命令 | 成功标志 |
| --- | --- | --- |
| 启动 | `powershell -ExecutionPolicy Bypass -File .\scripts\start-local-onnx-inference-service.ps1` | `local-onnx-inference.pid` 与日志文件出现 |
| 验证 | `node .\node_onnx_validation\test-local-onnx-inference-service.mjs` | 输出 JSON 中 `status` 为 `ok` |
| 关闭 | `powershell -ExecutionPolicy Bypass -File .\scripts\stop-local-onnx-inference-service.ps1` | 输出 `stopped_local_inference_pid=...` 或 `not_running` |

如果电脑需要游戏、剪辑或其他高优先级工作，应先运行“关闭”命令。关闭只会结束本服务记录的 Node.js PID，不会删除 ONNX 模型、导出文件或密钥。

## 接口契约

| 项目 | 值 |
| --- | --- |
| 基础地址 | `http://127.0.0.1:18765` |
| 健康检查 | `GET /health` |
| 检测接口 | `POST /v1/detect`，JSON 正文 `{ "text": "待检测文本" }` |
| 鉴权 | HTTP 头 `x-aigc-api-key`，值来自本机 `local_service.env` |
| 成功响应 | AI/人类概率、预测标签、截断标志、引擎名与耗时；不包含输入正文 |
| 拒绝规则 | 无效密钥 `401`；过短或格式错误正文 `400`；并发繁忙 `429` |

## 切换网页前的安全检查单

当前线上页面应继续使用 Iter5。只有以后满足以下全部项目时，才可配置网页通过受控服务器调用候选服务：

- [ ] V2 跨文体、跨生成器冻结盲测已按预注册规则通过。
- [ ] 推理服务器有足够内存，不是用户日常电脑或现有 512 MB 网页容器。
- [ ] 服务监听私网或 HTTPS 反向代理，并使用新的服务器端密钥。
- [ ] 网页后端有合理超时、健康检查、失败记录和自动回退 Iter5。
- [ ] 已完成带候选与不带候选配置的回归测试，并保存可回滚检查点。

在这些条件达成前，本地服务只作为本机工具与验证基线；它不会改变公开网页的检测结果。
