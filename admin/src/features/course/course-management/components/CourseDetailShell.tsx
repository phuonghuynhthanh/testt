import { IoIosSave } from "react-icons/io";
import { FiEdit3, FiHelpCircle, FiLayers, FiSettings } from "react-icons/fi";

import type { CourseDetailPanel } from "../../../../types/Course";

interface CourseDetailShellProps {
  title: string;
  detailPanel: CourseDetailPanel;
  chapterCount: number;
  lessonCount: number;
  assignmentCount: number;
  quizCount: number;
  isLoading: boolean;
  hasDraftCourse: boolean;
  isSaving: boolean;
  onChangePanel: (panel: CourseDetailPanel) => void;
  onSaveCourse: () => void;
}

const DETAIL_PANELS: Array<{
  id: CourseDetailPanel;
  label: string;
  icon: JSX.Element;
}> = [
  { id: "overview", label: "Overview", icon: <FiSettings /> },
  { id: "curriculum", label: "Curriculum", icon: <FiLayers /> },
  { id: "content", label: "Lesson Content", icon: <FiEdit3 /> },
  { id: "quiz", label: "Quiz", icon: <FiHelpCircle /> },
];

// Render the shared detail-mode summary, tabs, and save action.
const CourseDetailShell = ({
  title,
  detailPanel,
  chapterCount,
  lessonCount,
  assignmentCount,
  quizCount,
  isLoading,
  hasDraftCourse,
  isSaving,
  onChangePanel,
  onSaveCourse,
}: CourseDetailShellProps) => (
  <div className="flex flex-col gap-5">
    <div className="rounded-lg border border-white/15 bg-primary-black-light p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-primary-white/50">Editing</p>
          <h2 className="mt-1 truncate text-xl font-semibold">{title}</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs text-primary-white/55 xl:w-[480px]">
          <div className="rounded-md border border-white/10 bg-primary-black-medium px-3 py-2">
            <p className="text-lg font-semibold text-primary-white">
              {chapterCount}
            </p>
            <p>Chapters</p>
          </div>
          <div className="rounded-md border border-white/10 bg-primary-black-medium px-3 py-2">
            <p className="text-lg font-semibold text-primary-white">
              {lessonCount}
            </p>
            <p>Lessons</p>
          </div>
          <div className="rounded-md border border-white/10 bg-primary-black-medium px-3 py-2">
            <p className="text-lg font-semibold text-primary-white">
              {assignmentCount}
            </p>
            <p>Tests</p>
          </div>
          <div className="rounded-md border border-white/10 bg-primary-black-medium px-3 py-2">
            <p className="text-lg font-semibold text-primary-white">
              {quizCount}
            </p>
            <p>Quiz lessons</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {DETAIL_PANELS.map((panel) => (
            <button
              key={panel.id}
              type="button"
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                detailPanel === panel.id
                  ? "border-primary-green bg-primary-green text-primary-black"
                  : "border-white/15 bg-primary-black-medium text-primary-white/75 hover:border-primary-green hover:text-primary-green"
              }`}
              onClick={() => onChangePanel(panel.id)}
            >
              {panel.icon}
              {panel.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-primary-green px-4 py-2 font-semibold text-primary-black hover:bg-primary-green-dark disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSaveCourse}
          disabled={!hasDraftCourse || isSaving}
        >
          <span>{isSaving ? "Saving..." : "Save Course"}</span>
          <IoIosSave className="text-lg" />
        </button>
      </div>
    </div>

    {isLoading && <p className="text-primary-white/70">Loading course...</p>}
    {!isLoading && !hasDraftCourse && (
      <p className="text-primary-white/70">No course selected.</p>
    )}
  </div>
);

export default CourseDetailShell;
