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
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  name,
  value,
  readOnly = false,
  handleChange,
  placeholder,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <label htmlFor={id} className="text-primary-white font-medium">
        {label}
      </label>
      <input
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        className={`border border-gray-300 rounded-md p-2 mt-1 bg-primary-black-light text-primary-white first-line: ${
          readOnly ? " cursor-not-allowed text-primary-white/80" : ""
        }`}
        placeholder={placeholder}
      />
    </div>
  );
};

export default InputField;
