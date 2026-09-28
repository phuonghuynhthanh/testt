import React, { useState } from "react";
import { PiUploadSimple } from "react-icons/pi";
import { MdClose } from "react-icons/md";

interface MultipleImageUploadProps {
  label: string;
  id: string;
  files: File[];
  currentImages?: string[];
  onFileChange: (files: File[]) => void;
  onCurrentImageDelete?: (imageUrl: string) => void;
  placeholder?: string;
  className?: string;
}

const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({
  label,
  id,
  files,
  currentImages = [],
  onFileChange,
  onCurrentImageDelete,
  placeholder = "Click or drag images to upload",
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const updatedFiles = [...files, ...newFiles];
      onFileChange(updatedFiles);
    }
  };

  const handleOnDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      const newFiles = Array.from(droppedFiles);
      const updatedFiles = [...files, ...newFiles];
      onFileChange(updatedFiles);
    }
  };

  const handleDeleteFile = (indexToDelete: number) => {
    const updatedFiles = files.filter((_, index) => index !== indexToDelete);
    onFileChange(updatedFiles);
  };

  const handleDeleteCurrentImage = (imageUrl: string) => {
    if (onCurrentImageDelete) {
      onCurrentImageDelete(imageUrl);
    }
  };

  return (
    <div className={className}>
      <label className="block font-medium mb-1">{label}</label>

      {/* Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleOnDrop}
        className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors mb-4 ${
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id={id}
          multiple
          onChange={handleFileChange}
        />
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center space-y-2 cursor-pointer"
        >
          <PiUploadSimple className="text-4xl text-blue-500" />
          <span className="text-sm text-gray-500">{placeholder}</span>
          <span className="text-xs text-gray-400">
            PNG, JPG up to 10MB each
          </span>
        </label>
      </div>

      {/* Current Images from Server */}
      {currentImages.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Current Images ({currentImages.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentImages.map((imageUrl, index) => (
              <div key={`current-${index}`} className="relative group">
                <div className="w-full h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={imageUrl}
                    alt={`Current ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {onCurrentImageDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCurrentImage(imageUrl)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    title="Delete current image"
                  >
                    <MdClose className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Files Preview */}
      {files.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            New Images ({files.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <div key={`new-${index}`} className="relative group">
                <div className="w-full h-24 rounded-lg overflow-hidden border-2 border-green-200">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`New ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteFile(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  title="Delete new image"
                >
                  <MdClose className="w-4 h-4" />
                </button>
                <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  New
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {(currentImages.length > 0 || files.length > 0) && (
        <div className="text-sm text-gray-600 mt-2">
          Total: {currentImages.length + files.length} image(s)
          {currentImages.length > 0 && ` (${currentImages.length} current`}
          {files.length > 0 &&
            currentImages.length > 0 &&
            `, ${files.length} new)`}
          {files.length > 0 &&
            currentImages.length === 0 &&
            ` (${files.length} new)`}
          {currentImages.length > 0 && files.length === 0 && ")"}
        </div>
      )}
    </div>
  );
};

export default MultipleImageUpload;
