import { NextResponse } from "next/server";
import { listSignals } from "@/lib/supabase/signals";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const signals = await listSignals();
    return NextResponse.json(
      { signals },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("[Signals Latest] Failed to load signals:", error);
    return NextResponse.json({ signals: [], warning: "Failed to load signal history." });
  }
}
