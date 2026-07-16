export type WorkspaceQuotaAction = "read" | "write" | "member";
export type WorkspaceQuotaRole = "owner" | "editor" | "viewer" | "operator";
export type WorkspaceQuotaLimits = Record<WorkspaceQuotaAction, number>;

export function workspaceQuotaLimit(action: WorkspaceQuotaAction, role: WorkspaceQuotaRole, limits: WorkspaceQuotaLimits) {
  const roleMultiplier = role === "owner" || role === "operator" ? 2 : 1;
  return limits[action] * roleMultiplier;
}
