import type { CourseStudentDetailResponse } from "../../../../data/courseData";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";
import { formatDuration } from "../utils/studentManagementUtils";

interface StudentChapterProgressSectionProps {
  student: CourseStudentDetailResponse;
}

// Render chapter-level and lesson-level learning progress cards.
const StudentChapterProgressSection = ({
  student,
}: StudentChapterProgressSectionProps) => (
  <section className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold">Chapter Progress</h2>
        <p className="mt-1 text-sm text-primary-white/50">
          Expanded lesson-level timeline for each chapter.
        </p>
      </div>
      <span className="text-sm text-primary-white/55">
        {student.progress_summary.completed_chapters}/
        {student.progress_summary.total_chapters} chapters completed
      </span>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      {student.chapters.map((chapter) => (
        <div
          key={chapter.chapter_id}
          className="rounded-lg border border-white/10 bg-primary-black-medium px-5 py-6"
        >
          <ProgressBar
            value={chapter.progress_percent}
            label={`Chapter ${chapter.chapter_order}: ${chapter.chapter_title}`}
          />
          <div className="mt-5 grid gap-3">
            {chapter.lessons.map((lesson) => (
              <div
                key={lesson.lesson_id}
                className="flex flex-col gap-3 rounded-md border border-white/10 bg-primary-black px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-primary-white">
                    {lesson.lesson_title}
                  </p>
                  <p className="mt-1 text-xs text-primary-white/45">
                    {lesson.lesson_type} |{" "}
                    {formatDuration(lesson.time_spent_seconds)}
                  </p>
                </div>
                <StatusBadge status={lesson.status} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default StudentChapterProgressSection;
