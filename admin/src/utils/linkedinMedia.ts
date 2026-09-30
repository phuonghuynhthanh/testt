import { IMAGE_URL } from "../config/config";
import type { LinkedInMediaAsset } from "../types/Publication";

// Return one stable identity for either provider-backed or uploaded media.
export const linkedinMediaKey = (media: LinkedInMediaAsset): string =>
  media.provider === "pexels" ? `pexels:${media.providerId}` : `upload:${media.objectKey}`;

// Resolve uploaded object keys through the configured media host.
export const linkedinMediaUrl = (media: LinkedInMediaAsset): string =>
  media.provider === "pexels" ? media.imageUrl : `${IMAGE_URL}/${media.objectKey}`;

