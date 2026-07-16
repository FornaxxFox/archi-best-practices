export const SOURCE_INTAKE_SCHEMA_VERSION = "1.0.0" as const;

export type SourceIntakeSource = {
  label: string;
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  finalUrl: string | null;
  bytesRead: number;
  truncated: boolean;
  title: string;
  description: string;
  canonicalUrl: string;
  excerpt: string;
  error: string | null;
  durationMs: number;
};

export type SourceIntakeReport = {
  schemaVersion: typeof SOURCE_INTAKE_SCHEMA_VERSION;
  generatedAt: string;
  case: { id: string; title: string };
  policy: {
    onlyHttps: boolean;
    downloadedImages: boolean;
    maxBytes: number;
    timeoutMs: number;
    delayMs: number;
    interpretation: "none";
  };
  summary: { sourceCount: number; reachableCount: number; failedCount: number };
  sources: SourceIntakeSource[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} 必须是非空字符串`);
  return value;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${field} 必须是非负整数`);
  return value as number;
}

function nullableString(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== "string") throw new Error(`${field} 必须是字符串或 null`);
  return value as string | null;
}

function validateSource(value: unknown, index: number): SourceIntakeSource {
  if (!isObject(value)) throw new Error(`sources[${index}] 必须是对象`);
  const label = requiredString(value.label, `sources[${index}].label`);
  const url = requiredString(value.url, `sources[${index}].url`);
  if (!url.startsWith("https://")) throw new Error(`sources[${index}].url 必须使用 HTTPS`);
  const finalUrl = nullableString(value.finalUrl, `sources[${index}].finalUrl`);
  if (finalUrl && !finalUrl.startsWith("https://")) throw new Error(`sources[${index}].finalUrl 必须使用 HTTPS`);
  if (typeof value.ok !== "boolean") throw new Error(`sources[${index}].ok 必须是布尔值`);
  if (value.status !== null && (!Number.isInteger(value.status) || (value.status as number) < 100 || (value.status as number) > 599)) throw new Error(`sources[${index}].status 必须是 HTTP 状态码或 null`);
  return {
    label,
    url,
    ok: value.ok,
    status: value.status as number | null,
    contentType: nullableString(value.contentType, `sources[${index}].contentType`),
    finalUrl,
    bytesRead: nonNegativeInteger(value.bytesRead, `sources[${index}].bytesRead`),
    truncated: value.truncated === true,
    title: typeof value.title === "string" ? value.title : "",
    description: typeof value.description === "string" ? value.description : "",
    canonicalUrl: typeof value.canonicalUrl === "string" ? value.canonicalUrl : "",
    excerpt: typeof value.excerpt === "string" ? value.excerpt : "",
    error: nullableString(value.error, `sources[${index}].error`),
    durationMs: nonNegativeInteger(value.durationMs, `sources[${index}].durationMs`),
  };
}

export function validateSourceIntakeReport(value: unknown, expectedCaseId?: string): SourceIntakeReport {
  if (!isObject(value)) throw new Error("source-report 必须是 JSON 对象");
  if (value.schemaVersion !== SOURCE_INTAKE_SCHEMA_VERSION) throw new Error(`source-report schemaVersion 必须是 ${SOURCE_INTAKE_SCHEMA_VERSION}`);
  if (!isObject(value.case)) throw new Error("source-report.case 必须是对象");
  const caseId = requiredString(value.case.id, "source-report.case.id");
  const caseTitle = requiredString(value.case.title, "source-report.case.title");
  if (expectedCaseId && caseId !== expectedCaseId) throw new Error(`source-report 的案例 ID 必须是 ${expectedCaseId}`);
  const generatedAt = requiredString(value.generatedAt, "source-report.generatedAt");
  if (!isObject(value.policy)) throw new Error("source-report.policy 必须是对象");
  if (value.policy.onlyHttps !== true || value.policy.downloadedImages !== false || value.policy.interpretation !== "none") throw new Error("source-report.policy 不符合只读来源 intake 约束");
  const policy = {
    onlyHttps: true as const,
    downloadedImages: false as const,
    maxBytes: nonNegativeInteger(value.policy.maxBytes, "source-report.policy.maxBytes"),
    timeoutMs: nonNegativeInteger(value.policy.timeoutMs, "source-report.policy.timeoutMs"),
    delayMs: nonNegativeInteger(value.policy.delayMs, "source-report.policy.delayMs"),
    interpretation: "none" as const,
  };
  if (!isObject(value.summary)) throw new Error("source-report.summary 必须是对象");
  const summary = {
    sourceCount: nonNegativeInteger(value.summary.sourceCount, "source-report.summary.sourceCount"),
    reachableCount: nonNegativeInteger(value.summary.reachableCount, "source-report.summary.reachableCount"),
    failedCount: nonNegativeInteger(value.summary.failedCount, "source-report.summary.failedCount"),
  };
  if (summary.reachableCount + summary.failedCount !== summary.sourceCount) throw new Error("source-report.summary 的数量不一致");
  if (!Array.isArray(value.sources) || value.sources.length !== summary.sourceCount) throw new Error("source-report.sources 数量与 summary.sourceCount 不一致");
  const sources = value.sources.map(validateSource);
  const reachableCount = sources.filter((source) => source.ok).length;
  if (reachableCount !== summary.reachableCount) throw new Error("source-report.summary.reachableCount 与来源状态不一致");
  return { schemaVersion: SOURCE_INTAKE_SCHEMA_VERSION, generatedAt, case: { id: caseId, title: caseTitle }, policy, summary, sources };
}

export function reportByteLength(report: SourceIntakeReport): number {
  return new TextEncoder().encode(JSON.stringify(report)).byteLength;
}
