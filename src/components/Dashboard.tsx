"use client";

import { useMemo, useState } from "react";
import { Activity, Bell, BriefcaseBusiness, CircleDollarSign, Radar, TrendingUp } from "lucide-react";
import type { CompanySignal } from "@/types/signals";
import { MetricCard } from "@/components/MetricCard";
import { SignalChart } from "@/components/SignalChart";
import DynamicSearch from "@/components/DynamicSearch";

type DashboardProps = {
  initialSignals: CompanySignal[];
};

export function Dashboard({ initialSignals }: DashboardProps) {
  const [chartMode, setChartMode] = useState<"health" | "roles">("health");
  const [signals, setSignals] = useState<CompanySignal[]>(initialSignals);
  const [isPulling, setIsPulling] = useState(false);
  const latest = signals[signals.length - 1];
  const prior = signals[signals.length - 2];

  async function reloadSignals() {
    try {
      const res = await fetch("/api/signals/latest");
      const payload = await res.json();
      setSignals(payload.signals ?? signals);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to reload signals", e);
    }
  }

  const scoreDelta = latest && prior ? latest.healthScore - prior.healthScore : 0;
  const sortedAlerts = useMemo(() => [...signals].reverse().slice(0, 5), [signals]);

  // legacy modal removed — DynamicSearch handles autonomous pulls

  return (
    <section id="dashboard" className="border-t border-line bg-[#fffdf8] px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue">Live Workbench</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl">
              Company signals become an investable verdict.
            </h2>
          </div>
          <div className="flex items-center gap-3" />
        </div>
        <DynamicSearch onSuccess={reloadSignals} />
        <div className="flex w-full max-w-xs rounded-md border border-line bg-paper p-1">
            <button
              className={`flex-1 rounded font-serif px-3 py-2 text-sm ${chartMode === "health" ? "bg-ink text-white" : "text-ink/60"}`}
              onClick={() => setChartMode("health")}
            >
              Health
            </button>
            <button
              className={`flex-1 font-serif rounded px-3 py-2 text-sm ${chartMode === "roles" ? "bg-ink text-white" : "text-ink/60"}`}
              onClick={() => setChartMode("roles")}
            >
              Signals
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Radar}
            label="Health Score"
            value={`${latest?.healthScore ?? 0}`}
            detail={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta} points since last pull`}
            tone="moss"
          />
          <MetricCard
            icon={BriefcaseBusiness}
            label="Engineering Roles"
            value={`${latest?.engineeringRoles ?? 0}`}
            detail="Open engineering roles extracted from careers pages"
            tone="blue"
          />
          <MetricCard
            icon={CircleDollarSign}
            label="Enterprise Price"
            value={latest?.enterprisePrice ? `$${latest.enterprisePrice}` : "N/A"}
            detail="Current listed enterprise or highest plan price"
            tone="amber"
          />
          <MetricCard
            icon={Activity}
            label="Traffic Index"
            value={`${latest?.webTrafficIndex ?? 0}`}
            detail="Placeholder until a traffic provider is selected"
            tone="rust"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-md border border-line bg-paper p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
                  {chartMode === "health" ? "Earnings Health Score" : "Jobs + Pricing"}
                </p>
                <h3 className="mt-1 text-lg font-semibold font-serif text-ink">{latest?.companyName ?? "Demo Company"}</h3>
              </div>
              <TrendingUp className="h-5 w-5 text-moss" aria-hidden />
            </div>
            <div className="mt-6">
              <SignalChart signals={signals} mode={chartMode} />
            </div>
          </div>

          <div className="rounded-md border border-line font-mono bg-ink p-5 text-white">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-amber" aria-hidden />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Synthesis Feed</p>
                <h3 className="text-lg font-semibold font-serif">AI-generated alerts</h3>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {sortedAlerts.map((signal) => (
                <article key={signal.id} className="border-t border-white/12 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                      {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
                        new Date(signal.createdAt)
                      )}
                    </p>
                    <span className="rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase text-white/55">
                      {signal.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/76">{signal.synthesisAlert}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
        {/* {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold">Pull Real-Time Signals</h3>
              <label className="block text-sm text-ink/70">Careers URL</label>
              <input
                className="mt-1 mb-3 w-full rounded border px-3 py-2"
                value={careersInput}
                onChange={(e) => setCareersInput(e.target.value)}
              />
              <label className="block text-sm text-ink/70">Pricing URL</label>
              <input
                className="mt-1 mb-4 w-full rounded border px-3 py-2"
                value={pricingInput}
                onChange={(e) => setPricingInput(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded border px-3 py-2"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-ink px-3 py-2 text-white"
                  onClick={submitPull}
                >
                  Pull
                </button>
              </div>
            </div>
          </div>
        )} */}
      {/* </div> */}
    </section>
  );
}
