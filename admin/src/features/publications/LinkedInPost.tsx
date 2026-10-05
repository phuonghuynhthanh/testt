import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Warning } from "@phosphor-icons/react";
import {
  createLinkedInPost,
  generateLinkedInDraft,
  getLinkedInPost,
  proposeLinkedInTopics,
  publishLinkedInPost,
  retryLinkedInPost,
  searchLinkedInMedia,
  suggestPostMedia,
  updateLinkedInPost,
  uploadLinkedInMedia,
} from "../../services/linkedin/handleLinkedIn";
import { apiErrorMessage } from "../../types/Api";
import type { LinkedInAudience, LinkedInSourceType } from "../../types/LinkedIn";
import type { FactualReview, GeneratedLinkedInPost, LinkedInLinkPlacement, LinkedInMediaAsset, LinkedInMediaMode } from "../../types/Publication";
import type { PostLanguage } from "../../types/Language";
import { LinkedInContentEditor } from "./components/LinkedInContentEditor";
import { LinkedInPostTopicCard } from "./components/LinkedInPostTopicCard";
import { LinkedInPostMediaCard } from "./components/LinkedInPostMediaCard";
import { LinkedInSidePanel } from "./components/LinkedInSidePanel";
import { PageHeader, ConfirmDialog, StatusBadge } from "../../shared/ui";
import { linkedinMediaKey } from "../../utils/linkedinMedia";

const EMPTY_FACT_CHECK: FactualReview = { requiresHumanFactCheck: false, factCheckNotes: [] };

// Normalize factual-review data from older saved drafts.
const normalizeFactCheck = (val?: Partial<FactualReview> | null): FactualReview => ({
  requiresHumanFactCheck: Boolean(val?.requiresHumanFactCheck),
  factCheckNotes: val?.factCheckNotes ?? [],
});

