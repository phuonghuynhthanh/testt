import { FiBookOpen } from "react-icons/fi";

import type { ICourseData } from "../../../../types/Course";
import {
  countCourseAssignments,
  countCourseLessons,
} from "../../../../utils/courseUtils";

interface CourseListPanelProps {
  courseList: ICourseData[];
  isLoading: boolean;
  onOpenCourseDetail: (courseId: string) => void;
}

// Render the course picker cards before the admin enters detail mode.
const CourseListPanel = ({
  courseList,
  isLoading,
  onOpenCourseDetail,
}: CourseListPanelProps) => (
  <section className="rounded-lg border border-white/15 bg-primary-black-light p-4">
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold">Courses</h2>
        <p className="mt-1 max-w-xl text-sm text-primary-white/50">
          Start from the course list, then open a focused workspace for
          settings, curriculum, and lesson content.
        </p>
      </div>
      <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-primary-white/60">
        {courseList.length} records
      </span>
    </div>

    {isLoading && <p className="text-primary-white/70">Loading courses...</p>}
    {!isLoading && courseList.length === 0 && (
      <p className="text-primary-white/70">No course available.</p>
    )}

    {!isLoading && courseList.length > 0 && (
      <div className="grid gap-4 xl:grid-cols-2">
        {courseList.map((course) => (
          <button
            key={course.id}
            type="button"
            className="group rounded-lg border border-white/10 bg-primary-black-medium p-4 text-left transition hover:-translate-y-0.5 hover:border-primary-green/60 hover:bg-primary-black-light"
            onClick={() => onOpenCourseDetail(course.id)}
          >
            <div className="flex gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-primary-black">
                {course.image ? (
                  <img
                    src={String(course.image)}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiBookOpen className="text-xl text-primary-white/35" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary-green/30 bg-primary-green/10 px-2 py-0.5 text-xs font-semibold text-primary-green">
                    {course.published}
                  </span>
                  <span className="text-xs text-primary-white/45">
                    {course.chapters?.length || 0} chapters
                  </span>
                  <span className="text-xs text-primary-white/45">
                    {countCourseLessons(course)} lessons
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-2 font-semibold text-primary-white group-hover:text-primary-green">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-primary-white/50">
                  {course.description}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs text-primary-white/45">
                  <span>{course.chapters?.length || 0} chapters</span>
                  <span>{countCourseLessons(course)} lessons</span>
                  <span>{countCourseAssignments(course)} tests</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-primary-white/45">
                    Open detail editor
                  </span>
                  <span className="text-sm font-semibold text-primary-green">
                    Manage
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    )}
  </section>
);

export default CourseListPanel;
