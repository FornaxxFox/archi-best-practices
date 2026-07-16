import test from "node:test";
import assert from "node:assert/strict";
import { canManageWorkspace, canWriteWorkspace, generateWorkspaceToken, hashWorkspaceToken, isWorkspaceRole, workspaceTokenExpiry } from "../lib/workspace-auth.ts";
import { workspaceQuotaLimit } from "../lib/workspace-quota-policy.ts";

test("workspace roles have explicit read/write/management boundaries", () => {
  assert.equal(canManageWorkspace("owner"), true);
  assert.equal(canManageWorkspace("editor"), false);
  assert.equal(canWriteWorkspace("editor"), true);
  assert.equal(canWriteWorkspace("viewer"), false);
  assert.equal(isWorkspaceRole("viewer"), true);
  assert.equal(isWorkspaceRole("admin"), false);
});

test("member token is high-entropy and stored as a deterministic hash", async () => {
  const token = generateWorkspaceToken();
  assert.match(token, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(token, generateWorkspaceToken());
  assert.equal(await hashWorkspaceToken(token), await hashWorkspaceToken(token));
  assert.notEqual(await hashWorkspaceToken(token), token);
});

test("member token expiry defaults to 30 days and is bounded", () => {
  const now = Date.parse("2026-07-15T00:00:00.000Z");
  assert.equal(workspaceTokenExpiry(undefined, now), "2026-08-14T00:00:00.000Z");
  assert.equal(workspaceTokenExpiry(1, now), "2026-07-16T00:00:00.000Z");
  assert.throws(() => workspaceTokenExpiry(0, now), /1 到 365/);
  assert.throws(() => workspaceTokenExpiry(366, now), /1 到 365/);
});

test("workspace quota separates action budgets and roles", () => {
  const limits = { read: 120, write: 60, member: 30 } as const;
  assert.equal(workspaceQuotaLimit("read", "viewer", limits), 120);
  assert.equal(workspaceQuotaLimit("write", "editor", limits), 60);
  assert.equal(workspaceQuotaLimit("member", "operator", limits), 60);
  assert.equal(workspaceQuotaLimit("write", "owner", limits), 120);
});
