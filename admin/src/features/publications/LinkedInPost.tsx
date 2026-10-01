import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowDown, FiArrowLeft, FiArrowUp, FiSave, FiRefreshCw, FiSearch, FiAlertTriangle, FiUpload } from "react-icons/fi";
import { BsFileEarmarkText, BsStars } from "react-icons/bs";
import { FaLinkedin } from "react-icons/fa";
import {
  createLinkedInPost,
  generateLinkedInDraft,
  getLinkedInPost,
  proposeLinkedInTopics,
  publishLinkedInPost,
  retryLinkedInPost,
  retryLinkedInLinkComment,
  searchLinkedInMedia,
  suggestPostMedia,
  updateLinkedInPost,
  uploadLinkedInMedia,
} from "../../services/linkedin/handleLinkedIn";
import { apiErrorMessage } from "../../types/Api";
import type { LinkedInAudience, LinkedInSourceType } from "../../types/LinkedIn";
import type { FactualReview, GeneratedLinkedInPost, LinkedInLinkPlacement, LinkedInMediaAsset, LinkedInMediaMode } from "../../types/Publication";
import { AIImagePanel } from "../../shared/media/AIImagePanel";
import { PageHeader, SectionHeading, ConfirmDialog, BottomActionBar } from "../../shared/ui";
import { linkedinMediaKey, linkedinMediaUrl } from "../../utils/linkedinMedia";

const EMPTY_FACT_CHECK: FactualReview = { requiresHumanFactCheck: false, factCheckNotes: [] };

const normalizeFactCheck = (val?: Partial<FactualReview> | null): FactualReview => ({
  requiresHumanFactCheck: Boolean(val?.requiresHumanFactCheck),
  factCheckNotes: val?.factCheckNotes ?? [],
});

