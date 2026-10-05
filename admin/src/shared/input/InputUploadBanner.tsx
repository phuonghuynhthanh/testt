import React, { useEffect, useId, useState } from "react";
import { Trash, UploadSimple } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { IMAGE_URL } from "../../config/config";

interface BannerPreviewProps {
  fileImage?: File | null;
  bannerUrl?: string;
  onClear?: () => void;
}

// Render the selected banner (new file or stored object) with an optional remove button.
export const BannerPreview: React.FC<BannerPreviewProps> = ({ fileImage, bannerUrl, onClear }) => {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!fileImage) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(fileImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileImage]);

  const src = fileImage
    ? previewUrl
    : bannerUrl
      ? (/^https?:\/\//i.test(bannerUrl) ? bannerUrl : `${IMAGE_URL}/${bannerUrl}`)
      : "";
  if (!src) return null;

  return (
    <div className="group relative h-44 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated sm:h-56">
      <img src={src} alt="Ảnh bìa" className="h-full w-full object-cover" />
      {onClear && (
        <div className="absolute right-3 top-3 flex gap-2">
          <button type="button" onClick={onClear} className="btn btn-secondary !h-8 backdrop-blur">
            <Trash size={14} weight="light" />
            Gỡ ảnh
          </button>
        </div>
      )}
    </div>
  );
};

interface InputUploadBannerProps {
  fileImage?: File | null;
  bannerUrl?: string;
  setBannerImage: (file: File) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

const InputUploadBanner: React.FC<InputUploadBannerProps> = ({
  fileImage,
  setBannerImage,
  bannerUrl,
  disabled = false,
  showPreview = true,
}) => {
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB, matches MEDIA_MAX_UPLOAD_MB
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useId();

  // Validate type and size before handing the file to the parent.
  const selectFile = (file?: File) => {
    if (!file || disabled) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.info("Vui lòng chọn ảnh JPEG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.info("Tệp quá lớn. Kích thước tối đa là 20MB.");
      return;
    }
    setBannerImage(file);
  };

  const handleOnDropBanner = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const handleOnChangeBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
    e.currentTarget.value = "";
  };

  return (
    <div className="space-y-4">
      {showPreview && <BannerPreview fileImage={fileImage} bannerUrl={bannerUrl} />}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleOnDropBanner}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
          isDragging
            ? "border-primary-green/50 bg-surface-elevated"
            : "border-surface-border bg-surface-elevated/40 hover:border-primary-green/50 hover:bg-surface-elevated"
        }`}
      >
        <UploadSimple size={30} weight="light" className="text-content-muted" />
        <span className="text-sm font-medium">Chọn tệp ảnh từ thiết bị</span>
        <span className="hint">JPEG, PNG, WebP hoặc GIF, tối đa 20MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={disabled}
          className="hidden"
          id={inputId}
          onChange={handleOnChangeBanner}
        />
      </label>
    </div>
  );
};

export default InputUploadBanner;
