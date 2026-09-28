import React from "react";
import { motion } from "framer-motion";

interface ButtonCTAProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const ButtonCTA: React.FC<ButtonCTAProps> = ({
  children,
  onClick,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
}) => {
  const baseClasses =
    "relative overflow-hidden font-semibold rounded-md transition-all duration-300 transform-gpu";

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantClasses = {
    primary:
      "!bg-gradient-to-r from-primary-blue-medium to-primary-green-dark text-primary-white shadow-lg hover:shadow-xl",
    secondary:
      "bg-gradient-to-r from-primary-blue border to-primary-green text-primary-white shadow-lg hover:shadow-xl",
  };

  return (
    <motion.button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      whileHover={{
        scale: 1.01,
        y: 0,
        transition: { duration: 0.2 },
      }}
      whileTap={{
        scale: 0.95,
        transition: { duration: 0.1 },
      }}
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary-black-medium to-primary-green opacity-0"
        whileHover={{
          opacity: 1,
          transition: { duration: 0.3 },
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
        animate={{
          translateX: ["100%", "-100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "linear",
        }}
      />

      {/* Floating particles effect */}
      <motion.div className="absolute inset-0" whileHover="hover">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              left: `${20 + i * 12}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            variants={{
              hover: {
                y: [-10, -20, -10],
                opacity: [0.4, 1, 0.4],
                transition: {
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                },
              },
            }}
          />
        ))}
      </motion.div>

      {/* Button content */}
      <motion.span
        className="relative z-10 flex items-center justify-center gap-2"
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.2 },
        }}
      >
        {children}
      </motion.span>

      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-xl"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{
          scale: 2,
          opacity: [0, 0.3, 0],
          transition: { duration: 0.4 },
        }}
      />
    </motion.button>
  );
};

export default ButtonCTA;
