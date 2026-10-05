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

export const IMAGE_URL = import.meta.env.VITE_IMAGE_URL;

// Public marketing site that hosts published articles under /insights/<slug>.
export const PUBLIC_SITE_URL = readEnv("VITE_PUBLIC_SITE_URL") ?? "https://vietquant.com";
