import InputField from "../../../../shared/input/InputField";
import TextareaField from "../../../../shared/input/TextareaField";
import SelectField from "../../../../shared/select/SelectField";
import type { ICourseChapter, ICourseLesson, LessonType } from "../../../../types/Course";
import {
  getChapterSelectOptions,
  getLessonSelectOptions,
  LESSON_TYPE_OPTIONS,
} from "../../../../utils/courseUtils";
import CourseLessonSelectors from "./CourseLessonSelectors";

interface CourseCurriculumPanelProps {
  chapters: ICourseChapter[];
  activeChapterId: string;
  activeLessonId: string;
  activeChapter: ICourseChapter | null;
  activeLesson: ICourseLesson | null;
  newLessonType: LessonType;
  onChangeChapter: (chapterId: string) => void;
  onChangeLesson: (lessonId: string) => void;
  onAddChapter: () => void;
  onInsertChapterBefore: () => void;
  onDeleteActiveChapter: () => void;
  onAddLesson: () => void;
  onInsertLessonBefore: () => void;
  onDeleteActiveLesson: () => void;
  onChangeNewLessonType: (type: LessonType) => void;
  onUpdateChapterField: (field: "title" | "overview", value: string) => void;
  onChangeActiveLessonType: (type: LessonType) => void;
  onUpdateActiveLessonField: (field: "title" | "colab_link", value: string) => void;
  onUpdateActiveLessonContentField: (
    field: "url" | "banner_url",
    value: string,
  ) => void;
  onUpdateActiveLessonOrder: (value: string) => void;
}

