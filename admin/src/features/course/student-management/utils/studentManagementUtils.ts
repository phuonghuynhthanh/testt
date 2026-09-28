import type { CourseTrack, TestResult } from "../../../../data/courseData";

// Format ISO dates into a concise admin-friendly display.
export const formatDateTime = (value?: string) => {
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

// Format seconds into a compact hour/minute duration.
export const formatDuration = (seconds?: number) => {
  if (!seconds) return "--";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

// Prefer submitted state when the backend includes a submission timestamp.
export const getTestDisplayStatus = (
  status?: string | null,
  submittedAt?: string | null,
) => (submittedAt ? "SUBMITED" : status);

// Extract unique lesson ids from test results for track fetching.
export const getAssignmentLessonIds = (testResults: TestResult[] = []) =>
  Array.from(
    new Set(testResults.map((test) => test.lesson_id).filter(Boolean)),
  );

// Find the latest recorded time for one or more track actions.
export const getLatestTrackTime = (
  tracks: CourseTrack[] = [],
  actions: string[],
) => {
  const matchingTracks = tracks
    .filter((track) => actions.includes(track.action))
    .sort(
      (firstTrack, secondTrack) =>
        new Date(secondTrack.time).getTime() -
        new Date(firstTrack.time).getTime(),
    );

  return matchingTracks[0]?.time;
};

// Group track records by lesson ID for quick table lookups.
export const groupTracksByLessonId = (tracks: CourseTrack[]) =>
  tracks.reduce<Record<string, CourseTrack[]>>((groupedTracks, track) => {
    groupedTracks[track.lesson_id] = [
      ...(groupedTracks[track.lesson_id] || []),
      track,
    ];

    return groupedTracks;
  }, {});
