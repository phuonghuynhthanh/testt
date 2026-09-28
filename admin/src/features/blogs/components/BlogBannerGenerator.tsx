import type { ChangeEvent } from "react";

import InputField from "../../../shared/input/InputField";
import type {
  ImageAspectRatio,
  ImageQuality,
  ImageSize,
} from "../../../services/openrouter/handleImageGenerate";

interface BlogBannerGeneratorProps {
  imagePrompt: string;
  imageAspectRatio: ImageAspectRatio;
  imageSize: ImageSize;
  imageQuality: ImageQuality;
  isGeneratingBanner: boolean;
  onPromptChange: (value: string) => void;
  onAspectRatioChange: (value: ImageAspectRatio) => void;
  onSizeChange: (value: ImageSize) => void;
  onQualityChange: (value: ImageQuality) => void;
  onGenerateBanner: () => void;
}

const ASPECT_RATIO_OPTIONS: ImageAspectRatio[] = [
  "16:9",
  "4:3",
  "3:2",
  "1:1",
  "9:16",
  "21:9",
];

const IMAGE_SIZE_OPTIONS: ImageSize[] = ["1K", "2K", "4K"];
const IMAGE_QUALITY_OPTIONS: ImageQuality[] = ["low", "medium", "high"];

// Render an image generation selector with prompt, ratio, size, and quality controls.
const BlogBannerGenerator = ({
  imagePrompt,
  imageAspectRatio,
  imageSize,
  imageQuality,
  isGeneratingBanner,
  onPromptChange,
  onAspectRatioChange,
  onSizeChange,
  onQualityChange,
  onGenerateBanner,
}: BlogBannerGeneratorProps) => {
  // Normalize input events before forwarding typed image option values.
  const handleSelectChange =
    <T extends string>(onChange: (value: T) => void) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value as T);
    };

  return (
    <div className="space-y-2">
      <InputField
        label="Banner Prompt (Optional)"
        id="bannerPrompt"
        name="bannerPrompt"
        value={imagePrompt}
        handleChange={(event) => onPromptChange(event.target.value)}
        placeholder="Example: Symbolic editorial image matching the title, no text, no faces"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className="block font-medium text-primary-white mb-1">
            Aspect Ratio
          </label>
          <select
            className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full"
            value={imageAspectRatio}
            onChange={handleSelectChange(onAspectRatioChange)}
          >
            {ASPECT_RATIO_OPTIONS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium text-primary-white mb-1">
            Image Size
          </label>
          <select
            className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full"
            value={imageSize}
            onChange={handleSelectChange(onSizeChange)}
          >
            {IMAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium text-primary-white mb-1">
            Quality
          </label>
          <select
            className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full"
            value={imageQuality}
            onChange={handleSelectChange(onQualityChange)}
          >
            {IMAGE_QUALITY_OPTIONS.map((quality) => (
              <option key={quality} value={quality}>
                {quality}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        className="px-3 py-2 text-sm text-white font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        onClick={onGenerateBanner}
        disabled={isGeneratingBanner}
      >
        {isGeneratingBanner
          ? "Generating banner..."
          : "Generate Banner with OpenRouter"}
      </button>
    </div>
  );
};

export default BlogBannerGenerator;
