import React from "react";

export function SiteAttribution() {
  return (
    <aside
      aria-label="站点署名：long with Manus"
      className="site-attribution pointer-events-none fixed bottom-4 right-20 z-40 rounded-full border border-emerald-900/10 bg-white/90 px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-emerald-950 shadow-sm backdrop-blur-md sm:bottom-5 sm:right-24"
      data-testid="site-attribution"
    >
      long <span className="font-normal text-emerald-800/70">with</span> Manus
    </aside>
  );
}
