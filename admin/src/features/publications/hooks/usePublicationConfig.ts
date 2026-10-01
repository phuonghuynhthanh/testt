import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  commandBlogLinkedIn,
  generateLinkedInDraft,
  getPublication,
  publishBlog,
  retryLinkedIn,
  suggestLinkedInMedia,
  updatePublication,
  verifyLinkedInOrganization,
} from "../../../services/publication/handlePublication";
import { isManualDraftConflict } from "../../../services/publication/error";
import { uploadLinkedInMedia } from "../../../services/linkedin/handleLinkedIn";
import { getBlogDetail } from "../../../services/blog/handleBlog";
import { apiErrorMessage } from "../../../types/Api";
import { linkedinMediaKey } from "../../../utils/linkedinMedia";
import type {
  FactualReview,
  GeneratedLinkedInPost,
  LinkedInMediaAsset,
  LinkedInMediaMode,
  LinkedInMode,
  OrganizationVerification,
  PexelsCandidate,
  Publication,
} from "../../../types/Publication";

export type PendingPublicationConfirmation =
  | { kind: "regenerate-conflict" }
  | { kind: "disable-linkedin" }
  | { kind: "change-mode"; mode: LinkedInMode }
  | { kind: "replace-draft" }
  | null;

// Identify persisted media without mistaking generated image-plan entries for selections.
const isSelectedMedia = (
  media: Publication["linkedinMedia"][number],
): media is LinkedInMediaAsset => "provider" in media;

// Compare editable media fields to detect unsaved changes reliably.
const mediaSignature = (items: LinkedInMediaAsset[]): string =>
  JSON.stringify(
    items.map((item) => ({ key: linkedinMediaKey(item), altText: item.altText, order: item.order })),
  );

// Validate the exact image count required by the generated media mode.
const hasValidMediaCount = (mode: LinkedInMediaMode, count: number): boolean =>
  mode === "none"
    ? count === 0
    : mode === "single-image"
      ? count === 1
      : count >= 2 && count <= 20;