// Author, review, persist, and publish a standalone LinkedIn post.
const LinkedInPost: React.FC = () => {
  const { post_id: id } = useParams<{ post_id: string }>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [authorMode, setAuthorMode] = useState<"manual" | "ai">("ai");
  const [language, setLanguage] = useState<PostLanguage>("vietnamese");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState<LinkedInAudience>(null);
  const [linkPlacement, setLinkPlacement] = useState<LinkedInLinkPlacement>("NONE");
  const [content, setContent] = useState("");
  const [mediaMode, setMediaMode] = useState<LinkedInMediaMode>("none");
  const [media, setMedia] = useState<LinkedInMediaAsset[]>([]);
  const [candidates, setCandidates] = useState<LinkedInMediaAsset[]>([]);
  const [keywords, setKeywords] = useState("");
  const [sourceType, setSourceType] = useState<LinkedInSourceType>("CUSTOM");
  const [factCheck, setFactCheck] = useState<FactualReview>(EMPTY_FACT_CHECK);
  const [generation, setGeneration] = useState<GeneratedLinkedInPost>({});
  const [factCheckAcknowledged, setFactCheckAcknowledged] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [confirmAiOverwrite, setConfirmAiOverwrite] = useState(false);
  const targetAudience = audience?.trim() || null;

  const detail = useQuery({ queryKey: ["linkedin-post", id], queryFn: () => getLinkedInPost(id!), enabled: Boolean(id) });

  useEffect(() => {
    if (!detail.data) return;
    setTopic(detail.data.topic ?? "");
    setContent(detail.data.content ?? "");
    setMediaMode(detail.data.mediaMode ?? "none");
    setMedia(detail.data.media ?? []);
    setCandidates(detail.data.media ?? []);
    setSourceType(detail.data.sourceType ?? "CUSTOM");
    setLinkPlacement(detail.data.linkPlacement ?? "NONE");
    setAuthorMode(detail.data.sourceType === "INDEPENDENT_AI" ? "ai" : "manual");
    const loaded = normalizeFactCheck(detail.data.factCheck);
    setFactCheck(loaded);
    setGeneration(detail.data.generation ?? {});
    setLanguage(detail.data.generation?.language ?? "vietnamese");
    setFactCheckAcknowledged(true);
  }, [detail.data]);

  const immutable = ["PUBLISHED", "PUBLISHING", "REVIEW_REQUIRED"].includes(detail.data?.status ?? "");
  const factCheckBlocked = factCheck.requiresHumanFactCheck && !factCheckAcknowledged;
  const mediaCountValid = mediaMode === "none" ? media.length === 0 : mediaMode === "single-image" ? media.length === 1 : media.length >= 2 && media.length <= 20;
  const formValid = Boolean((topic || "").trim() && (content || "").trim() && mediaCountValid && media.every((m) => (m.altText || "").trim()) && !factCheckBlocked);

  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["linkedin-posts"] });
    if (id) client.invalidateQueries({ queryKey: ["linkedin-post", id] });
    client.invalidateQueries({ queryKey: ["linkedin-history"] });
  };

  const payload = () => ({ topic: (topic || "").trim(), content: (content || "").trim(), mediaMode, media, factCheck, generation, sourceType, linkPlacement });

  const save = useMutation({
    mutationFn: () => id ? updateLinkedInPost(id, payload()) : createLinkedInPost({ ...payload(), action: "SAVE_DRAFT" }),
    onSuccess: (res) => { toast.success("Đã lưu bản nháp LinkedIn."); invalidate(); if (!id) navigate(`/linkedin/posts/${res.id}`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const draft = useMutation({
    mutationFn: () => generateLinkedInDraft({ topic, context, targetAudience, requestedMediaMode: mediaMode, language }),
    onSuccess: (data) => {
      setContent(data.content); setMediaMode(data.media.mode); setSourceType("INDEPENDENT_AI");
      setFactCheck(data.factualReview); setGeneration(data.generated);
      setFactCheckAcknowledged(true);
      setKeywords(data.media.images.flatMap((img) => img.searchKeywords).join(", "));
      setConfirmAiOverwrite(false);
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const propose = useMutation({
    mutationFn: () => proposeLinkedInTopics({ count: 3, recentLimit: 20, targetAudience, language }),
    onSuccess: (d) => setTopics(d.topics),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const search = useMutation({
    mutationFn: () => {
      const keys = keywords.split(",").map((v) => v.trim()).filter(Boolean);
      return id ? suggestPostMedia(id, keys) : searchLinkedInMedia(keys);
    },
    onSuccess: (items) => setCandidates([
      ...media,
      ...items.filter((item) => !media.some((selected) => linkedinMediaKey(selected) === linkedinMediaKey(item))),
    ]),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const upload = useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map(uploadLinkedInMedia)),
    onSuccess: (items) => {
      const maximum = mediaMode === "single-image" ? 1 : 20;
      const next = (mediaMode === "single-image" ? items.slice(0, 1) : [...media, ...items])
        .slice(0, maximum)
        .map((item, index) => ({ ...item, order: index + 1 }));
      setMedia(next);
      setCandidates((current) => [
        ...next,
        ...current.filter((item) => !next.some((selected) => linkedinMediaKey(selected) === linkedinMediaKey(item))),
      ]);
      toast.success(`Đã tải lên ${items.length} ảnh.`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!id) return createLinkedInPost({ ...payload(), action: "PUBLISH_NOW" });
      await updateLinkedInPost(id, payload());
      return publishLinkedInPost(id);
    },
    onSuccess: () => { toast.success("Đã gửi yêu cầu đăng LinkedIn."); setConfirm(false); invalidate(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const retry = useMutation({
    mutationFn: () => retryLinkedInPost(id!),
    onSuccess: () => { toast.success("Đã gửi yêu cầu thử lại."); invalidate(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggleCandidate = (c: LinkedInMediaAsset) => {
    if (mediaMode === "none") return;
    const key = linkedinMediaKey(c);
    const exists = media.some((m) => linkedinMediaKey(m) === key);
    if (exists) setMedia(media.filter((m) => linkedinMediaKey(m) !== key).map((m, i) => ({ ...m, order: i + 1 })));
    else if (mediaMode === "single-image") setMedia([{ ...c, order: 1 }]);
    else if (media.length < 20) setMedia([...media, { ...c, order: media.length + 1 }]);
  };

  const moveMedia = (key: string, delta: number) => {
    const index = media.findIndex((item) => linkedinMediaKey(item) === key);
    const destination = index + delta;
    if (index < 0 || destination < 0 || destination >= media.length) return;
    const next = [...media];
    [next[index], next[destination]] = [next[destination], next[index]];
    setMedia(next.map((item, order) => ({ ...item, order: order + 1 })));
  };

  const generateAiDraft = () => {
    if (content.trim()) setConfirmAiOverwrite(true);
    else draft.mutate();
  };

  if (id && detail.isLoading) {
    return <div className="py-20 text-center text-xs text-content-muted">Đang tải bài đăng LinkedIn...</div>;
  }

  if (id && detail.isError) {
    return <div className="py-20 text-center text-xs text-rose-400">Không thể tải bài đăng: {apiErrorMessage(detail.error)}</div>;
  }

  const lastError = detail.data?.lastError;
  const lastErrorMessage = typeof lastError === "string" ? lastError : lastError?.message;
  const status = detail.data?.status;

  return (
    <section className="max-w-[1096px] mx-auto">
      <Link to="/linkedin" className="btn btn-ghost mb-5">
        <ArrowLeft size={16} weight="light" />
        <span>Quay lại Quản lý LinkedIn</span>
      </Link>
      <PageHeader
        title={id ? "Chi tiết bài LinkedIn" : "Tạo bài đăng LinkedIn"}
        description="Biên soạn, kiểm tra tính xác thực và đăng bài trực tiếp lên LinkedIn."
        actions={status ? <StatusBadge status={status} /> : undefined}
      />

      {immutable && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300">
          <Warning size={18} weight="light" className="shrink-0 text-amber-400" />
          <span>{status === "REVIEW_REQUIRED" ? "Trạng thái không chắc chắn. Vui lòng kiểm tra trang Company Page." : "Bài đăng này ở trạng thái chỉ đọc."}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <LinkedInPostTopicCard
            immutable={immutable} authorMode={authorMode} onAuthorModeChange={(m) => { setAuthorMode(m); if (m === "manual") setSourceType("CUSTOM"); }}
            topic={topic} onTopicChange={setTopic} context={context} onContextChange={setContext}
            audience={audience} onAudienceChange={setAudience} language={language} onLanguageChange={setLanguage}
            topics={topics} onProposeTopics={() => propose.mutate()} isProposingTopics={propose.isPending}
            onGenerateAiDraft={generateAiDraft} isGeneratingDraft={draft.isPending} hasContent={Boolean(content.trim())}
            linkPlacement={linkPlacement} onLinkPlacementChange={setLinkPlacement}
            contentSlot={<LinkedInContentEditor content={content} onChange={setContent} media={media} linkPlacement={linkPlacement} language={generation.language ?? "vietnamese"} disabled={immutable} />}
          />

          <LinkedInPostMediaCard
            immutable={immutable} mediaMode={mediaMode}
            onMediaModeChange={(next) => { setMediaMode(next); if (next === "none") setMedia([]); if (next === "single-image" && media.length > 1) setMedia(media.slice(0, 1)); }}
            keywords={keywords} onKeywordsChange={setKeywords} onSearchMedia={() => search.mutate()} isSearchingMedia={search.isPending}
            onUploadMedia={(files) => upload.mutate(files)} isUploadingMedia={upload.isPending}
            candidates={candidates} media={media} onToggleCandidate={toggleCandidate} onMoveMedia={moveMedia}
            onAltTextChange={(key, text) => setMedia(media.map((m) => linkedinMediaKey(m) === key ? { ...m, altText: text } : m))}
            onAddAiGeneratedMedia={(item) => setCandidates((curr) => [item, ...curr])}
            topic={topic} content={content}
          />

          {(factCheck.requiresHumanFactCheck || factCheck.factCheckNotes.length > 0) && (
            <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                <Warning size={18} weight="light" className="text-amber-400" />Kiểm tra tính chính xác của nội dung
              </h3>
              {factCheck.factCheckNotes.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200/90">{factCheck.factCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul>
              ) : <p className="mt-2 text-xs text-amber-200/90">Nội dung này cần được người quản trị kiểm tra thủ công trước khi xuất bản.</p>}
              {factCheck.requiresHumanFactCheck && (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs text-amber-200">
                  <input type="checkbox" disabled={immutable} checked={factCheckAcknowledged} onChange={(e) => setFactCheckAcknowledged(e.target.checked)} className="h-4 w-4 accent-[#22C55E]" />
                  <span>Tôi xác nhận đã kiểm tra và đối chiếu các thông tin trên là chính xác.</span>
                </label>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:col-span-5">
          <LinkedInSidePanel
            status={status}
            lastErrorMessage={lastErrorMessage}
            publishedLinkUrl={detail.data?.publishedLinkUrl}
            topic={topic}
            content={content}
            mediaMode={mediaMode}
            media={media}
            requiresFactCheck={factCheck.requiresHumanFactCheck}
            factCheckAcknowledged={factCheckAcknowledged}
            immutable={immutable}
            canSave={formValid || Boolean(topic.trim() || content.trim())}
            canPublish={formValid && !publish.isPending && !save.isPending && !retry.isPending}
            canRetry={Boolean(id) && !retry.isPending && !save.isPending && !publish.isPending}
            isSaving={save.isPending}
            isPublishing={publish.isPending}
            isRetrying={retry.isPending}
            onSave={() => save.mutate()}
            onPublish={() => setConfirm(true)}
            onRetry={() => retry.mutate()}
          />
        </aside>
      </div>

      <ConfirmDialog isOpen={confirmAiOverwrite} title="Ghi đè nội dung bằng AI?" message="Nội dung LinkedIn hiện tại sẽ được thay thế bằng bản nháp AI mới." confirmLabel="Tiếp tục tạo lại" cancelLabel="Hủy" variant="primary" isLoading={draft.isPending} onConfirm={() => draft.mutate()} onCancel={() => setConfirmAiOverwrite(false)} />
      <ConfirmDialog isOpen={confirm} title="Xác nhận đăng bài lên LinkedIn" message={`Bạn sắp xuất bản bài đăng "${topic}" (${mediaMode !== "none" ? `${media.length} ảnh` : "không ảnh"}) lên trang Company Page chính thức.`} confirmLabel="Đăng bài ngay" cancelLabel="Hủy" variant="primary" isLoading={publish.isPending} onConfirm={() => publish.mutate()} onCancel={() => setConfirm(false)} />
    </section>
  );
};

export default LinkedInPost;
