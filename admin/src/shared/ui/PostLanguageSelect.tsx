import type { PostLanguage } from "../../types/Language";

// Select the language for the next AI generation without changing existing content.
export const PostLanguageSelect = ({ value, onChange, disabled = false }: {
  value: PostLanguage;
  onChange: (language: PostLanguage) => void;
  disabled?: boolean;
}) => (
  <label className="block space-y-1.5 text-xs font-medium text-content-secondary">
    <span>Ngôn ngữ bài viết</span>
    <select aria-label="Ngôn ngữ bài viết" value={value} disabled={disabled}
      onChange={(event) => onChange(event.target.value as PostLanguage)}
      className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-content-primary disabled:opacity-50">
      <option value="vietnamese">Tiếng Việt</option>
      <option value="english">Tiếng Anh</option>
    </select>
  </label>
);
