"use client";

import { useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Radar,
  TrendingUp
} from "lucide-react";
import type { CompanySignal } from "@/types/signals";
import { MetricCard } from "@/components/MetricCard";
import { SignalChart } from "@/components/SignalChart";
import DynamicSearch from "@/components/DynamicSearch";

type DashboardProps = {
  initialSignals: CompanySignal[];
};

type ToastState =
  | { kind: "success"; title: string; text: string }
  | { kind: "error"; title: string; text: string }
  | null;

function byCreatedAtAsc(a: CompanySignal, b: CompanySignal) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function Dashboard({ initialSignals }: DashboardProps) {
  const [chartMode, setChartMode] = useState<"health" | "roles">("health");
  const [signals, setSignals] = useState<CompanySignal[]>([...initialSignals].sort(byCreatedAtAsc));
  const [selectedCompany, setSelectedCompany] = useState(initialSignals[initialSignals.length - 1]?.companyName ?? "");
  const [isPulling, setIsPulling] = useState(false);
  const [activeCompany, setActiveCompany] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const companyOptions = useMemo(() => {
    const latestByCompany = new Map<string, CompanySignal>();
    for (const signal of signals) {
      latestByCompany.set(signal.companyName.toLowerCase(), signal);
    }
    return [...latestByCompany.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [signals]);

  const selectedSignals = useMemo(() => {
    if (!selectedCompany) return signals;
    return signals.filter((signal) => signal.companyName.toLowerCase() === selectedCompany.toLowerCase());
  }, [selectedCompany, signals]);

  const latest = selectedSignals[selectedSignals.length - 1];
  const prior = selectedSignals[selectedSignals.length - 2];
  const scoreDelta = latest && prior ? latest.healthScore - prior.healthScore : 0;
  const sortedAlerts = useMemo(() => [...selectedSignals].sort(byCreatedAtAsc).reverse().slice(0, 5), [selectedSignals]);

  async function reloadSignals() {
    try {
      const res = await fetch("/api/signals/latest", { cache: "no-store" });
      const payload = await res.json();
      if (Array.isArray(payload.signals)) {
        const sorted = payload.signals.sort(byCreatedAtAsc);
        setSignals(sorted);
        if (!selectedCompany && sorted.length > 0) {
          setSelectedCompany(sorted[sorted.length - 1].companyName);
        }
      }
    } catch (e) {
      console.error("Failed to reload signals", e);
    }
  }

  function handleStart(companyName: string) {
    setActiveCompany(companyName);
    setToast(null);
    setIsPulling(true);
  }

  function handleSuccess(signal: CompanySignal) {
    setSignals((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== signal.id);
      return [...withoutDuplicate, signal].sort(byCreatedAtAsc);
    });
    setSelectedCompany(signal.companyName);
    setIsPulling(false);
    setToast({
      kind: "success",
      title: "Analysis complete",
      text: `${signal.companyName} is now reflected in Health, Signals, and the AI synthesis feed.`
    });
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    void reloadSignals();
  }

  function handleError(message: string) {
    setIsPulling(false);
    setToast({
      kind: "error",
      title: "Analysis failed",
      text: message
    });
  }

  return (
    <section id="dashboard" className="relative border-t border-line bg-[#fffdf8] px-5 py-10 sm:px-8 lg:px-12">
      <div className={`mx-auto max-w-7xl transition duration-500 ${isPulling ? "blur-sm" : ""}`}>
        <div className="flex flex-col gap-5 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue">Live Workbench</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl text-ink">
              Company signals become an investable verdict.
            </h2>
          </div>
        </div>

        <DynamicSearch onStart={handleStart} onSuccess={handleSuccess} onError={handleError} />

        <div ref={resultsRef} className="scroll-mt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">Selected Analysis</p>
              <h3 className="mt-1 font-serif text-2xl text-ink">{latest?.companyName ?? "No company selected"}</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedCompany}
                onChange={(event) => setSelectedCompany(event.target.value)}
                disabled={companyOptions.length === 0}
                className="min-h-10 rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink"
              >
                {companyOptions.length > 0 ? (
                  companyOptions.map((signal) => (
                    <option key={signal.companyName.toLowerCase()} value={signal.companyName}>
                      {signal.companyName}
                    </option>
                  ))
                ) : (
                  <option value="">No history loaded</option>
                )}
              </select>
              <div className="flex w-full max-w-xs rounded-md border border-line bg-paper p-1">
                <button
                  type="button"
                  className={`flex-1 rounded px-3 py-2 font-serif text-sm ${
                    chartMode === "health" ? "bg-ink text-white" : "text-ink/60"
                  }`}
                  onClick={() => setChartMode("health")}
                >
                  Health
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded px-3 py-2 font-serif text-sm ${
                    chartMode === "roles" ? "bg-ink text-white" : "text-ink/60"
                  }`}
                  onClick={() => setChartMode("roles")}
                >
                  Signals
                </button>
              </div>
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
              label="Open Roles"
              value={`${latest?.openRoles ?? 0}`}
              detail={`${latest?.engineeringRoles ?? 0} engineering or technical roles detected`}
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
              detail="Proxy estimate from discovered public web signals"
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
                  <h3 className="mt-1 font-serif text-lg font-semibold text-ink">
                    {latest?.companyName ?? "No company selected"}
                  </h3>
                </div>
                <TrendingUp className="h-5 w-5 text-moss" aria-hidden />
              </div>
              <div className="mt-6">
                <SignalChart signals={selectedSignals} mode={chartMode} />
              </div>
            </div>

            <div className="rounded-md border border-line bg-ink p-5 font-mono text-white">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber" aria-hidden />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                    Synthesis Feed
                  </p>
                  <h3 className="font-serif text-lg font-semibold">AI-generated alerts</h3>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {sortedAlerts.length > 0 ? sortedAlerts.map((signal) => (
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
                )) : (
                  <p className="border-t border-white/12 pt-4 text-sm leading-6 text-white/60">
                    Run a validated company analysis to populate this feed.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-line bg-paper p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">Company History</p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-ink">
                  {selectedSignals.length} pull{selectedSignals.length === 1 ? "" : "s"} for {latest?.companyName ?? "this target"}
                </h3>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink/45">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Health</th>
                    <th className="py-2 pr-4 font-medium">Open Roles</th>
                    <th className="py-2 pr-4 font-medium">Eng/Tech Roles</th>
                    <th className="py-2 pr-4 font-medium">Enterprise Price</th>
                    <th className="py-2 pr-4 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selectedSignals].reverse().map((signal) => (
                    <tr key={signal.id} className="border-b border-line/70 text-ink">
                      <td className="py-3 pr-4">
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        }).format(new Date(signal.createdAt))}
                      </td>
                      <td className="py-3 pr-4">{signal.healthScore}</td>
                      <td className="py-3 pr-4">{signal.openRoles}</td>
                      <td className="py-3 pr-4">{signal.engineeringRoles}</td>
                      <td className="py-3 pr-4">{signal.enterprisePrice ? `$${signal.enterprisePrice}` : "N/A"}</td>
                      <td className="py-3 pr-4 uppercase">{signal.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isPulling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-md border border-white/12 bg-ink p-6 text-white shadow-2xl">
            <div className="analysis-loader mx-auto">
              <span />
              <span />
              <span />
            </div>
            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
              Autonomous Pipeline Running
            </p>
            <h3 className="mt-3 text-center font-serif text-2xl">Analyzing {activeCompany}</h3>
            <p className="mx-auto mt-3 max-w-sm text-center font-mono text-sm leading-6 text-white/60">
              Discovering targets, unlocking pages, extracting signals, and updating the time-series cache.
            </p>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="analysis-progress h-full rounded-full bg-amber" />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-md rounded-md border border-line bg-paper p-4 shadow-2xl">
          <div className="flex gap-3">
            {toast.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-moss" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rust" aria-hidden />
            )}
            <div>
              <p className="font-serif text-base font-semibold text-ink">{toast.title}</p>
              <p className="mt-1 font-mono text-sm leading-6 text-ink/65">{toast.text}</p>
            </div>
            <button
              type="button"
              className="ml-auto h-7 px-2 font-mono text-xs text-ink/45 hover:text-ink"
              onClick={() => setToast(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
