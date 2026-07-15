export const SOURCE_INTAKE_STATUSES = ["recorded", "needs_review", "approved", "rejected"] as const;
export type SourceIntakeStatus = (typeof SOURCE_INTAKE_STATUSES)[number];

export function isSourceIntakeStatus(value: string): value is SourceIntakeStatus {
  return (SOURCE_INTAKE_STATUSES as readonly string[]).includes(value);
}

export function canTransitionSourceIntake(from: SourceIntakeStatus, to: SourceIntakeStatus) {
  if (from === to) return false;
  if (from === "recorded") return to === "needs_review";
  if (from === "needs_review") return to === "approved" || to === "rejected";
  return to === "needs_review";
}
