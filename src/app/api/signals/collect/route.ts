import { NextRequest, NextResponse } from "next/server";
import { extractSignalsFromHtml } from "@/lib/aiml";
import { fetchUnlockedHtml } from "@/lib/brightData";
import { isDemoMode } from "@/lib/env";
import { calculateHealthScore, confidenceForScore } from "@/lib/scoring";
import { insertSignal } from "@/lib/supabase/signals";

type SerpResult = {
  link?: string;
  url?: string;
  title?: string;
  source?: string;
  display_link?: string;
  description?: string;
  rank?: number;
};

type DiscoveryTarget = {
  url: string;
  title: string;
  source: string;
};

type PipelineDebug = {
  normalizedCompany: string;
  officialDomain?: string;
  validation: string[];
  serp: Array<{
    purpose: string;
    query: string;
    accepted?: string;
    rejected: Array<{ url: string; reason: string }>;
  }>;
  extraction: Array<{
    purpose: string;
    url: string;
    htmlLength: number;
    textLength: number;
    roleHints: number;
    openRoleTitles?: string[];
    engineeringRoleTitles?: string[];
  }>;
};

const TRUSTED_JOB_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "workdayjobs.com",
  "myworkdayjobs.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "jobs.ashbyhq.com"
];

const CAREER_TERMS = ["career", "careers", "jobs", "job", "openings", "positions"];
const COMMERCIAL_TERMS = ["pricing", "enterprise", "commercial", "value-calculator", "calculator", "contact-sales"];

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

