// Resolve environment variable value from a list of keys in priority order.
const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (value) return value;
  }
  return undefined;
};

export const API_SERVICES = readEnv(
  "VITE_API_SERVICES",
  "VITE_API_SERVICES_ADMIN",
);
export const TOKEN_IPINFO = import.meta.env.VITE_TOKEN_IPINFO;
export const API_CHAT_SERVICE = import.meta.env.VITE_API_CHAT_SERVICE;
export const TELEGRAM_SUPPORT_BOT_TOKEN = import.meta.env
  .VITE_TELEGRAM_SUPPORT_BOT_TOKEN;

export const DOMAIN_WEBSITE = readEnv("VITE_DOMAIN_WEBSITE", "VITE_BASE_URL");

export const OPEN_ROUTER_API_KEY = import.meta.env.VITE_OPEN_ROUTER_API_KEY;
export const OPEN_ROUTER_IMAGE_MODEL = import.meta.env
  .VITE_OPEN_ROUTER_IMAGE_MODEL;
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const IMAGE_URL = import.meta.env.VITE_IMAGE_URL;
export const API_QUANT_SERVICES = import.meta.env.VITE_API_QUANT_SERVICES;
