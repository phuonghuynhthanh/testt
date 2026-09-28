import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import type { MDXEditorMethods } from "@mdxeditor/editor";

import type {
  CourseDetailPanel,
  CourseEditorMode,
  CourseViewMode,
  ICourseData,
  ICourseLesson,
  LessonType,
} from "../types/Course";
import {
  getCourseDetail,
  getCourseList,
  updateCourse,
} from "../services/course/handleCourse";
import {
  getCourseQuiz,
  updateCourseQuiz,
} from "../services/course/handleQuiz";
import {
  buildCourseUpdatePayload,
  cloneCourse,
  countCourseAssignments,
  countCourseLessons,
  createDefaultLessonContentByType,
  createEmptyChapter,
  createEmptyLesson,
  getAssignmentLessonOptions,
  lessonContentToMarkdown,
  multilineToArray,
  normalizeStringArray,
  reindexChapters,
  reindexLessons,
  reorderLessonByOrder,
  updateLessonMarkdown,
} from "../utils/courseUtils";
import {
  cloneCourseQuizLessons,
  createEmptyQuizLesson,
  createEmptyQuizOption,
  createEmptyQuizQuestion,
  sortQuizLessonsByCourseOrder,
} from "../utils/courseQuizUtils";
import type {
  ICourseQuizPayload,
  IQuizLesson,
} from "../types/CourseQuiz";

