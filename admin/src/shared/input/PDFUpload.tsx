import React, { useState } from "react";
import { PiUploadSimple } from "react-icons/pi";
import { MdClose } from "react-icons/md";

interface PDFUploadProps {
  label: string;
  id: string;
  file: File | null;
  currentPdfUrl?: string;
  onFileChange: (file: File | null) => void;
  placeholder?: string;
  className?: string;
}

const PDFUpload: React.FC<PDFUploadProps> = ({
  label,
  id,
  file,
  currentPdfUrl,
  onFileChange,
  placeholder = "Click or drag a PDF to upload",
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") return;
      onFileChange(selected);
    }
  };

  const handleOnDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;
    const selected = droppedFiles[0];
    if (selected.type !== "application/pdf") return;
    onFileChange(selected);
  };

  const clearFile = () => onFileChange(null);

  return (
    <div className={className}>
      <label className="block font-medium mb-1">{label}</label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleOnDrop}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors mb-3 ${
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          id={id}
          onChange={handleFileChange}
        />
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center space-y-2 cursor-pointer"
        >
          <PiUploadSimple className="text-3xl text-blue-500" />
          <span className="text-sm text-gray-500">{placeholder}</span>
        </label>
      </div>

      {/* Current PDF */}
      {currentPdfUrl && !file && (
        <div className="flex items-center justify-between bg-gray-50 border rounded p-3 mb-2">
          <a
            href={currentPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View current PDF
          </a>
          <button
            type="button"
            onClick={clearFile}
            className="flex items-center gap-1 text-red-600"
          >
            <MdClose />
            Clear
          </button>
        </div>
      )}

      {/* Selected PDF Preview */}
      {file && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-3">
          <div className="text-sm">
            <div className="font-medium">{file.name}</div>
            <div className="text-gray-600">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="flex items-center gap-1 text-red-600"
          >
            <MdClose />
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
