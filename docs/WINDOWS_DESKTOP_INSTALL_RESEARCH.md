# Windows 桌面客户端安装渠道核验

**核验日期：** 2026-08-14（GMT+8）  
**目的：** 在 Microsoft Store 无法安装时，评估 Windows 安装包的可信替代来源；不以下载页面自述替代发布者签名验证。

## 官方渠道

| 渠道 | 核验结果 | 结论 |
|---|---|---|
| [Manus Desktop 下载页](https://manus.im/desktop) | Windows 按钮跳转至 Microsoft Store 产品 ID `9phv7m7v4s5l` | 当前可确认的官方 Windows 分发入口 |
| [官方 Desktop 文档](https://manus.im/docs/features/desktop) | 要求通过官方站点获取 macOS 或 Windows 客户端；说明本地文件夹须显式授权、命令须用户批准 | 应优先使用；没有披露独立 `.exe` / `.msixbundle` 直链 |
| [Microsoft Store 页面](https://apps.microsoft.com/detail/9phv7m7v4s5l) | 提供 Windows 应用条目 | 是官方 Windows 商店分发路径，但用户当前报告无法安装 |

## 第三方页面的有限观察

[Uptodown 的 Manus 页面](https://manus.en.uptodown.com/windows) 列出 `Manus 1.6.3.0`、文件类型 `MSIXBUNDLE`、大小 `200.16 MB` 以及网页自述 SHA-256 `50dbfce7208cf93e54ffb5652b148b6b01e582990845579e679c65c1e9997cbe`。该页面也将开发者标为 `BUTTERFLY EFFECT PTE. LTD.`。

> 上述信息只说明第三方页面所声称的文件元数据，**不能证明下载文件与官方发布包一致**。在 Windows 设备上，必须先验证包的 Authenticode 数字签名、签名链、发行者名称和本地计算出的 SHA-256；在未完成这些验证前，不下载、不转发、不安装该第三方包。

## 当前安全结论

尚未发现由官方公开、可直接下载且可独立验证的 Windows `.exe` 或 `.msixbundle` 链接。因此，不向用户提供第三方安装包。下一步应先取得 Microsoft Store 的完整错误代码与 `winver` 输出，优先修复官方分发路径；若用户坚持尝试第三方包，只能在其本机对下载文件执行签名和哈希核验后再决定是否安装。

用户提供的 Microsoft Store 截图已明确显示 “This product is unavailable in your market”。这表明当前阻塞是应用市场可用性问题，而非单纯的 Store 启动或缓存问题。Microsoft 的通用文档建议检查 Windows 更新、Store 更新、时间与地区设置，并在持续无法安装时联系支持；这些步骤可用于排除配置异常，但不能将未在账户所在市场上架的应用变为可安装状态。[5] [6]

官方 Manus 文档仅指向官方站点的 Windows 下载入口，并说明桌面端能在用户显式授权的文件夹和命令批准边界内使用本机 GPU；其文档没有提供替代 Windows 离线安装包。[1]

## 参考

1. [Manus Desktop 官方文档](https://manus.im/docs/features/desktop)
2. [Manus Desktop 官方下载页](https://manus.im/desktop)
3. [Microsoft Store：Manus](https://apps.microsoft.com/detail/9phv7m7v4s5l)
4. [Uptodown：Manus for Windows（第三方页面，仅作风险核验）](https://manus.en.uptodown.com/windows)
5. [Microsoft：修复 Microsoft Store 应用问题](https://support.microsoft.com/en-us/accounts-billing/fix-problems-with-apps-from-microsoft-store)
6. [Microsoft：Microsoft Store 无法打开](https://support.microsoft.com/en-us/accounts-billing/microsoft-store-doesn-t-open)
