import { NextRequest, NextResponse } from "next/server";
import { extractSignalsFromHtml } from "@/lib/aiml";
import { fetchUnlockedHtml } from "@/lib/brightData";
import { isDemoMode } from "@/lib/env";
import { calculateHealthScore, confidenceForScore } from "@/lib/scoring";
import { insertSignal } from "@/lib/supabase/signals";
import type { CompanyTarget } from "@/types/signals";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const webTrafficIndex = 50;
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
