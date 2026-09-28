import React, { useState } from "react";
import { PiUploadSimple } from "react-icons/pi";

interface ImageUploadProps {
  label: string;
  id: string;
  multiple?: boolean;
  files: File | File[] | null;
  currentImages?: string | string[];
  onFileChange: (files: File | File[] | null) => void;
  placeholder?: string;
  className?: string;
  previewClassName?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  id,
  multiple = false,
  files,
  currentImages,
  onFileChange,
  placeholder = "Click or drag an image to upload",
  className = "",
  previewClassName = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (multiple) {
        const fileArray = Array.from(e.target.files);
        onFileChange(fileArray);
      } else {
        const file = e.target.files[0] || null;
        onFileChange(file);
      }
    }
  };

  const handleOnDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles) return;

    if (multiple) {
      const fileArray = Array.from(droppedFiles);
      onFileChange(fileArray);
    } else {
      const file = droppedFiles[0] || null;
      onFileChange(file);
    }
  };

  // Convert files to arrays for consistent handling
  const fileArray = files ? (Array.isArray(files) ? files : [files]) : [];
  const currentImageArray = currentImages
    ? Array.isArray(currentImages)
      ? currentImages
      : [currentImages]
    : [];

  return (
    <div className={className}>
      <label className="block font-medium mb-1">{label}</label>
      <div className="h-[150px] flex items-center mb-2 gap-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleOnDrop}
          className={`flex justify-center items-center h-full border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id={id}
            multiple={multiple}
            onChange={handleFileChange}
          />
          <label
            htmlFor={id}
            className="flex flex-col items-center justify-center space-y-2 cursor-pointer"
          >
            <PiUploadSimple className="text-2xl text-blue-500" />
            <span className="text-sm text-gray-500">{placeholder}</span>
          </label>
        </div>

        {/* Show preview - prioritize new files, fallback to current */}
        {fileArray.length > 0 ? (
          <img
            src={URL.createObjectURL(fileArray[0])}
            alt="Preview"
            className={`rounded-lg h-full w-[250px] object-fill border ${previewClassName}`}
          />
        ) : currentImageArray.length > 0 ? (
          <img
            src={currentImageArray[0]}
            alt="Current"
            className={`rounded-lg h-full w-[250px] object-fill border ${previewClassName}`}
          />
        ) : null}
      </div>

      {/* Grid Preview for Multiple Images */}
      {multiple && (
        <>
          {/* Show new images grid */}
          {fileArray.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                New Images Preview ({fileArray.length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fileArray.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="w-full h-24 rounded-lg overflow-hidden border-2 border-green-200">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show current images grid when no new images */}
          {fileArray.length === 0 && currentImageArray.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Current Images ({currentImageArray.length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentImageArray.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <div className="w-full h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={imageUrl}
                        alt={`Current ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageUpload;
