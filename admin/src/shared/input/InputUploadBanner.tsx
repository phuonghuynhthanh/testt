import React, { useState } from "react";
import { FaUpload } from "react-icons/fa";
import { toast } from "react-toastify";
import { IMAGE_URL } from "../../config/config";

interface InputUploadBannerProps {
  fileImage?: File | null;
  bannerUrl?: string;
  setBannerImage: (file: File) => void;
}

const InputUploadBanner: React.FC<InputUploadBannerProps> = ({
  fileImage,
  setBannerImage,
  bannerUrl,
}) => {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
  const [isDragging, setIsDragging] = useState(false);

  const handleOnDropBanner = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.info("Tệp quá lớn. Kích thước tối đa là 2MB.");
      return;
    }
    setBannerImage(file);
  };

  const handleOnChangeBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.info("Tệp quá lớn. Kích thước tối đa là 2MB.");
      return;
    }
    setBannerImage(file);
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
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleOnDropBanner}
          className={`flex-1 flex justify-center items-center min-h-[120px] sm:h-[150px] border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary-green bg-primary-green/10" : "border-surface-border hover:border-surface-hover hover:bg-surface-elevated/30"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="banner-upload"
            onChange={handleOnChangeBanner}
          />
          <label
            htmlFor="banner-upload"
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
            src={URL.createObjectURL(fileImage)}
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
