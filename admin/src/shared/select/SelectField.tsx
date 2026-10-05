import React from "react";

interface SelectFieldProps {
  label: string;
  id: string;
  name: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  id,
  name,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <label htmlFor={id} className="label mb-1.5 text-xs font-medium text-content-secondary">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`sel h-9 w-full rounded-md border border-surface-border bg-surface-base px-3 text-sm text-content-primary transition focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green ${
          disabled ? "opacity-55 cursor-not-allowed bg-surface-elevated/40" : ""
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectField;
