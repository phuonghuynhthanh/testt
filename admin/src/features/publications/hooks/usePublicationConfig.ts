import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  commandBlogLinkedIn, generateLinkedInDraft, getPublication, retryLinkedIn,
  suggestLinkedInMedia, updatePublication,
} from "../../../services/publication/handlePublication";
import { isManualDraftConflict } from "../../../services/publication/error";
import type { PostLanguage } from "../../../types/Language";
import { uploadLinkedInMedia } from "../../../services/linkedin/handleLinkedIn";
import { apiErrorMessage } from "../../../types/Api";
import type {
  FactualReview, GeneratedLinkedInPost, LinkedInLinkPlacement, LinkedInMediaAsset, LinkedInMediaMode,
  LinkedInMode, Publication,
} from "../../../types/Publication";

// Identify persisted images instead of generated image-plan placeholders.
const isSelectedMedia = (media: Publication["linkedinMedia"][number]): media is LinkedInMediaAsset =>
  "provider" in media;

// Manage the LinkedIn adaptation of an already approved website article.
export const usePublicationConfig = (blogId: string) => {
  const client = useQueryClient();
  const [mode, setMode] = useState<LinkedInMode>("SUMMARY");
  const [language, setLanguage] = useState<PostLanguage>("vietnamese");
  const [linkPlacement, setLinkPlacement] = useState<LinkedInLinkPlacement>("NONE");
  const [content, setContent] = useState("");
  const [mediaMode, setMediaMode] = useState<LinkedInMediaMode>("none");
  const [selectedMedia, setSelectedMedia] = useState<LinkedInMediaAsset[]>([]);
  const [suggestions, setSuggestions] = useState<LinkedInMediaAsset[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [factCheck, setFactCheck] = useState<FactualReview>({ requiresHumanFactCheck: false, factCheckNotes: [] });
  const [generation, setGeneration] = useState<GeneratedLinkedInPost>({});
  const [factCheckAcknowledged, setFactCheckAcknowledged] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [pendingRegenerate, setPendingRegenerate] = useState<boolean | null>(null);
  const [dirty, setDirty] = useState(false);
  const hydratedId = useRef("");

  const pubQuery = useQuery({
    queryKey: ["publication", blogId],
    queryFn: () => getPublication(blogId),
    enabled: Boolean(blogId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const pub = pubQuery.data;
  const immutable = Boolean(pub && ["PUBLISHING", "PUBLISHED", "REVIEW_REQUIRED"].includes(pub.linkedinStatus));

  // Hydrate once per article so background status refreshes cannot erase local edits.
  useEffect(() => {
    if (!pub || hydratedId.current === blogId) return;
    hydratedId.current = blogId;
    setMode(!pub.linkedinRecordId && !pub.linkedinContent?.trim() ? "SUMMARY" : pub.linkedinMode || "SAME");
    setLinkPlacement(pub.linkedinLinkPlacement ?? "NONE");
    setContent(pub.linkedinContent || "");
    setMediaMode(pub.linkedinMediaMode || "none");
    setSelectedMedia(pub.linkedinMedia.filter(isSelectedMedia));
    setSuggestions(pub.linkedinMedia.filter(isSelectedMedia));
    setFactCheck(pub.linkedinFactCheck ?? { requiresHumanFactCheck: false, factCheckNotes: [] });
    setGeneration(pub.linkedinGenerated ?? {});
    setLanguage(pub.linkedinGenerated?.language ?? "vietnamese");
    setFactCheckAcknowledged(!pub.linkedinFactCheck?.requiresHumanFactCheck);
    setDirty(false);
  }, [pub, blogId]);

  // Warn before browser navigation discards unsaved authoring work.
  useEffect(() => {
    if (!dirty) return;
    // Request the browser's standard unsaved-changes warning.
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  // Adapt channel configuration only when the administrator requests a draft or save.
  const normalizeSettings = () => updatePublication(blogId, {
    publishWeb: true,
    publishLinkedin: true,
    linkedinMode: mode,
    linkedinLinkPlacement: linkPlacement,
  });

  // Refresh status and overview lists without rehydrating local text or images.
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["publication", blogId] }),
      client.invalidateQueries({ queryKey: ["linkedin-posts"] }),
      client.invalidateQueries({ queryKey: ["publication-blogs"] }),
    ]);
  };

  // Construct reviewed content with a server-owned link-placement option.
  const payload = (action: "SAVE_DRAFT" | "PUBLISH_NOW") => ({
    mode, content, media: selectedMedia, linkPlacement, factCheck,
    generation: { ...generation }, action,
  });

  const draftMutation = useMutation({
    mutationFn: async (regenerate: boolean) => {
      await normalizeSettings();
      // Keep preview text link-free so toggling the attachment cannot leave an old URL behind.
      return generateLinkedInDraft(blogId, {
        mode: mode as Exclude<LinkedInMode, "CUSTOM">, linkPlacement, regenerate, language,
      });
    },
    onSuccess: (data) => {
      setContent(data.content);
      setMediaMode(data.media.mode);
      if (data.media.mode === "none") setSelectedMedia([]);
      if (data.media.mode === "single-image") setSelectedMedia((items) => items.slice(0, 1));
      setFactCheck(data.factualReview);
      setGeneration(data.generated);
      setFactCheckAcknowledged(!data.factualReview.requiresHumanFactCheck);
      setKeywordInput(data.media.images.flatMap((image) => image.searchKeywords).join(", "));
      setDirty(true);
      toast.success("Đã tạo nội dung LinkedIn. Kiểm tra và lưu bản nháp trước khi rời trang.");
    },
    onError: (error, regenerate) => {
      if (!regenerate && isManualDraftConflict(error)) {
        setPendingRegenerate(true);
        return;
      }
      toast.error(apiErrorMessage(error));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      await normalizeSettings();
      return commandBlogLinkedIn(blogId, payload("SAVE_DRAFT"));
    },
    onSuccess: async () => {
      setDirty(false);
      toast.success("Đã lưu bản nháp LinkedIn, chưa đăng công khai.");
      await refresh();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await normalizeSettings();
      return commandBlogLinkedIn(blogId, payload("PUBLISH_NOW"));
    },
    onSuccess: async () => {
      setDirty(false);
      setShowConfirmPublish(false);
      toast.success("Đã gửi bài đăng lên LinkedIn.");
      await refresh();
    },
    onError: async (error) => {
      setShowConfirmPublish(false);
      toast.error(apiErrorMessage(error));
      await refresh();
    },
  });

  const searchMediaMutation = useMutation({
    mutationFn: (keywords: string[]) => suggestLinkedInMedia(blogId, { keywords }),
    onSuccess: setSuggestions,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map(uploadLinkedInMedia)),
    onSuccess: (items) => {
      setSelectedMedia((current) => (mediaMode === "single-image" ? items.slice(0, 1) : [...current, ...items])
        .slice(0, 20).map((item, index) => ({ ...item, order: index + 1 })));
      setSuggestions((current) => [...items, ...current]);
      setDirty(true);
      toast.success(`Đã tải lên ${items.length} ảnh.`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryLinkedIn(blogId),
    onSuccess: async () => { toast.success("Đã gửi yêu cầu thử lại LinkedIn."); await refresh(); },
    onError: async (error) => { toast.error(apiErrorMessage(error)); await refresh(); },
  });

  // Confirm before replacing any existing text with generated content.
  const generateDraft = () => {
    if (mode === "CUSTOM" || immutable) return;
    if (content.trim()) setPendingRegenerate(false);
    else draftMutation.mutate(false);
  };

  const mediaCountValid = mediaMode === "none" ? selectedMedia.length === 0
    : mediaMode === "single-image" ? selectedMedia.length === 1
      : selectedMedia.length >= 2 && selectedMedia.length <= 20;
  const altTextValid = selectedMedia.every((item) => Boolean(item.altText?.trim()));
  const factCheckValid = !factCheck.requiresHumanFactCheck || factCheckAcknowledged;
  const busy = draftMutation.isPending || saveDraftMutation.isPending || publishMutation.isPending ||
    uploadMutation.isPending || retryMutation.isPending;
  const valid = Boolean(content.trim() && mediaCountValid && altTextValid && factCheckValid);
  const canSaveDraft = Boolean(pub && !immutable && valid && !busy);
  const canPublish = canSaveDraft && pub?.linkedinStatus !== "FAILED";
  const canRetry = pub?.linkedinStatus === "FAILED" && pub.linkedinError?.retryable === true && !dirty && !busy;
  const guidance = immutable ? (pub?.linkedinStatus === "PUBLISHED" ? "Bài đã đăng lên LinkedIn và không thể chỉnh sửa."
    : pub?.linkedinStatus === "PUBLISHING" ? "Đang đăng bài. Tạm thời không thể chỉnh sửa."
      : "Bài đang chờ xác minh và không thể chỉnh sửa. Kiểm tra Trang Doanh nghiệp LinkedIn trước khi tiếp tục.")
    : !content.trim() ? "Soạn nội dung hoặc tạo nội dung từ bài website."
      : !mediaCountValid ? "Chọn đủ số ảnh theo chế độ đã chọn."
        : !altTextValid ? "Nhập mô tả cho từng ảnh đã chọn."
          : !factCheckValid ? "Xác nhận đã kiểm tra thông tin trước khi tiếp tục."
            : pub?.linkedinStatus === "FAILED" ? (dirty ? "Lưu bản nháp đã chỉnh sửa trước khi thử lại."
              : "Bài đăng thất bại. Chỉ thử lại khi hệ thống cho phép.")
              : "Lưu bản nháp để giữ nội dung; đăng LinkedIn để xuất bản công khai.";

  return {
    mode, setMode, language, setLanguage, linkPlacement, setLinkPlacement, content, setContent,
    mediaMode, setMediaMode, selectedMedia, setSelectedMedia, suggestions, setSuggestions,
    keywordInput, setKeywordInput, factCheck, factCheckAcknowledged, setFactCheckAcknowledged,
    showConfirmPublish, setShowConfirmPublish, pendingRegenerate, setPendingRegenerate,
    setDirty, generation, pub, immutable, busy, guidance, canSaveDraft, canPublish, canRetry,
    isLoading: pubQuery.isLoading, isError: pubQuery.isError,
    generateDraft, draftMutation, saveDraftMutation, publishMutation,
    searchMediaMutation, uploadMutation, retryMutation,
  };
};
