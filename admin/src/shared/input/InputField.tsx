import React from "react";

interface InputFieldProps {
  label: string;
  id: string;
  name: string;
  value: string;
  readOnly?: boolean;
  handleChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  placeholder?: string;
  className?: string;
}

// Render a standardized form text input with dark surface styling and clear focus states.
const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  name,
  value,
  readOnly = false,
  handleChange,
  placeholder,
  className = "",
}) => {
  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-content-secondary mb-1.5">
        {label}
      </label>
      <input
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-surface-border px-3.5 py-2 text-sm text-content-primary placeholder-content-muted transition ${
          readOnly
            ? "bg-surface-card/60 text-content-muted cursor-not-allowed border-dashed"
            : "bg-surface-elevated focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green"
        }`}
      />
    </div>
  );
};

export default InputField;
