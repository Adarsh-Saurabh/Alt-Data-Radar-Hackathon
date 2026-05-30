import type { CompanySignal } from "@/types/signals";
import { demoSignals } from "@/lib/demoData";
import { isDemoMode } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type SignalRow = {
  id: string;
  company_name: string;
  ticker: string;
  open_roles: number;
  engineering_roles: number;
  enterprise_price: number | null;
  web_traffic_index: number;
  health_score: number;
  confidence: "low" | "medium" | "high";
  synthesis_alert: string;
  created_at: string;
};

function fromRow(row: SignalRow): CompanySignal {
  return {
    id: row.id,
    companyName: row.company_name,
    ticker: row.ticker,
    openRoles: row.open_roles,
    engineeringRoles: row.engineering_roles,
    enterprisePrice: row.enterprise_price,
    webTrafficIndex: row.web_traffic_index,
    healthScore: row.health_score,
    confidence: row.confidence,
    synthesisAlert: row.synthesis_alert,
    createdAt: row.created_at
  };
}

export async function listSignals(): Promise<CompanySignal[]> {
  if (isDemoMode()) {
    return demoSignals;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("company_signals")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(90);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => fromRow(row as SignalRow));
}

export async function insertSignal(signal: Omit<CompanySignal, "id">) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("company_signals")
    .insert({
      company_name: signal.companyName,
      ticker: signal.ticker,
      open_roles: signal.openRoles,
      engineering_roles: signal.engineeringRoles,
      enterprise_price: signal.enterprisePrice,
      web_traffic_index: signal.webTrafficIndex,
      health_score: signal.healthScore,
      confidence: signal.confidence,
      synthesis_alert: signal.synthesisAlert,
      created_at: signal.createdAt
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as SignalRow);
}
