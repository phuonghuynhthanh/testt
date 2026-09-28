import TextareaField from "../../../../shared/input/TextareaField";
import CourseMarkdownContent from "../../../../shared/markdown-content/CourseMarkdownContent";
import MarkdownEditor from "../../../../shared/markdown/MarkdownEditor";
import type { Ref } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import type {
  CourseEditorMode,
  ICourseChapter,
  ICourseLesson,
} from "../../../../types/Course";
import {
  getChapterSelectOptions,
  getLessonSelectOptions,
} from "../../../../utils/courseUtils";
import CourseLessonSelectors from "./CourseLessonSelectors";

interface CourseContentPanelProps {
  chapters: ICourseChapter[];
  activeChapterId: string;
  activeLessonId: string;
  activeChapter: ICourseChapter | null;
  activeLesson: ICourseLesson | null;
  activeLessonLabel: string;
  isContentLesson: boolean;
  editorMode: CourseEditorMode;
  lessonJsonText: string;
  markdownValue: string;
  onChangeChapter: (chapterId: string) => void;
  onChangeLesson: (lessonId: string) => void;
  onChangeLessonJsonText: (value: string) => void;
  onChangeEditorMode: (mode: CourseEditorMode) => void;
  onChangeLessonMarkdown: (value: string) => void;
  markdownEditorRef?: Ref<MDXEditorMethods>;
}

// Render the isolated lesson content editor for JSON and markdown content.
const CourseContentPanel = ({
  chapters,
  activeChapterId,
  activeLessonId,
  activeChapter,
  activeLesson,
  activeLessonLabel,
  isContentLesson,
  editorMode,
  lessonJsonText,
  markdownValue,
  onChangeChapter,
  onChangeLesson,
  onChangeLessonJsonText,
  onChangeEditorMode,
  onChangeLessonMarkdown,
  markdownEditorRef,
}: CourseContentPanelProps) => (
  <section className="rounded-lg border border-white/15 bg-primary-black-light p-4">
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-primary-white">
          Lesson Content
        </h2>
        <p className="mt-1 text-sm text-primary-white/50">
          Edit only the selected lesson payload here. Use Curriculum when you
          need to change structure or metadata.
        </p>
      </div>
      <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-primary-white/60">
        {activeLessonLabel}
      </span>
    </div>

    <CourseLessonSelectors
      chapterSelectId="content-chapter-select"
      lessonSelectId="content-lesson-select"
      chapterValue={activeChapterId}
      lessonValue={activeLessonId}
      chapterOptions={getChapterSelectOptions(chapters)}
      lessonOptions={getLessonSelectOptions(activeChapter?.lessons || [])}
      onChangeChapter={onChangeChapter}
      onChangeLesson={onChangeLesson}
      isChapterDisabled={!chapters.length}
      isLessonDisabled={!activeChapter?.lessons?.length}
    />

    {!activeLesson && (
      <div className="mt-4 rounded-md border border-white/10 bg-primary-black-medium p-4 text-sm text-primary-white/55">
        Select a lesson from the controls above to edit its content.
      </div>
    )}

    {activeLesson && !isContentLesson && (
      <div className="mt-4">
        <TextareaField
          label="Lesson Content JSON"
          id="lesson-content-json"
          name="lesson-content-json"
          value={lessonJsonText}
          rows={18}
          handleChange={(event) => onChangeLessonJsonText(event.target.value)}
        />
      </div>
    )}

    {activeLesson && isContentLesson && (
      <div className="mt-4 grid gap-4">
        <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-primary-black-medium p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-white">
              Markdown Content
            </h3>
            <p className="mt-1 text-sm text-primary-white/50">
              Use Markdown for rich editing, Raw for source markdown, and
              Preview to verify the rendered course block.
            </p>
          </div>
          <div className="w-fit rounded-md border border-white/15 bg-primary-black p-1">
            <button
              type="button"
              className={`rounded px-3 py-1 text-sm ${
                editorMode === "markdown"
                  ? "bg-primary-green text-primary-black"
                  : "text-primary-white/80"
              }`}
              onClick={() => onChangeEditorMode("markdown")}
            >
              Markdown
            </button>
            <button
              type="button"
              className={`ml-1 rounded px-3 py-1 text-sm ${
                editorMode === "raw"
                  ? "bg-primary-green text-primary-black"
                  : "text-primary-white/80"
              }`}
              onClick={() => onChangeEditorMode("raw")}
            >
              Raw
            </button>
            <button
              type="button"
              className={`ml-1 rounded px-3 py-1 text-sm ${
                editorMode === "preview"
                  ? "bg-primary-green text-primary-black"
                  : "text-primary-white/80"
              }`}
              onClick={() => onChangeEditorMode("preview")}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Keep the markdown editor mounted across modes (toggle visibility only)
            so its scroll position and undo history survive mode switches. */}
        <div className={editorMode === "markdown" ? "grid gap-3" : "hidden"}>
            <p className="text-sm text-primary-white/55">
              Edit markdown on the left. The right pane renders the real lesson
              output, including LaTeX.
            </p>
            <div className="grid gap-4 xl:grid-cols-2">
              <MarkdownEditor
                ref={markdownEditorRef}
                value={markdownValue}
                title={activeLesson?.title || activeLessonLabel}
                onChange={onChangeLessonMarkdown}
                placeholder="Start writing lesson content using Markdown..."
                height="h-[720px]"
                className="border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              />
              <div className="h-[720px] overflow-y-auto rounded-lg border border-white/10 bg-primary-black p-5">
                <CourseMarkdownContent
                  content={markdownValue}
                  enableCopyCode
                />
              </div>
            </div>
          </div>

        {/* Raw mode is for direct markdown editing when you need full source control. */}
        {editorMode === "raw" && (
          <TextareaField
            label="Raw Markdown"
            id="lesson-markdown"
            name="lesson-markdown"
            value={markdownValue}
            rows={22}
            handleChange={(event) => onChangeLessonMarkdown(event.target.value)}
            placeholder="Edit the markdown source directly..."
          />
        )}

        {editorMode === "preview" && (
          <div>
            <p className="mb-2 text-sm text-primary-white/60">
              Supports: <code>component:list-card</code>,{" "}
              <code>component:list-dropdown</code>,{" "}
              <code>component:list-flip</code>,{" "}
              <code>component:step-list</code>,{" "}
              <code>component:callout</code>
            </p>
            <CourseMarkdownContent content={markdownValue} enableCopyCode />
          </div>
        )}
      </div>
    )}
  </section>
);

export default CourseContentPanel;
