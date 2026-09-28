import type { CourseUser } from "../data/courseData";
import type {
  ICourseTestSummaryLesson,
  ICourseTestSummaryStudent,
} from "../types/CourseTestSummary";
import type { ClassFilterState } from "../features/course/student-management/test-summary/testSummaryTypes";

// Format ISO timestamps into a concise admin-friendly display.
export const formatDateTime = (value?: string | null) => {
  if (!value) return "--";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

// Convert a backend registration date into a normalized timestamp.
export const parseBackendDate = (value?: string | null) => {
  if (!value) return null;

  const normalizedValue = value.trim().replace(" ", "T");
  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.getTime();
};

// Convert a date input value into an inclusive start boundary.
export const getStartOfDayValue = (value: string) => {
  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
};

// Convert a date input value into an inclusive end boundary.
export const getEndOfDayValue = (value: string) => {
  const parsedDate = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
};

// Return a stable identity for comparing users across APIs.
export const getUserMatchKey = (studentId?: string | null, email?: string | null) =>
  (email || studentId || "").trim().toLowerCase();

// Normalize the lesson title because the API may return either title field.
export const getLessonTitle = (lesson: ICourseTestSummaryLesson) =>
  lesson.lesson_title || lesson.title || lesson.lesson_id;

// Normalize a student display label for the summary tables.
export const getStudentLabel = (student: ICourseTestSummaryStudent) =>
  student.full_name || student.email || student.student_id;

// Resolve one learner label for the not-submitted class table.
export const getLearnerLabel = (user: CourseUser) =>
  user.full_name || user.display_name || user.email || user.id;

// Check whether one runtime string represents a completed backend job.
export const hasCompletedRunTime = (value?: string) =>
  Boolean(value && value.trim().toUpperCase() !== "PENDING");

// Format a score value for the submitted students table.
export const formatScoreValue = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
};

// Filter learners into a class range using package and registration date.
export const filterClassLearners = (
  learners: CourseUser[],
  filters: ClassFilterState,
) => {
  const allowedPackages = new Set(["GOLD", "PLATINUM"]);
  const packageFiltered = learners.filter((user) => {
    if (!user.subscription_package) return false;
    if (!allowedPackages.has(user.subscription_package)) return false;

    if (
      filters.package !== "ALL" &&
      user.subscription_package !== filters.package
    ) {
      return false;
    }

    return true;
  });

  const startBoundary = filters.registrationFrom
    ? getStartOfDayValue(filters.registrationFrom)
    : null;
  const endBoundary = filters.registrationTo
    ? getEndOfDayValue(filters.registrationTo)
    : null;

  return packageFiltered.filter((user) => {
    const registrationTime = parseBackendDate(user.registration_date);
    if (registrationTime === null) return false;
    if (startBoundary !== null && registrationTime < startBoundary) return false;
    if (endBoundary !== null && registrationTime > endBoundary) return false;
    return true;
  });
};

// Remove learners that already appear in scheduled or submitted lists.
export const getNotSubmittedLearners = (
  classLearners: CourseUser[],
  scheduledStudents: ICourseTestSummaryStudent[],
  submittedStudents: ICourseTestSummaryStudent[],
) => {
  const scheduledKeys = new Set(
    scheduledStudents.map((student) =>
      getUserMatchKey(student.student_id, student.email),
    ),
  );
  const submittedKeys = new Set(
    submittedStudents.map((student) =>
      getUserMatchKey(student.student_id, student.email),
    ),
  );

  return classLearners.filter((learner) => {
    const learnerKey = getUserMatchKey(learner.id, learner.email);
    return !scheduledKeys.has(learnerKey) && !submittedKeys.has(learnerKey);
  });
};
