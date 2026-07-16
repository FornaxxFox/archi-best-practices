export type WorkspaceInvite = { spaceId: string; memberId: string; token: string; expiresAt: string };

function validInvite(value: unknown): value is WorkspaceInvite {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const invite = value as Partial<WorkspaceInvite>;
  return typeof invite.spaceId === "string" && typeof invite.memberId === "string" && typeof invite.token === "string" && invite.token.length >= 40 && typeof invite.expiresAt === "string";
}

export function buildWorkspaceInviteUrl(baseUrl: string, invite: WorkspaceInvite) {
  const url = new URL("/boards", baseUrl);
  url.hash = `archlens-invite=${encodeURIComponent(JSON.stringify(invite))}`;
  return url.toString();
}

export function parseWorkspaceInviteFragment(fragment: string): WorkspaceInvite | null {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const encoded = params.get("archlens-invite");
  if (!encoded) return null;
  try {
    const value: unknown = JSON.parse(encoded);
    return validInvite(value) ? value : null;
  } catch {
    return null;
  }
}
