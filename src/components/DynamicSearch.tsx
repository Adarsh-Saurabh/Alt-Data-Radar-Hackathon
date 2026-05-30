import { Search, SendHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CompanySignal } from "@/types/signals";

interface DynamicSearchProps {
  onStart: (companyName: string) => void;
  onSuccess: (signal: CompanySignal) => void;
  onError: (message: string) => void;
}

export default function DynamicSearch({ onStart, onSuccess, onError }: DynamicSearchProps) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) return;

    if (normalizedQuery.length < 3 || !/[a-z]/i.test(normalizedQuery)) {
      onError("Enter a real company name with at least 3 letters.");
      return;
    }

    setIsProcessing(true);
    onStart(normalizedQuery);

    try {
      const response = await fetch("/api/signals/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cron_secret": process.env.NEXT_PUBLIC_CRON_SECRET || "851c94a066d6a31eb18c2f1c5977167838b8584c10209cc378664d07839e10c9"
        },
        body: JSON.stringify({ companyName: normalizedQuery })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Agent failed to analyze company");
      }

      if (!payload.signal) {
        throw new Error(payload.message ?? "Agent completed without returning a signal.");
      }

      setQuery("");
      onSuccess(payload.signal as CompanySignal);
    } catch (error) {
      console.error(error);
      onError(error instanceof Error ? error.message : "The AI agent couldn't process this company.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="my-8 rounded-md border border-line bg-paper p-5">
      <div className="flex items-center gap-3">
        <Search className="h-5 w-5 text-blue" aria-hidden />
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Autonomous Target Analysis</h2>
          <p className="mt-1 font-mono text-sm leading-6 text-ink/60">
            Enter a real company name. The agent validates an official domain before unlocking pages or saving a signal.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Bloom Energy, Vercel, Pizza Hut..."
          className="min-h-12 flex-1 rounded-md border border-line bg-white px-4 py-3 font-serif text-ink outline-none focus:ring-2 focus:ring-blue/20"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing || !query.trim()}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-5 py-3 font-serif font-semibold transition-all ${
            isProcessing
              ? "cursor-wait border-blue/30 bg-blue/12 text-blue"
              : "border-ink bg-ink text-white hover:bg-ink/90"
          }`}
        >
          {isProcessing ? "Agent is working..." : "Deploy Agent"}
          <SendHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
