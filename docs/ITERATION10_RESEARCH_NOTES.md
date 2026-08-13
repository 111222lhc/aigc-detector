# 十轮模型增强研究记录

## 已核验的公开来源

| 来源 | 已核验事实 | 对本次迭代的用途 |
| --- | --- | --- |
| C-ReD 论文（ACL Findings 2026） | 论文指出中文 AIGC 检测面临模型多样性不足和数据同质化问题，并以真实提示语料检验对未见 LLM 与外部中文数据集的泛化能力。 | 将“生成器隔离”和“领域隔离”列为候选模型胜出的必要证据，不能仅以随机切分准确率作部署决策。 |
| C-ReD 开源仓库 | 基准包含新闻、问答、影评、学术写作、作文五个领域；覆盖 ChatGPT、Qwen、DeepSeek、Claude 等九类生成器，共 128,610 条样本；样本有统一 `text`、`label`、`domain`、`generator`、`prompt` 和 `length` 字段。 | 以现有本地 C-ReD 数据为基线，按领域、生成器和长度建立固定的独立评分表；新增数据不得与该固定回归集合重叠。 |

## 当前实验边界

本次十轮迭代保持当前 Iter5 作为冻结部署基线。每个候选只能使用指定的训练分区；固定回归集、用户提供短抒情反例及其变体不得进入训练或调参。最终选择将同时比较总体误差、领域分层误差、短文本误差、生成器外推与阈值下的人类误报；候选若无稳定、可解释的独立优势，将不替换网页模型。

## 参考链接

1. Qing et al.，C-ReD: A Comprehensive Chinese Benchmark for AI-Generated Text Detection Derived from Real-World Prompts，ACL Findings 2026：<https://aclanthology.org/2026.findings-acl.2119/>
2. C-ReD 数据与基准实现：<https://github.com/HeraldofLight/C-ReD>
3. Macko et al.，MULTITuDE: Large-Scale Multilingual Machine-Generated Text Detection Benchmark，EMNLP 2023：<https://aclanthology.org/2023.emnlp-main.616/>
4. Li & Zhang，Linguistic Differences between AI and Human Comments in Weibo，CCL 2025：<https://aclanthology.org/2025.ccl-1.64/>

## 增补的候选方法依据

MULTITuDE 使用真实与机器生成文本，跨 11 种语言、8 类生成器比较零样本统计方法、黑箱方法和微调检测器，并将未见语言与未见 LLM 作为明确评测条件。因此，本项目将把“留出生成器”纳入每轮得分，而非只报告同分布结果。

中文风格计量研究针对短文本、可解释性和合成数据依赖的局限，使用面向中文社交文本的风格特征与轻量分类器获得了较高的论文内表现。该结论不能直接外推到论文文本，但支持将可解释的句长、标点、词汇重复、连接词、停顿与结构分布作为当前字符 n-gram 模型的受控集成候选，并要求其在论文领域、短抒情回归和用户反例上分别证明增益。

## 新增人类语料来源的执行记录

计划中的 2021 年及以前中文维基历史版本采集在启动后受到公共 API 的 `429 Too Many Requests` 限流，已停止而非持续重试，且未写入可用训练样本。后续将改用可完整下载、可指向固定版本的公开语料，并在接入前执行文本精确去重与来源字段审计。

初步检索定位到公开的 THUCNews 镜像仓库，可作为独立于当前 HC3/C-ReD 主语料的候选人类新闻来源；在正式采用前仍需核验其文件内容、许可、时间边界与同现率。候选链接：<https://github.com/anglgn/Chinese-Text-Classification-Dataset>。
