import React from "react";
import { ConfirmDialog } from "../../../shared/ui";
import PublicationStepper from "./PublicationStepper";
import PublicationChannelCard from "./PublicationChannelCard";
import PublicationPublishCard from "./PublicationPublishCard";
import LinkedInWorkspaceCard from "./LinkedInWorkspaceCard";
import { usePublicationConfig } from "../hooks/usePublicationConfig";
import { linkedinMediaKey } from "../../../utils/linkedinMedia";
import { formatCmsDate } from "../../../utils/date";
import type { LinkedInMediaAsset } from "../../../types/Publication";

interface PublicationConfigWorkspaceProps {
  blogId: string;
  blogState?: string;
  showStepper?: boolean;
  title?: string;
  description?: string;
  blogSaveVersion?: number;
}

// Read a useful organization name without depending on undocumented provider keys.
const readProviderName = (value: Record<string, unknown>): string => {
  for (const key of ["localizedName", "name", "vanityName", "id"]) {
    if (typeof value[key] === "string" && value[key]) return String(value[key]);
  }
  return "Tổ chức đã cấu hình";
};

// Render the synchronized multi-channel publication workspace with stepper and responsive columns.
export const PublicationConfigWorkspace: React.FC<PublicationConfigWorkspaceProps> = ({
  blogId,
  blogState,
  showStepper = true,
  title,
  description,
  blogSaveVersion = 0,
}) => {
  const {
    mode,
    publishWeb,
    publishLinkedin,
    includeWebLink,
    setIncludeWebLink,
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
    settingsDirty,
    showConfirmPublish,
    setShowConfirmPublish,
    pendingConfirmation,
    setPendingConfirmation,
    draftStale,
    verification,
    pub,
    isLoading,
    isError,
    isApproved,
    webPublished,
    isPublished,
    hasChannel,
    canPublish,
    canSaveDraft,
    mediaCountValid,
    altTextValid,
    toggleChannel,
    changeMode,
    generateDraft,
    confirmPendingAction,
    saveSettingsMutation,
    draftMutation,
    saveDraftMutation,
    publishMutation,
    searchMediaMutation,
    uploadMutation,
    retryMutation,
    verifyMutation,
  } = usePublicationConfig(blogId, blogState, blogSaveVersion);

  // Toggle selection of media candidate in LinkedIn workspace.
  const handleToggleMedia = (cand: LinkedInMediaAsset) => {
    const k = linkedinMediaKey(cand);
    setSelectedMedia((prev) =>
      prev.some((i) => linkedinMediaKey(i) === k)
        ? prev
            .filter((i) => linkedinMediaKey(i) !== k)
            .map((item, index) => ({ ...item, order: index + 1 }))
        : [...prev, cand]
            .slice(0, mediaMode === "single-image" ? 1 : 20)
            .map((item, index) => ({ ...item, order: index + 1 }))
    );
  };

  // Move selected media position forward or backward in display order.
  const handleMoveMedia = (key: string, delta: number) => {
    const idx = selectedMedia.findIndex((i) => linkedinMediaKey(i) === key);
    if (idx < 0 || idx + delta < 0 || idx + delta >= selectedMedia.length) return;
    const next = [...selectedMedia];
    [next[idx], next[idx + delta]] = [next[idx + delta], next[idx]];
    setSelectedMedia(next.map((item, index) => ({ ...item, order: index + 1 })));
  };

  // Update alt text for a specific LinkedIn media asset.
  const handleUpdateAltText = (key: string, text: string) => {
    setSuggestions((prev) =>
      prev.map((item) => (linkedinMediaKey(item) === key ? { ...item, altText: text } : item))
    );
    setSelectedMedia((prev) =>
      prev.map((i) => (linkedinMediaKey(i) === key ? { ...i, altText: text } : i))
    );
  };

  // Convert comma or newline separated phrases into backend search keywords.
  const handleSearchMedia = () => {
    const keywords = keywordInput
      .split(/[\n,]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    searchMediaMutation.mutate(keywords);
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-content-muted">Đang tải cấu hình xuất bản…</div>;
  }
  if (isError || !pub) {
    return <div className="py-10 text-center text-sm text-rose-400">Không thể tải cấu hình xuất bản.</div>;
  }

  const pendingMessage = pendingConfirmation?.kind === "disable-linkedin"
    ? "Tắt LinkedIn sẽ hủy các chỉnh sửa nội dung và hình ảnh cục bộ chưa lưu."
    : pendingConfirmation?.kind === "change-mode"
      ? "Thay đổi chế độ sẽ thay thế bản nháp và hình ảnh LinkedIn hiện tại."
      : "Các chỉnh sửa LinkedIn chưa lưu sẽ bị thay thế bằng bản nháp mới.";
  const displayedCandidates = [
    ...selectedMedia,
    ...suggestions.filter(
      (candidate) =>
        !selectedMedia.some((item) => linkedinMediaKey(item) === linkedinMediaKey(candidate)),
    ),
  ];

  return (
    <div className="space-y-6">
      {title && (
        <div className="border-b border-surface-border pb-4">
          <h2 className="text-lg font-bold text-content-primary">{title}</h2>
          {description && <p className="text-xs text-content-muted mt-0.5">{description}</p>}
        </div>
      )}

      {showStepper && (
        <PublicationStepper
          isApproved={isApproved}
          webPublished={webPublished}
          publishWeb={publishWeb}
          publishLinkedin={publishLinkedin}
          linkedinStatus={pub?.linkedinStatus || "NOT_SELECTED"}
        />
      )}

      <div className="space-y-6">
        <div className="space-y-6">
          <PublicationChannelCard
            publishWeb={publishWeb}
            publishLinkedin={publishLinkedin}
            mode={mode}
            includeWebLink={includeWebLink}
            settingsDirty={settingsDirty}
            isSaving={saveSettingsMutation.isPending}
            isPublished={isPublished}
            onToggleWeb={() => toggleChannel("web")}
            onToggleLinkedin={() => toggleChannel("linkedin")}
            onChangeMode={changeMode}
            onToggleWebLink={setIncludeWebLink}
            onSaveSettings={() => saveSettingsMutation.mutate()}
          />

        </div>

        <div className="space-y-6">
          {draftStale && ["SAME", "SUMMARY"].includes(pub.linkedinMode) && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300">
              Bài viết website đã thay đổi sau khi bản nháp LinkedIn được tạo. Hãy tạo lại trước khi xuất bản.
            </p>
          )}
          {publishLinkedin && <LinkedInWorkspaceCard
            publishLinkedin={publishLinkedin}
            settingsDirty={settingsDirty}
            content={content}
            onContentChange={setContent}
            isGeneratingDraft={draftMutation.isPending}
            onGenerateDraft={generateDraft}
            showGenerateDraft={mode !== "CUSTOM"}
            mediaMode={mediaMode}
            candidates={displayedCandidates}
            selectedMedia={selectedMedia}
            onToggleMedia={handleToggleMedia}
            onMoveMedia={handleMoveMedia}
            onUpdateAltText={handleUpdateAltText}
            onUploadMedia={(files) => uploadMutation.mutate(files)}
            isUploading={uploadMutation.isPending}
            keywordInput={keywordInput}
            onKeywordChange={setKeywordInput}
            onSearchMedia={handleSearchMedia}
            isSearchingMedia={searchMediaMutation.isPending}
            factCheck={factCheck}
            factCheckAcknowledged={factCheckAcknowledged}
            onAcknowledgeFactCheck={setFactCheckAcknowledged}
            onSaveDraft={() => saveDraftMutation.mutate()}
            canSaveDraft={canSaveDraft}
            isSavingDraft={saveDraftMutation.isPending}
            isPublished={isPublished}
          />}

          {publishLinkedin && (
            <div className="rounded-xl border border-surface-border bg-surface-card p-5 text-xs text-content-secondary shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-content-primary text-sm">Trạng thái LinkedIn</h3>
                  <p className="mt-1">{{ NOT_SELECTED: "Chưa chọn kênh", DRAFT: "Bản nháp", READY: "Sẵn sàng", PUBLISHING: "Đang đăng bài", PUBLISHED: "Đã đăng", FAILED: "Đăng thất bại", REVIEW_REQUIRED: "Cần kiểm tra trên LinkedIn" }[pub.linkedinStatus]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                  className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 font-medium text-content-primary disabled:opacity-50"
                >
                  {verifyMutation.isPending ? "Đang xác minh…" : "Xác minh tổ chức LinkedIn"}
                </button>
              </div>
              {verification && (
                <p>
                  {readProviderName(verification.organization)}: {verification.readyForOrganicPosting ? "Sẵn sàng đăng bài" : "Chưa sẵn sàng"}.
                </p>
              )}
              {pub.linkedinError && <p className="text-rose-400">{pub.linkedinError.message}</p>}
              {pub.linkedinStatus === "REVIEW_REQUIRED" && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-amber-300">
                  Kết quả xuất bản chưa rõ ràng. Hãy kiểm tra Trang Doanh nghiệp trước khi thao tác tiếp.
                </p>
              )}
              {isPublished && (
                <p className="text-emerald-400">
                  Đã xuất bản {pub.linkedinPublishedAt ? `vào lúc ${formatCmsDate(pub.linkedinPublishedAt)}` : ""}.
                </p>
              )}
              {pub.linkedinStatus === "FAILED" && pub.linkedinError?.retryable === true && (
                <button
                  type="button"
                  onClick={() => retryMutation.mutate()}
                  disabled={retryMutation.isPending}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                >
                  {retryMutation.isPending ? "Đang thử lại…" : "Thử lại LinkedIn"}
                </button>
              )}
              {(!mediaCountValid || !altTextValid) && (
                <p className="text-amber-300">Vui lòng chọn đúng số lượng ảnh và bổ sung alt text trước khi lưu hoặc xuất bản.</p>
              )}
            </div>
          )}
        </div>
      </div>

          <PublicationPublishCard
            isApproved={isApproved}
            hasChannel={hasChannel}
            settingsDirty={settingsDirty}
            canPublish={canPublish}
            isPublishing={publishMutation.isPending}
            publishLabel="Xuất bản"
            requiresApproval={publishLinkedin}
            guidance={settingsDirty
              ? "Bước tiếp theo: lưu lựa chọn kênh ở phía trên."
              : !hasChannel
                ? "Chọn ít nhất một kênh đăng bài."
                : publishLinkedin && !isApproved
                  ? "Bài viết cần được duyệt trong danh sách bài viết trước khi tiếp tục."
                  : publishLinkedin && isPublished
                    ? "Bài LinkedIn đã được đăng. Không cần xuất bản lại."
                    : publishLinkedin && !content.trim()
                      ? "Soạn hoặc tạo bản nháp LinkedIn ở phần bên dưới."
                      : publishLinkedin && (!mediaCountValid || !altTextValid)
                        ? "Chọn đủ ảnh và nhập mô tả cho từng ảnh LinkedIn."
                        : publishLinkedin && factCheck.requiresHumanFactCheck && !factCheckAcknowledged
                          ? "Xác nhận đã kiểm tra thông tin trong phần nội dung LinkedIn."
                          : !canPublish
                            ? "Kiểm tra trạng thái LinkedIn bên dưới để tiếp tục."
                            : "Bấm Xuất bản để đăng công khai lên các kênh đã chọn. Một hộp xác nhận sẽ mở trước khi đăng."}
            onPublishClick={() => setShowConfirmPublish(true)}
          />

      <ConfirmDialog
        isOpen={showConfirmPublish}
        title="Xác nhận xuất bản bài viết"
        message={`Kích hoạt xuất bản bài viết này tới các kênh đã chọn (${publishWeb ? "Website" : ""}${publishWeb && publishLinkedin ? " & " : ""}${publishLinkedin ? "LinkedIn" : ""})?`}
        confirmLabel="Xuất bản ngay"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setShowConfirmPublish(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingConfirmation)}
        title="Xác nhận thay đổi"
        message={pendingMessage}
        confirmLabel="Tiếp tục"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={draftMutation.isPending}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
};

export default PublicationConfigWorkspace;
