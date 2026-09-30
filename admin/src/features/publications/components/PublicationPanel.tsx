import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  generateLinkedInDraft,
  commandBlogLinkedIn,
  getPublication,
  publishBlog,
  retryLinkedIn,
  suggestLinkedInMedia,
  updatePublication,
  verifyLinkedInOrganization,
} from "../../../services/publication/handlePublication";
import { isManualDraftConflict } from "../../../services/publication/error";
import { apiErrorMessage as publicationErrorMessage } from "../../../types/Api";
import { formatCmsDate } from "../../../utils/date";
import type {
  FactualReview,
  GeneratedLinkedInPost,
  LinkedInMediaMode,
  LinkedInMode,
  OrganizationVerification,
  PexelsCandidate,
  Publication,
} from "../../../types/Publication";

interface PublicationPanelProps {
  blogId: string;
  blogSaveVersion: number;
  blogState?: string;
  linkedinWorkspace?: boolean;
}

// Identify selected Pexels media without mistaking generated image-plan entries for candidates.
const isPexelsCandidate = (
  media: Publication["linkedinMedia"][number],
): media is PexelsCandidate => "providerId" in media;

// Compare only editable media fields so server refreshes do not create false dirty states.
const mediaSignature = (items: PexelsCandidate[]): string =>
  JSON.stringify(
    items.map(({ providerId, altText, order }) => ({ providerId, altText, order })),
  );

// Enforce the exact image count represented by the backend media mode.
const hasValidMediaCount = (mode: LinkedInMediaMode, count: number): boolean =>
  mode === "none"
    ? count === 0
    : mode === "single-image"
      ? count === 1
      : count >= 2 && count <= 20;

// Read a useful string from provider data without depending on undocumented optional keys.
const readProviderText = (
  value: Record<string, unknown>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key]) return String(value[key]);
  }
  return null;
};

// Keep every backend publication status distinct in the administrator UI.
const statusCopy: Record<Publication["linkedinStatus"], string> = {
  NOT_SELECTED: "Chưa chọn xuất bản LinkedIn.",
  DRAFT: "Bản nháp cần có nội dung trước khi xuất bản.",
  READY: "Đã sẵn sàng cho lượt xem xét cuối cùng.",
  PUBLISHING: "Đang tiến hành xuất bản...",
  PUBLISHED: "Đã xuất bản.",
  FAILED: "Xuất bản thất bại; có thể thử lại.",
  REVIEW_REQUIRED: "Kết quả có thể chưa rõ ràng; vui lòng kiểm tra Trang Doanh nghiệp.",
};

