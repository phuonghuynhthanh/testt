import type { CourseTrack } from "../../../../data/courseData";
import {
  formatDateTime,
  getLatestTrackTime,
} from "../utils/studentManagementUtils";

interface AssignmentTrackTimelineProps {
  tracks?: CourseTrack[];
  isLoading: boolean;
}

// Render the saved assignment track timestamps for one lesson.
const AssignmentTrackTimeline = ({
  tracks,
  isLoading,
}: AssignmentTrackTimelineProps) => {
  if (isLoading) {
    return <span className="text-xs text-primary-white/40">Loading...</span>;
  }

  const scheduledAt = getLatestTrackTime(tracks, ["SCHEDULED"]);
  const startedAt = getLatestTrackTime(tracks, ["STARTED"]);
  const submittedAt = getLatestTrackTime(tracks, ["SUBMIT", "SUBMITTED"]);

  return (
    <div className="grid min-w-[190px] gap-1 text-xs text-primary-white/60">
      <span>Scheduled: {formatDateTime(scheduledAt)}</span>
      <span>Started: {formatDateTime(startedAt)}</span>
      <span>Submit: {formatDateTime(submittedAt)}</span>
    </div>
  );
};

export default AssignmentTrackTimeline;
