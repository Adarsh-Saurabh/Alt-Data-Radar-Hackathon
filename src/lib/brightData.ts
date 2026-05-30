export async function fetchUnlockedHtml(targetUrl: string): Promise<string> {
  console.log(`Unlocking ${targetUrl} via Bright Data...`);

  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.BRIGHT_DATA_API_KEY}`
    },
    body: JSON.stringify({
      zone: process.env.BRIGHT_DATA_WEB_UNLOCKER_ZONE,
      url: targetUrl,
      format: "raw"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bright Data Unlocker failed: ${response.status} - ${errorText}`);
  }

  return await response.text();
}
