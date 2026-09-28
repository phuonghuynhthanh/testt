import InputField from "../../../../shared/input/InputField";
import TextareaField from "../../../../shared/input/TextareaField";
import type { ICourseData } from "../../../../types/Course";

interface CourseOverviewPanelProps {
  draftCourse: ICourseData;
  toolsAndSkillsText: string;
  forWhomText: string;
  onCourseFieldChange: (field: keyof ICourseData, value: string) => void;
  onChangeToolsAndSkillsText: (value: string) => void;
  onChangeForWhomText: (value: string) => void;
}

// Render the top-level course metadata editor.
const CourseOverviewPanel = ({
  draftCourse,
  toolsAndSkillsText,
  forWhomText,
  onCourseFieldChange,
  onChangeToolsAndSkillsText,
  onChangeForWhomText,
}: CourseOverviewPanelProps) => (
  <div className="rounded-lg border border-white/15 bg-primary-black-light p-4">
    <h2 className="mb-4 text-xl font-semibold text-primary-white">
      Course Configuration
    </h2>
    <div className="grid gap-4 md:grid-cols-2">
      <InputField
        label="Course Id"
        id="course-id"
        name="course-id"
        value={draftCourse.id}
        readOnly
      />
      <InputField
        label="Publish State"
        id="published"
        name="published"
        value={String(draftCourse.published || "")}
        handleChange={(event) =>
          onCourseFieldChange("published", event.target.value)
        }
      />
      <InputField
        label="Title"
        id="title"
        name="title"
        value={draftCourse.title || ""}
        handleChange={(event) => onCourseFieldChange("title", event.target.value)}
      />
      <InputField
        label="Day Publish"
        id="day_publish"
        name="day_publish"
        value={String(draftCourse.day_publish ?? 0)}
        handleChange={(event) =>
          onCourseFieldChange("day_publish", event.target.value)
        }
      />
    </div>
    <div className="mt-4 grid gap-4">
      <TextareaField
        label="Description"
        id="description"
        name="description"
        value={draftCourse.description || ""}
        rows={4}
        handleChange={(event) =>
          onCourseFieldChange("description", event.target.value)
        }
      />
      <TextareaField
        label="Objective"
        id="objective"
        name="objective"
        value={draftCourse.objective || ""}
        rows={3}
        handleChange={(event) =>
          onCourseFieldChange("objective", event.target.value)
        }
      />
      <InputField
        label="Image URL"
        id="image"
        name="image"
        value={String(draftCourse.image || "")}
        handleChange={(event) => onCourseFieldChange("image", event.target.value)}
      />
      <TextareaField
        label="Tools & Skills (one item per line)"
        id="tools-and-skills"
        name="tools-and-skills"
        value={toolsAndSkillsText}
        rows={4}
        handleChange={(event) => onChangeToolsAndSkillsText(event.target.value)}
      />
      <TextareaField
        label="For Whom (one item per line)"
        id="for-whom"
        name="for-whom"
        value={forWhomText}
        rows={4}
        handleChange={(event) => onChangeForWhomText(event.target.value)}
      />
    </div>
  </div>
);

export default CourseOverviewPanel;
