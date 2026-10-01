import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";
import {
  getPublication,
  updatePublication,
  generateLinkedInDraft,
  saveLinkedInPublication,
  publishBlog,
  suggestLinkedInMedia,
} from "../../services/publication/handlePublication";
import { uploadLinkedInMedia } from "../../services/linkedin/handleLinkedIn";
import { getBlogDetail } from "../../services/blog/handleBlog";
import { apiErrorMessage } from "../../types/Api";
import { PageHeader, ConfirmDialog } from "../../shared/ui";
import PublicationStepper from "./components/PublicationStepper";
import PublicationChannelCard from "./components/PublicationChannelCard";
import PublicationPublishCard from "./components/PublicationPublishCard";
import LinkedInWorkspaceCard from "./components/LinkedInWorkspaceCard";
import RawApiResponseAccordion from "./components/RawApiResponseAccordion";
import type {
  FactualReview,
  LinkedInMediaAsset,
  LinkedInMode,
  PexelsCandidate,
} from "../../types/Publication";
import { linkedinMediaKey } from "../../utils/linkedinMedia";

// Orchestrate publication configuration, multi-channel stepper, and dual-column workspace.
const PublicationConfigPage: React.FC = () => {
  const { blog_id: blogId = "" } = useParams<{ blog_id: string }>();
  const client = useQueryClient();

  const [mode, setMode] = useState<LinkedInMode>("SAME");
  const [publishWeb, setPublishWeb] = useState(true);
  const [publishLinkedin, setPublishLinkedin] = useState(false);
  const [includeWebLink, setIncludeWebLink] = useState(false);
  const [content, setContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<LinkedInMediaAsset[]>([]);
  const [suggestions, setSuggestions] = useState<PexelsCandidate[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [factCheck, setFactCheck] = useState<FactualReview>({
    requiresHumanFactCheck: false,
    factCheckNotes: [],
  });
  const [factCheckAcknowledged, setFactCheckAcknowledged] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  const blogQuery = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId),
    enabled: Boolean(blogId),
  });

  const pubQuery = useQuery({
    queryKey: ["publication", blogId],
    queryFn: () => getPublication(blogId),
    enabled: Boolean(blogId),
  });

  const pub = pubQuery.data;

  useEffect(() => {
    if (pub) {
      setMode(pub.linkedinMode || "SAME");
      setPublishWeb(pub.publishWeb);
      setPublishLinkedin(pub.publishLinkedin);
      setIncludeWebLink(pub.linkedinIncludeWebLink ?? false);
      setContent(pub.linkedinContent || "");
      setSelectedMedia(pub.linkedinMedia.filter((m): m is LinkedInMediaAsset => "provider" in m));
      setSettingsDirty(false);
    }
  }, [pub]);

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      updatePublication(blogId, {
        publishWeb,
        publishLinkedin,
        linkedinMode: mode,
        linkedinIncludeWebLink: includeWebLink,
      }),
    onSuccess: () => {
      toast.success("Đã lưu cấu hình kênh thành công.");
      setSettingsDirty(false);
      client.invalidateQueries({ queryKey: ["publication", blogId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const draftMutation = useMutation({
    mutationFn: () =>
      generateLinkedInDraft(blogId, {
        mode: (mode === "CUSTOM" ? "SAME" : mode) as "SAME" | "SUMMARY",
        includeWebLink,
        regenerate: true,
      }),
    onSuccess: (data) => {
      toast.success("Đã tạo bản nháp LinkedIn.");
      setContent(data.content || "");
      if (data.factualReview) setFactCheck(data.factualReview);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      saveLinkedInPublication(blogId, {
        content,
        media: selectedMedia,
      }),
    onSuccess: () => {
      toast.success("Đã lưu bản nháp LinkedIn.");
      client.invalidateQueries({ queryKey: ["publication", blogId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishBlog(blogId),
    onSuccess: () => {
      toast.success("Đã kích hoạt xuất bản bài viết.");
      setShowConfirmPublish(false);
      client.invalidateQueries({ queryKey: ["publication", blogId] });
      client.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const searchMediaMutation = useMutation({
    mutationFn: (keywords: string[]) => suggestLinkedInMedia(blogId, { keywords }),
    onSuccess: (data) => setSuggestions(data),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results: LinkedInMediaAsset[] = [];
      for (const file of files) {
        const up = await uploadLinkedInMedia(file);
        results.push({
          provider: "upload",
          objectKey: up.objectKey,
          fileName: up.fileName,
          altText: up.altText || "",
          order: selectedMedia.length + results.length + 1,
        });
      }
      return results;
    },
    onSuccess: (items) => {
      toast.success(`Đã tải lên ${items.length} ảnh.`);
      setSelectedMedia((prev) => [...prev, ...items]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const isApproved = blogQuery.data?.state === "APPROVED";
  const webPublished = publishWeb && isApproved;
  const isPublished = pub?.linkedinStatus === "PUBLISHED";
  const hasChannel = publishWeb || publishLinkedin;
  const canPublish =
    isApproved &&
    hasChannel &&
    !settingsDirty &&
    (!publishLinkedin || Boolean(content.trim()));

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/publications"
          title="Quay lại danh sách xuất bản"
          aria-label="Quay lại danh sách xuất bản"
          className="size-9 inline-flex items-center justify-center rounded-lg border border-surface-border bg-surface-card text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
        >
          <FiArrowLeft className="text-base" />
        </Link>
        <PageHeader
          title={blogQuery.data?.title ? `Xuất bản: ${blogQuery.data.title}` : "Cấu hình xuất bản"}
          description="Thiết lập kênh phát hành, nội dung LinkedIn và tiến trình xuất bản đa nền tảng."
        />
      </div>

      <PublicationStepper
        isApproved={isApproved}
        webPublished={webPublished}
        publishWeb={publishWeb}
        publishLinkedin={publishLinkedin}
        linkedinStatus={pub?.linkedinStatus || "NOT_SELECTED"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <PublicationChannelCard
            publishWeb={publishWeb}
            publishLinkedin={publishLinkedin}
            mode={mode}
            includeWebLink={includeWebLink}
            settingsDirty={settingsDirty}
            isSaving={saveSettingsMutation.isPending}
            isPublished={isPublished}
            onToggleWeb={() => {
              setPublishWeb(!publishWeb);
              setSettingsDirty(true);
            }}
            onToggleLinkedin={() => {
              setPublishLinkedin(!publishLinkedin);
              setSettingsDirty(true);
            }}
            onChangeMode={(m) => {
              setMode(m);
              setSettingsDirty(true);
            }}
            onToggleWebLink={(c) => {
              setIncludeWebLink(c);
              setSettingsDirty(true);
            }}
            onSaveSettings={() => saveSettingsMutation.mutate()}
          />

          <PublicationPublishCard
            isApproved={isApproved}
            hasChannel={hasChannel}
            settingsDirty={settingsDirty}
            canPublish={canPublish}
            isPublishing={publishMutation.isPending}
            publishLabel="Xuất bản"
            onPublishClick={() => setShowConfirmPublish(true)}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <LinkedInWorkspaceCard
            publishLinkedin={publishLinkedin}
            settingsDirty={settingsDirty}
            content={content}
            onContentChange={setContent}
            isGeneratingDraft={draftMutation.isPending}
            onGenerateDraft={() => draftMutation.mutate()}
            mediaMode="multi-image"
            candidates={[...selectedMedia, ...suggestions]}
            selectedMedia={selectedMedia}
            onToggleMedia={(cand) => {
              const k = linkedinMediaKey(cand);
              setSelectedMedia((prev) =>
                prev.some((i) => linkedinMediaKey(i) === k)
                  ? prev.filter((i) => linkedinMediaKey(i) !== k)
                  : [...prev, cand]
              );
            }}
            onMoveMedia={(key, delta) => {
              const idx = selectedMedia.findIndex((i) => linkedinMediaKey(i) === key);
              if (idx < 0 || idx + delta < 0 || idx + delta >= selectedMedia.length) return;
              const next = [...selectedMedia];
              [next[idx], next[idx + delta]] = [next[idx + delta], next[idx]];
              setSelectedMedia(next);
            }}
            onUpdateAltText={(key, text) => {
              setSelectedMedia((prev) =>
                prev.map((i) => (linkedinMediaKey(i) === key ? { ...i, altText: text } : i))
              );
            }}
            onUploadMedia={(files) => uploadMutation.mutate(files)}
            isUploading={uploadMutation.isPending}
            keywordInput={keywordInput}
            onKeywordChange={setKeywordInput}
            onSearchMedia={() => searchMediaMutation.mutate(keywordInput.split(",").map((s) => s.trim()))}
            isSearchingMedia={searchMediaMutation.isPending}
            factCheck={factCheck}
            factCheckAcknowledged={factCheckAcknowledged}
            onAcknowledgeFactCheck={setFactCheckAcknowledged}
            onSaveDraft={() => saveDraftMutation.mutate()}
            canSaveDraft={Boolean(content.trim())}
            isSavingDraft={saveDraftMutation.isPending}
            isPublished={isPublished}
          />

          <RawApiResponseAccordion data={pub} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmPublish}
        title="Xác nhận xuất bản bài viết"
        message={`Bài viết sẽ được kích hoạt xuất bản tới các kênh: ${publishWeb ? "Website" : ""}${publishWeb && publishLinkedin ? " & " : ""}${publishLinkedin ? "LinkedIn" : ""}.`}
        confirmLabel="Xuất bản ngay"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setShowConfirmPublish(false)}
      />
    </section>
  );
};

export default PublicationConfigPage;
