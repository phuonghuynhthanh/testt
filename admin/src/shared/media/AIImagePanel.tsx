import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { generateAIImage, type AIImagePurpose, type GeneratedAIImage } from "../../services/media/handleMedia";
import { apiErrorMessage } from "../../types/Api";
import { linkedinMediaUrl } from "../../utils/linkedinMedia";

export const AIImagePanel = ({ purpose, context, onUse, disabled = false }: {
  purpose: AIImagePurpose;
  context: string;
  onUse: (image: GeneratedAIImage) => void;
  disabled?: boolean;
}) => {
  const [prompt, setPrompt] = useState("");
  const [altText, setAltText] = useState("");
  const [candidate, setCandidate] = useState<GeneratedAIImage | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await generateAIImage({
        purpose,
        prompt: prompt.trim() || undefined,
        context: context.trim().slice(0, 20000) || undefined,
        altText: altText.trim() || undefined,
        size: "1K",
      });
      setCandidate(result);
      setAltText(result.media.altText || altText);
      toast.success("Đã tạo ảnh AI để xem trước.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="hint">
        AI đề xuất ảnh chân thực dựa trên nội dung đang soạn. Kiểm tra ảnh trước khi sử dụng.
      </p>
      <textarea
        aria-label="Mô tả ảnh AI"
        disabled={disabled || loading}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Góc nhìn hoặc cảnh bạn muốn thể hiện (không bắt buộc)"
        className="inp"
      />
      <input
        aria-label="Mô tả ảnh AI cho người đọc"
        disabled={disabled || loading}
        value={altText}
        onChange={(event) => setAltText(event.target.value)}
        maxLength={1000}
        placeholder="Mô tả ảnh (alt text)"
        className="inp"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || loading || (!prompt.trim() && !context.trim())}
          onClick={generate}
          className="btn btn-ai lg !h-[2.5rem]"
        >
          <Sparkle size={16} weight="light" />
          {loading ? "Đang chuẩn bị và tạo ảnh…" : candidate ? "Tạo lại" : "Tạo ảnh"}
        </button>
      </div>
      {candidate && (
        <div className="space-y-2 border-t border-surface-border pt-3">
          <img
            src={linkedinMediaUrl(candidate.media)}
            alt={altText || candidate.media.altText}
            className="max-h-56 rounded-md border border-surface-border object-contain"
          />
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => onUse({ ...candidate, media: { ...candidate.media, altText: altText.trim() || candidate.media.altText } })}
            className="btn btn-primary"
          >
            Dùng ảnh này
          </button>
        </div>
      )}
    </div>
  );
};
