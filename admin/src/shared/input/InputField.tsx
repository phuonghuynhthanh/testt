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
      <label htmlFor={id} className="label mb-1.5 text-xs font-medium text-content-secondary">
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
        className={`inp h-9 w-full rounded-md border border-surface-border bg-surface-base px-3 text-sm text-content-primary placeholder:text-[#8493A8] transition ${
          readOnly
            ? "opacity-55 cursor-not-allowed border-dashed bg-surface-elevated/40"
            : "focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green"
        }`}
      />
    </div>
  );
};

export default InputField;