// Author, review, persist, and publish a standalone LinkedIn post.
const LinkedInPost: React.FC = () => {
  const { post_id: id } = useParams<{ post_id: string }>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [authorMode, setAuthorMode] = useState<"manual" | "ai">("manual");
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
    setFactCheckAcknowledged(!loaded.requiresHumanFactCheck);
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
    mutationFn: () => generateLinkedInDraft({ topic, context, targetAudience, requestedMediaMode: mediaMode }),
    onSuccess: (data) => {
      setContent(data.content); setMediaMode(data.media.mode); setSourceType("INDEPENDENT_AI");
      setFactCheck(data.factualReview); setGeneration(data.generated);
      setFactCheckAcknowledged(!data.factualReview.requiresHumanFactCheck);
      setKeywords(data.media.images.flatMap((img) => img.searchKeywords).join(", "));
      setConfirmAiOverwrite(false);
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const propose = useMutation({
    mutationFn: () => proposeLinkedInTopics({ count: 3, recentLimit: 20, targetAudience }),
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

  // Retry a failed first comment without re-publishing the main post.
  const retryComment = useMutation({
    mutationFn: () => retryLinkedInLinkComment(id!),
    onSuccess: () => { toast.success("Đã gửi yêu cầu thử lại bình luận liên kết."); invalidate(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  // Toggle image candidate selection in media array.
  const toggleCandidate = (c: LinkedInMediaAsset) => {
    if (mediaMode === "none") return;
    const key = linkedinMediaKey(c);
    const exists = media.some((m) => linkedinMediaKey(m) === key);
    if (exists) setMedia(media.filter((m) => linkedinMediaKey(m) !== key).map((m, i) => ({ ...m, order: i + 1 })));
    else if (mediaMode === "single-image") setMedia([{ ...c, order: 1 }]);
    else if (media.length < 20) setMedia([...media, { ...c, order: media.length + 1 }]);
  };

  // Move one selected image while keeping contiguous provider order values.
  const moveMedia = (key: string, delta: number) => {
    const index = media.findIndex((item) => linkedinMediaKey(item) === key);
    const destination = index + delta;
    if (index < 0 || destination < 0 || destination >= media.length) return;
    const next = [...media];
    [next[index], next[destination]] = [next[destination], next[index]];
    setMedia(next.map((item, order) => ({ ...item, order: order + 1 })));
  };

  // Protect administrator-authored copy before replacing it with an AI draft.
  const generateAiDraft = () => {
    if (content.trim()) setConfirmAiOverwrite(true);
    else draft.mutate();
  };

  // Switch authoring intent without silently deleting the current draft.
  const changeAuthorMode = (next: "manual" | "ai") => {
    setAuthorMode(next);
    if (next === "manual") setSourceType("CUSTOM");
  };

  if (id && detail.isLoading) {
    return (
      <div className="py-20 text-center text-sm text-content-muted">
        Đang tải bài đăng LinkedIn...
      </div>
    );
  }

  if (id && detail.isError) {
    return (
      <div className="py-20 text-center text-sm text-rose-400">
        Không thể tải bài đăng LinkedIn: {apiErrorMessage(detail.error)}
      </div>
    );
  }

  return (
    <section className="space-y-6 max-w-5xl mx-auto pb-40 sm:pb-28">
      <div>
        <Link
          to="/linkedin"
          title="Quay lại Quản lý LinkedIn"
          aria-label="Quay lại Quản lý LinkedIn"
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-content-muted transition-colors hover:bg-surface-elevated hover:text-primary-green"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Quản lý LinkedIn</span>
        </Link>
        <PageHeader title={id ? "Chi tiết bài LinkedIn" : "Tạo bài đăng LinkedIn"} description="Biên soạn, kiểm tra tính xác thực và đăng bài trực tiếp lên LinkedIn" />
      </div>

      {immutable && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <FiAlertTriangle className="text-lg shrink-0 text-amber-400" />
          <span>{detail.data?.status === "REVIEW_REQUIRED" ? "Trạng thái không chắc chắn. Vui lòng kiểm tra trang Company Page trước khi thực hiện." : "Bài đăng này ở trạng thái chỉ đọc và không thể chỉnh sửa."}</span>
        </div>
      )}
      {detail.data?.lastError && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">{detail.data.lastError}</div>
      )}
      {detail.data?.status === "PUBLISHED" && detail.data.linkCommentStatus !== "NOT_REQUESTED" && (
        <div className={`rounded-xl border p-4 text-xs ${detail.data.linkCommentStatus === "FAILED" ? "border-rose-500/30 text-rose-300" : "border-surface-border text-content-muted"}`}>
          Bình luận liên kết: {detail.data.linkCommentStatus}.
          {detail.data.linkCommentStatus === "FAILED" && id && <button type="button" onClick={() => retryComment.mutate()} disabled={retryComment.isPending} className="ml-3 underline">{retryComment.isPending ? "Đang thử lại…" : "Thử lại bình luận"}</button>}
          {detail.data.linkCommentStatus === "REVIEW_REQUIRED" && <span className="ml-2">Hãy kiểm tra LinkedIn; hệ thống không tự thử lại để tránh bình luận trùng.</span>}
        </div>
      )}

      {!immutable && (
        <div className="flex w-fit gap-1 rounded-xl border border-surface-border bg-surface-card p-1">
          <button
            type="button"
            title="Viết thủ công"
            aria-label="Viết thủ công"
            onClick={() => changeAuthorMode("manual")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              authorMode === "manual"
                ? "border border-primary-green/30 bg-surface-elevated text-primary-green shadow-sm"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <BsFileEarmarkText className="text-sm" />
            <span>Viết thủ công</span>
          </button>
          <button
            type="button"
            title="Tạo bằng AI"
            aria-label="Tạo bằng AI"
            onClick={() => changeAuthorMode("ai")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              authorMode === "ai"
                ? "border border-purple-500/30 bg-surface-elevated text-purple-300 shadow-sm"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <BsStars className="text-sm text-purple-300" />
            <span>Tạo bằng AI</span>
          </button>
        </div>
      )}

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Chủ đề & Nội dung" description="Chủ đề bài đăng và văn bản xuất bản" />
        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1.5">Chủ đề bài đăng <span className="text-rose-400">*</span></label>
          <input disabled={immutable} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Nhập chủ đề bài đăng..." className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition disabled:opacity-50" />
        </div>
        {authorMode === "ai" && !immutable && <div className="space-y-4 rounded-xl border border-purple-500/20 bg-purple-950/10 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-content-secondary">Ngữ cảnh bổ sung</label>
              <textarea rows={3} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Luận điểm, dữ liệu hoặc góc nhìn cần AI sử dụng..." className="w-full resize-y rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:outline-none focus:ring-1 focus:ring-purple-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-content-secondary">Đối tượng độc giả</label>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAudience(null)} className={`rounded px-2 py-1 text-xs ${audience === null ? "bg-purple-500/30 text-purple-100" : "bg-surface-elevated text-content-muted"}`}>Để AI tự chọn</button>{["math", "competitive-programming", "software-engineering", "machine-learning", "systems"].map((preset) => <button key={preset} type="button" onClick={() => setAudience(preset)} className={`rounded px-2 py-1 text-xs ${audience === preset ? "bg-purple-500/30 text-purple-100" : "bg-surface-elevated text-content-muted"}`}>{preset}</button>)}</div>
              <input value={audience ?? ""} onChange={(event) => setAudience(event.target.value)} maxLength={300} placeholder="Hoặc nhập đối tượng riêng" className="mt-2 w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-content-primary" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              title={draft.isPending ? "Đang tạo bằng AI" : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
              aria-label={draft.isPending ? "Đang tạo bằng AI" : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}
              disabled={!(topic || "").trim() || draft.isPending}
              onClick={generateAiDraft}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/40 px-3.5 py-2 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-900/50 disabled:opacity-50"
            >
              <BsStars className={`text-sm ${draft.isPending ? "animate-pulse" : ""}`} />
              <span>{draft.isPending ? "Đang tạo..." : content ? "Tạo lại bằng AI" : "Tạo bản nháp AI"}</span>
            </button>
            <button
              type="button"
              title="Gợi ý chủ đề AI"
              aria-label="Gợi ý chủ đề AI"
              disabled={propose.isPending}
              onClick={() => propose.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary disabled:opacity-50"
            >
              <FiRefreshCw className={`text-xs ${propose.isPending ? "animate-spin" : ""}`} />
              <span>Gợi ý chủ đề</span>
            </button>
          </div>
        </div>}
        {authorMode === "ai" && topics.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {topics.map((item) => (
              <button key={item} type="button" disabled={immutable} onClick={() => setTopic(item)} className="px-3 py-1 rounded-lg border border-surface-border bg-surface-elevated text-xs text-content-secondary hover:text-content-primary hover:border-primary-green/40 transition-colors text-left">
                {item}
              </button>
            ))}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1.5">Nội dung bài viết <span className="text-rose-400">*</span></label>
          <textarea disabled={immutable} rows={7} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Soạn nội dung bài đăng LinkedIn..." className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2.5 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition resize-y disabled:opacity-50" />
        </div>
        <div><label className="mb-1.5 block text-xs font-medium text-content-secondary">Vị trí liên kết website</label><div className="flex flex-wrap gap-2">{(["NONE", "IN_POST", "FIRST_COMMENT"] as const).map((placement) => <button key={placement} type="button" disabled={immutable} onClick={() => setLinkPlacement(placement)} className={`rounded-lg border px-3 py-2 text-xs ${linkPlacement === placement ? "border-primary-green bg-primary-green/10 text-content-primary" : "border-surface-border text-content-muted"}`}>{placement === "NONE" ? "Không đính kèm" : placement === "IN_POST" ? "Trong bài đăng" : "Bình luận đầu tiên"}</button>)}</div><p className="mt-2 text-xs text-content-muted">Liên kết đích được hệ thống xác định khi xuất bản, không chỉnh sửa trong nội dung đã duyệt.</p></div>
      </div>

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Hình ảnh bài đăng" description="Tìm ảnh Pexels hoặc tải ảnh trực tiếp từ thiết bị" />
        <div className="flex items-center gap-3">
          <label className="text-xs text-content-muted">Chế độ ảnh:</label>
          <select disabled={immutable} value={mediaMode} onChange={(e) => { const next = e.target.value as LinkedInMediaMode; setMediaMode(next); if (next === "none") setMedia([]); if (next === "single-image" && media.length > 1) setMedia(media.slice(0, 1)); }} className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green">
            <option value="none">Không kèm ảnh</option><option value="single-image">Một ảnh</option><option value="multi-image">Nhiều ảnh (2-20)</option>
          </select>
        </div>
        {mediaMode !== "none" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input disabled={immutable} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Từ khóa tìm kiếm ảnh Pexels..." className="flex-1 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:ring-1 focus:ring-primary-green" />
              <button
                type="button"
                title={search.isPending ? "Đang tìm ảnh" : "Tìm ảnh"}
                aria-label={search.isPending ? "Đang tìm ảnh" : "Tìm ảnh"}
                disabled={immutable || search.isPending}
                onClick={() => search.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs font-medium text-content-primary transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                <FiSearch className={`text-sm ${search.isPending ? "animate-pulse" : ""}`} />
                <span>Tìm ảnh</span>
              </button>
              <label
                title={upload.isPending ? "Đang tải ảnh" : "Tải ảnh lên"}
                aria-label={upload.isPending ? "Đang tải ảnh" : "Tải ảnh lên"}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs font-medium text-content-primary transition-colors hover:bg-surface-hover ${immutable || upload.isPending ? "pointer-events-none opacity-50" : ""}`}
              >
                <FiUpload className={`text-sm ${upload.isPending ? "animate-pulse" : ""}`} />
                <span>Tải ảnh lên</span>
                <input type="file" multiple={mediaMode === "multi-image"} accept="image/jpeg,image/png,image/gif" className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) upload.mutate(files); event.currentTarget.value = ""; }} />
              </label>
            </div>
            <p className="text-xs text-content-muted">Đã chọn: <strong className="text-content-primary">{media.length}</strong> ảnh {mediaMode === "multi-image" ? "(cần 2–20 ảnh)" : "(cần 1 ảnh)"}</p>
            <AIImagePanel purpose="LINKEDIN" context={`${topic}\n${content}`} onUse={(generated) => { const item = { ...generated.media, order: media.length + 1 }; setCandidates((current) => [item, ...current]); }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((item) => {
                const key = linkedinMediaKey(item);
                const selected = media.some((m) => linkedinMediaKey(m) === key);
                return (
                  <article key={key} className={`rounded-xl border overflow-hidden bg-surface-elevated transition ${selected ? "border-primary-green ring-1 ring-primary-green" : "border-surface-border"}`}>
                    <img src={linkedinMediaUrl(item)} alt={item.altText} className="h-36 w-full object-cover" />
                    <div className="p-3 space-y-2 text-xs">
                      <p className="text-content-muted truncate">{item.provider === "pexels" ? item.attribution : item.fileName}</p>
                      {selected && (
                        <input value={media.find((m) => linkedinMediaKey(m) === key)?.altText ?? ""} onChange={(e) => setMedia(media.map((m) => linkedinMediaKey(m) === key ? { ...m, altText: e.target.value } : m))} disabled={immutable} placeholder="Alt text (bắt buộc)..." className="w-full rounded border border-surface-border bg-surface-card px-2 py-1 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green" />
                      )}
                      {selected && media.length > 1 && <div className="flex gap-2">
                        <button type="button" title="Đưa ảnh lên trước" aria-label="Đưa ảnh lên trước" disabled={immutable || media.findIndex((m) => linkedinMediaKey(m) === key) === 0} onClick={() => moveMedia(key, -1)} className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-surface-border bg-surface-card py-1 text-content-secondary disabled:opacity-30"><FiArrowUp /><span>Lên</span></button>
                        <button type="button" title="Đưa ảnh xuống sau" aria-label="Đưa ảnh xuống sau" disabled={immutable || media.findIndex((m) => linkedinMediaKey(m) === key) === media.length - 1} onClick={() => moveMedia(key, 1)} className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-surface-border bg-surface-card py-1 text-content-secondary disabled:opacity-30"><FiArrowDown /><span>Xuống</span></button>
                      </div>}
                      <button type="button" disabled={immutable} onClick={() => toggleCandidate(item)} className={`w-full py-1.5 rounded font-medium text-xs transition ${selected ? "bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40" : "bg-surface-card hover:bg-surface-border text-content-secondary hover:text-content-primary border border-surface-border"}`}>
                        {selected ? "Bỏ chọn" : "Chọn ảnh này"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(factCheck.requiresHumanFactCheck || factCheck.factCheckNotes.length > 0) && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-amber-300 text-sm flex items-center gap-2">
            <FiAlertTriangle className="text-amber-400" /><span>Kiểm tra tính chính xác của nội dung</span>
          </h3>
          {factCheck.factCheckNotes.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-xs text-amber-200/90">{factCheck.factCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          ) : <p className="text-xs text-amber-200/90">Nội dung này cần được người quản trị kiểm tra thủ công trước khi xuất bản.</p>}
          {factCheck.requiresHumanFactCheck && (
            <label className="flex items-center gap-2.5 pt-2 text-xs text-amber-200 cursor-pointer">
              <input type="checkbox" disabled={immutable} checked={factCheckAcknowledged} onChange={(e) => setFactCheckAcknowledged(e.target.checked)} className="rounded" />
              <span>Tôi xác nhận đã kiểm tra và đối chiếu các thông tin trên là chính xác.</span>
            </label>
          )}
        </div>
      )}

      {/* Keep draft and publication actions accessible from every editing section. */}
      {!immutable && <BottomActionBar>
        <span role="status" className="max-w-md text-xs text-content-muted">{!topic.trim() ? "Nhập chủ đề bài đăng để tiếp tục." : !content.trim() ? "Soạn nội dung hoặc tạo bản nháp bằng AI." : !mediaCountValid ? "Chọn đủ số ảnh theo chế độ đã chọn." : !media.every((item) => item.altText.trim()) ? "Nhập mô tả cho từng ảnh đã chọn." : factCheckBlocked ? "Xác nhận đã kiểm tra thông tin trước khi tiếp tục." : "Lưu bản nháp để giữ nội dung; Đăng lên LinkedIn để xuất bản công khai."}</span>
        <div className="flex flex-wrap items-center gap-3">
        {!immutable && (
          <button
            type="button"
            title={save.isPending ? "Đang lưu bản nháp" : "Lưu bản nháp"}
            aria-label={save.isPending ? "Đang lưu bản nháp" : "Lưu bản nháp"}
            disabled={!formValid || save.isPending || publish.isPending || retry.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-4 py-2.5 text-xs font-medium text-content-primary transition-colors hover:bg-surface-hover disabled:opacity-40 shadow-xs"
          >
            <FiSave className={`text-sm ${save.isPending ? "animate-pulse" : ""}`} />
            <span>{save.isPending ? "Đang lưu..." : "Lưu bản nháp"}</span>
          </button>
        )}
        {!immutable && detail.data?.status !== "FAILED" && (
          <button
            type="button"
            title="Đăng ngay lên LinkedIn"
            aria-label="Đăng ngay lên LinkedIn"
            disabled={!formValid || publish.isPending || save.isPending || retry.isPending}
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-[#084e96] disabled:opacity-40"
          >
            <FaLinkedin className="text-sm" />
            <span>Đăng lên LinkedIn</span>
          </button>
        )}
        {id && detail.data?.status === "FAILED" && (
          <button
            type="button"
            title="Thử lại xuất bản"
            aria-label="Thử lại xuất bản"
            disabled={retry.isPending || save.isPending || publish.isPending}
            onClick={() => retry.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
          >
            <FiRefreshCw className={`text-sm ${retry.isPending ? "animate-spin" : ""}`} />
            <span>Thử lại xuất bản</span>
          </button>
        )}
        </div>
      </BottomActionBar>}

      <ConfirmDialog
        isOpen={confirmAiOverwrite}
        title="Ghi đè nội dung bằng AI?"
        message="Nội dung LinkedIn hiện tại sẽ được thay thế bằng bản nháp AI mới."
        confirmLabel="Tiếp tục tạo lại"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={draft.isPending}
        onConfirm={() => draft.mutate()}
        onCancel={() => setConfirmAiOverwrite(false)}
      />

      <ConfirmDialog
        isOpen={confirm}
        title="Xác nhận đăng bài lên LinkedIn"
        message={`Bạn sắp xuất bản bài đăng "${topic}" (${mediaMode !== "none" ? `${media.length} ảnh` : "không ảnh"}) lên trang Company Page chính thức.`}
        confirmLabel="Đăng bài ngay"
        cancelLabel="Hủy"
        variant="primary"
        isLoading={publish.isPending}
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
};

export default LinkedInPost;
