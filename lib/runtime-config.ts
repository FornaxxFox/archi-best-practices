export type McpRuntimeConfig = {
  authToken: string;
  authEnabled: boolean;
  sourceIntakeToken: string;
  sourceIntakeAuthEnabled: boolean;
  rateLimitPerMinute: number;
  sourceIntakeWriteEnabled: boolean;
  sourceIntakeMaxReportBytes: number;
  workspaceToken: string;
  workspaceAuthEnabled: boolean;
  workspaceWriteEnabled: boolean;
  workspaceMaxSnapshotBytes: number;
  workspaceRateLimitPerMinute: number;
  workspaceWriteRateLimitPerMinute: number;
  workspaceMemberRateLimitPerMinute: number;
  workspaceInviteBaseUrl: string;
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
  const sourceIntakeToken = env("ARCHLENS_SOURCE_INTAKE_TOKEN");
  const workspaceToken = env("ARCHLENS_WORKSPACE_TOKEN");
  return {
    authToken,
    authEnabled: Boolean(authToken),
    sourceIntakeToken,
    sourceIntakeAuthEnabled: Boolean(sourceIntakeToken),
    rateLimitPerMinute: positiveInteger(env("ARCHLENS_MCP_RATE_LIMIT_PER_MINUTE"), 60),
    sourceIntakeWriteEnabled: booleanEnv(env("ARCHLENS_SOURCE_INTAKE_WRITE_ENABLED")),
    sourceIntakeMaxReportBytes: positiveInteger(env("ARCHLENS_SOURCE_INTAKE_MAX_REPORT_BYTES"), 250_000, 5_000_000),
    workspaceToken,
    workspaceAuthEnabled: Boolean(workspaceToken),
    workspaceWriteEnabled: booleanEnv(env("ARCHLENS_WORKSPACE_WRITE_ENABLED")),
    workspaceMaxSnapshotBytes: positiveInteger(env("ARCHLENS_WORKSPACE_MAX_SNAPSHOT_BYTES"), 500_000, 5_000_000),
    workspaceRateLimitPerMinute: positiveInteger(env("ARCHLENS_WORKSPACE_RATE_LIMIT_PER_MINUTE"), 120),
    workspaceWriteRateLimitPerMinute: positiveInteger(env("ARCHLENS_WORKSPACE_WRITE_RATE_LIMIT_PER_MINUTE"), 60),
    workspaceMemberRateLimitPerMinute: positiveInteger(env("ARCHLENS_WORKSPACE_MEMBER_RATE_LIMIT_PER_MINUTE"), 30),
    workspaceInviteBaseUrl: env("ARCHLENS_WORKSPACE_INVITE_BASE_URL"),
  };
}

export function hasValidMcpAuthorization(request: Request, config = getMcpRuntimeConfig()) {
  if (!config.authEnabled) return true;
  return request.headers.get("authorization") === `Bearer ${config.authToken}`;
}

export function hasValidSourceIntakeAuthorization(request: Request, config = getMcpRuntimeConfig()) {
  if (config.sourceIntakeAuthEnabled) return request.headers.get("authorization") === `Bearer ${config.sourceIntakeToken}`;
  return hasValidMcpAuthorization(request, config);
}

export function hasValidWorkspaceAuthorization(request: Request, config = getMcpRuntimeConfig()) {
  return config.workspaceAuthEnabled && request.headers.get("authorization") === `Bearer ${config.workspaceToken}`;
}