// Render the structural chapter and lesson editor for a course.
const CourseCurriculumPanel = ({
  chapters,
  activeChapterId,
  activeLessonId,
  activeChapter,
  activeLesson,
  newLessonType,
  onChangeChapter,
  onChangeLesson,
  onAddChapter,
  onInsertChapterBefore,
  onDeleteActiveChapter,
  onAddLesson,
  onInsertLessonBefore,
  onDeleteActiveLesson,
  onChangeNewLessonType,
  onUpdateChapterField,
  onChangeActiveLessonType,
  onUpdateActiveLessonField,
  onUpdateActiveLessonContentField,
  onUpdateActiveLessonOrder,
}: CourseCurriculumPanelProps) => (
  <div className="rounded-lg border border-white/15 bg-primary-black-light p-4">
    <h2 className="mb-4 text-xl font-semibold text-primary-white">
      Chapter / Lesson Editor
    </h2>

    <CourseLessonSelectors
      chapterSelectId="chapter-select"
      lessonSelectId="lesson-select"
      chapterValue={activeChapterId}
      lessonValue={activeLessonId}
      chapterOptions={getChapterSelectOptions(chapters)}
      lessonOptions={getLessonSelectOptions(activeChapter?.lessons || [])}
      onChangeChapter={onChangeChapter}
      onChangeLesson={onChangeLesson}
      isChapterDisabled={!chapters.length}
      isLessonDisabled={!activeChapter?.lessons?.length}
    />

    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-md border border-white/20 px-3 py-1 text-sm text-primary-white/90 hover:border-primary-green hover:text-primary-green"
        onClick={onAddChapter}
      >
        Add Chapter
      </button>
      <button
        type="button"
        className="rounded-md border border-white/20 px-3 py-1 text-sm text-primary-white/90 hover:border-primary-green hover:text-primary-green"
        onClick={onInsertChapterBefore}
        disabled={!chapters.length}
      >
        Insert Chapter Before
      </button>
      <button
        type="button"
        className="rounded-md border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onDeleteActiveChapter}
        disabled={!activeChapter}
      >
        Delete Chapter
      </button>
    </div>

    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-md border border-white/20 px-3 py-1 text-sm text-primary-white/90 hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onAddLesson}
        disabled={!activeChapter}
      >
        Add Lesson
      </button>
      <button
        type="button"
        className="rounded-md border border-white/20 px-3 py-1 text-sm text-primary-white/90 hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onInsertLessonBefore}
        disabled={!activeChapter}
      >
        Insert Lesson Before
      </button>
      <button
        type="button"
        className="rounded-md border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onDeleteActiveLesson}
        disabled={!activeLesson}
      >
        Delete Lesson
      </button>
    </div>

    <div className="mt-2 max-w-xs">
      <SelectField
        label="New Lesson Type"
        id="new-lesson-type"
        name="new-lesson-type"
        value={newLessonType}
        options={LESSON_TYPE_OPTIONS.map((type) => ({
          label: type,
          value: type,
        }))}
        onChange={(event) => onChangeNewLessonType(event.target.value as LessonType)}
      />
    </div>

    {activeChapter && (
      <div className="mt-4">
        <InputField
          label="Chapter Title"
          id="chapter-title"
          name="chapter-title"
          value={activeChapter.title || ""}
          handleChange={(event) =>
            onUpdateChapterField("title", event.target.value)
          }
        />
        <TextareaField
          label="Chapter Overview"
          id="chapter-overview"
          name="chapter-overview"
          value={activeChapter.overview || ""}
          rows={3}
          handleChange={(event) =>
            onUpdateChapterField("overview", event.target.value)
          }
        />
      </div>
    )}

    {activeLesson && (
      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Lesson Type"
            id="lesson-type"
            name="lesson-type"
            value={activeLesson.type}
            options={LESSON_TYPE_OPTIONS.map((type) => ({
              label: type,
              value: type,
            }))}
            onChange={(event) =>
              onChangeActiveLessonType(event.target.value as LessonType)
            }
          />
          <InputField
            label="Lesson Title"
            id="lesson-title"
            name="lesson-title"
            value={activeLesson.title || ""}
            handleChange={(event) =>
              onUpdateActiveLessonField("title", event.target.value)
            }
          />
          <InputField
            label="Colab Link"
            id="lesson-colab"
            name="lesson-colab"
            value={String(activeLesson.colab_link || "")}
            handleChange={(event) =>
              onUpdateActiveLessonField("colab_link", event.target.value)
            }
          />
          <div className="flex flex-col">
            <label
              htmlFor="lesson-order"
              className="font-medium text-primary-white"
            >
              Lesson Order
            </label>
            <input
              id="lesson-order"
              name="lesson-order"
              type="number"
              min={1}
              step={1}
              value={activeLesson.order}
              onChange={(event) =>
                onUpdateActiveLessonOrder(event.target.value)
              }
              className="mt-1 rounded-md border border-gray-300 bg-primary-black-light p-2 text-primary-white first-line: focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Show video-specific fields when the selected lesson is a VIDEO lesson. */}
        {activeLesson.type === "VIDEO" && (
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Video URL"
              id="lesson-video-url"
              name="lesson-video-url"
              value={String(
                (activeLesson.content as Record<string, unknown> | null)?.url ??
                  "",
              )}
              handleChange={(event) =>
                onUpdateActiveLessonContentField("url", event.target.value)
              }
            />
            <InputField
              label="Banner URL"
              id="lesson-video-banner"
              name="lesson-video-banner"
              value={String(activeLesson.banner_url ?? "")}
              handleChange={(event) =>
                onUpdateActiveLessonContentField(
                  "banner_url",
                  event.target.value,
                )
              }
            />
          </div>
        )}

        <div className="rounded-md border border-primary-green/20 bg-primary-green/5 px-3 py-2 text-sm text-primary-white/65">
          Content editing is now separated into the Lesson Content tab so
          curriculum changes stay focused. Changing the lesson order here will
          reorder lessons within the chapter and update their `order` values.
          {activeLesson.type === "VIDEO" &&
            " Video lessons also support a dedicated banner URL for the learner preview."}
        </div>
      </div>
    )}
  </div>
);

export default CourseCurriculumPanel;
