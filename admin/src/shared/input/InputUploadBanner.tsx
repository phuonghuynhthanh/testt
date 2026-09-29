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
      <div className="h-[150px] flex items-center mb-2 gap-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleOnDropBanner}
          className={`flex justify-center items-center h-full border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
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
            <FaUpload className="text-2xl text-blue-500" />
            <span className="text-sm text-gray-500">
              Nhấp hoặc kéo thả hình ảnh để tải lên
            </span>
          </label>
        </div>

        {fileImage ? (
          <img
            src={URL.createObjectURL(fileImage)}
            alt="Xem trước Banner"
            className="rounded-lg h-full w-[250px] object-fill border"
          />
        ) : bannerUrl ? (
          <img
            src={/^https?:\/\//i.test(bannerUrl) ? bannerUrl : `${IMAGE_URL}/${bannerUrl}`}
            alt="Xem trước Banner"
            className="rounded-lg h-full w-[250px] object-fill border"
          />
        ) : null}
      </div>
    </div>
  );
};

export default InputUploadBanner;