// Encapsulate course-management state, queries, and editing actions.
export const useCourseManagement = (courseToken: string) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<CourseViewMode>("list");
  const [detailPanel, setDetailPanel] =
    useState<CourseDetailPanel>("overview");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [draftCourse, setDraftCourse] = useState<ICourseData | null>(null);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [activeLessonId, setActiveLessonId] = useState("");
  const [editorMode, setEditorMode] = useState<CourseEditorMode>("markdown");
  const [toolsAndSkillsText, setToolsAndSkillsText] = useState("");
  const [forWhomText, setForWhomText] = useState("");
  const [lessonJsonText, setLessonJsonText] = useState("");
  const [newLessonType, setNewLessonType] = useState<LessonType>("CONTENT");
  const [draftQuizLessons, setDraftQuizLessons] = useState<IQuizLesson[]>([]);
  const [activeQuizLessonId, setActiveQuizLessonId] = useState("");
  const lessonMarkdownEditorRef = useRef<MDXEditorMethods>(null);
  // Track an ASSIGNMENT lesson auto-created for a quiz that is not yet persisted.
  const pendingAssignmentRef = useRef(false);
  const normalizedCourseToken = courseToken.trim();

  const { data: courseList = [], isLoading: isCourseListLoading } = useQuery({
    queryKey: ["admin-courses", normalizedCourseToken],
    queryFn: () => getCourseList(normalizedCourseToken),
    refetchOnWindowFocus: false,
  });

  const {
    data: selectedCourse,
    isLoading: isCourseDetailLoading,
    refetch: refetchCourse,
  } = useQuery({
    queryKey: ["admin-course-detail", selectedCourseId, normalizedCourseToken],
    queryFn: () => getCourseDetail(selectedCourseId, normalizedCourseToken),
    enabled: viewMode === "detail" && !!selectedCourseId,
    refetchOnWindowFocus: false,
  });

  const { data: selectedCourseQuiz, isLoading: isCourseQuizLoading } = useQuery({
      queryKey: [
        "admin-course-quiz",
        selectedCourseId,
        normalizedCourseToken,
      ],
      queryFn: () => getCourseQuiz(normalizedCourseToken),
      enabled:
        viewMode === "detail" &&
        detailPanel === "quiz" &&
        !!selectedCourseId,
      refetchOnWindowFocus: false,
    });

  const updateMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildCourseUpdatePayload>) =>
      updateCourse(payload, normalizedCourseToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-courses", normalizedCourseToken],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "admin-course-detail",
          selectedCourseId,
          normalizedCourseToken,
        ],
      });
      // The draft assignment is now persisted in the course tree.
      pendingAssignmentRef.current = false;
      toast.success("Course updated successfully.");
    },
    onError: () => {
      toast.error("Unable to update course.");
    },
  });

  const quizUpdateMutation = useMutation({
    mutationFn: (payload: ICourseQuizPayload) =>
      updateCourseQuiz(payload, normalizedCourseToken),
    onSuccess: (_, payload) => {
      setDraftQuizLessons(cloneCourseQuizLessons(payload.data));
      queryClient.invalidateQueries({
        queryKey: [
          "admin-course-quiz",
          selectedCourseId,
          normalizedCourseToken,
        ],
      });
      toast.success("Quiz updated successfully.");
    },
    onError: () => {
      toast.error("Unable to update quiz.");
    },
  });

  // Return to list mode if the selected course disappears from the source list.
  useEffect(() => {
    if (!courseList.length || !selectedCourseId) return;

    const hasSelectedCourse = courseList.some(
      (course) => course.id === selectedCourseId,
    );

    if (!hasSelectedCourse) {
      setSelectedCourseId("");
      setDraftCourse(null);
      setViewMode("list");
    }
  }, [courseList, selectedCourseId]);

  // Initialize a fresh editable draft whenever the selected course changes.
  useEffect(() => {
    if (!selectedCourse) return;

    const cloned = cloneCourse(selectedCourse);
    pendingAssignmentRef.current = false;
    setDraftCourse(cloned);
    setToolsAndSkillsText(
      normalizeStringArray(cloned.tools_and_skills).join("\n"),
    );
    setForWhomText(normalizeStringArray(cloned.for_whom).join("\n"));

    const firstChapter = cloned.chapters?.[0];
    setActiveChapterId(firstChapter?.id || "");
    setActiveLessonId(firstChapter?.lessons?.[0]?.id || "");
  }, [selectedCourse]);

  // Initialize the quiz draft when the quiz payload is loaded.
  useEffect(() => {
    if (!selectedCourseQuiz) return;

    // Keep the quiz list aligned with the lesson order from the course tree.
    const sortedQuiz = sortQuizLessonsByCourseOrder(
      selectedCourse ?? null,
      cloneCourseQuizLessons(selectedCourseQuiz),
    );

    setDraftQuizLessons(sortedQuiz);
    setActiveQuizLessonId((current) =>
      sortedQuiz.some((quiz) => quiz.lesson_id === current)
        ? current
        : sortedQuiz[0]?.lesson_id || "",
    );
  }, [selectedCourse, selectedCourseQuiz]);

  // Resolve the currently selected chapter from the local draft tree.
  const activeChapter = useMemo(() => {
    if (!draftCourse) return null;

    return (
      draftCourse.chapters.find((chapter) => chapter.id === activeChapterId) ||
      null
    );
  }, [activeChapterId, draftCourse]);

  // Resolve the currently selected lesson from the active chapter.
  const activeLesson = useMemo(() => {
    if (!activeChapter) return null;

    return (
      activeChapter.lessons.find((lesson) => lesson.id === activeLessonId) ||
      null
    );
  }, [activeChapter, activeLessonId]);

  // Mirror non-markdown lesson content into raw JSON text for the textarea.
  useEffect(() => {
    if (!activeLesson || activeLesson.type === "CONTENT") {
      setLessonJsonText("");
      return;
    }

    setLessonJsonText(JSON.stringify(activeLesson.content ?? {}, null, 2));
    // Depend on the lesson identity, not the derived object reference, so typing
    // valid JSON does not re-stringify and clobber the in-progress textarea text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLessonId, activeLesson?.type]);

  // Update a top-level field on the draft course object.
  const handleCourseFieldChange = (field: keyof ICourseData, value: string) => {
    setDraftCourse((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: field === "day_publish" ? Number(value) : value,
      };
    });
  };

  // Update the chapter array with one shared state helper.
  const updateDraftChapters = (
    updater: (chapters: ICourseData["chapters"]) => ICourseData["chapters"],
  ) => {
    setDraftCourse((current) => {
      if (!current) return current;

      return {
        ...current,
        chapters: updater(current.chapters || []),
      };
    });
  };

  // Change the active chapter and reset lesson selection within it.
  const handleChangeChapter = (nextChapterId: string) => {
    setActiveChapterId(nextChapterId);
    const chapter = draftCourse?.chapters.find(
      (item) => item.id === nextChapterId,
    );
    setActiveLessonId(chapter?.lessons?.[0]?.id || "");
  };

  // Update a field on the currently selected chapter.
  const handleUpdateActiveChapterField = (
    field: "title" | "overview",
    value: string,
  ) => {
    if (!activeChapter) return;

    updateDraftChapters((chapters) =>
      chapters.map((chapter) =>
        chapter.id === activeChapter.id
          ? { ...chapter, [field]: value }
          : chapter,
      ),
    );
  };

  // Append a chapter to the end of the draft course.
  const handleAddChapter = () => {
    setDraftCourse((current) => {
      if (!current) return current;

      const nextChapter = createEmptyChapter((current.chapters?.length || 0) + 1);
      const nextChapters = reindexChapters([
        ...(current.chapters || []),
        nextChapter,
      ]);
      setActiveChapterId(nextChapter.id);
      setActiveLessonId("");
      return { ...current, chapters: nextChapters };
    });
  };

  // Insert a chapter before the currently selected one.
  const handleInsertChapterBefore = () => {
    setDraftCourse((current) => {
      if (!current) return current;

      const chapters = current.chapters || [];
      const activeIndex = chapters.findIndex(
        (chapter) => chapter.id === activeChapterId,
      );
      const insertIndex = activeIndex >= 0 ? activeIndex : chapters.length;
      const nextChapter = createEmptyChapter(insertIndex + 1);
      const nextChapters = reindexChapters([
        ...chapters.slice(0, insertIndex),
        nextChapter,
        ...chapters.slice(insertIndex),
      ]);

      setActiveChapterId(nextChapter.id);
      setActiveLessonId("");
      return { ...current, chapters: nextChapters };
    });
  };

  // Delete the selected chapter and fall back to the nearest remaining item.
  const handleDeleteActiveChapter = () => {
    setDraftCourse((current) => {
      if (!current || !activeChapterId) return current;

      const chapters = current.chapters || [];
      const activeIndex = chapters.findIndex(
        (chapter) => chapter.id === activeChapterId,
      );
      if (activeIndex < 0) return current;

      const nextChapters = reindexChapters(
        chapters.filter((chapter) => chapter.id !== activeChapterId),
      );
      const fallbackChapter =
        nextChapters[Math.min(activeIndex, nextChapters.length - 1)];

      setActiveChapterId(fallbackChapter?.id || "");
      setActiveLessonId(fallbackChapter?.lessons?.[0]?.id || "");
      return { ...current, chapters: nextChapters };
    });
  };

  // Update the selected lesson by applying a transformer to it.
  const handleUpdateLesson = (
    updater: (lesson: ICourseLesson) => ICourseLesson,
  ) => {
    if (!activeChapter || !activeLesson) return;

    updateDraftChapters((chapters) =>
      chapters.map((chapter) => {
        if (chapter.id !== activeChapter.id) return chapter;

        return {
          ...chapter,
          lessons: chapter.lessons.map((lesson) =>
            lesson.id === activeLesson.id ? updater(lesson) : lesson,
          ),
        };
      }),
    );
  };

  // Update a simple editable field on the selected lesson.
  const handleUpdateActiveLessonField = (
    field: "title" | "colab_link",
    value: string,
  ) => {
    handleUpdateLesson((lesson) => ({
      ...lesson,
      [field]: value,
    }));
  };

  // Update a field inside the selected lesson content object.
  const handleUpdateActiveLessonContentField = (
    field: "url" | "banner_url",
    value: string,
  ) => {
    if (!activeLesson || activeLesson.type !== "VIDEO") return;

    handleUpdateLesson((lesson) => {
      if (field === "banner_url") {
        return {
          ...lesson,
          banner_url: value,
        };
      }

      const nextContent =
        lesson.content && typeof lesson.content === "object"
          ? { ...(lesson.content as Record<string, unknown>) }
          : {};

      return {
        ...lesson,
        content: {
          ...nextContent,
          url: value,
        },
      };
    });
  };

  // Move the selected lesson to a new order inside the active chapter.
  const handleUpdateActiveLessonOrder = (value: string) => {
    if (!activeChapter || !activeLesson) return;

    const nextOrder = Number(value);
    if (!Number.isFinite(nextOrder)) return;

    updateDraftChapters((chapters) =>
      chapters.map((chapter) => {
        if (chapter.id !== activeChapter.id) return chapter;

        return {
          ...chapter,
          lessons: reorderLessonByOrder(
            chapter.lessons || [],
            activeLesson.id,
            nextOrder,
          ),
        };
      }),
    );
  };

  // Swap the selected lesson type and reset its content shape.
  const handleChangeActiveLessonType = (nextType: LessonType) => {
    handleUpdateLesson((lesson) => ({
      ...lesson,
      type: nextType,
      banner_url: nextType === "VIDEO" ? lesson.banner_url ?? null : undefined,
      content: createDefaultLessonContentByType(nextType),
    }));
  };

  // Append a lesson to the currently selected chapter.
  const handleAddLesson = () => {
    setDraftCourse((current) => {
      if (!current || !activeChapter) return current;

      const nextLesson = createEmptyLesson(
        (activeChapter.lessons?.length || 0) + 1,
        newLessonType,
      );
      const nextChapters = current.chapters.map((chapter) => {
        if (chapter.id !== activeChapter.id) return chapter;

        return {
          ...chapter,
          lessons: reindexLessons([...(chapter.lessons || []), nextLesson]),
        };
      });

      setActiveLessonId(nextLesson.id);
      return { ...current, chapters: nextChapters };
    });
  };

  // Insert a lesson before the currently selected lesson.
  const handleInsertLessonBefore = () => {
    setDraftCourse((current) => {
      if (!current || !activeChapter) return current;

      const activeIndex = activeChapter.lessons.findIndex(
        (lesson) => lesson.id === activeLessonId,
      );
      const insertIndex =
        activeIndex >= 0 ? activeIndex : activeChapter.lessons.length;
      const nextLesson = createEmptyLesson(insertIndex + 1, newLessonType);
      const nextChapters = current.chapters.map((chapter) => {
        if (chapter.id !== activeChapter.id) return chapter;

        return {
          ...chapter,
          lessons: reindexLessons([
            ...chapter.lessons.slice(0, insertIndex),
            nextLesson,
            ...chapter.lessons.slice(insertIndex),
          ]),
        };
      });

      setActiveLessonId(nextLesson.id);
      return { ...current, chapters: nextChapters };
    });
  };

  // Delete the selected lesson and move focus to the nearest fallback lesson.
  const handleDeleteActiveLesson = () => {
    setDraftCourse((current) => {
      if (!current || !activeChapter || !activeLessonId) return current;

      const activeIndex = activeChapter.lessons.findIndex(
        (lesson) => lesson.id === activeLessonId,
      );
      if (activeIndex < 0) return current;

      // Warn when removing an ASSIGNMENT that a quiz is still linked to.
      const removedLesson = activeChapter.lessons[activeIndex];
      if (
        removedLesson?.type === "ASSIGNMENT" &&
        draftQuizLessons.some((quiz) => quiz.lesson_id === removedLesson.id)
      ) {
        toast.warning(
          "This ASSIGNMENT lesson is linked to a quiz. The quiz will lose its link until you reassign it.",
        );
      }

      let nextSelectedLessonId = "";
      const nextChapters = current.chapters.map((chapter) => {
        if (chapter.id !== activeChapter.id) return chapter;

        const nextLessons = reindexLessons(
          chapter.lessons.filter((lesson) => lesson.id !== activeLessonId),
        );
        const fallbackLesson =
          nextLessons[Math.min(activeIndex, nextLessons.length - 1)];
        nextSelectedLessonId = fallbackLesson?.id || "";

        return {
          ...chapter,
          lessons: nextLessons,
        };
      });

      setActiveLessonId(nextSelectedLessonId);
      return { ...current, chapters: nextChapters };
    });
  };

  // Open one course in detail mode from the overview list.
  const handleOpenCourseDetail = (courseId: string) => {
    setSelectedCourseId(courseId);
    setDetailPanel("overview");
    setViewMode("detail");
  };

  // Return to list mode while leaving cached queries intact.
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCourseId("");
    setDraftCourse(null);
    setActiveChapterId("");
    setActiveLessonId("");
    setDraftQuizLessons([]);
    setActiveQuizLessonId("");
  };

  // Parse JSON lesson content while allowing temporary invalid textarea input.
  const handleChangeLessonJsonText = (value: string) => {
    setLessonJsonText(value);

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      handleUpdateLesson((lesson) => ({
        ...lesson,
        content: parsed,
      }));
    } catch {
      // Preserve the typing flow until the JSON becomes valid again.
    }
  };

  // Persist markdown changes back into the selected content lesson.
  const handleChangeLessonMarkdown = (value: string) => {
    handleUpdateLesson((lesson) => updateLessonMarkdown(lesson, value));
  };

  // Replace the active quiz lesson inside the draft list.
  const updateActiveQuizLesson = (
    updater: (lesson: IQuizLesson) => IQuizLesson,
  ) => {
    setDraftQuizLessons((current) =>
      current.map((lesson) =>
        lesson.lesson_id === activeQuizLessonId ? updater(lesson) : lesson,
      ),
    );
  };

  // Change the selected quiz lesson in the quiz editor.
  const handleChangeQuizLesson = (lessonId: string) => {
    setActiveQuizLessonId(lessonId);
  };

  // Quickly create an ASSIGNMENT lesson in the first chapter and return its id.
  // Used when a quiz is added but the course tree has no free ASSIGNMENT lesson.
  const createAssignmentLessonInFirstChapter = (): string | null => {
    if (!draftCourse?.chapters?.length) {
      toast.warning("Add a chapter before linking a quiz.");
      return null;
    }

    const firstChapter = draftCourse.chapters[0];
    const newLesson = createEmptyLesson(
      (firstChapter.lessons?.length || 0) + 1,
      "ASSIGNMENT",
    );
    newLesson.title = "Quiz Assignment";

    setDraftCourse((current) => {
      if (!current?.chapters?.length) return current;

      const [first, ...rest] = current.chapters;
      return {
        ...current,
        chapters: [
          {
            ...first,
            lessons: reindexLessons([...(first.lessons || []), newLesson]),
          },
          ...rest,
        ],
      };
    });

    // Flag the unsaved assignment so the quiz save persists the course first.
    pendingAssignmentRef.current = true;
    return newLesson.id;
  };

  // Append a new quiz lesson, linking it to an ASSIGNMENT lesson id.
  const handleAddQuizLesson = () => {
    const usedLessonIds = new Set(
      draftQuizLessons.map((quiz) => quiz.lesson_id),
    );
    // Reuse a free ASSIGNMENT lesson, otherwise create one on the fly.
    const availableAssignment = assignmentLessonOptions.find(
      (option) => !usedLessonIds.has(option.value),
    );
    const lessonId =
      availableAssignment?.value ?? createAssignmentLessonInFirstChapter();
    if (!lessonId) return;

    setDraftQuizLessons((current) => {
      const nextLesson = createEmptyQuizLesson(lessonId, current.length + 1);
      setActiveQuizLessonId(nextLesson.lesson_id);
      return [...current, nextLesson];
    });
  };

  // Relink the active quiz lesson to a different ASSIGNMENT lesson id.
  const handleChangeQuizLessonAssignment = (lessonId: string) => {
    setDraftQuizLessons((current) =>
      current.map((quiz) =>
        quiz.lesson_id === activeQuizLessonId
          ? { ...quiz, lesson_id: lessonId }
          : quiz,
      ),
    );
    setActiveQuizLessonId(lessonId);
  };

  // Remove the active quiz lesson and fall back to the nearest remaining item.
  const handleDeleteQuizLesson = () => {
    setDraftQuizLessons((current) => {
      const activeIndex = current.findIndex(
        (lesson) => lesson.lesson_id === activeQuizLessonId,
      );
      if (activeIndex < 0) return current;

      const nextLessons = current.filter(
        (lesson) => lesson.lesson_id !== activeQuizLessonId,
      );
      const fallbackLesson = nextLessons[Math.min(activeIndex, nextLessons.length - 1)];
      setActiveQuizLessonId(fallbackLesson?.lesson_id || "");
      return nextLessons;
    });
  };

  // Update a top-level field on the active quiz lesson.
  const handleUpdateQuizLessonField = (
    field: "title" | "overview" | "time_limit",
    value: string,
  ) => {
    if (field === "time_limit") {
      updateActiveQuizLesson((lesson) => ({
        ...lesson,
        content: {
          ...lesson.content,
          time_limit: Number(value) || 0,
        },
      }));
      return;
    }

    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      [field]: value,
    }));
  };

  // Update a field on one quiz question inside the active lesson.
  const handleUpdateQuizQuestionField = (
    questionId: string,
    field: "question" | "explain" | "answer",
    value: string,
  ) => {
    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      content: {
        ...lesson.content,
        questions: lesson.content.questions.map((question) =>
          question.id === questionId ? { ...question, [field]: value } : question,
        ),
      },
    }));
  };

  // Update one option text inside a quiz question.
  const handleUpdateQuizOptionField = (
    questionId: string,
    optionId: string,
    value: string,
  ) => {
    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      content: {
        ...lesson.content,
        questions: lesson.content.questions.map((question) =>
          question.id === questionId
            ? {
                ...question,
                options: question.options.map((option) =>
                  option.id === optionId ? { ...option, text: value } : option,
                ),
              }
            : question,
        ),
      },
    }));
  };

  // Append a new blank question to the active quiz lesson.
  const handleAddQuizQuestion = () => {
    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      content: {
        ...lesson.content,
        questions: [...lesson.content.questions, createEmptyQuizQuestion()],
      },
    }));
  };

  // Remove one question from the active quiz lesson.
  const handleDeleteQuizQuestion = (questionId: string) => {
    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      content: {
        ...lesson.content,
        questions: lesson.content.questions.filter(
          (question) => question.id !== questionId,
        ),
      },
    }));
  };

  // Append a new option to one quiz question.
  const handleAddQuizOption = (questionId: string) => {
    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      content: {
        ...lesson.content,
        questions: lesson.content.questions.map((question) => {
          if (question.id !== questionId) return question;

          const nextOption = createEmptyQuizOption(question.options.length + 1);
          return {
            ...question,
            options: [...question.options, nextOption],
          };
        }),
      },
    }));
  };

  // Remove one option from a quiz question and keep the answer valid.
  const handleDeleteQuizOption = (questionId: string, optionId: string) => {
    updateActiveQuizLesson((lesson) => ({
      ...lesson,
      content: {
        ...lesson.content,
        questions: lesson.content.questions.map((question) => {
          if (question.id !== questionId) return question;

          const nextOptions = question.options.filter(
            (option) => option.id !== optionId,
          );
          const nextAnswer =
            question.answer === optionId
              ? nextOptions[0]?.id || ""
              : question.answer;

          return {
            ...question,
            options: nextOptions,
            answer: nextAnswer,
          };
        }),
      },
    }));
  };

  // Save the full quiz payload for the selected course.
  const handleSaveCourseQuiz = async () => {
    if (!selectedCourseId || !draftQuizLessons.length) return;

    // Every quiz must resolve to an existing ASSIGNMENT lesson in the tree.
    const assignmentIds = new Set(
      assignmentLessonOptions.map((option) => option.value),
    );
    const hasUnlinkedQuiz = draftQuizLessons.some(
      (quiz) => !quiz.lesson_id || !assignmentIds.has(quiz.lesson_id),
    );
    if (hasUnlinkedQuiz) {
      toast.warning(
        "Select an ASSIGNMENT lesson for every quiz before saving.",
      );
      return;
    }

    try {
      // Persist the course first so a freshly created ASSIGNMENT lesson exists
      // in the backend before the quiz references it.
      if (pendingAssignmentRef.current && draftCourse) {
        await updateMutation.mutateAsync(
          buildCourseUpdatePayload({
            ...draftCourse,
            day_publish: Number(draftCourse.day_publish) || 0,
            tools_and_skills: multilineToArray(toolsAndSkillsText),
            for_whom: multilineToArray(forWhomText),
          }),
        );
      }

      await quizUpdateMutation.mutateAsync({
        course_id: selectedCourseId,
        data: draftQuizLessons,
      });

      // Refresh the course tree so any newly created ASSIGNMENT lesson is shown.
      await refetchCourse();
    } catch {
      // Mutation onError handlers already surface the failure to the user.
    }
  };

  // Save the current draft after normalizing text-area list fields.
  const handleSaveCourse = () => {
    if (!draftCourse) return;

    const parsedDayPublish = Number(draftCourse.day_publish);
    if (!Number.isFinite(parsedDayPublish)) {
      toast.warning("Day Publish must be a valid number.");
      return;
    }

    // draftCourse is the single source of truth: the editor's onChange already
    // writes every keystroke back into it, so build the payload straight from it.
    const payload = buildCourseUpdatePayload({
      ...draftCourse,
      day_publish: parsedDayPublish,
      tools_and_skills: multilineToArray(toolsAndSkillsText),
      for_whom: multilineToArray(forWhomText),
    });

    updateMutation.mutate(payload);
  };

  const isLoading = isCourseListLoading || isCourseDetailLoading;
  const isDetailView = viewMode === "detail";
  const isDetailReady = isDetailView && !isLoading && !!draftCourse;
  const markdownValue = lessonContentToMarkdown(activeLesson);
  const isContentLesson = activeLesson?.type === "CONTENT";
  const detailChapterCount = draftCourse?.chapters?.length || 0;
  const detailLessonCount = draftCourse ? countCourseLessons(draftCourse) : 0;
  const detailAssignmentCount = draftCourse
    ? countCourseAssignments(draftCourse)
    : 0;
  const detailQuizCount = draftQuizLessons.length;
  const activeLessonLabel = activeLesson
    ? `Lesson ${activeLesson.order}: ${activeLesson.title || "Untitled lesson"}`
    : "No lesson selected";
  const activeQuizLesson = draftQuizLessons.find(
    (quiz) => quiz.lesson_id === activeQuizLessonId,
  );
  const quizLessonOptions = draftQuizLessons.map((quiz, index) => ({
    label: `Quiz ${index + 1}: ${quiz.title || "Untitled quiz"}`,
    value: quiz.lesson_id,
  }));
  // All ASSIGNMENT lessons available to link a quiz to.
  const assignmentLessonOptions = useMemo(
    () => getAssignmentLessonOptions(draftCourse),
    [draftCourse],
  );
  // ASSIGNMENT lessons the active quiz may link to (its own plus any unused).
  const activeQuizAssignmentOptions = useMemo(() => {
    const usedByOthers = new Set(
      draftQuizLessons
        .filter((quiz) => quiz.lesson_id !== activeQuizLessonId)
        .map((quiz) => quiz.lesson_id),
    );
    return assignmentLessonOptions.filter(
      (option) => !usedByOthers.has(option.value),
    );
  }, [assignmentLessonOptions, draftQuizLessons, activeQuizLessonId]);

  return {
    viewMode,
    detailPanel,
    draftCourse,
    activeChapter,
    activeChapterId,
    activeLesson,
    activeLessonId,
    editorMode,
    toolsAndSkillsText,
    forWhomText,
    lessonJsonText,
    newLessonType,
    draftQuizLessons,
    activeQuizLesson,
    activeQuizLessonId,
    isCourseQuizLoading,
    isSavingQuiz: quizUpdateMutation.isPending,
    detailQuizCount,
    quizLessonOptions,
    activeQuizAssignmentOptions,
    courseList,
    isCourseListLoading,
    isLoading,
    isDetailView,
    isDetailReady,
    isSaving: updateMutation.isPending,
    markdownValue,
    isContentLesson,
    detailChapterCount,
    detailLessonCount,
    detailAssignmentCount,
    activeLessonLabel,
    setDetailPanel,
    setEditorMode,
    setToolsAndSkillsText,
    setForWhomText,
    setNewLessonType,
    setActiveLessonId,
    lessonMarkdownEditorRef,
    handleBackToList,
    handleOpenCourseDetail,
    handleCourseFieldChange,
    handleSaveCourse,
    handleChangeChapter,
    handleAddChapter,
    handleInsertChapterBefore,
    handleDeleteActiveChapter,
    handleAddLesson,
    handleInsertLessonBefore,
    handleDeleteActiveLesson,
    handleUpdateActiveChapterField,
    handleChangeActiveLessonType,
    handleUpdateActiveLessonField,
    handleUpdateActiveLessonContentField,
    handleUpdateActiveLessonOrder,
    handleChangeLessonJsonText,
    handleChangeLessonMarkdown,
    handleChangeQuizLesson,
    handleAddQuizLesson,
    handleChangeQuizLessonAssignment,
    handleDeleteQuizLesson,
    handleUpdateQuizLessonField,
    handleUpdateQuizQuestionField,
    handleUpdateQuizOptionField,
    handleAddQuizQuestion,
    handleDeleteQuizQuestion,
    handleAddQuizOption,
    handleDeleteQuizOption,
    handleSaveCourseQuiz,
  };
};