function normalizeCompanyName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function validateCompanyName(companyName: string) {
  const normalized = normalizeCompanyName(companyName);

  if (normalized.length < 3) {
    return { ok: false as const, normalized, error: "Enter a company name with at least 3 characters." };
  }

  if (!/[a-z]/i.test(normalized) || !/^[a-z0-9&.,' -]+$/i.test(normalized)) {
    return { ok: false as const, normalized, error: "Enter a real company name using letters and numbers." };
  }

  const compact = normalized.replace(/[^a-z0-9]/gi, "");
  if (compact.length < 3) {
    return { ok: false as const, normalized, error: "Enter a more specific company name." };
  }

  return { ok: true as const, normalized };
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function getRegistrableDomain(url: string) {
  const host = getHostname(url);
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

function normalizedText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function companyTokens(companyName: string) {
  const stop = new Set(["inc", "corp", "corporation", "company", "co", "ltd", "llc", "plc", "the"]);
  return normalizedText(companyName)
    .split(" ")
    .filter((token) => token.length > 1 && !stop.has(token));
}

function resultUrl(result: SerpResult) {
  return result.link || result.url || "";
}

function resultMatchesCompany(result: SerpResult, companyName: string) {
  const haystack = normalizedText(
    [result.title, result.source, result.display_link, result.description, resultUrl(result)].filter(Boolean).join(" ")
  );
  const tokens = companyTokens(companyName);
  if (tokens.length === 0) return false;

  const requiredMatches = tokens.length === 1 ? 1 : Math.min(2, tokens.length);
  return tokens.filter((token) => haystack.includes(token)).length >= requiredMatches;
}

function isTrustedJobBoard(url: string) {
  const host = getHostname(url);
  return TRUSTED_JOB_HOSTS.some((trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`));
}

function hasAnyTerm(url: string, terms: string[]) {
  const normalizedUrl = url.toLowerCase();
  return terms.some((term) => normalizedUrl.includes(term));
}

function resultHasIntent(result: SerpResult, terms: string[]) {
  const haystack = normalizedText(
    [resultUrl(result), result.title, result.source, result.display_link, result.description].filter(Boolean).join(" ")
  );
  return terms.some((term) => haystack.includes(normalizedText(term)));
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"');
}

function htmlToReadableText(html: string, preserveLines = false) {
  const text = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/?(?:div|section|article|li|ul|ol|h[1-6]|p|br|tr|td|th|a|span|button)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return (preserveLines ? lines.join("\n") : lines.join(" ")).trim().slice(0, 45000);
}

function stripHtmlForAnalysis(html: string) {
  return htmlToReadableText(html, false)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 45000);
}

function roleHintCount(text: string) {
  const matches = text.match(/\b(engineer|engineering|developer|software|backend|frontend|full stack|machine learning|data scientist|devops|platform)\b/gi);
  return matches?.length ?? 0;
}

function cleanRoleTitle(title: string) {
  return title
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9]+|[^a-z0-9)]+$/gi, "")
    .trim();
}

function isLikelyRoleTitle(line: string) {
  const title = cleanRoleTitle(line);
  const words = title.split(/\s+/).filter(Boolean);
  if (title.length < 4 || title.length > 90 || words.length > 8) return false;
  if (/[.!?]{1}$/.test(title)) return false;

  return /\b(engineers?|engineering|developers?|designer|manager|analyst|specialist|consultant|architect|scientist|support|sales|executives?|product|security|software|technical|devops|data)\b/i.test(
    title
  );
}

function isEngineeringRoleTitle(title: string) {
  return /\b(engineers?|engineering|developers?|software|backend|frontend|full stack|machine learning|ml|data scientist|devops|platform|security|architect|technical support)\b/i.test(
    title
  );
}

function extractCareerRoles(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanRoleTitle(line))
    .filter(Boolean);
  const titles = new Map<string, string>();
  const employmentMarker = /\b(full time|part time|contract|internship|temporary|remote|hybrid|on-site|onsite)\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    if (!employmentMarker.test(lines[index])) continue;

    for (let back = index - 1; back >= Math.max(0, index - 5); back -= 1) {
      if (isLikelyRoleTitle(lines[back])) {
        titles.set(lines[back].toLowerCase(), lines[back]);
        break;
      }
    }
  }

  const sameLinePattern =
    /\b([A-Z][A-Za-z0-9&/().,+# -]{3,80}?\b(?:Engineer|Engineers|Developer|Designer|Manager|Analyst|Specialist|Consultant|Architect|Scientist|Executive|Executives|Support)[A-Za-z0-9&/().,+# -]{0,40})\s+(?:Full time|Part time|Contract|Internship|Temporary|Remote|Hybrid|On-site|Onsite)\b/g;
  for (const match of text.matchAll(sameLinePattern)) {
    const title = cleanRoleTitle(match[1]);
    if (isLikelyRoleTitle(title)) {
      titles.set(title.toLowerCase(), title);
    }
  }

  const openRoleTitles = [...titles.values()];
  return {
    openRoleTitles,
    engineeringRoleTitles: openRoleTitles.filter(isEngineeringRoleTitle)
  };
}

async function searchSerp(query: string): Promise<SerpResult[]> {
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
      return [];
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.organic && Array.isArray(data.organic) && data.organic.length > 0) {
      return data.organic;
    }

    if (data.results && Array.isArray(data.results)) {
      return data.results.filter((item: any) => item.type === "organic");
    }

    return [];
  } catch (error) {
    console.error("[SERP] Error:", error);
    return [];
  }
}

async function discoverOfficialDomain(companyName: string, debug: PipelineDebug) {
  const query = `"${companyName}" official website company`;
  const results = await searchSerp(query);
  const rejected: Array<{ url: string; reason: string }> = [];

  for (const result of results.slice(0, 8)) {
    const url = resultUrl(result);
    const host = getHostname(url);
    if (!url || !host) continue;

    if (isTrustedJobBoard(url) || host.includes("wikipedia.org") || host.includes("linkedin.com")) {
      rejected.push({ url, reason: "not an owned company website" });
      continue;
    }

    if (!resultMatchesCompany(result, companyName)) {
      rejected.push({ url, reason: "result title/source does not match company name" });
      continue;
    }

    const domain = getRegistrableDomain(url);
    debug.officialDomain = domain;
    debug.serp.push({ purpose: "official-domain", query, accepted: url, rejected });
    console.log(`[SERP] Official domain accepted for ${companyName}: ${domain} (${url})`);
    return domain;
  }

  debug.serp.push({ purpose: "official-domain", query, rejected });
  return null;
}

async function discoverTarget(input: {
  purpose: "careers" | "commercial";
  query: string;
  companyName: string;
  officialDomain: string;
  terms: string[];
  debug: PipelineDebug;
}): Promise<DiscoveryTarget | null> {
  const results = await searchSerp(input.query);
  const rejected: Array<{ url: string; reason: string }> = [];

  for (const result of results.slice(0, 10)) {
    const url = resultUrl(result);
    const domain = getRegistrableDomain(url);

    if (!url || !domain) continue;

    const sameCompanyDomain = domain === input.officialDomain;
    const trustedJobBoard = input.purpose === "careers" && isTrustedJobBoard(url) && resultMatchesCompany(result, input.companyName);

    if (!sameCompanyDomain && !trustedJobBoard) {
      rejected.push({ url, reason: `domain ${domain} does not match official domain ${input.officialDomain}` });
      continue;
    }

    if (!hasAnyTerm(url, input.terms) && !resultHasIntent(result, input.terms)) {
      rejected.push({ url, reason: `missing ${input.purpose} intent in URL/result` });
      continue;
    }

    input.debug.serp.push({
      purpose: input.purpose,
      query: input.query,
      accepted: url,
      rejected
    });
    console.log(`[SERP] ${input.purpose} target accepted: ${url}`);
    return {
      url,
      title: result.title ?? "",
      source: result.source ?? ""
    };
  }

  input.debug.serp.push({ purpose: input.purpose, query: input.query, rejected });
  return null;
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

    const validation = validateCompanyName(companyName);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedCompany = validation.normalized;
    const debug: PipelineDebug = {
      normalizedCompany,
      validation: ["company name passed basic validation"],
      serp: [],
      extraction: []
    };

    const officialDomain = await discoverOfficialDomain(normalizedCompany, debug);
    if (!officialDomain) {
      return NextResponse.json(
        {
          error: "Agent could not validate this as a real company target.",
          debug
        },
        { status: 422 }
      );
    }

    const careersTarget = await discoverTarget({
      purpose: "careers",
      query: `site:${officialDomain} ${normalizedCompany} careers jobs engineering`,
      companyName: normalizedCompany,
      officialDomain,
      terms: CAREER_TERMS,
      debug
    });
    const commercialTarget = await discoverTarget({
      purpose: "commercial",
      query: `site:${officialDomain} ${normalizedCompany} pricing enterprise commercial value calculator`,
      companyName: normalizedCompany,
      officialDomain,
      terms: COMMERCIAL_TERMS,
      debug
    });

    if (!careersTarget && !commercialTarget) {
      return NextResponse.json({ error: "Agent could not locate validated web targets.", debug }, { status: 404 });
    }

    let combinedHtml = `COMPANY CONTEXT: ${normalizedCompany}\nOFFICIAL DOMAIN: ${officialDomain}\n\n`;
    let deterministicOpenRoles: string[] = [];
    let deterministicEngineeringRoles: string[] = [];

    if (careersTarget) {
      console.log(`[Unlocker] Scraping Careers: ${careersTarget.url}`);
      const careersHtml = await fetchUnlockedHtml(careersTarget.url);
      const careersText = htmlToReadableText(careersHtml, true);
      const careerRoles = extractCareerRoles(careersText);
      deterministicOpenRoles = careerRoles.openRoleTitles;
      deterministicEngineeringRoles = careerRoles.engineeringRoleTitles;
      debug.extraction.push({
        purpose: "careers",
        url: careersTarget.url,
        htmlLength: careersHtml.length,
        textLength: careersText.length,
        roleHints: roleHintCount(careersText),
        openRoleTitles: careerRoles.openRoleTitles,
        engineeringRoleTitles: careerRoles.engineeringRoleTitles
      });
      combinedHtml += [
        `--- DETERMINISTIC CAREERS EXTRACTION (${careersTarget.url}) ---`,
        `open_roles_detected: ${careerRoles.openRoleTitles.length}`,
        `engineering_roles_detected: ${careerRoles.engineeringRoleTitles.length}`,
        `open_role_titles: ${careerRoles.openRoleTitles.join(" | ") || "none detected"}`,
        `engineering_role_titles: ${careerRoles.engineeringRoleTitles.join(" | ") || "none detected"}`,
        "",
        `--- CAREERS PAGE (${careersTarget.url}) ---`,
        careersText,
        ""
      ].join("\n");
    }

    if (commercialTarget) {
      console.log(`[Unlocker] Scraping Commercial: ${commercialTarget.url}`);
      const commercialHtml = await fetchUnlockedHtml(commercialTarget.url);
      const commercialText = stripHtmlForAnalysis(commercialHtml);
      debug.extraction.push({
        purpose: "commercial",
        url: commercialTarget.url,
        htmlLength: commercialHtml.length,
        textLength: commercialText.length,
        roleHints: roleHintCount(commercialText)
      });
      combinedHtml += `--- COMMERCIAL PAGE (${commercialTarget.url}) ---\n${commercialText}\n\n`;
    }

    console.log(`[AI] Synthesizing ${normalizedCompany} data...`, JSON.stringify(debug, null, 2));
    const extracted = await extractSignalsFromHtml({ companyName: normalizedCompany, combinedHtml });

    const openRoles =
      deterministicOpenRoles.length > 0 ? deterministicOpenRoles.length : extracted.openEngineeringRoles;
    const engineeringRoles =
      deterministicOpenRoles.length > 0 ? deterministicEngineeringRoles.length : extracted.openEngineeringRoles;
    const careerEvidence =
      deterministicOpenRoles.length > 0
        ? `Detected ${openRoles} open role${openRoles === 1 ? "" : "s"} on the validated careers page${
            engineeringRoles > 0 ? `, including ${engineeringRoles} engineering/technical role${engineeringRoles === 1 ? "" : "s"}` : ""
          }.`
        : "";
    const webTrafficIndex = extracted.webTrafficIndex;
    const healthScore = calculateHealthScore({
      engineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex
    });

    const signal = await insertSignal({
      companyName: normalizedCompany,
      ticker: normalizedCompany.slice(0, 4).toUpperCase(),
      openRoles,
      engineeringRoles,
      enterprisePrice: extracted.enterprisePrice,
      webTrafficIndex,
      healthScore,
      confidence: confidenceForScore(healthScore),
      synthesisAlert: [careerEvidence, extracted.synthesisAlert].filter(Boolean).join(" "),
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, signal, debug });
  } catch (error) {
    console.error("[Pipeline Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
