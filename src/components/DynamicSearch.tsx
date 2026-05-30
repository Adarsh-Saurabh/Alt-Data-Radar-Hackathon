import { useState, type FormEvent } from "react";

interface DynamicSearchProps {
  onSuccess: () => void;
}

export default function DynamicSearch({ onSuccess }: DynamicSearchProps) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/signals/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cron_secret": process.env.NEXT_PUBLIC_CRON_SECRET || "851c94a066d6a31eb18c2f1c5977167838b8584c10209cc378664d07839e10c9"
        },
        body: JSON.stringify({ companyName: query })
      });

      if (!response.ok) throw new Error("Agent failed to analyze company");

      setQuery("");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("The AI agent couldn't process this company. Check logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-2 font-mono">Autonomous Target Analysis</h2>
      <p className="text-sm text-gray-500 mb-4 font-mono">
        Enter a company name. Our agent will discover their commercial endpoints, bypass security, and extract financial signals.
      </p>

      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Bloom Energy, Vercel, Pizza Hut..."
          className="flex-1 font-serif border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing || !query.trim()}
          className={`px-6 py-2 rounded font-medium text-black font-serif border border-gray-700 transition-all ${
            isProcessing ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isProcessing ? "Agent is working..." : "Deploy Agent"}
        </button>
      </div>
    </form>
  );
}
