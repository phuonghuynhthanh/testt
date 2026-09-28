export type LessonTab = "scheduled" | "submitted" | "not_submitted";

export type LearnerPackageFilter = "ALL" | "GOLD" | "PLATINUM";

export interface ClassFilterState {
  package: LearnerPackageFilter;
  registrationFrom: string;
  registrationTo: string;
}
