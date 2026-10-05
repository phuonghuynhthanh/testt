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
      <label htmlFor={id} className="label mb-1.5 text-xs font-medium text-content-secondary">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        rows={rows}
        className={`inp w-full rounded-md border border-surface-border bg-surface-base p-3 text-sm text-content-primary placeholder:text-[#8493A8] transition focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green ${
          readOnly ? "opacity-55 cursor-not-allowed border-dashed bg-surface-elevated/40" : ""
        }`}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export default TextareaField;
