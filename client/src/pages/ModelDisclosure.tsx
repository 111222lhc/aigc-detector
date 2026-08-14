import { ArrowLeft, BarChart3, CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const metrics = [
  ["总体准确率", "69.00%", "96.00%", "+27.00 个百分点"],
  ["平衡准确率", "69.00%", "96.00%", "+27.00 个百分点"],
  ["宏平均 F1", "65.70%", "96.00%", "+30.30 个百分点"],
  ["AI 漏检率", "62.00%", "7.00%", "−55.00 个百分点"],
  ["人类误报率", "0.00%", "1.00%", "+1.00 个百分点"],
];

export default function ModelDisclosure() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] text-[#26372e]">
      <nav className="border-b border-[#e4eae4] bg-[#f6f8f5]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-5 sm:px-7">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#456452] transition-colors hover:bg-[#eaf1eb]">
            <ArrowLeft size={16} /> 返回检测首页
          </Link>
        </div>
      </nav>

      <section className="border-b border-[#e2e9e2] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-7 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e6da] bg-[#edf5ee] px-3 py-1.5 text-xs font-medium text-[#427957]"><ShieldCheck size={13} /> 模型说明与验证边界</div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#21342a] sm:text-5xl">当前使用 Iter5，<br />候选模型在综合盲测中表现更强。</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#63746a]">为了避免把不同数据集的数字混在一起，下表只比较同一份锁定盲测中的两个模型：100 条人类历史新闻文本与 100 条独立生成的历史新闻风格 AI 文本。结果是统计性能证据，不构成作者身份确认。</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-7 sm:py-14">
        <div className="rounded-2xl border border-[#dce8dd] bg-white p-5 shadow-[0_10px_30px_rgba(38,58,43,0.04)] sm:p-7">
          <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eaf3eb] text-[#377c54]"><BarChart3 size={19} /></span><div><h2 className="text-lg font-semibold text-[#2b3f33]">同一锁定盲测的直接比较</h2><p className="mt-1 text-sm leading-6 text-[#708076]">候选模型在总体准确率、平衡准确率和宏平均 F1 上均高于当前线上 Iter5。</p></div></div>
          <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#e6ece6] text-xs font-semibold tracking-wide text-[#718177]"><tr><th className="pb-3 pr-4">指标</th><th className="pb-3 px-4">当前 Iter5</th><th className="pb-3 px-4">微调候选</th><th className="pb-3 pl-4">变化</th></tr></thead><tbody>{metrics.map(([name, baseline, candidate, delta]) => <tr key={name} className="border-b border-[#edf1ed] last:border-0"><td className="py-3 pr-4 font-medium text-[#43564a]">{name}</td><td className="px-4 py-3 text-[#63746a]">{baseline}</td><td className="px-4 py-3 font-semibold text-[#2f704b]">{candidate}</td><td className="py-3 pl-4 text-[#397b55]">{delta}</td></tr>)}</tbody></table></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#dce8dd] bg-white p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eaf3eb] text-[#377c54]"><CheckCircle2 size={19} /></span><div><h2 className="text-lg font-semibold text-[#2b3f33]">可以得出的结论</h2><p className="mt-2 text-sm leading-6 text-[#63746a]">在这份固定的新闻风格盲测中，候选模型的<strong className="font-semibold text-[#43564a]">综合识别能力更强</strong>，特别是 AI 文本漏检明显更少。</p></div></div></article>
          <article className="rounded-2xl border border-[#efd4b9] bg-[#fffaf4] p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff0df] text-[#a35c24]"><CircleAlert size={19} /></span><div><h2 className="text-lg font-semibold text-[#75451d]">为什么当前没有直接替换</h2><p className="mt-2 text-sm leading-6 text-[#89521f]">此前的上线规则要求人类误报不得增加。候选从 0% 变为 1%，未通过这项<strong className="font-semibold">零退化风险门槛</strong>。这不等于候选整体较弱；但改用新的综合规则后，必须使用一份尚未读取的新盲测集重新验证，不能把已经看过的这份结果重复当作最终上线凭据。</p></div></div></article>
        </div>

        <div className="mt-6 rounded-2xl border border-[#d8e5d9] bg-[#f2f8f3] p-5 sm:p-7"><h2 className="text-lg font-semibold text-[#2b3f33]">下一步验证方式</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#557062]">后续将预先声明综合指标与人类误报绝对上限，并在新的、跨文体与跨生成器盲测集上验证。通过后还需要把 BERT 候选导出或蒸馏为可在当前 Node.js 网站中一致推理的模型，才会更新网站版本。</p></div>
      </section>
    </main>
  );
}
