import { cases } from "./data";
import { DATASET_KIND, DATASET_VERSION } from "./dataset-meta";

export { DATASET_KIND, DATASET_VERSION };

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
