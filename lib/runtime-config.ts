export type McpRuntimeConfig = {
  authToken: string;
  authEnabled: boolean;
  rateLimitPerMinute: number;
  sourceIntakeWriteEnabled: boolean;
  sourceIntakeMaxReportBytes: number;
};

function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() ?? "" : "";
}

function positiveInteger(value: string, fallback: number, max = 10_000) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
}

function booleanEnv(value: string) {
  return value === "1" || value.toLowerCase() === "true";
}

export function getMcpRuntimeConfig(): McpRuntimeConfig {
  const authToken = env("ARCHLENS_MCP_TOKEN");
  return {
    authToken,
    authEnabled: Boolean(authToken),
    rateLimitPerMinute: positiveInteger(env("ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE"), 60),
    sourceIntakeWriteEnabled: booleanEnv(env("ARCHLENS_SOURCE_INTAKE_WRITE_ENABLED")),
    sourceIntakeMaxReportBytes: positiveInteger(env("ARCHLENS_SOURCE_INTAKE_MAX_REPORT_BYTES"), 250_000, 5_000_000),
  };
}

export function hasValidMcpAuthorization(request: Request, config = getMcpRuntimeConfig()) {
  if (!config.authEnabled) return true;
  return request.headers.get("authorization") === `Bearer ${config.authToken}`;
}

export function hasValidSourceIntakeAuthorization(request: Request, config = getMcpRuntimeConfig()) {
  return hasValidMcpAuthorization(request, config);
}
