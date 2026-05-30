export type CompanySignal = {
  id: string;
  companyName: string;
  ticker: string;
  openRoles: number;
  engineeringRoles: number;
  enterprisePrice: number | null;
  webTrafficIndex: number;
  healthScore: number;
  confidence: "low" | "medium" | "high";
  synthesisAlert: string;
  createdAt: string;
};

export type CompanyTarget = {
  companyName: string;
  ticker: string;
  careersUrl: string;
  pricingUrl: string;
  trafficUrl?: string;
};

export type ExtractedSignal = {
  openEngineeringRoles: number;
  enterprisePrice: number | null;
  synthesisAlert: string;
  webTrafficIndex: number;
};
