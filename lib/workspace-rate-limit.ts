import { eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { workspaceRateLimitBuckets } from "@/db/schema";
import { workspaceQuotaLimit } from "@/lib/workspace-quota-policy";
export { workspaceQuotaLimit } from "@/lib/workspace-quota-policy";
export type { WorkspaceQuotaAction, WorkspaceQuotaLimits, WorkspaceQuotaRole } from "@/lib/workspace-quota-policy";

const WINDOW_MS = 60_000;

export type WorkspaceQuotaResult = { allowed: boolean; limit: number; remaining: number; resetAt: number };
export type WorkspaceDatabase = Awaited<ReturnType<typeof getDb>>;

export async function consumeWorkspaceQuota(db: WorkspaceDatabase, bucketKey: string, limit: number, now = Date.now()): Promise<WorkspaceQuotaResult> {
  const windowStartedAt = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const updatedAt = new Date(now).toISOString();
  await db.insert(workspaceRateLimitBuckets).values({ bucketKey, windowStartedAt, count: 1, updatedAt }).onConflictDoUpdate({
    target: workspaceRateLimitBuckets.bucketKey,
    set: {
      windowStartedAt: sql`CASE WHEN ${workspaceRateLimitBuckets.windowStartedAt} = ${windowStartedAt} THEN ${workspaceRateLimitBuckets.windowStartedAt} ELSE ${windowStartedAt} END`,
      count: sql`CASE WHEN ${workspaceRateLimitBuckets.windowStartedAt} = ${windowStartedAt} THEN ${workspaceRateLimitBuckets.count} + 1 ELSE 1 END`,
      updatedAt,
    },
  });
  const [bucket] = await db.select({ windowStartedAt: workspaceRateLimitBuckets.windowStartedAt, count: workspaceRateLimitBuckets.count }).from(workspaceRateLimitBuckets).where(eq(workspaceRateLimitBuckets.bucketKey, bucketKey)).limit(1);
  if (!bucket) throw new Error("workspace quota bucket 写入后无法读取");
  if (Math.random() < 0.01) await db.delete(workspaceRateLimitBuckets).where(lt(workspaceRateLimitBuckets.windowStartedAt, windowStartedAt - WINDOW_MS));
  return { allowed: bucket.count <= limit, limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.windowStartedAt + WINDOW_MS };
}
