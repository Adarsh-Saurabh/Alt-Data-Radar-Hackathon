import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "moss" | "amber" | "rust";
  icon: LucideIcon;
};

const toneStyles = {
  blue: "text-blue border-blue/20 bg-blue/5",
  moss: "text-moss border-moss/20 bg-moss/5",
  amber: "text-amber border-amber/25 bg-amber/10",
  rust: "text-rust border-rust/20 bg-rust/5"
};

export function MetricCard({ label, value, detail, tone = "blue", icon: Icon }: MetricCardProps) {
  return (
    <div className={clsx("rounded-md border p-4", toneStyles[tone])}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">{label}</p>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="mt-5 font-serif text-4xl leading-none text-ink">{value}</p>
      <p className="mt-2 text-sm leading-5 text-ink/58">{detail}</p>
    </div>
  );
}
