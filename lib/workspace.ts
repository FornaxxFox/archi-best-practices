import { DATASET_VERSION } from "./dataset-meta.ts";

export const WORKSPACE_SNAPSHOT_SCHEMA_VERSION = "1.0.0" as const;

export type LastResearch = {
  template: string;
  prompt: string;
  createdAt: string;
};

export type WorkspaceSnapshot = {
  schemaVersion: typeof WORKSPACE_SNAPSHOT_SCHEMA_VERSION;
  datasetVersion: string;
  exportedAt: string;
  savedCaseIds: string[];
  ratings: Record<string, number>;
  lastResearch: LastResearch | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertString(value: unknown, field: string, errors: string[]) {
  if (!nonEmptyString(value)) errors.push(`${field} 必须是非空字符串`);
}

export function validateWorkspaceSnapshot(input: unknown): WorkspaceSnapshot {
  if (!isRecord(input)) throw new Error("工作区文件必须是一个 JSON 对象");
  const errors: string[] = [];
  if (input.schemaVersion !== WORKSPACE_SNAPSHOT_SCHEMA_VERSION) errors.push(`schemaVersion 必须是 ${WORKSPACE_SNAPSHOT_SCHEMA_VERSION}`);
  assertString(input.datasetVersion, "datasetVersion", errors);
  assertString(input.exportedAt, "exportedAt", errors);
  if (!Array.isArray(input.savedCaseIds)) errors.push("savedCaseIds 必须是数组");
  const savedCaseIds = Array.isArray(input.savedCaseIds) ? input.savedCaseIds : [];
  if (savedCaseIds.some((id) => typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) errors.push("savedCaseIds 必须是 kebab-case 字符串数组");
  if (new Set(savedCaseIds).size !== savedCaseIds.length) errors.push("savedCaseIds 不能重复");

  if (!isRecord(input.ratings)) errors.push("ratings 必须是对象");
  const ratings = isRecord(input.ratings) ? input.ratings : {};
  for (const [id, rating] of Object.entries(ratings)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !Number.isInteger(rating) || rating < 0 || rating > 5) errors.push(`ratings.${id} 必须是 0-5 的整数`);
  }

  const lastResearch = input.lastResearch;
  if (lastResearch !== null && lastResearch !== undefined) {
    if (!isRecord(lastResearch)) errors.push("lastResearch 必须是对象或 null");
    else {
      assertString(lastResearch.template, "lastResearch.template", errors);
      assertString(lastResearch.prompt, "lastResearch.prompt", errors);
      assertString(lastResearch.createdAt, "lastResearch.createdAt", errors);
      if (typeof lastResearch.prompt === "string" && lastResearch.prompt.length > 4000) errors.push("lastResearch.prompt 不能超过 4000 个字符");
    }
  }
  if (errors.length) throw new Error(`工作区文件校验失败：\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return {
    schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
    datasetVersion: input.datasetVersion as string,
    exportedAt: input.exportedAt as string,
    savedCaseIds: [...savedCaseIds] as string[],
    ratings: { ...ratings } as Record<string, number>,
    lastResearch: lastResearch && isRecord(lastResearch) ? { template: lastResearch.template as string, prompt: lastResearch.prompt as string, createdAt: lastResearch.createdAt as string } : null,
  };
}

export function buildWorkspaceSnapshot(savedCaseIds: readonly string[], ratings: Record<string, number>, lastResearch: LastResearch | null): WorkspaceSnapshot {
  return validateWorkspaceSnapshot({ schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION, datasetVersion: DATASET_VERSION, exportedAt: new Date().toISOString(), savedCaseIds, ratings, lastResearch });
}

export function parseWorkspaceSnapshot(content: string): WorkspaceSnapshot {
  let input: unknown;
  try {
    input = JSON.parse(content);
  } catch {
    throw new Error("工作区文件不是有效的 JSON");
  }
  return validateWorkspaceSnapshot(input);
}
