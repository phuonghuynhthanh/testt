import React from "react";
import { motion } from "framer-motion";
import { type IconType } from "react-icons";

interface ButtonThemeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "outlineRed" | "outlineGreen" | "green";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: IconType;
  iconPosition?: "left" | "right";
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const ButtonTheme: React.FC<ButtonThemeProps> = ({
  children,
  variant = "default",
  size = "sm",
  fullWidth = false,
  icon: Icon,
  iconPosition = "left",
  onClick,
  disabled = false,
  className = "",
  type = "button",
}) => {
  const baseClasses =
    "font-semibold transition-all text-xs duration-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantClasses = {
    default:
      "bg-gradient-to-br from-primary-blue-light to-primary-green text-primary-white shadow-lg hover:shadow-xl hover:from-primary-green-dark hover:to-primary-green focus:ring-primary-blue-light",
    outline:
      "border border-primary-white bg-primary-black hover:bg-primary-black-light text-primary-white ",
    outlineRed:
      "border border-primary-red-dark bg-primary-white hover:bg-primary-red-dark/10 text-primary-red-dark hover:text-primary-red-dark focus:ring-primary-red-dark",
    outlineGreen:
      "border border-primary-green-dark  hover:bg-primary-green-dark/10 text-primary-green-dark hover:text-primary-green-dark focus:ring-primary-green-dark",
    green:
      "bg-primary-green text-primary-blue hover:bg-primary-green/85 focus:ring-primary-green-medium border border-primary-green/5",
  };

  const widthClasses = fullWidth ? "w-full" : "w-auto";

  const combinedClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      <div className="flex items-center justify-center gap-2">
        {Icon && iconPosition === "left" && <Icon className="w-5 h-5" />}
        {children}
        {Icon && iconPosition === "right" && <Icon className="w-5 h-5" />}
      </div>
    </motion.button>
  );
};

export default ButtonTheme;
