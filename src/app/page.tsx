import { ArrowRight, Database, Globe2, LineChart, LockKeyhole, ScanSearch, Sparkles } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { listSignals } from "@/lib/supabase/signals";

const flow = [
  {
    title: "Acquire",
    text: "Bright Data Web Unlocker pulls careers and pricing pages on a timed cadence.",
    icon: Globe2
  },
  {
    title: "Synthesize",
    text: "AI/ML API converts raw HTML into structured JSON with investor-ready alerts.",
    icon: Sparkles
  },
  {
    title: "Store",
    text: "Supabase keeps every pull as time-series evidence for trend analysis.",
    icon: Database
  },
  {
    title: "Decide",
    text: "The dashboard scores momentum before earnings and highlights signal breaks.",
    icon: LineChart
  }
];

export default async function Home() {
  const signals = await listSignals();

  return (
    <main>
      <section className="relative overflow-hidden bg-ink px-5 py-6 text-white sm:px-8 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">Web Data Unlocked</p>
            <p className="mt-1 font-serif text-2xl">Alternative Data Radar</p>
          </div>
          <a
            href="#dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-white/16 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Open Workbench
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-10 pb-14 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-sm border border-white/12 bg-white/6 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/56">
              Finance · Alternative Data · MVP
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-6xl leading-[0.95] text-white sm:text-7xl lg:text-8xl">
              From digital signals to earnings alpha.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/62">
              A serverless intelligence layer that monitors job postings, pricing pages, and traffic proxies to flag company-level momentum before quarterly earnings.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/88"
              >
                View Live Prototype
                <ScanSearch className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="#architecture"
                className="inline-flex items-center gap-2 rounded-md border border-white/16 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                See Pipeline
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>

          <div className="border-l border-white/12 pl-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["$14B", "Alt data market"],
                ["90%", "Adviser adoption"],
                ["4-8w", "Early warning target"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-md border border-white/12 bg-white/[0.04] p-4">
                  <p className="font-serif text-3xl text-white">{value}</p>
                  <p className="mt-2 text-xs leading-5 text-white/48">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-white/12 bg-white/[0.04] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Current Verdict</p>
              <p className="mt-3 text-2xl font-semibold text-white">Synthesis beats raw feeds.</p>
              <p className="mt-3 text-sm leading-6 text-white/55">
                The gap is not scraping one more page. It is turning multiple weak signals into one timely, auditable decision surface.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="bg-paper px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue">Serverless Pipeline</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">
                Built for the hackathon demo, shaped for production.
              </h2>
              <p className="mt-5 text-base leading-7 text-ink/62">
                The live adapters are already separated from the UI. Until keys are added, the app runs in demo mode with a small local dataset.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {flow.map((step, index) => (
                <div key={step.title} className="rounded-md border border-line bg-[#fffdf8] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <step.icon className="h-5 w-5 text-blue" aria-hidden />
                    <span className="font-mono text-xs text-ink/35">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/60">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#fffdf8] px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            ["Competitor gap", "Thinknum and SimilarWeb expose feeds; the MVP exposes a verdict."],
            ["Buyer wedge", "Mid-market funds need an affordable, auditable signal layer."],
            ["Compliance posture", "Public-source provenance and pull history are first-class records."]
          ].map(([title, text]) => (
            <div key={title} className="flex gap-3">
              <LockKeyhole className="mt-1 h-4 w-4 flex-none text-moss" aria-hidden />
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink/58">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dashboard initialSignals={signals} />
    </main>
  );
}
