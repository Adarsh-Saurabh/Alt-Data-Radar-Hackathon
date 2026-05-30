import { z } from "zod";
import { requireEnv } from "@/lib/env";
import type { ExtractedSignal } from "@/types/signals";

const extractedSignalSchema = z.object({
  open_engineering_roles: z.number().int().nonnegative(),
  enterprise_price: z.number().int().nonnegative().nullable(),
  web_traffic_index: z.number().int().min(1).max(100),
  synthesis_alert: z.string().min(1)
});

export function cleanAndParseJSON(text: string): any {
  // Robust JSON extraction from model output. Models sometimes wrap JSON in
  // text or markdown fences, or add explanatory text. Try several heuristics.
  const trimmed = String(text).trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {}
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  throw new Error("Unable to parse JSON from AI/ML response.");
}

export async function extractSignalsFromHtml(input: {
  companyName: string;
  careersHtml?: string;
  pricingHtml?: string;
  combinedHtml?: string;
}): Promise<ExtractedSignal> {
  const apiKey = requireEnv("AIML_API_KEY");
  const baseUrl = process.env.AIML_BASE_URL ?? "https://api.aimlapi.com/v1";
  const model = process.env.AIML_MODEL ?? "gpt-4o-mini";

  const promptParts = [
    `Company: ${input.companyName}`,
    "Read the HTML. Extract the exact number of open engineering roles and the current price of the Enterprise tier.",
    "If the company uses custom enterprise pricing (e.g., ROI calculators, PPAs, or contact-sales models), return null for `enterprise_price` and describe the pricing model in `synthesis_alert`.",
    'Output schema: {"open_engineering_roles": int, "enterprise_price": int | null, "web_traffic_index": int (1-100), "synthesis_alert": string}.',
    "For `synthesis_alert`, include a one-sentence note about pricing structure when enterprise price is null, and a short warning if roles drop to zero.",
    "Estimate `web_traffic_index` (1-100) as a proxy based on firmographic clues in the provided HTML: job counts, geo spread, partner logos, deployment language. Use 1-30 for low, 31-70 for medium, and 71-100 for high."
  ];

  if (input.combinedHtml) {
    promptParts.push(`COMBINED_HTML:\n${input.combinedHtml}`);
  } else {
    promptParts.push(`CAREERS_HTML:\n${input.careersHtml ?? ""}`);
    promptParts.push(`PRICING_HTML:\n${input.pricingHtml ?? ""}`);
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are a financial data extractor. Output only a valid JSON object and no markdown."
        },
        {
          role: "user",
          content: promptParts.join("\n\n")
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI/ML API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI/ML API returned an empty response.");
  }

  const parsedJson = cleanAndParseJSON(content);
  const parsed = extractedSignalSchema.parse(parsedJson);

  return {
    openEngineeringRoles: parsed.open_engineering_roles,
    enterprisePrice: parsed.enterprise_price,
    webTrafficIndex: parsed.web_traffic_index,
    synthesisAlert: parsed.synthesis_alert
  };
}