// Provide the review-first workflow in either the Blog editor or LinkedIn workspace.
const PublicationPanel = ({
  blogId,
  blogSaveVersion,
  blogState,
  linkedinWorkspace = false,
}: PublicationPanelProps) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<LinkedInMode>("SAME");
  const [publishWeb, setPublishWeb] = useState(true);
  const [publishLinkedin, setPublishLinkedin] = useState(false);
  const [includeWebLink, setIncludeWebLink] = useState(false);
  const [content, setContent] = useState("");
  const [mediaMode, setMediaMode] = useState<LinkedInMediaMode>("none");
  const [factCheck, setFactCheck] = useState<FactualReview>({ requiresHumanFactCheck: false, factCheckNotes: [] });
  const [generation, setGeneration] = useState<GeneratedLinkedInPost>({});
  const [suggestions, setSuggestions] = useState<PexelsCandidate[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<PexelsCandidate[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [verification, setVerification] = useState<OrganizationVerification | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [draftStale, setDraftStale] = useState(false);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [factCheckAcknowledged, setFactCheckAcknowledged] = useState(false);
  const previousBlogSaveVersion = useRef(blogSaveVersion);

  const publicationQuery = useQuery({
    queryKey: ["publication", blogId],
    queryFn: () => getPublication(blogId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const publication = publicationQuery.data;
  const savedMedia = useMemo(
    () => publication?.linkedinMedia.filter(isPexelsCandidate) ?? [],
    [publication],
  );
  const effectiveIncludeWebLink = publishWeb && publishLinkedin && includeWebLink;
  const settingsDirty = Boolean(
    publication &&
      (publishWeb !== publication.publishWeb ||
        publishLinkedin !== publication.publishLinkedin ||
        mode !== publication.linkedinMode ||
        effectiveIncludeWebLink !== publication.linkedinIncludeWebLink),
  );
  const contentDirty = Boolean(
    publication && content !== (publication.linkedinContent ?? ""),
  );
  const mediaDirty = mediaSignature(selectedMedia) !== mediaSignature(savedMedia);
  const hasUnsavedChanges = settingsDirty || contentDirty || mediaDirty || previewDirty;

  // Require a fresh fact-check acknowledgement when navigating to another Blog.
  useEffect(() => {
    setFactCheckAcknowledged(false);
    setPreviewDirty(false);
  }, [blogId]);

  // Mirror server state into editable controls after each successful mutation.
  useEffect(() => {
    if (!publication) return;
    setMode(publication.linkedinMode);
    setPublishWeb(publication.publishWeb);
    setPublishLinkedin(publication.publishLinkedin);
    setIncludeWebLink(publication.linkedinIncludeWebLink);
    setContent(publication.linkedinContent || "");
    setMediaMode(publication.linkedinMediaMode);
    setFactCheck(publication.linkedinFactCheck ?? { requiresHumanFactCheck: false, factCheckNotes: [] });
    setGeneration(publication.linkedinGenerated ?? {});
    setSelectedMedia(publication.linkedinMedia.filter(isPexelsCandidate));
    if (!publication.linkedinFactCheck?.requiresHumanFactCheck) {
      setFactCheckAcknowledged(true);
    }
  }, [publication]);

  // Mark generated copy stale only after this screen successfully saves the Blog.
  useEffect(() => {
    if (
      blogSaveVersion > previousBlogSaveVersion.current &&
      publication?.linkedinContent &&
      ["SAME", "SUMMARY"].includes(publication.linkedinMode)
    ) {
      setDraftStale(true);
    }
    previousBlogSaveVersion.current = blogSaveVersion;
  }, [blogSaveVersion, publication]);

  // Warn before the browser discards local publication edits.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Ask the browser to protect locally edited publication data.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Refresh publication and every Blog list cache affected by publishing.
  const refreshPublication = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["publication", blogId] }),
      queryClient.invalidateQueries({ queryKey: ["blogDetail", blogId] }),
      queryClient.invalidateQueries({ queryKey: ["blogs"] }),
    ]);
  };

  const settingsMutation = useMutation({
    mutationFn: () =>
      updatePublication(blogId, {
        publishWeb,
        publishLinkedin,
        linkedinMode: mode,
        linkedinIncludeWebLink: effectiveIncludeWebLink,
      }),
    onSuccess: async () => {
      toast.success("Đã lưu cài đặt xuất bản.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
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
        const approved = window.confirm(
          "Bản nháp này có các chỉnh sửa thủ công. Tạo lại sẽ ghi đè lên nội dung này. Tiếp tục?",
        );
        if (approved) draftMutation.mutate(true);
        return;
      }
      toast.error(publicationErrorMessage(error));
    },
  });
  const saveDraftMutation = useMutation({
    // Persist the reviewed draft through the command endpoint, not the edit-only endpoint.
    mutationFn: () => commandBlogLinkedIn(blogId, { mode, content, media: selectedMedia, includeWebLink: effectiveIncludeWebLink, factCheck, generation: { ...generation }, action: "SAVE_DRAFT" }),
    onSuccess: async () => {
      setPreviewDirty(false);
      toast.success("Đã lưu bản nháp LinkedIn.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const suggestionsMutation = useMutation({
    mutationFn: (keywords?: string[]) =>
      suggestLinkedInMedia(blogId, keywords?.length ? { keywords } : {}),
    onSuccess: (items) => setSuggestions(items),
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const publishMutation = useMutation({
    // Send PUBLISH_NOW directly for reviewed LinkedIn copy; Web-only keeps its configured-channel command.
    mutationFn: () => publishLinkedin ? commandBlogLinkedIn(blogId, { mode, content, media: selectedMedia, includeWebLink: effectiveIncludeWebLink, factCheck, generation: { ...generation }, action: "PUBLISH_NOW" }) : publishBlog(blogId),
    onSuccess: async () => {
      setPreviewDirty(false);
      setShowConfirmation(false);
      toast.success("Yêu cầu xuất bản hoàn tất.");
      await refreshPublication();
    },
    onError: async (error) => {
      setShowConfirmation(false);
      toast.error(publicationErrorMessage(error));
      await refreshPublication();
    },
  });
  const retryMutation = useMutation({
    mutationFn: () => retryLinkedIn(blogId),
    onSuccess: async () => {
      toast.success("Thử lại xuất bản LinkedIn hoàn tất.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
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
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });

  // Enforce the at-least-one-channel constraint and protect local edits.
  const toggleChannel = (channel: "web" | "linkedin") => {
    if (channel === "web") {
      if (publishWeb && !publishLinkedin) return;
      setPublishWeb(!publishWeb);
      if (publishWeb) setIncludeWebLink(false);
      return;
    }
    if (publishLinkedin && !publishWeb) return;
    if (
      publishLinkedin &&
      (contentDirty || mediaDirty) &&
      !window.confirm("Tắt LinkedIn và hủy bỏ các chỉnh sửa cục bộ chưa lưu?")
    ) {
      return;
    }
    setPublishLinkedin(!publishLinkedin);
    if (publishLinkedin) setIncludeWebLink(false);
  };

  // Protect draft work before changing a mode that clears persisted generation data.
  const changeMode = (nextMode: LinkedInMode) => {
    if (nextMode === mode) return;
    if (
      (content || selectedMedia.length > 0) &&
      !window.confirm(
        "Thay đổi chế độ và lưu cài đặt sẽ xóa bản nháp và hình ảnh LinkedIn hiện tại. Tiếp tục?",
      )
    ) {
      return;
    }
    setMode(nextMode);
  };

  // Select candidates in deterministic order without exceeding provider limits.
  const toggleMedia = (candidate: PexelsCandidate) => {
    const exists = selectedMedia.some((item) => item.providerId === candidate.providerId);
    const next = exists
      ? selectedMedia.filter((item) => item.providerId !== candidate.providerId)
      : [...selectedMedia, candidate];
    const maximum = mediaMode === "single-image" ? 1 : 20;
    setSelectedMedia(
      next.slice(0, maximum).map((item, index) => ({ ...item, order: index + 1 })),
    );
  };

  // Keep reviewed alt text synchronized with a selected candidate.
  const updateAltText = (providerId: string, altText: string) => {
    const update = (item: PexelsCandidate) =>
      item.providerId === providerId ? { ...item, altText } : item;
    setSuggestions((items) => items.map(update));
    setSelectedMedia((items) => items.map(update));
  };

  // Request a safe initial generation and let the backend identify manual-edit conflicts.
  const generateDraft = () => {
    if (mode === "CUSTOM" || settingsDirty) return;
    if (contentDirty && !window.confirm("Các chỉnh sửa LinkedIn chưa lưu sẽ bị thay thế. Tiếp tục?")) {
      return;
    }
    draftMutation.mutate(false);
  };

  // Convert optional comma or newline-separated phrases into backend keywords.
  const searchMedia = () => {
    const keywords = keywordInput
      .split(/[\n,]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    suggestionsMutation.mutate(keywords);
  };

  if (publicationQuery.isLoading) {
    return <div className="my-10 text-gray-300">Đang tải cài đặt xuất bản…</div>;
  }
  if (publicationQuery.isError || !publication) {
    return <div className="my-10 text-red-300">Không thể tải cài đặt xuất bản.</div>;
  }

  const mediaCountValid = hasValidMediaCount(
    mediaMode,
    selectedMedia.length,
  );
  const altTextValid = selectedMedia.every((item) => item.altText.trim());
  const publishLabel = publishWeb && publishLinkedin
    ? "Xuất bản"
    : publishWeb
      ? "Xuất bản Website"
      : "Xuất bản LinkedIn";
  const isPublished = publication.linkedinStatus === "PUBLISHED";
  const websitePublished = publishWeb && blogState === "APPROVED";
  const canStartPublish =
    !publishLinkedin ||
    ["NOT_SELECTED", "DRAFT", "READY"].includes(publication.linkedinStatus);
  const publishBlocked =
    settingsDirty ||
    (publishLinkedin && (
      !content.trim()
      || !mediaCountValid
      || !altTextValid
      || (factCheck.requiresHumanFactCheck && !factCheckAcknowledged)
    ));
  const organizationName = verification
    ? readProviderText(verification.organization, ["localizedName", "name", "vanityName", "id"])
    : null;
  const displayedCandidates = [
    ...selectedMedia,
    ...suggestions.filter(
      (candidate) =>
        !selectedMedia.some((item) => item.providerId === candidate.providerId),
    ),
  ];
  const modeDescription = {
    SAME: "Giữ nội dung chính của bài viết và định dạng lại phù hợp cho LinkedIn.",
    SUMMARY: "Tạo phiên bản tóm tắt ngắn gọn dành riêng cho LinkedIn từ toàn bộ bài viết.",
    CUSTOM: "Tự viết và chỉnh sửa nội dung bài đăng LinkedIn thủ công.",
  }[mode];

  return (
    <section className="my-10 border-t border-primary-blue-lighter pt-8">
      <h2 className="text-xl font-bold text-primary-white">
        {linkedinWorkspace ? "Bài đăng LinkedIn" : "Xuất bản & Phân phối"}
      </h2>
      <div className="mt-5 space-y-5 rounded-lg bg-primary-black-light p-5">
        <div>
          <h3 className="font-semibold text-primary-white">
            {linkedinWorkspace ? "Xuất bản LinkedIn" : "Xuất bản tới"}
          </h3>
          <div className="mt-3 flex gap-5">
            {!linkedinWorkspace && <label><input type="checkbox" checked={publishWeb} onChange={() => toggleChannel("web")} /> Website</label>}
            <label><input type="checkbox" checked={publishLinkedin} onChange={() => toggleChannel("linkedin")} /> LinkedIn</label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => settingsMutation.mutate()}
          disabled={!settingsDirty || settingsMutation.isPending || isPublished}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {settingsMutation.isPending ? "Đang lưu…" : "Lưu cài đặt xuất bản"}
        </button>

        {publishLinkedin && <>
          <div>
            <h3 className="font-semibold text-primary-white">Chế độ LinkedIn</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["SAME", "SUMMARY", "CUSTOM"] as LinkedInMode[]).map((item) => (
                <label key={item}><input type="radio" name="linkedin-mode" checked={mode === item} onChange={() => changeMode(item)} /> {item === "SAME" ? "Giữ nguyên (SAME)" : item === "SUMMARY" ? "Tóm tắt (SUMMARY)" : "Tùy chỉnh (CUSTOM)"}</label>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-300">{modeDescription}</p>
            <label className="mt-3 block"><input type="checkbox" checked={includeWebLink} disabled={!publishWeb} onChange={(event) => setIncludeWebLink(event.target.checked)} /> Bao gồm liên kết bài viết trên website</label>
            {!publishWeb && <p className="mt-1 text-sm text-yellow-200">Liên kết website không khả dụng vì bài viết này sẽ không được xuất bản lên website.</p>}
          </div>

          {draftStale && ["SAME", "SUMMARY"].includes(publication.linkedinMode) && <p className="rounded border border-yellow-500 p-3 text-sm text-yellow-200">Bài viết website đã thay đổi sau khi bản nháp LinkedIn này được tạo. Hãy cân nhắc tạo lại trước khi xuất bản.</p>}

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-primary-white">Bản nháp LinkedIn</h3>
              {mode !== "CUSTOM" && <button type="button" onClick={generateDraft} disabled={settingsDirty || draftMutation.isPending || isPublished} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{draftMutation.isPending ? "Đang tạo…" : content ? "Tạo lại" : "Tạo bản nháp"}</button>}
            </div>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={isPublished} className="mt-3 min-h-40 w-full rounded border border-gray-600 bg-primary-black p-3 text-primary-white" placeholder={mode === "CUSTOM" ? "Viết bài đăng LinkedIn…" : "Tạo bản nháp để xem xét…"} />
            <button type="button" onClick={() => saveDraftMutation.mutate()} disabled={!content.trim() || (!contentDirty && !mediaDirty && !previewDirty) || settingsDirty || !mediaCountValid || !altTextValid || saveDraftMutation.isPending || isPublished || (factCheck.requiresHumanFactCheck && !factCheckAcknowledged)} className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saveDraftMutation.isPending ? "Đang lưu…" : "Lưu bản nháp LinkedIn"}</button>
          </div>

          {factCheck.requiresHumanFactCheck && <div className="rounded border border-yellow-500 p-3 text-yellow-100"><strong>Kiểm tra tính chính xác</strong><ul className="ml-5 list-disc">{factCheck.factCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul><label className="mt-3 flex gap-2"><input type="checkbox" checked={factCheckAcknowledged} onChange={(event) => setFactCheckAcknowledged(event.target.checked)} disabled={isPublished} /> Tôi đã kiểm tra các thông tin trên.</label></div>}

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h3 className="font-semibold text-primary-white">Hình ảnh</h3><p className="text-sm text-gray-300">Chế độ: {mediaMode === "single-image" ? "1 hình ảnh" : mediaMode === "multi-image" ? "Nhiều hình ảnh" : "Không có hình ảnh"}</p></div>
              {mediaMode !== "none" && <div className="flex flex-wrap gap-2">
                <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Từ khóa (tùy chọn)..." className="rounded border border-gray-600 bg-primary-black px-3 py-2 text-sm text-primary-white" />
                <button type="button" onClick={searchMedia} disabled={suggestionsMutation.isPending || isPublished} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{suggestionsMutation.isPending ? "Đang tìm…" : keywordInput.trim() ? "Tìm lại" : "Tìm gợi ý"}</button>
              </div>}
            </div>

            {displayedCandidates.length > 0 && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">{displayedCandidates.map((candidate) => {
              const selected = selectedMedia.some((item) => item.providerId === candidate.providerId);
              return <article key={candidate.providerId} className={`overflow-hidden rounded border ${selected ? "border-blue-400" : "border-gray-600"}`}>
                <img src={candidate.imageUrl} alt={candidate.altText} className="h-32 w-full object-cover" />
                <div className="space-y-2 p-3 text-xs text-primary-white">
                  <label className="block">Văn bản thay thế (Alt text)<input value={candidate.altText} onChange={(event) => updateAltText(candidate.providerId, event.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-primary-black p-2" /></label>
                  <p>Ảnh bởi {candidate.photographer}</p>
                  <p>{candidate.attribution}</p>
                  <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="block text-blue-300 underline">Xem trên Pexels</a>
                  <button type="button" onClick={() => toggleMedia(candidate)} className="rounded bg-blue-600 px-3 py-2 text-white">{selected ? "Bỏ chọn" : "Chọn"}</button>
                </div>
              </article>;
            })}</div>}

            {mediaMode !== "none" && <p className={`mt-2 text-sm ${mediaCountValid && altTextValid ? "text-green-300" : "text-yellow-200"}`}>{mediaMode === "single-image" ? "Chọn chính xác 1 hình ảnh kèm văn bản thay thế (alt text)." : "Chọn từ 2–20 hình ảnh kèm văn bản thay thế (alt text)."}</p>}
          </div>
        </>}

        <div className="border-t border-gray-600 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold text-primary-white">Trạng thái xuất bản</h3><p className="text-sm text-gray-300">{linkedinWorkspace ? `LinkedIn: ${publishLinkedin ? statusCopy[publication.linkedinStatus] : "Chưa chọn"}` : `Website: ${publishWeb ? websitePublished ? "Đã xuất bản" : "Sẵn sàng" : "Chưa chọn"} · LinkedIn: ${publishLinkedin ? statusCopy[publication.linkedinStatus] : "Chưa chọn"}`}</p></div>
            {publishLinkedin && <button type="button" onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending} className="rounded border border-blue-400 px-3 py-2 text-sm text-blue-200">{verifyMutation.isPending ? "Đang xác minh…" : "Xác minh tổ chức LinkedIn"}</button>}
          </div>

          {publishLinkedin && verification && <div className="mt-3 rounded border border-gray-600 p-3 text-sm text-gray-200">
            <p>Tổ chức: {organizationName || "Tổ chức đã cấu hình"}</p>
            <p>Sẵn sàng đăng bài tự nhiên: {verification.readyForOrganicPosting ? "Có" : "Không"}</p>
            <p>Vai trò: {verification.roles.map((role) => readProviderText(role, ["role", "roleType", "name"])).filter(Boolean).join(", ") || "Không có dữ liệu"}</p>
            {Object.entries(verification.permissions).map(([key, value]) => <p key={key}>{key}: {value ? "Có" : "Không"}</p>)}
          </div>}

          <p className="mt-2 text-sm text-gray-300">{statusCopy[publication.linkedinStatus]}</p>
          {publication.linkedinError && <p className="mt-2 text-sm text-red-300">{publication.linkedinError.message}</p>}
          {publication.linkedinStatus === "REVIEW_REQUIRED" && <p className="mt-3 rounded border border-red-500 p-3 text-red-200">Kết quả xuất bản LinkedIn có thể chưa rõ ràng. Hãy kiểm tra Trang Doanh nghiệp trước khi thao tác tiếp. Tự động thử lại đã tắt để tránh trùng lặp bài đăng.</p>}
          {isPublished && <p className="mt-3 text-green-300">LinkedIn đã xuất bản {publication.linkedinPublishedAt ? `vào lúc ${formatCmsDate(publication.linkedinPublishedAt)}` : ""}{publication.linkedinPostId ? ` · ID bài đăng: ${publication.linkedinPostId}` : ""}</p>}
          {publication.linkedinStatus === "FAILED" && publication.linkedinError?.retryable === true && <button type="button" onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending} className="mt-3 rounded bg-amber-600 px-4 py-2 text-white">{retryMutation.isPending ? "Đang thử lại…" : "Thử lại LinkedIn"}</button>}
          {settingsDirty && <p className="mt-3 text-sm text-yellow-200">Vui lòng lưu cài đặt kênh trước khi xuất bản.</p>}
          {publishLinkedin && (!mediaCountValid || !altTextValid) && <p className="mt-2 text-sm text-yellow-200">Vui lòng chọn hình ảnh và alt text phù hợp trước khi xuất bản.</p>}
          {canStartPublish && !(publishWeb && !publishLinkedin && websitePublished) && <button type="button" onClick={() => setShowConfirmation(true)} disabled={publishMutation.isPending || publishBlocked} className="mt-3 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{publishLabel}</button>}
        </div>
      </div>

      {showConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-lg bg-primary-black p-6 text-primary-white shadow-xl">
        <h3 className="text-lg font-bold">Xác nhận xuất bản</h3>
        <p className="mt-3">Mục tiêu: {publishWeb ? "Website" : ""}{publishWeb && publishLinkedin ? " + " : ""}{publishLinkedin ? "LinkedIn" : ""}</p>
        {publishLinkedin && <><p>Chế độ LinkedIn: {publication.linkedinMode}</p><p>Liên kết website: {publication.linkedinIncludeWebLink ? "Bao gồm" : "Không bao gồm"}</p><p>Hình ảnh: {savedMedia.length} hình ảnh</p><p>Trạng thái LinkedIn: {statusCopy[publication.linkedinStatus]}</p></>}
        {publishWeb && publishLinkedin && <p className="mt-3 text-sm text-gray-300">Website sẽ được xuất bản trước. Sau đó LinkedIn sẽ được xuất bản tiếp theo.</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowConfirmation(false)} className="rounded border border-gray-500 px-4 py-2">Hủy</button><button type="button" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="rounded bg-emerald-600 px-4 py-2">{publishMutation.isPending ? "Đang xuất bản…" : "Xuất bản ngay"}</button></div>
      </div></div>}
    </section>
  );
};

export default PublicationPanel;