// Manage the complete publication workflow shared by the publication page and Blog editor.
export const usePublicationConfig = (
  blogId: string,
  blogState?: string,
  blogSaveVersion = 0,
) => {
  const client = useQueryClient();
  const [mode, setMode] = useState<LinkedInMode>("SAME");
  const [publishWeb, setPublishWeb] = useState(true);
  const [publishLinkedin, setPublishLinkedin] = useState(false);
  const [includeWebLink, setIncludeWebLink] = useState(false);
  const [content, setContent] = useState("");
  const [mediaMode, setMediaMode] = useState<LinkedInMediaMode>("none");
  const [selectedMedia, setSelectedMedia] = useState<LinkedInMediaAsset[]>([]);
  const [suggestions, setSuggestions] = useState<PexelsCandidate[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [factCheck, setFactCheck] = useState<FactualReview>({
    requiresHumanFactCheck: false,
    factCheckNotes: [],
  });
  const [generation, setGeneration] = useState<GeneratedLinkedInPost>({});
  const [factCheckAcknowledged, setFactCheckAcknowledged] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingPublicationConfirmation>(null);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [draftStale, setDraftStale] = useState(false);
  const [verification, setVerification] = useState<OrganizationVerification | null>(null);
  const previousBlogSaveVersion = useRef(blogSaveVersion);

  const blogQuery = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId),
    enabled: Boolean(blogId) && !blogState,
  });
  const pubQuery = useQuery({
    queryKey: ["publication", blogId],
    queryFn: () => getPublication(blogId),
    enabled: Boolean(blogId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const pub = pubQuery.data;
  const savedMedia = useMemo(
    () => pub?.linkedinMedia.filter(isSelectedMedia) ?? [],
    [pub],
  );
  const effectiveIncludeWebLink = publishWeb && publishLinkedin && includeWebLink;
  const settingsDirty = Boolean(
    pub &&
      (publishWeb !== pub.publishWeb ||
        publishLinkedin !== pub.publishLinkedin ||
        mode !== pub.linkedinMode ||
        effectiveIncludeWebLink !== pub.linkedinIncludeWebLink),
  );
  const contentDirty = Boolean(pub && content !== (pub.linkedinContent ?? ""));
  const mediaDirty = mediaSignature(selectedMedia) !== mediaSignature(savedMedia);
  const hasUnsavedChanges = settingsDirty || contentDirty || mediaDirty || previewDirty;

  // Synchronize persisted publication data with editable controls after loading or saving.
  useEffect(() => {
    if (!pub) return;
    setMode(pub.linkedinMode || "SAME");
    setPublishWeb(pub.publishWeb);
    setPublishLinkedin(pub.publishLinkedin);
    setIncludeWebLink(pub.linkedinIncludeWebLink ?? false);
    setContent(pub.linkedinContent || "");
    setMediaMode(pub.linkedinMediaMode);
    setSelectedMedia(pub.linkedinMedia.filter(isSelectedMedia));
    setFactCheck(pub.linkedinFactCheck ?? { requiresHumanFactCheck: false, factCheckNotes: [] });
    setGeneration(pub.linkedinGenerated ?? {});
    setFactCheckAcknowledged(!pub.linkedinFactCheck?.requiresHumanFactCheck);
    setPreviewDirty(false);
  }, [pub]);

  // Mark generated copy stale when the containing Blog editor saves newer source content.
  useEffect(() => {
    if (
      blogSaveVersion > previousBlogSaveVersion.current &&
      pub?.linkedinContent &&
      ["SAME", "SUMMARY"].includes(pub.linkedinMode)
    ) {
      setDraftStale(true);
    }
    previousBlogSaveVersion.current = blogSaveVersion;
  }, [blogSaveVersion, pub]);

  // Protect local publication edits from accidental browser navigation.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Refresh every cache affected by a publication mutation.
  const refreshPublication = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["publication", blogId] }),
      client.invalidateQueries({ queryKey: ["blogDetail", blogId] }),
      client.invalidateQueries({ queryKey: ["blogs"] }),
    ]);
  };

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      updatePublication(blogId, {
        publishWeb,
        publishLinkedin,
        linkedinMode: mode,
        linkedinIncludeWebLink: effectiveIncludeWebLink,
      }),
    onSuccess: async () => {
      toast.success("Đã lưu cấu hình kênh thành công.");
      await refreshPublication();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const draftMutation = useMutation({
    mutationFn: (regenerate: boolean) =>
      generateLinkedInDraft(blogId, {
        mode: mode as Exclude<LinkedInMode, "CUSTOM">,
        includeWebLink: effectiveIncludeWebLink,
        regenerate,
      }),
    onSuccess: (data) => {
      setContent(data.content);
      setMediaMode(data.media.mode);
      if (data.media.mode === "none") setSelectedMedia([]);
      if (data.media.mode === "single-image") setSelectedMedia((items) => items.slice(0, 1));
      setFactCheck(data.factualReview);
      setGeneration(data.generated);
      setKeywordInput(data.media.images.flatMap((image) => image.searchKeywords).join(", "));
      setFactCheckAcknowledged(false);
      setDraftStale(false);
      setPreviewDirty(true);
      toast.success("Đã tạo bản nháp LinkedIn để xem xét.");
    },
    onError: (error, regenerate) => {
      if (!regenerate && isManualDraftConflict(error)) {
        setPendingConfirmation({ kind: "regenerate-conflict" });
        return;
      }
      toast.error(apiErrorMessage(error));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      commandBlogLinkedIn(blogId, {
        mode,
        content,
        media: selectedMedia,
        includeWebLink: effectiveIncludeWebLink,
        factCheck,
        generation: { ...generation },
        action: "SAVE_DRAFT",
      }),
    onSuccess: async () => {
      setPreviewDirty(false);
      toast.success("Đã lưu bản nháp LinkedIn.");
      await refreshPublication();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishLinkedin
        ? commandBlogLinkedIn(blogId, {
            mode,
            content,
            media: selectedMedia,
            includeWebLink: effectiveIncludeWebLink,
            factCheck,
            generation: { ...generation },
            action: "PUBLISH_NOW",
          })
        : publishBlog(blogId),
    onSuccess: async () => {
      setPreviewDirty(false);
      setShowConfirmPublish(false);
      toast.success("Yêu cầu xuất bản hoàn tất.");
      await refreshPublication();
    },
    onError: async (error) => {
      setShowConfirmPublish(false);
      toast.error(apiErrorMessage(error));
      await refreshPublication();
    },
  });

  const searchMediaMutation = useMutation({
    mutationFn: (keywords?: string[]) =>
      suggestLinkedInMedia(blogId, keywords?.length ? { keywords } : {}),
    onSuccess: setSuggestions,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map(uploadLinkedInMedia)),
    onSuccess: (items) => {
      const maximum = mediaMode === "single-image" ? 1 : 20;
      const next = (mediaMode === "single-image" ? items.slice(0, 1) : [...selectedMedia, ...items])
        .slice(0, maximum)
        .map((item, index) => ({ ...item, order: index + 1 }));
      setSelectedMedia(next);
      toast.success(`Đã tải lên ${items.length} ảnh.`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryLinkedIn(blogId),
    onSuccess: async () => {
      toast.success("Thử lại xuất bản LinkedIn hoàn tất.");
      await refreshPublication();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyLinkedInOrganization,
    onSuccess: (result) => {
      setVerification(result);
      toast[result.readyForOrganicPosting ? "success" : "warning"](
        result.readyForOrganicPosting
          ? "Tổ chức LinkedIn đã sẵn sàng để đăng bài."
          : "Tổ chức LinkedIn chưa sẵn sàng để đăng bài.",
      );
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Enforce at least one selected channel and protect unsaved LinkedIn edits.
  const toggleChannel = (channel: "web" | "linkedin") => {
    if (channel === "web") {
      if (publishWeb && !publishLinkedin) return;
      setPublishWeb(!publishWeb);
      if (publishWeb) setIncludeWebLink(false);
      return;
    }
    if (publishLinkedin && !publishWeb) return;
    if (publishLinkedin && (contentDirty || mediaDirty)) {
      setPendingConfirmation({ kind: "disable-linkedin" });
      return;
    }
    setPublishLinkedin(!publishLinkedin);
    if (publishLinkedin) setIncludeWebLink(false);
  };

  // Protect existing draft content before changing its generation mode.
  const changeMode = (nextMode: LinkedInMode) => {
    if (nextMode === mode) return;
    if (content || selectedMedia.length > 0) {
      setPendingConfirmation({ kind: "change-mode", mode: nextMode });
      return;
    }
    setMode(nextMode);
  };

  // Generate a draft only after its channel settings are persisted.
  const generateDraft = () => {
    if (mode === "CUSTOM" || settingsDirty) return;
    if (contentDirty) {
      setPendingConfirmation({ kind: "replace-draft" });
      return;
    }
    draftMutation.mutate(false);
  };

  // Execute a confirmed action that may replace local LinkedIn work.
  const confirmPendingAction = () => {
    const action = pendingConfirmation;
    setPendingConfirmation(null);
    if (!action) return;
    if (action.kind === "regenerate-conflict") draftMutation.mutate(true);
    if (action.kind === "disable-linkedin") {
      setPublishLinkedin(false);
      setIncludeWebLink(false);
    }
    if (action.kind === "change-mode") setMode(action.mode);
    if (action.kind === "replace-draft") draftMutation.mutate(false);
  };

  const resolvedState = blogState || blogQuery.data?.state;
  const isApproved = resolvedState === "APPROVED";
  const webPublished = publishWeb && isApproved;
  const isPublished = pub?.linkedinStatus === "PUBLISHED";
  const hasChannel = publishWeb || publishLinkedin;
  const mediaCountValid = hasValidMediaCount(mediaMode, selectedMedia.length);
  const altTextValid = selectedMedia.every((item) => Boolean((item.altText || "").trim()));
  const factCheckValid = !factCheck.requiresHumanFactCheck || factCheckAcknowledged;
  const canPublish = Boolean(
    pub &&
      (!publishLinkedin || isApproved) &&
      hasChannel &&
      !settingsDirty &&
      (!publishLinkedin ||
        (content.trim() && mediaCountValid && altTextValid && factCheckValid &&
          ["NOT_SELECTED", "DRAFT", "READY"].includes(pub.linkedinStatus))),
  );
  const canSaveDraft = Boolean(
    content.trim() &&
      (contentDirty || mediaDirty || previewDirty) &&
      !settingsDirty &&
      mediaCountValid &&
      altTextValid &&
      factCheckValid,
  );

  return {
    mode,
    publishWeb,
    publishLinkedin,
    includeWebLink,
    content,
    setContent,
    mediaMode,
    selectedMedia,
    setSelectedMedia,
    suggestions,
    setSuggestions,
    keywordInput,
    setKeywordInput,
    factCheck,
    factCheckAcknowledged,
    setFactCheckAcknowledged,
    showConfirmPublish,
    setShowConfirmPublish,
    pendingConfirmation,
    setPendingConfirmation,
    draftStale,
    verification,
    pub,
    isLoading: pubQuery.isLoading,
    isError: pubQuery.isError,
    isApproved,
    webPublished,
    isPublished,
    hasChannel,
    settingsDirty,
    mediaCountValid,
    altTextValid,
    canPublish,
    canSaveDraft,
    toggleChannel,
    changeMode,
    generateDraft,
    confirmPendingAction,
    setIncludeWebLink,
    saveSettingsMutation,
    draftMutation,
    saveDraftMutation,
    publishMutation,
    searchMediaMutation,
    uploadMutation,
    retryMutation,
    verifyMutation,
  };
};
