import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  getCourseStudentDetail,
  getCourseTracks,
} from "../../../services/course/handleCourse";
import CourseAdminAuthGate from "../components/CourseAdminAuthGate";
import StudentChapterProgressSection from "./components/StudentChapterProgressSection";
import StudentDetailHeader from "./components/StudentDetailHeader";
import StudentOverviewSection from "./components/StudentOverviewSection";
import StudentTestResultsSection from "./components/StudentTestResultsSection";
import {
  getAssignmentLessonIds,
  groupTracksByLessonId,
} from "./utils/studentManagementUtils";

interface StudentManagementDetailContentProps {
  courseToken: string;
}

// Render the dedicated student detail workspace.
const StudentManagementDetailContent = ({
  courseToken,
}: StudentManagementDetailContentProps) => {
  const navigate = useNavigate();
  const { studentId = "" } = useParams();

  const studentQuery = useQuery({
    queryKey: ["course-student-detail", courseToken, studentId],
    queryFn: () => getCourseStudentDetail(studentId, courseToken),
    enabled: !!studentId,
  });

  const student = studentQuery.data || null;
  const assignmentLessonIds = useMemo(
    () => getAssignmentLessonIds(student?.test_results || []),
    [student?.test_results],
  );

  const tracksQuery = useQuery({
    queryKey: ["course-assignment-tracks", courseToken, assignmentLessonIds],
    queryFn: async () => {
      const response = await getCourseTracks(
        { lesson_ids: assignmentLessonIds, limit: 200 },
        courseToken,
      );

      return groupTracksByLessonId(response.data);
    },
    enabled: assignmentLessonIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isRefreshing = studentQuery.isFetching || tracksQuery.isFetching;
  const isTracksLoading = tracksQuery.isLoading || tracksQuery.isFetching;

  // Refresh student detail and assignment tracks together.
  const handleRefreshDetail = () => {
    studentQuery.refetch();
    tracksQuery.refetch();
  };

  // Return to the student management list.
  const handleBackToStudents = () => {
    navigate("/course/student-management");
  };

  return (
    <div className="flex flex-col gap-6 pb-10 text-primary-white">
      <StudentDetailHeader
        studentName={student?.full_name}
        isRefreshing={isRefreshing}
        onBack={handleBackToStudents}
        onRefresh={handleRefreshDetail}
      />

      {studentQuery.isLoading && (
        <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
          Loading student detail...
        </div>
      )}

      {!studentQuery.isLoading && !student && (
        <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
          Student detail is not available.
        </div>
      )}

      {student && (
        <>
          <StudentOverviewSection student={student} />
          <StudentChapterProgressSection student={student} />
          <StudentTestResultsSection
            student={student}
            tracksByLessonId={tracksQuery.data}
            isTracksLoading={isTracksLoading}
          />
        </>
      )}
    </div>
  );
};

// Wrap student detail with the dedicated course-admin auth popup.
const StudentManagementDetail = () => (
  <CourseAdminAuthGate>
    {(courseToken) => (
      <StudentManagementDetailContent courseToken={courseToken} />
    )}
  </CourseAdminAuthGate>
);

export default StudentManagementDetail;
