import { useState } from "react";
import { BsStars } from "react-icons/bs";
import { toast } from "react-toastify";
import { generateAIImage, type AIImagePurpose, type GeneratedAIImage } from "../../services/media/handleMedia";
import { apiErrorMessage } from "../../types/Api";
import { linkedinMediaUrl } from "../../utils/linkedinMedia";

// Generate a Cloudflare image candidate and require an explicit selection callback.
export const AIImagePanel = ({ purpose, context, onUse, disabled = false }: { purpose: AIImagePurpose; context: string; onUse: (image: GeneratedAIImage) => void; disabled?: boolean }) => {
  const [prompt, setPrompt] = useState("");
  const [altText, setAltText] = useState("");
  const [candidate, setCandidate] = useState<GeneratedAIImage | null>(null);
  const [loading, setLoading] = useState(false);

  // Request a new image without changing the parent form until the user selects it.
  const generate = async () => {
    setLoading(true);
    try {
      const result = await generateAIImage({ purpose, prompt: prompt.trim() || undefined, context: context.trim().slice(0, 20000) || undefined, altText: altText.trim() || undefined, size: "1K" });
      setCandidate(result);
      setAltText(result.media.altText || altText);
      toast.success("Đã tạo ảnh AI để xem trước.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return <div className="mt-4 space-y-3 rounded-xl border border-purple-500/20 bg-purple-950/10 p-4">
    <div className="flex items-center gap-2 text-xs font-semibold text-purple-200"><BsStars /> Tạo ảnh bằng AI</div>
    <p className="text-xs text-content-muted">AI đề xuất ảnh chân thực dựa trên nội dung đang soạn. Kiểm tra ảnh trước khi sử dụng.</p>
    <textarea aria-label="Mô tả ảnh AI" disabled={disabled || loading} value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={2} placeholder="Góc nhìn hoặc cảnh bạn muốn thể hiện (không bắt buộc)" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-content-primary disabled:opacity-50" />
    <input aria-label="Mô tả ảnh AI cho người đọc" disabled={disabled || loading} value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={1000} placeholder="Mô tả ảnh (alt text)" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-content-primary disabled:opacity-50" />
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled || loading || (!prompt.trim() && !context.trim())} onClick={generate} className="rounded-lg border border-purple-500/30 px-3 py-1.5 text-xs text-purple-200 disabled:opacity-50">{loading ? "Đang chuẩn bị và tạo ảnh…" : candidate ? "Tạo lại" : "Tạo ảnh"}</button>
    </div>
    {candidate && <div className="space-y-2"><img src={linkedinMediaUrl(candidate.media)} alt={altText || candidate.media.altText} className="max-h-56 rounded-lg border border-surface-border object-contain" /><button type="button" disabled={disabled || loading} onClick={() => onUse({ ...candidate, media: { ...candidate.media, altText: altText.trim() || candidate.media.altText } })} className="rounded-lg bg-primary-green px-3 py-1.5 text-xs font-semibold text-primary-black disabled:opacity-50">Dùng ảnh này</button></div>}
  </div>;
};
