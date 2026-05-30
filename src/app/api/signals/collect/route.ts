import { NextRequest, NextResponse } from "next/server";
import { extractSignalsFromHtml } from "@/lib/aiml";
import { fetchUnlockedHtml } from "@/lib/brightData";
import { isDemoMode } from "@/lib/env";
import { calculateHealthScore, confidenceForScore } from "@/lib/scoring";
import { insertSignal } from "@/lib/supabase/signals";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const publicSecret = process.env.NEXT_PUBLIC_CRON_SECRET;

  if (!secret && !publicSecret) {
    return true;
  }

  const bearer = request.headers.get("authorization");
  const cronHeader = request.headers.get("cron_secret");

  return bearer === `Bearer ${secret}` || cronHeader === secret || cronHeader === publicSecret;
}

async function findUrlViaSerp(query: string): Promise<string | null> {
  console.log(`[SERP] Searching Google for: ${query}`);
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us`;
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BRIGHT_DATA_API_KEY}`
      },
      body: JSON.stringify({
        zone: process.env.BRIGHT_DATA_SERP_ZONE,
        url: searchUrl,
        format: "raw"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SERP] Bright Data failed: ${response.status} - ${errorText}`);
      return null;
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    // Bright Data SERP parsed layout: { organic: [...] } with link property.
    if (data.organic && Array.isArray(data.organic) && data.organic.length > 0) {
      const url = data.organic[0].link || data.organic[0].url;
      if (url) return url;
    }

    // Handle direct REST API layout: { results: [...] } with type and url property
    if (data.results && Array.isArray(data.results)) {
      const organicResult = data.results.find((item: any) => item.type === "organic");
      if (organicResult && organicResult.url) {
        return organicResult.url;
      }
    }

    return null;
  } catch (error) {
    console.error("[SERP] Error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Demo mode is always allowed without auth; production requires secret.
  if (isDemoMode()) {
    return NextResponse.json(
      {
        status: "demo-mode",
        message: "Set DEMO_MODE=false and provide API keys to enable live collection."
      },
      { status: 202 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { companyName } = (await request.json()) as { companyName?: string };

    if (!companyName) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }

    const careersUrl = await findUrlViaSerp(`${companyName} careers jobs`);
    const commercialUrl = await findUrlViaSerp(`${companyName} pricing OR \"value calculator\" OR enterprise`);

    if (!careersUrl || !commercialUrl) {
      const missingTargets = [
        !careersUrl ? "careers/jobs page" : null,
        !commercialUrl ? "pricing/commercial page" : null
      ].filter(Boolean);

      return NextResponse.json(
        {
          error: `Agent could not locate required web target${missingTargets.length > 1 ? "s" : ""}: ${missingTargets.join(", ")}.`
        },
        { status: 404 }
      );
    }

    let combinedHtml = `COMPANY CONTEXT: ${companyName}\n\n`;

    console.log(`[Unlocker] Scraping Careers: ${careersUrl}`);
    const careersHtml = await fetchUnlockedHtml(careersUrl);
    combinedHtml += `--- CAREERS PAGE ---\n${careersHtml}\n\n`;

    console.log(`[Unlocker] Scraping Commercial: ${commercialUrl}`);
    const commercialHtml = await fetchUnlockedHtml(commercialUrl);
    combinedHtml += `--- COMMERCIAL PAGE ---\n${commercialHtml}\n\n`;

    console.log(`[AI] Synthesizing ${companyName} data...`);
    const extracted = await extractSignalsFromHtml({ companyName, combinedHtml });

    const healthScore = calculateHealthScore({
      engineeringRoles: extracted.openEngineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex: extracted.webTrafficIndex
    });

    const signal = await insertSignal({
      companyName,
      ticker: companyName.slice(0, 4).toUpperCase(),
      openRoles: extracted.openEngineeringRoles,
      engineeringRoles: extracted.openEngineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex: extracted.webTrafficIndex,
      healthScore,
      confidence: confidenceForScore(healthScore),
      synthesisAlert: extracted.synthesisAlert,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, signal });
  } catch (error) {
    console.error("[Pipeline Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
