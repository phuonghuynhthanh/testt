import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
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
import Modal from "../../shared/Popup/Modal";
import { apiErrorMessage } from "../../types/Api";
import type { LinkedInSourceType } from "../../types/LinkedIn";
import type {
  FactualReview,
  GeneratedLinkedInPost,
  LinkedInMediaMode,
  PexelsCandidate,
} from "../../types/Publication";

const EMPTY_FACT_CHECK: FactualReview = {
  requiresHumanFactCheck: false,
  factCheckNotes: [],
};

// Normalize older persisted records whose fact-check object may be empty.
const normalizeFactCheck = (value?: Partial<FactualReview> | null): FactualReview => ({
  requiresHumanFactCheck: Boolean(value?.requiresHumanFactCheck),
  factCheckNotes: value?.factCheckNotes ?? [],
});

// Author, review, persist, and publish one standalone LinkedIn post.
const LinkedInPost = () => {
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
  const detail = useQuery({
    queryKey: ["linkedin-post", id],
    queryFn: () => getLinkedInPost(id!),
    enabled: Boolean(id),
  });

  // Load persisted values into the same form used before the first save.
  useEffect(() => {
    if (!detail.data) return;
    setTopic(detail.data.topic);
    setContent(detail.data.content);
    setMediaMode(detail.data.mediaMode);
    setMedia(detail.data.media);
    setCandidates(detail.data.media);
    setSourceType(detail.data.sourceType);
    const loadedFactCheck = normalizeFactCheck(detail.data.factCheck);
    setFactCheck(loadedFactCheck);
    setGeneration(detail.data.generation ?? {});
    setFactCheckAcknowledged(!loadedFactCheck.requiresHumanFactCheck);
  }, [detail.data]);

  const immutable = detail.data?.status === "PUBLISHED"
    || detail.data?.status === "PUBLISHING"
    || detail.data?.status === "REVIEW_REQUIRED";
  const factCheckBlocked = factCheck.requiresHumanFactCheck && !factCheckAcknowledged;
  const mediaCountValid = mediaMode === "none"
    ? media.length === 0
    : mediaMode === "single-image"
      ? media.length === 1
      : media.length >= 2 && media.length <= 20;
  const mediaValid = mediaCountValid && media.every((item) => item.altText.trim());
  const formValid = Boolean(topic.trim() && content.trim() && mediaValid && !factCheckBlocked);

  // Refresh all LinkedIn views affected by persistence or publication.
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["linkedin-posts"] });
    if (id) client.invalidateQueries({ queryKey: ["linkedin-post", id] });
    client.invalidateQueries({ queryKey: ["linkedin-history"] });
  };

  // Build the reviewed payload from only the currently visible editor state.
  const reviewedPayload = () => ({
    topic: topic.trim(),
    content: content.trim(),
    mediaMode,
    media,
    factCheck,
    generation,
    sourceType,
  });

  const save = useMutation({
    mutationFn: () => id
      ? updateLinkedInPost(id, reviewedPayload())
      : createLinkedInPost({ ...reviewedPayload(), action: "SAVE_DRAFT" }),
    onSuccess: (post) => {
      toast.success("Đã lưu bản nháp LinkedIn.");
      invalidate();
      if (!id) navigate(`/linkedin/posts/${post.id}`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const draft = useMutation({
    mutationFn: () => generateLinkedInDraft({
      topic,
      targetAudience: "mixed",
      requestedMediaMode: mediaMode,
    }),
    onSuccess: (data) => {
      setContent(data.content);
      setMediaMode(data.media.mode);
      setSourceType("INDEPENDENT_AI");
      setFactCheck(data.factualReview);
      setGeneration(data.generated);
      setFactCheckAcknowledged(!data.factualReview.requiresHumanFactCheck);
      setKeywords(data.media.images.flatMap((image) => image.searchKeywords).join(", "));
      toast.success("Đã tạo bản nháp AI — chưa được lưu.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const propose = useMutation({
    mutationFn: () => proposeLinkedInTopics({
      count: 3,
      recentLimit: 20,
      targetAudience: "mixed",
    }),
    onSuccess: (data) => setTopics(data.topics),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const search = useMutation({
    mutationFn: () => {
      const parsedKeywords = keywords.split(",").map((value) => value.trim()).filter(Boolean);
      return id ? suggestPostMedia(id, parsedKeywords) : searchLinkedInMedia(parsedKeywords);
    },
    onSuccess: setCandidates,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const publish = useMutation({
    mutationFn: async () => {
      if (!id) return createLinkedInPost({ ...reviewedPayload(), action: "PUBLISH_NOW" });
      await updateLinkedInPost(id, reviewedPayload());
      return publishLinkedInPost(id);
    },
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu đăng LinkedIn.");
      setConfirm(false);
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const retry = useMutation({
    mutationFn: () => retryLinkedInPost(id!),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu thử lại.");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Keep selected media consistent with the backend mode constraints.
  const changeMediaMode = (next: LinkedInMediaMode) => {
    setMediaMode(next);
    if (next === "none") setMedia([]);
    if (next === "single-image" && media.length > 1) setMedia(media.slice(0, 1));
  };

  // Select, replace, or remove a candidate according to the active media mode.
  const toggleCandidate = (candidate: PexelsCandidate) => {
    if (mediaMode === "none") return;
    const selected = media.some((item) => item.providerId === candidate.providerId);
    if (selected) {
      setMedia(media
        .filter((item) => item.providerId !== candidate.providerId)
        .map((item, index) => ({ ...item, order: index + 1 })));
    } else if (mediaMode === "single-image") {
      setMedia([{ ...candidate, order: 1 }]);
    } else if (media.length < 20) {
      setMedia([...media, { ...candidate, order: media.length + 1 }]);
    }
  };

  // Edit required accessibility text on the selected media payload.
  const updateAltText = (providerId: string, altText: string) => {
    setMedia(media.map((item) => item.providerId === providerId ? { ...item, altText } : item));
  };

  return (
    <section className="mx-auto max-w-4xl space-y-5 text-gray-th2">
      <Link to="/linkedin" className="text-blue-300">← Quản lý LinkedIn</Link>
      <h1 className="text-2xl font-bold text-primary-white">{id ? "Bài LinkedIn" : "Tạo bài LinkedIn"}</h1>

      {immutable && (
        <p className="rounded border border-orange-400 p-3 text-orange-200">
          {detail.data?.status === "REVIEW_REQUIRED"
            ? "Trạng thái không chắc chắn. Kiểm tra Company Page trước khi tiếp tục; không được retry tự động."
            : "Bài đăng này không thể chỉnh sửa ở trạng thái hiện tại."}
        </p>
      )}
      {detail.data?.lastError && <p className="rounded border border-red-700 p-3 text-red-200">{detail.data.lastError}</p>}

      <label className="block">Chủ đề
        <input disabled={immutable} value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-1 w-full rounded bg-primary-black p-3" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button disabled={!topic.trim() || immutable} onClick={() => draft.mutate()} className="rounded bg-indigo-600 px-3 py-2 text-white">
          {draft.isPending ? "Đang tạo bằng AI…" : "Tạo bản nháp AI"}
        </button>
        <button disabled={immutable} onClick={() => propose.mutate()} className="rounded bg-gray-700 px-3 py-2">Gợi ý chủ đề AI</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((item) => <button key={item} disabled={immutable} onClick={() => setTopic(item)} className="rounded border border-gray-600 p-2 text-left">{item}</button>)}
      </div>

      <label className="block">Nội dung
        <textarea disabled={immutable} value={content} onChange={(event) => setContent(event.target.value)} className="mt-1 min-h-48 w-full rounded bg-primary-black p-3" />
      </label>

      <label>Media mode
        <select disabled={immutable} value={mediaMode} onChange={(event) => changeMediaMode(event.target.value as LinkedInMediaMode)} className="ml-2 rounded bg-primary-black p-2">
          <option value="none">Không ảnh</option>
          <option value="single-image">Một ảnh</option>
          <option value="multi-image">Nhiều ảnh</option>
        </select>
      </label>
      {mediaMode !== "none" && (
        <div>
          <div className="flex gap-2">
            <input disabled={immutable} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Từ khóa Pexels, ngăn bằng dấu phẩy" className="flex-1 rounded bg-primary-black p-2" />
            <button disabled={immutable || search.isPending} onClick={() => search.mutate()} className="rounded bg-gray-700 p-2">
              {search.isPending ? "Đang tìm ảnh…" : id ? "Gợi ý ảnh" : "Tìm ảnh"}
            </button>
          </div>
          <p className="mt-2 text-sm">Đã chọn {media.length} ảnh{mediaMode === "multi-image" ? " (cần 2–20)" : " (cần 1)"}.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {candidates.map((item) => {
              const selected = media.some((value) => value.providerId === item.providerId);
              return (
                <article key={item.providerId} className={`overflow-hidden rounded border text-left ${selected ? "border-primary-green" : "border-gray-700"}`}>
                  <img src={item.imageUrl} alt={item.altText} className="h-32 w-full object-cover" />
                  <div className="space-y-2 p-2 text-sm">
                    <p>{item.attribution}</p>
                    {selected && <input value={media.find((value) => value.providerId === item.providerId)?.altText ?? ""} onChange={(event) => updateAltText(item.providerId, event.target.value)} disabled={immutable} placeholder="Alt text bắt buộc" className="w-full rounded bg-primary-black p-2" />}
                    <button disabled={immutable} onClick={() => toggleCandidate(item)} className="rounded bg-gray-700 px-3 py-2">{selected ? "Bỏ chọn" : "Chọn"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {(factCheck.requiresHumanFactCheck || factCheck.factCheckNotes.length > 0) && (
        <section className="rounded border border-yellow-500 p-4">
          <h2 className="font-semibold text-yellow-200">Kiểm tra tính chính xác</h2>
          {factCheck.factCheckNotes.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">{factCheck.factCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          ) : (
            <p className="mt-2">Nội dung này cần được kiểm tra thủ công.</p>
          )}
          {factCheck.requiresHumanFactCheck && (
            <label className="mt-3 flex gap-2">
              <input type="checkbox" disabled={immutable} checked={factCheckAcknowledged} onChange={(event) => setFactCheckAcknowledged(event.target.checked)} />
              Tôi đã kiểm tra các thông tin trên.
            </label>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {!immutable && (
          <button disabled={!formValid || save.isPending} onClick={() => save.mutate()} className="rounded bg-gray-700 px-4 py-3 disabled:opacity-50">Lưu bản nháp</button>
        )}
        {!immutable && detail.data?.status !== "FAILED" && (
          <button disabled={!formValid || publish.isPending} onClick={() => setConfirm(true)} className="rounded bg-[#0a66c2] px-4 py-3 text-white disabled:opacity-50">Đăng ngay lên LinkedIn</button>
        )}
        {id && detail.data?.status === "FAILED" && (
          <button disabled={retry.isPending} onClick={() => retry.mutate()} className="rounded bg-red-700 px-4 py-3 text-white">Thử lại</button>
        )}
      </div>

      <Modal isOpen={confirm} onClose={() => setConfirm(false)}>
        <h2 className="text-xl text-primary-white">Đăng ngay lên LinkedIn?</h2>
        <p className="mt-2">{topic} · {mediaMode} · {media.length} ảnh</p>
        <div className="mt-4 flex gap-3">
          <button onClick={() => setConfirm(false)}>Hủy</button>
          <button disabled={publish.isPending} onClick={() => publish.mutate()} className="rounded bg-[#0a66c2] px-3 py-2 text-white">Đăng ngay</button>
        </div>
      </Modal>
    </section>
  );
};

export default LinkedInPost;
