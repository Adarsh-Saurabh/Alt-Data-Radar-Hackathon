export function calculateHealthScore(input: {
  engineeringRoles: number;
  enterprisePrice: number | null;
  webTrafficIndex: number;
}) {
  const hiringScore = Math.min(100, input.engineeringRoles * 4);
  const priceScore = input.enterprisePrice ? Math.min(100, input.enterprisePrice / 10) : 45;
  const trafficScore = input.webTrafficIndex;

  return Math.round(hiringScore * 0.45 + priceScore * 0.25 + trafficScore * 0.3);
}

export function confidenceForScore(score: number): "low" | "medium" | "high" {
  if (score >= 78) {
    return "high";
  }

  if (score >= 52) {
    return "medium";
  }

  return "low";
}
