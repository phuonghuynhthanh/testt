// Resolve and normalize environment values so service paths never start with a double slash.
const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (value) return value.replace(/\/+$/, "");
  }
  return undefined;
};

export const API_SERVICES = readEnv("VITE_API_SERVICES");
export const DOMAIN_WEBSITE = readEnv("VITE_DOMAIN_WEBSITE", "VITE_BASE_URL");

export const OPEN_ROUTER_API_KEY = import.meta.env.VITE_OPEN_ROUTER_API_KEY;
export const OPEN_ROUTER_IMAGE_MODEL = import.meta.env
  .VITE_OPEN_ROUTER_IMAGE_MODEL;
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const IMAGE_URL = import.meta.env.VITE_IMAGE_URL;
