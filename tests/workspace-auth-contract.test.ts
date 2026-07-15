import test from "node:test";
import assert from "node:assert/strict";
import { canManageWorkspace, canWriteWorkspace, generateWorkspaceToken, hashWorkspaceToken, isWorkspaceRole } from "../lib/workspace-auth.ts";

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
