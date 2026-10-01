import { useState } from "react";
import { BsStars } from "react-icons/bs";
import { toast } from "react-toastify";
import { generateAIImage, type AIAspectRatio, type AIImagePurpose, type AIImageQuality, type GeneratedAIImage } from "../../services/media/handleMedia";
import { apiErrorMessage } from "../../types/Api";
import { linkedinMediaUrl } from "../../utils/linkedinMedia";

// Generate a Cloudflare image candidate and require an explicit selection callback.
export const AIImagePanel = ({ purpose, context, onUse }: { purpose: AIImagePurpose; context: string; onUse: (image: GeneratedAIImage) => void }) => {
  const [prompt, setPrompt] = useState("");
  const [altText, setAltText] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AIAspectRatio>(purpose === "BLOG_BANNER" ? "16:9" : "1:1");
  const [quality, setQuality] = useState<AIImageQuality>("BALANCED");
  const [candidate, setCandidate] = useState<GeneratedAIImage | null>(null);
  const [loading, setLoading] = useState(false);

  // Request a new image without changing the parent form until the user selects it.
  const generate = async () => {
    setLoading(true);
    try {
      const result = await generateAIImage({ purpose, prompt: prompt || undefined, context: context || undefined, altText: altText || undefined, aspectRatio, size: "1K", quality });
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
    <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={2} placeholder="Mô tả ảnh (không bắt buộc nếu có ngữ cảnh)" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-content-primary" />
    <input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={1000} placeholder="Mô tả ảnh (alt text)" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-content-primary" />
    <div className="flex flex-wrap gap-2">
      <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as AIAspectRatio)} className="rounded-lg border border-surface-border bg-surface-elevated px-2 py-1.5 text-xs text-content-primary"><option>16:9</option><option>1:1</option><option>4:5</option><option>4:3</option></select>
      <select value={quality} onChange={(event) => setQuality(event.target.value as AIImageQuality)} className="rounded-lg border border-surface-border bg-surface-elevated px-2 py-1.5 text-xs text-content-primary"><option value="FAST">Nhanh</option><option value="BALANCED">Cân bằng</option><option value="HIGH">Cao</option></select>
      <button type="button" disabled={loading || (!prompt.trim() && !context.trim())} onClick={generate} className="rounded-lg border border-purple-500/30 px-3 py-1.5 text-xs text-purple-200 disabled:opacity-50">{loading ? "Đang tạo…" : candidate ? "Tạo lại" : "Tạo ảnh"}</button>
    </div>
    {candidate && <div className="space-y-2"><img src={linkedinMediaUrl(candidate.media)} alt={altText || candidate.media.altText} className="max-h-56 rounded-lg border border-surface-border" /><button type="button" onClick={() => onUse({ ...candidate, media: { ...candidate.media, altText } })} className="rounded-lg bg-primary-green px-3 py-1.5 text-xs font-semibold text-primary-black">Dùng ảnh này</button></div>}
  </div>;
};
