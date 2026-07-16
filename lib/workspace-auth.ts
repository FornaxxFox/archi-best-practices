export const WORKSPACE_ROLES = ["owner", "editor", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
export const DEFAULT_WORKSPACE_TOKEN_TTL_DAYS = 30;

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function canWriteWorkspace(role: WorkspaceRole) {
  return role === "owner" || role === "editor";
}

export function canManageWorkspace(role: WorkspaceRole) {
  return role === "owner";
}

export function workspaceTokenExpiry(value: unknown = DEFAULT_WORKSPACE_TOKEN_TTL_DAYS, now = Date.now()) {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 365) throw new Error("expiresInDays 必须是 1 到 365 之间的整数");
  return new Date(now + (value as number) * 24 * 60 * 60 * 1000).toISOString();
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function generateWorkspaceToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashWorkspaceToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}
