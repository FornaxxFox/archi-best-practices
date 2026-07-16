import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceInviteUrl, parseWorkspaceInviteFragment } from "../lib/workspace-invite.ts";

test("workspace invite keeps the bearer token in the URL fragment", () => {
  const invite = { spaceId: "studio-research", memberId: "designer-a", token: "A".repeat(43), expiresAt: "2026-08-14T00:00:00.000Z" };
  const url = buildWorkspaceInviteUrl("https://archlens.example", invite);
  assert.equal(new URL(url).pathname, "/boards");
  assert.equal(new URL(url).search, "");
  assert.deepEqual(parseWorkspaceInviteFragment(new URL(url).hash), invite);
  assert.equal(parseWorkspaceInviteFragment("#archlens-invite=broken"), null);
});
