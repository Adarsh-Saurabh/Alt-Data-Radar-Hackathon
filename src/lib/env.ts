export function isDemoMode() {
  const v = process.env.DEMO_MODE;
  if (v === undefined) return true;
  return String(v).trim().toLowerCase() !== "false";
}

export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
