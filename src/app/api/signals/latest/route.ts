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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load signals." },
      { status: 500 }
    );
  }
}
