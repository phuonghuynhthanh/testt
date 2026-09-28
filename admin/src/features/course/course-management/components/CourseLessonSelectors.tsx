import SelectField from "../../../../shared/select/SelectField";
import type { CourseSelectOption } from "../../../../types/Course";

interface CourseLessonSelectorsProps {
  chapterSelectId: string;
  lessonSelectId: string;
  chapterValue: string;
  lessonValue: string;
  chapterOptions: CourseSelectOption[];
  lessonOptions: CourseSelectOption[];
  onChangeChapter: (chapterId: string) => void;
  onChangeLesson: (lessonId: string) => void;
  isChapterDisabled: boolean;
  isLessonDisabled: boolean;
}

// Render the shared chapter and lesson selectors used across panels.
const CourseLessonSelectors = ({
  chapterSelectId,
  lessonSelectId,
  chapterValue,
  lessonValue,
  chapterOptions,
  lessonOptions,
  onChangeChapter,
  onChangeLesson,
  isChapterDisabled,
  isLessonDisabled,
}: CourseLessonSelectorsProps) => (
  <div className="grid gap-4 md:grid-cols-2">
    <SelectField
      label="Chapter"
      id={chapterSelectId}
      name={chapterSelectId}
      value={chapterValue}
      options={chapterOptions}
      onChange={(event) => onChangeChapter(event.target.value)}
      disabled={isChapterDisabled}
    />
    <SelectField
      label="Lesson"
      id={lessonSelectId}
      name={lessonSelectId}
      value={lessonValue}
      options={lessonOptions}
      onChange={(event) => onChangeLesson(event.target.value)}
      disabled={isLessonDisabled}
    />
  </div>
);

export default CourseLessonSelectors;
