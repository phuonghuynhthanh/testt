import { ConfirmDialog, SectionHeading } from "../../../shared/ui";
import { Copy, PencilSimple, Sparkle } from "@phosphor-icons/react";
import LinkedInPostMediaCard from "./LinkedInPostMediaCard";
import LinkedInSidePanel from "./LinkedInSidePanel";
import LinkedInWorkspaceCard from "./LinkedInWorkspaceCard";
import { usePublicationConfig } from "../hooks/usePublicationConfig";
import { linkedinMediaKey } from "../../../utils/linkedinMedia";
import type { LinkedInMediaAsset, LinkedInMediaMode, LinkedInMode } from "../../../types/Publication";
import { apiErrorMessage } from "../../../types/Api";

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

  if (editor.isLoading) return <p className="py-10 text-center text-xs text-content-muted">Đang tải bản nháp LinkedIn…</p>;
  if (editor.isError || !pub) return <p className="py-10 text-center text-xs text-rose-400">Không thể tải bản nháp LinkedIn. Vui lòng tải lại trang.</p>;

  const lastErrorMessage = pub.linkedinError ? apiErrorMessage(pub.linkedinError) : undefined;
  const modes = [
    ["SUMMARY", "Tóm tắt bằng AI", "Tạo bản tóm tắt để bạn kiểm tra và chỉnh sửa.", Sparkle],
    ["SAME", "Chuyển nguyên bài", "Chuyển bài website thành văn bản LinkedIn.", Copy],
    ["CUSTOM", "Tự viết", "Soạn nội dung LinkedIn theo ý bạn.", PencilSimple],
  ] as const;

  return (
    <div>
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="panel p-4 space-y-4">
            <SectionHeading title="1. Chọn cách soạn bài LinkedIn" />
            <div className="grid gap-3 sm:grid-cols-3">
              {modes.map(([value, label, description, Icon]) => (
                <button
                  key={value}
                  type="button"
                  disabled={locked}
                  aria-pressed={mode === value}
                  onClick={() => { editor.setMode(value as LinkedInMode); editor.setDirty(true); }}
                  className={`rounded-xl border p-3.5 text-left text-xs transition-all duration-300 ${
                    mode === value
                      ? "border-primary-green bg-primary-green/10"
                      : "border-surface-border bg-surface-elevated hover:border-content-muted/40"
                  }`}
                >
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <Icon size={16} weight="light" className={mode === value ? "text-primary-green" : "text-content-muted"} />
                    {label}
                  </span>
                  <span className="block leading-relaxed text-content-muted">{description}</span>
                </button>
              ))}
            </div>
            <p className="hint">Đổi cách soạn giữ nguyên nội dung hiện tại. Bạn có thể chỉnh sửa nội dung trước khi đăng.</p>

            <div>
              <label className="label">Vị trí liên kết website</label>
              <div className="seg">
                {(["NONE", "IN_POST"] as const).map((placement) => (
                  <button
                    key={placement}
                    type="button"
                    disabled={locked}
                    aria-selected={linkPlacement === placement}
                    onClick={() => { editor.setLinkPlacement(placement); editor.setDirty(true); }}
                  >
                    {placement === "NONE" ? "Không chèn liên kết" : "Chèn liên kết trong bài"}
                  </button>
                ))}
              </div>
              <p className="hint mt-2">Hệ thống xác định URL bài website khi đăng; nội dung đã duyệt luôn không chứa URL.</p>
            </div>
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
            showLanguageSelect={mode === "SUMMARY"}
            generationLanguage={language}
            onLanguageChange={editor.setLanguage}
            media={selectedMedia}
            factCheck={factCheck}
            factCheckAcknowledged={factCheckAcknowledged}
            onAcknowledgeFactCheck={(value) => { editor.setFactCheckAcknowledged(value); editor.setDirty(true); }}
            isPublished={locked}
          />

          <LinkedInPostMediaCard
            immutable={locked}
            mediaMode={mediaMode}
            onMediaModeChange={changeMediaMode}
            keywords={keywordInput}
            onKeywordsChange={editor.setKeywordInput}
            onSearchMedia={() => editor.searchMediaMutation.mutate(keywordInput.split(/[\n,]+/).map((key) => key.trim()).filter(Boolean))}
            isSearchingMedia={editor.searchMediaMutation.isPending}
            onUploadMedia={(files) => editor.uploadMutation.mutate(files)}
            isUploadingMedia={editor.uploadMutation.isPending}
            candidates={displayedCandidates}
            media={selectedMedia}
            onToggleCandidate={toggleMedia}
            onMoveMedia={moveMedia}
            onAltTextChange={updateAltText}
            onAddAiGeneratedMedia={(item) => {
              editor.setSuggestions((current) => [item, ...current]);
              editor.setDirty(true);
            }}
            topic=""
            content={content}
          />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:col-span-5">
          <LinkedInSidePanel
            status={pub.linkedinStatus === "NOT_SELECTED" ? undefined : pub.linkedinStatus}
            lastErrorMessage={lastErrorMessage}
            publishedLinkUrl={null}
            showTopicCheck={false}
            topic=""
            content={content}
            mediaMode={mediaMode}
            media={selectedMedia}
            requiresFactCheck={factCheck.requiresHumanFactCheck}
            factCheckAcknowledged={factCheckAcknowledged}
            immutable={immutable}
            canSave={canSaveDraft}
            canPublish={canPublish}
            canRetry={canRetry}
            isSaving={editor.saveDraftMutation.isPending}
            isPublishing={editor.publishMutation.isPending}
            isRetrying={editor.retryMutation.isPending}
            onSave={() => editor.saveDraftMutation.mutate()}
            onPublish={() => editor.setShowConfirmPublish(true)}
            onRetry={() => editor.setShowConfirmPublish(true)}
          />
          <p role="status" className="hint">{guidance}</p>
        </aside>
      </div>

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
