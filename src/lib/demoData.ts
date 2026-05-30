import type { CompanySignal, CompanyTarget } from "@/types/signals";

export const demoTarget: CompanyTarget = {
  companyName: "Example SaaS Co.",
  ticker: "EXMP",
  careersUrl: "https://example.com/careers",
  pricingUrl: "https://example.com/pricing"
};

export const demoSignals: CompanySignal[] = [
  {
    id: "demo-1",
    companyName: "Example SaaS Co.",
    ticker: "EXMP",
    openRoles: 42,
    engineeringRoles: 18,
    enterprisePrice: 840,
    webTrafficIndex: 73,
    healthScore: 72,
    confidence: "medium",
    synthesisAlert: "Hiring velocity is steady while pricing remains unchanged.",
    createdAt: "2026-05-24T06:00:00.000Z"
  },
  {
    id: "demo-2",
    companyName: "Example SaaS Co.",
    ticker: "EXMP",
    openRoles: 46,
    engineeringRoles: 20,
    enterprisePrice: 840,
    webTrafficIndex: 76,
    healthScore: 76,
    confidence: "medium",
    synthesisAlert: "Engineering demand increased with no discounting signal.",
    createdAt: "2026-05-25T06:00:00.000Z"
  },
  {
    id: "demo-3",
    companyName: "Example SaaS Co.",
    ticker: "EXMP",
    openRoles: 51,
    engineeringRoles: 25,
    enterprisePrice: 899,
    webTrafficIndex: 82,
    healthScore: 84,
    confidence: "high",
    synthesisAlert: "Pricing power improved while engineering hiring accelerated.",
    createdAt: "2026-05-26T06:00:00.000Z"
  },
  {
    id: "demo-4",
    companyName: "Example SaaS Co.",
    ticker: "EXMP",
    openRoles: 49,
    engineeringRoles: 23,
    enterprisePrice: 899,
    webTrafficIndex: 80,
    healthScore: 81,
    confidence: "high",
    synthesisAlert: "Operational momentum remains positive, with slight traffic softening.",
    createdAt: "2026-05-27T06:00:00.000Z"
  },
  {
    id: "demo-5",
    companyName: "Example SaaS Co.",
    ticker: "EXMP",
    openRoles: 37,
    engineeringRoles: 12,
    enterprisePrice: 760,
    webTrafficIndex: 68,
    healthScore: 58,
    confidence: "medium",
    synthesisAlert: "Warning: engineering roles and enterprise price both dropped.",
    createdAt: "2026-05-28T06:00:00.000Z"
  },
  {
    id: "demo-6",
    companyName: "Example SaaS Co.",
    ticker: "EXMP",
    openRoles: 40,
    engineeringRoles: 15,
    enterprisePrice: 760,
    webTrafficIndex: 71,
    healthScore: 64,
    confidence: "medium",
    synthesisAlert: "Hiring recovered modestly, but pricing is still below prior baseline.",
    createdAt: "2026-05-29T06:00:00.000Z"
  }
];
