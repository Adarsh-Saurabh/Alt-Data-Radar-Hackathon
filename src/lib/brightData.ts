import { requireEnv } from "@/lib/env";

type FetchUnlockedHtmlInput = {
  url: string;
};

export async function fetchUnlockedHtml({ url }: FetchUnlockedHtmlInput) {
  const apiKey = requireEnv("BRIGHT_DATA_API_KEY");
  const zone = requireEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE");
  const endpoint = process.env.BRIGHT_DATA_BASE_URL ?? "https://api.brightdata.com/request";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      zone,
      url,
      format: "raw"
    })
  });

  if (!response.ok) {
    throw new Error(`Bright Data request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
