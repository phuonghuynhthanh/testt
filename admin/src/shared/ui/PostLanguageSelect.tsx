import type { PostLanguage } from "../../types/Language";

// Render the post language dropdown with the shared label and compact input styles.
export const PostLanguageSelect = ({ value, onChange, disabled = false }: {
  value: PostLanguage;
  onChange: (language: PostLanguage) => void;
  disabled?: boolean;
}) => (
  <div>
    <label className="label">Ngôn ngữ bài viết</label>
    <select
      aria-label="Ngôn ngữ bài viết"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as PostLanguage)}
      className="inp sm !w-auto"
    >
      <option value="vietnamese">Tiếng Việt</option>
      <option value="english">Tiếng Anh</option>
    </select>
  </div>
);
