import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { importPexelsBanner, searchPexelsBanners } from "../../services/media/handleMedia";
import { apiErrorMessage } from "../../types/Api";
import type { PexelsCandidate } from "../../types/Publication";

export const PexelsImagePanel = ({ onUse, onBusyChange, disabled = false }: {
  onUse: (objectKey: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) => {
  const [keywords, setKeywords] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const search = useMutation({
    mutationFn: () => searchPexelsBanners(keywords.split(/[,\n]+/).map((key) => key.trim()).filter(Boolean).slice(0, 5)),
  });

  const searchImages = (event: FormEvent) => {
    event.preventDefault();
    if (keywords.trim() && !disabled && !importingId) search.mutate();
  };

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

  return (
    <div className="space-y-4">
      <form onSubmit={searchImages} className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Từ khóa tìm ảnh</span>
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            maxLength={300}
            disabled={disabled || Boolean(importingId)}
            placeholder="Từ khóa tìm ảnh, ví dụ: stock market"
            className="inp"
          />
        </label>
        <button
          type="submit"
          disabled={disabled || search.isPending || Boolean(importingId) || !keywords.trim()}
          className="btn btn-secondary lg !h-[2.5rem]"
        >
          <MagnifyingGlass size={16} weight="light" />
          <span>{search.isPending ? "Đang tìm…" : "Tìm ảnh"}</span>
        </button>
      </form>
      {search.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-rose-400">
          <span>{apiErrorMessage(search.error)}</span>
          <button type="button" disabled={disabled || Boolean(importingId)} onClick={() => search.mutate()} className="underline">
            Thử lại
          </button>
        </div>
      )}
      {search.isSuccess && search.data.length === 0 && (
        <p role="status" className="text-xs text-content-muted">
          Không tìm thấy ảnh phù hợp. Hãy thử từ khóa cụ thể hơn.
        </p>
      )}
      {search.data && search.data.length > 0 && (
        <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {search.data.map((candidate) => (
            <div key={candidate.providerId} className="overflow-hidden rounded-xl border border-surface-border bg-surface-elevated">
              <img src={candidate.imageUrl} alt={candidate.altText} loading="lazy" className="aspect-video w-full object-cover" />
              <div className="space-y-2 p-2">
                <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[11px] text-content-muted hover:text-primary-green">
                  Ảnh: {candidate.photographer} · Pexels
                </a>
                <button
                  type="button"
                  disabled={disabled || Boolean(importingId) || search.isPending}
                  onClick={() => { void selectImage(candidate); }}
                  className="btn btn-primary w-full"
                >
                  {importingId === candidate.providerId ? "Đang tải ảnh…" : "Dùng làm ảnh bìa"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
