import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave, FiRefreshCw, FiSearch, FiAlertTriangle } from "react-icons/fi";
import { BsStars } from "react-icons/bs";
import { FaLinkedin } from "react-icons/fa";
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
} from "../../services/linkedin/handleLinkedIn";
import { apiErrorMessage } from "../../types/Api";
import type { LinkedInSourceType } from "../../types/LinkedIn";
import type { FactualReview, GeneratedLinkedInPost, LinkedInMediaMode, PexelsCandidate } from "../../types/Publication";
import { PageHeader, SectionHeading, ConfirmDialog } from "../../shared/ui";

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
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [mediaMode, setMediaMode] = useState<LinkedInMediaMode>("none");
  const [media, setMedia] = useState<PexelsCandidate[]>([]);
  const [candidates, setCandidates] = useState<PexelsCandidate[]>([]);
  const [keywords, setKeywords] = useState("");
  const [sourceType, setSourceType] = useState<LinkedInSourceType>("CUSTOM");
  const [factCheck, setFactCheck] = useState<FactualReview>(EMPTY_FACT_CHECK);
  const [generation, setGeneration] = useState<GeneratedLinkedInPost>({});
  const [factCheckAcknowledged, setFactCheckAcknowledged] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  const detail = useQuery({ queryKey: ["linkedin-post", id], queryFn: () => getLinkedInPost(id!), enabled: Boolean(id) });

  useEffect(() => {
    if (!detail.data) return;
    setTopic(detail.data.topic ?? "");
    setContent(detail.data.content ?? "");
    setMediaMode(detail.data.mediaMode ?? "none");
    setMedia(detail.data.media ?? []);
    setCandidates(detail.data.media ?? []);
    setSourceType(detail.data.sourceType ?? "CUSTOM");
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

  const payload = () => ({ topic: (topic || "").trim(), content: (content || "").trim(), mediaMode, media, factCheck, generation, sourceType });

  const save = useMutation({
    mutationFn: () => id ? updateLinkedInPost(id, payload()) : createLinkedInPost({ ...payload(), action: "SAVE_DRAFT" }),
    onSuccess: (res) => { toast.success("Đã lưu bản nháp LinkedIn."); invalidate(); if (!id) navigate(`/linkedin/posts/${res.id}`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const draft = useMutation({
    mutationFn: () => generateLinkedInDraft({ topic, targetAudience: "mixed", requestedMediaMode: mediaMode }),
    onSuccess: (data) => {
      setContent(data.content); setMediaMode(data.media.mode); setSourceType("INDEPENDENT_AI");
      setFactCheck(data.factualReview); setGeneration(data.generated);
      setFactCheckAcknowledged(!data.factualReview.requiresHumanFactCheck);
      setKeywords(data.media.images.flatMap((img) => img.searchKeywords).join(", "));
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const propose = useMutation({
    mutationFn: () => proposeLinkedInTopics({ count: 3, recentLimit: 20, targetAudience: "mixed" }),
    onSuccess: (d) => setTopics(d.topics),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const search = useMutation({
    mutationFn: () => {
      const keys = keywords.split(",").map((v) => v.trim()).filter(Boolean);
      return id ? suggestPostMedia(id, keys) : searchLinkedInMedia(keys);
    },
    onSuccess: setCandidates,
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

  // Toggle image candidate selection in media array.
  const toggleCandidate = (c: PexelsCandidate) => {
    if (mediaMode === "none") return;
    const exists = media.some((m) => m.providerId === c.providerId);
    if (exists) setMedia(media.filter((m) => m.providerId !== c.providerId).map((m, i) => ({ ...m, order: i + 1 })));
    else if (mediaMode === "single-image") setMedia([{ ...c, order: 1 }]);
    else if (media.length < 20) setMedia([...media, { ...c, order: media.length + 1 }]);
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
    <section className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link to="/linkedin" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-primary-green mb-3 transition-colors">
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

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Chủ đề & Nội dung" description="Chủ đề bài đăng và văn bản xuất bản" />
        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1.5">Chủ đề bài đăng <span className="text-rose-400">*</span></label>
          <input disabled={immutable} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Nhập chủ đề bài đăng..." className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition disabled:opacity-50" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!(topic || "").trim() || immutable || draft.isPending} onClick={() => draft.mutate()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/50 text-xs font-semibold transition-colors disabled:opacity-50">
            <BsStars className="text-sm" /><span>{draft.isPending ? "Đang tạo bằng AI..." : "Tạo bản nháp AI"}</span>
          </button>
          <button type="button" disabled={immutable || propose.isPending} onClick={() => propose.mutate()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-content-secondary hover:text-content-primary border border-surface-border text-xs font-medium transition-colors disabled:opacity-50">
            <FiRefreshCw className={`text-xs ${propose.isPending ? "animate-spin" : ""}`} /><span>Gợi ý chủ đề AI</span>
          </button>
        </div>
        {topics.length > 0 && (
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
      </div>

      <div className="bg-surface-card p-6 rounded-xl border border-surface-border space-y-4">
        <SectionHeading title="Hình ảnh bài đăng (Pexels)" description="Chọn chế độ ảnh và đính kèm hình ảnh chất lượng cao" />
        <div className="flex items-center gap-3">
          <label className="text-xs text-content-muted">Chế độ ảnh:</label>
          <select disabled={immutable} value={mediaMode} onChange={(e) => { const next = e.target.value as LinkedInMediaMode; setMediaMode(next); if (next === "none") setMedia([]); if (next === "single-image" && media.length > 1) setMedia(media.slice(0, 1)); }} className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green">
            <option value="none">Không kèm ảnh</option><option value="single-image">Một ảnh</option><option value="multi-image">Nhiều ảnh (2-20)</option>
          </select>
        </div>
        {mediaMode !== "none" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input disabled={immutable} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Từ khóa tìm kiếm ảnh Pexels..." className="flex-1 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:ring-1 focus:ring-primary-green" />
              <button type="button" disabled={immutable || search.isPending} onClick={() => search.mutate()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-content-primary border border-surface-border text-xs font-semibold transition-colors disabled:opacity-50">
                <FiSearch className="text-sm" /><span>{search.isPending ? "Đang tìm..." : "Tìm ảnh"}</span>
              </button>
            </div>
            <p className="text-xs text-content-muted">Đã chọn: <strong className="text-content-primary">{media.length}</strong> ảnh {mediaMode === "multi-image" ? "(cần 2–20 ảnh)" : "(cần 1 ảnh)"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((item) => {
                const selected = media.some((m) => m.providerId === item.providerId);
                return (
                  <article key={item.providerId} className={`rounded-xl border overflow-hidden bg-surface-elevated transition ${selected ? "border-primary-green ring-1 ring-primary-green" : "border-surface-border"}`}>
                    <img src={item.imageUrl} alt={item.altText} className="h-36 w-full object-cover" />
                    <div className="p-3 space-y-2 text-xs">
                      <p className="text-content-muted truncate">{item.attribution}</p>
                      {selected && (
                        <input value={media.find((m) => m.providerId === item.providerId)?.altText ?? ""} onChange={(e) => setMedia(media.map((m) => m.providerId === item.providerId ? { ...m, altText: e.target.value } : m))} disabled={immutable} placeholder="Alt text (bắt buộc)..." className="w-full rounded border border-surface-border bg-surface-card px-2 py-1 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green" />
                      )}
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

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {!immutable && (
          <button type="button" disabled={!formValid || save.isPending} onClick={() => save.mutate()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-surface-border bg-surface-elevated hover:bg-surface-hover text-content-primary text-sm font-medium transition-colors disabled:opacity-40">
            <FiSave className="text-base" /><span>Lưu bản nháp</span>
          </button>
        )}
        {!immutable && detail.data?.status !== "FAILED" && (
          <button type="button" disabled={!formValid || publish.isPending} onClick={() => setConfirm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0a66c2] hover:bg-[#084e96] text-white text-sm font-semibold transition-colors disabled:opacity-40 shadow-md">
            <FaLinkedin className="text-base" /><span>Đăng ngay lên LinkedIn</span>
          </button>
        )}
        {id && detail.data?.status === "FAILED" && (
          <button type="button" disabled={retry.isPending} onClick={() => retry.mutate()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-40">
            <FiRefreshCw className="text-base" /><span>Thử lại xuất bản</span>
          </button>
        )}
      </div>

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
