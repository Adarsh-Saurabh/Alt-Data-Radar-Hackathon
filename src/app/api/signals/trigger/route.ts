import { NextResponse } from "next/server";
import { extractSignalsFromHtml } from "@/lib/aiml";
import { fetchUnlockedHtml } from "@/lib/brightData";
import { isDemoMode } from "@/lib/env";
import { calculateHealthScore, confidenceForScore } from "@/lib/scoring";
import { insertSignal } from "@/lib/supabase/signals";
import type { CompanyTarget } from "@/types/signals";

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      {
        status: "demo-mode",
        message: "Set DEMO_MODE=false and provide API keys to enable live collection."
      },
      { status: 202 }
    );
  }

  try {
    const target = (await request.json()) as CompanyTarget;
    const [careersHtml, pricingHtml] = await Promise.all([
      fetchUnlockedHtml(target.careersUrl),
      fetchUnlockedHtml(target.pricingUrl)
    ]);

    const extracted = await extractSignalsFromHtml({
      companyName: target.companyName,
      careersHtml,
      pricingHtml
    });

    const healthScore = calculateHealthScore({
      engineeringRoles: extracted.openEngineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex: extracted.webTrafficIndex
    });

    const signal = await insertSignal({
      companyName: target.companyName,
      ticker: target.ticker,
      openRoles: extracted.openEngineeringRoles,
      engineeringRoles: extracted.openEngineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex: extracted.webTrafficIndex,
      healthScore,
      confidence: confidenceForScore(healthScore),
      synthesisAlert: extracted.synthesisAlert,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ signal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signal collection failed." },
      { status: 500 }
    );
  }
}
