import { cases } from "./data";

export const DATASET_VERSION = "2026-07-15.1";
export const DATASET_KIND = "curated-seed";

export function getDatasetManifest() {
  return {
    name: "archlens-case-library",
    version: DATASET_VERSION,
    kind: DATASET_KIND,
    caseCount: cases.length,
    sourceOfTruth: "lib/data.ts",
    provenance: "公开来源 + ArchLens 编辑性归纳",
  };
}
