import { z } from "zod";
import { requireEnv } from "@/lib/env";
import type { ExtractedSignal } from "@/types/signals";

const extractedSignalSchema = z.object({
  open_engineering_roles: z.number().int().nonnegative(),
  enterprise_price: z.number().int().nonnegative().nullable(),
  synthesis_alert: z.string().min(1)
});

export async function extractSignalsFromHtml(input: {
  companyName: string;
  careersHtml: string;
  pricingHtml: string;
}): Promise<ExtractedSignal> {
  const apiKey = requireEnv("AIML_API_KEY");
  const baseUrl = process.env.AIML_BASE_URL ?? "https://api.aimlapi.com/v1";
  const model = process.env.AIML_MODEL ?? "gpt-4o-mini";

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
          content:
            "You are a financial data extractor. Output only a valid JSON object and no markdown."
        },
        {
          role: "user",
          content: [
            `Company: ${input.companyName}`,
            "Read the HTML. Extract the exact number of open engineering roles and the current price of the Enterprise tier.",
            'Output schema: {"open_engineering_roles": int, "enterprise_price": int | null, "synthesis_alert": string}.',
            "In synthesis_alert, write a one-sentence warning if roles drop to zero or price drops.",
            `CAREERS_HTML:\n${input.careersHtml}`,
            `PRICING_HTML:\n${input.pricingHtml}`
          ].join("\n\n")
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

  const parsed = extractedSignalSchema.parse(JSON.parse(content));

  return {
    openEngineeringRoles: parsed.open_engineering_roles,
    enterprisePrice: parsed.enterprise_price,
    synthesisAlert: parsed.synthesis_alert
  };
}
