import React, { useEffect, useId, useState } from "react";
import { FaUpload } from "react-icons/fa";
import { toast } from "react-toastify";
import { IMAGE_URL } from "../../config/config";

interface InputUploadBannerProps {
  fileImage?: File | null;
  bannerUrl?: string;
  setBannerImage: (file: File) => void;
  disabled?: boolean;
}

// Show the active banner and release local object URLs after replacement or unmount.
const InputUploadBanner: React.FC<InputUploadBannerProps> = ({
  fileImage,
  setBannerImage,
  bannerUrl,
  disabled = false,
}) => {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const inputId = useId();

  // Revoke each file preview when the selected local file changes.
  useEffect(() => {
    if (!fileImage) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(fileImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileImage]);

  // Validate both picked and dropped files through one consistent upload boundary.
  const selectFile = (file?: File) => {
    if (!file || disabled) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.info("Vui lòng chọn ảnh JPEG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.info("Tệp quá lớn. Kích thước tối đa là 2MB.");
      return;
    }
    setBannerImage(file);
  };

  // Accept a dropped image without allowing the browser to navigate to the file.
  const handleOnDropBanner = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  // Permit choosing the same file again after clearing the previous selection.
  const handleOnChangeBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
    e.currentTarget.value = "";
  };

  return (
    <div>
      <label className="block font-medium mb-1 text-primary-white">
        Ảnh Banner
      </label>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center mb-2 gap-3 min-h-[140px]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleOnDropBanner}
          className={`flex-1 flex justify-center items-center min-h-[120px] sm:h-[150px] border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary-green bg-primary-green/10" : "border-surface-border hover:border-surface-hover hover:bg-surface-elevated/30"
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={disabled}
            className="hidden"
            id={inputId}
            onChange={handleOnChangeBanner}
          />
          <label
            htmlFor={inputId}
            className="flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <FaUpload className="text-2xl text-primary-green" />
            <span className="text-sm text-content-muted">
              Nhấp hoặc kéo thả hình ảnh để tải lên
            </span>
          </label>
        </div>

        {fileImage ? (
          <img
            src={previewUrl}
            alt="Xem trước Banner"
            className="rounded-xl h-[140px] sm:h-[150px] w-full sm:w-[250px] object-cover border border-surface-border"
          />
        ) : bannerUrl ? (
          <img
            src={/^https?:\/\//i.test(bannerUrl) ? bannerUrl : `${IMAGE_URL}/${bannerUrl}`}
            alt="Xem trước Banner"
            className="rounded-xl h-[140px] sm:h-[150px] w-full sm:w-[250px] object-cover border border-surface-border"
          />
        ) : null}
      </div>
    </div>
  );
};

export default InputUploadBanner;
