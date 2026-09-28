import React from "react";

interface TextareaFieldProps {
  label: string;
  id?: string;
  name?: string;
  value: string;
  readOnly?: boolean;
  handleChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  id,
  name,
  value,
  readOnly = false,
  handleChange,
  placeholder,
  rows = 4,
  onKeyDown,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <label htmlFor={id} className="text-primary-white font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        rows={rows}
        className={`w-full px-4 py-3 rounded border border-gray-700 bg-transparent text-primary-white ${
          readOnly
            ? "bg-primary-black-medium cursor-not-allowed text-primary-white"
            : ""
        }`}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export default TextareaField;
