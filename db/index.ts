import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type RuntimeEnv = { DB?: D1Database };

async function getRuntimeEnv(): Promise<RuntimeEnv | null> {
  try {
    const runtime = await import("cloudflare:workers");
    return runtime.env as RuntimeEnv;
  } catch {
    return null;
  }
}

export async function hasDbBinding() {
  return Boolean((await getRuntimeEnv())?.DB);
}

export async function getDb() {
  const runtimeEnv = await getRuntimeEnv();
  if (!runtimeEnv?.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(runtimeEnv.DB, { schema });
}
