import { BottomActionBar, ConfirmDialog } from "../../../shared/ui";
import LinkedInWorkspaceCard from "./LinkedInWorkspaceCard";
import { usePublicationConfig } from "../hooks/usePublicationConfig";
import { linkedinMediaKey } from "../../../utils/linkedinMedia";
import type { LinkedInMediaAsset, LinkedInMediaMode, LinkedInMode } from "../../../types/Publication";
import { PostLanguageSelect } from "../../../shared/ui/PostLanguageSelect";
import { AIImagePanel } from "../../../shared/media/AIImagePanel";

const STATUS_LABELS = {
  NOT_SELECTED: "Chưa có bản nháp", DRAFT: "Bản nháp", READY: "Sẵn sàng",
  PUBLISHING: "Đang đăng bài", PUBLISHED: "Đã đăng", FAILED: "Đăng thất bại",
  REVIEW_REQUIRED: "Cần kiểm tra trên LinkedIn",
};

// Compose the LinkedIn editor and image picker for one approved website article.
export const PublicationConfigWorkspace = ({ blogId }: { blogId: string }) => {
  const editor = usePublicationConfig(blogId);
  const {
    mode, language, linkPlacement, content, mediaMode, selectedMedia, suggestions, keywordInput,
    factCheck, factCheckAcknowledged, pub, immutable, busy, guidance,
    canSaveDraft, canPublish, canRetry,
  } = editor;
  const locked = immutable || busy;
  const displayedCandidates = [
    ...selectedMedia,
    ...suggestions.filter((candidate) =>
      !selectedMedia.some((item) => linkedinMediaKey(item) === linkedinMediaKey(candidate))),
  ];

  // Toggle selection while maintaining contiguous order and single-image replacement.
  const toggleMedia = (candidate: LinkedInMediaAsset) => {
    const key = linkedinMediaKey(candidate);
    editor.setSelectedMedia((current) => (
      current.some((item) => linkedinMediaKey(item) === key)
        ? current.filter((item) => linkedinMediaKey(item) !== key)
        : mediaMode === "single-image" ? [candidate] : [...current, candidate].slice(0, 20)
    ).map((item, index) => ({ ...item, order: index + 1 })));
    editor.setDirty(true);
  };

  // Move one image without allowing positions outside the selected list.
  const moveMedia = (key: string, delta: number) => {
    const index = selectedMedia.findIndex((item) => linkedinMediaKey(item) === key);
    if (index < 0 || index + delta < 0 || index + delta >= selectedMedia.length) return;
    const next = [...selectedMedia];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    editor.setSelectedMedia(next.map((item, position) => ({ ...item, order: position + 1 })));
    editor.setDirty(true);
  };

  // Apply image mode changes using the same selection limits as standalone LinkedIn posts.
  const changeMediaMode = (next: LinkedInMediaMode) => {
    editor.setMediaMode(next);
    if (next === "none") editor.setSelectedMedia([]);
    if (next === "single-image") editor.setSelectedMedia((current) => current.slice(0, 1));
    editor.setDirty(true);
  };

  // Keep selected-image descriptions synchronized with search results.
  const updateAltText = (key: string, text: string) => {
    editor.setSelectedMedia((current) => current.map((item) =>
      linkedinMediaKey(item) === key ? { ...item, altText: text } : item));
    editor.setSuggestions((current) => current.map((item) =>
      linkedinMediaKey(item) === key ? { ...item, altText: text } : item));
    editor.setDirty(true);
  };

  if (editor.isLoading) return <p className="py-10 text-center text-content-muted">Đang tải bản nháp LinkedIn…</p>;
  if (editor.isError || !pub) return <p className="py-10 text-center text-rose-400">Không thể tải bản nháp LinkedIn. Vui lòng tải lại trang.</p>;

  return (
    <div className="space-y-6 pb-48 sm:pb-32">
      <div className="rounded-xl border border-surface-border bg-surface-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-content-primary">1. Chọn cách soạn bài LinkedIn</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["SUMMARY", "Tóm tắt bằng AI", "Tạo bản tóm tắt để bạn kiểm tra và chỉnh sửa."],
            ["SAME", "Chuyển nguyên bài", "Chuyển bài website thành văn bản LinkedIn."],
            ["CUSTOM", "Tự viết", "Soạn nội dung LinkedIn theo ý bạn."],
          ] as const).map(([value, label, description]) => (
            <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs ${mode === value ? "border-primary-green bg-primary-green/10" : "border-surface-border"}`}>
              <input type="radio" name="linkedin-mode" value={value} checked={mode === value} disabled={locked}
                onChange={() => { editor.setMode(value as LinkedInMode); editor.setDirty(true); }} />
              <span><span className="block font-semibold text-content-primary">{label}</span><span className="mt-1 block text-content-muted">{description}</span></span>
            </label>
          ))}
        </div>
        {mode === "SUMMARY" && <PostLanguageSelect value={language} onChange={editor.setLanguage} disabled={locked} />}
        <p className="text-xs text-content-muted">Đổi cách soạn giữ nguyên nội dung hiện tại. Bạn có thể chỉnh sửa nội dung trước khi đăng.</p>
        <div className="flex flex-wrap gap-2">{(["NONE", "IN_POST"] as const).map((placement) => <button key={placement} type="button" disabled={locked} onClick={() => { editor.setLinkPlacement(placement); editor.setDirty(true); }} className={`rounded-lg border px-3 py-2 text-xs ${linkPlacement === placement ? "border-primary-green bg-primary-green/10 text-content-primary" : "border-surface-border text-content-muted"}`}>{placement === "NONE" ? "Không liên kết" : "Trong bài đăng"}</button>)}</div>
        <p className="text-xs text-content-muted">Hệ thống xác định URL bài website khi đăng; nội dung đã duyệt luôn không chứa URL.</p>
      </div>

      <LinkedInWorkspaceCard
        content={content}
        blogId={blogId}
        linkPlacement={linkPlacement}
        language={editor.generation.language ?? "vietnamese"}
        onContentChange={(value) => { editor.setContent(value); editor.setDirty(true); }}
        isGeneratingDraft={editor.draftMutation.isPending}
        onGenerateDraft={editor.generateDraft}
        showGenerateDraft={mode !== "CUSTOM"}
        mediaMode={mediaMode}
        onMediaModeChange={changeMediaMode}
        candidates={displayedCandidates}
        selectedMedia={selectedMedia}
        onToggleMedia={toggleMedia}
        onMoveMedia={moveMedia}
        onUpdateAltText={updateAltText}
        onUploadMedia={(files) => editor.uploadMutation.mutate(files)}
        isUploading={editor.uploadMutation.isPending}
        keywordInput={keywordInput}
        onKeywordChange={editor.setKeywordInput}
        onSearchMedia={() => editor.searchMediaMutation.mutate(keywordInput.split(/[\n,]+/).map((key) => key.trim()).filter(Boolean))}
        isSearchingMedia={editor.searchMediaMutation.isPending}
        factCheck={factCheck}
        factCheckAcknowledged={factCheckAcknowledged}
        onAcknowledgeFactCheck={(value) => { editor.setFactCheckAcknowledged(value); editor.setDirty(true); }}
        isPublished={locked}
      />
      {!locked && <AIImagePanel purpose="LINKEDIN" context={content} onUse={(generated) => {
        editor.setSuggestions((current) => [generated.media, ...current]);
        editor.setDirty(true);
      }} />}

      <div className="rounded-xl border border-surface-border bg-surface-card p-5 space-y-2 text-xs">
        <h2 className="font-semibold text-content-primary">Trạng thái LinkedIn: {STATUS_LABELS[pub.linkedinStatus]}</h2>
        {pub.linkedinError && <p className="text-rose-400">{pub.linkedinError.message}</p>}
        {pub.linkedinStatus === "REVIEW_REQUIRED" && <p className="text-amber-300">Kết quả đăng chưa rõ ràng. Kiểm tra Trang Doanh nghiệp LinkedIn để tránh đăng trùng.</p>}
        {pub.linkedinPublishedAt && <p className="text-content-muted">Thời gian đăng: {pub.linkedinPublishedAt}</p>}

      </div>

      <BottomActionBar>
        <p role="status" className="max-w-md text-xs text-content-muted">{guidance}</p>
        <div className="flex flex-wrap gap-2">
          {!immutable && <button type="button" disabled={!canSaveDraft} onClick={() => editor.saveDraftMutation.mutate()}
            className="rounded-lg border border-surface-border bg-surface-elevated px-4 py-2.5 text-xs font-medium text-content-primary disabled:opacity-40">
            {editor.saveDraftMutation.isPending ? "Đang lưu…" : "Lưu bản nháp LinkedIn"}
          </button>}
          {!immutable && pub.linkedinStatus !== "FAILED" && <button type="button" disabled={!canPublish} onClick={() => editor.setShowConfirmPublish(true)}
            className="rounded-lg bg-[#0a66c2] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">
            {editor.publishMutation.isPending ? "Đang đăng…" : "Đăng lên LinkedIn"}
          </button>}
          {pub.linkedinStatus === "FAILED" && pub.linkedinError?.retryable === true &&
            <button type="button" disabled={!canRetry} onClick={() => editor.setShowConfirmPublish(true)}
              className="rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">
              {editor.retryMutation.isPending ? "Đang thử lại…" : "Thử lại LinkedIn"}
            </button>}
        </div>
      </BottomActionBar>

      <ConfirmDialog isOpen={editor.showConfirmPublish} title="Xác nhận đăng lên LinkedIn"
        message={`Bài sẽ được đăng công khai lên Trang Doanh nghiệp LinkedIn với ${selectedMedia.length} ảnh${linkPlacement === "NONE" ? ", không đính kèm liên kết website" : " và liên kết do hệ thống thêm khi xuất bản"}. Nội dung website không thay đổi.`}
        confirmLabel={pub.linkedinStatus === "FAILED" ? "Thử lại LinkedIn" : "Đăng bài ngay"}
        cancelLabel="Hủy" variant="primary" isLoading={editor.publishMutation.isPending || editor.retryMutation.isPending}
        onConfirm={() => {
          if (pub.linkedinStatus === "FAILED") { editor.setShowConfirmPublish(false); editor.retryMutation.mutate(); }
          else editor.publishMutation.mutate();
        }}
        onCancel={() => editor.setShowConfirmPublish(false)} />
      <ConfirmDialog isOpen={editor.pendingRegenerate !== null} title="Tạo lại nội dung LinkedIn?"
        message="Nội dung hiện tại sẽ bị thay thế. Kiểm tra bản nháp mới trước khi lưu hoặc đăng."
        confirmLabel="Tạo lại" cancelLabel="Giữ nội dung" variant="danger" isLoading={editor.draftMutation.isPending}
        onConfirm={() => { const regenerate = editor.pendingRegenerate ?? false; editor.setPendingRegenerate(null); editor.draftMutation.mutate(regenerate); }}
        onCancel={() => editor.setPendingRegenerate(null)} />
    </div>
  );
};

export default PublicationConfigWorkspace;
