import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import { searchLinkedInMedia } from "../../services/linkedin/handleLinkedIn";
import { importPexelsBanner } from "../../services/media/handleMedia";
import { apiErrorMessage } from "../../types/Api";
import type { PexelsCandidate } from "../../types/Publication";

// Search existing landscape candidates and import only the image the administrator chooses.
export const PexelsImagePanel = ({ onUse, onBusyChange, disabled = false }: {
  onUse: (objectKey: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) => {
  const [keywords, setKeywords] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const search = useMutation({
    mutationFn: () => searchLinkedInMedia(keywords.split(/[,\n]+/).map((key) => key.trim()).filter(Boolean).slice(0, 5)),
  });

  // Submit an intentional search instead of fetching provider results on every keystroke.
  const searchImages = (event: FormEvent) => {
    event.preventDefault();
    if (keywords.trim() && !disabled && !importingId) search.mutate();
  };

  // Preserve the current banner until the chosen candidate is successfully stored.
  const selectImage = async (candidate: PexelsCandidate) => {
    setImportingId(candidate.providerId);
    onBusyChange?.(true);
    try {
      const stored = await importPexelsBanner(candidate);
      onUse(stored.objectKey);
      toast.success("Đã chọn ảnh bìa từ Pexels — chưa lưu bài viết.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setImportingId(null);
      onBusyChange?.(false);
    }
  };

  return <div className="space-y-3 rounded-xl border border-surface-border bg-surface-elevated/30 p-4">
    <h4 className="text-xs font-semibold text-content-primary">Tìm ảnh bìa trên Pexels</h4>
    <form onSubmit={searchImages} className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 space-y-1 text-xs text-content-secondary">
        <span>Từ khóa tìm ảnh</span>
        <input value={keywords} onChange={(event) => setKeywords(event.target.value)} maxLength={300}
          disabled={disabled || Boolean(importingId)} placeholder="Ví dụ: server room, data center"
          className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green disabled:opacity-50" />
      </label>
      <button type="submit" disabled={disabled || search.isPending || Boolean(importingId) || !keywords.trim()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-content-primary disabled:opacity-50">
        <FiSearch />{search.isPending ? "Đang tìm…" : "Tìm ảnh"}
      </button>
    </form>
    {search.isError && <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-rose-300">
      <span>{apiErrorMessage(search.error)}</span><button type="button" disabled={disabled || Boolean(importingId)} onClick={() => search.mutate()} className="underline">Thử lại</button>
    </div>}
    {search.isSuccess && search.data.length === 0 && <p role="status" className="text-xs text-content-muted">Không tìm thấy ảnh phù hợp. Hãy thử từ khóa cụ thể hơn.</p>}
    {search.data && search.data.length > 0 && <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
      {search.data.map((candidate) => <div key={candidate.providerId} className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
        <img src={candidate.imageUrl} alt={candidate.altText} loading="lazy" className="aspect-video w-full object-cover" />
        <div className="space-y-2 p-2">
          <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[11px] text-content-muted hover:text-primary-green">Ảnh: {candidate.photographer} · Pexels</a>
          <button type="button" disabled={disabled || Boolean(importingId) || search.isPending} onClick={() => { void selectImage(candidate); }}
            className="w-full rounded-lg bg-primary-green px-2 py-1.5 text-xs font-semibold text-primary-black disabled:opacity-50">
            {importingId === candidate.providerId ? "Đang tải ảnh…" : "Dùng làm ảnh bìa"}
          </button>
        </div>
      </div>)}
    </div>}
  </div>;
};
