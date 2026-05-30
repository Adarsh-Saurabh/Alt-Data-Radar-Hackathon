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

    // Prefer AI-generated proxy webTrafficIndex, fallback to deterministic offset
    const aiTraffic = (extracted as any).webTrafficIndex;
    const dayOffset = new Date().getDate() % 15; // 0-14
    const fallbackTraffic = Math.max(1, Math.min(100, 50 + dayOffset));
    const webTrafficIndex = typeof aiTraffic === "number" ? aiTraffic : fallbackTraffic;

    const healthScore = calculateHealthScore({
      engineeringRoles: extracted.openEngineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex
    });

    const signal = await insertSignal({
      companyName: target.companyName,
      ticker: target.ticker,
      openRoles: extracted.openEngineeringRoles,
      engineeringRoles: extracted.openEngineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex,
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
