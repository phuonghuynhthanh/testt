import React, { useEffect, useId, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { Category } from "../../../types/Category";

interface CategoryComboboxProps {
  value: string;
  items: Category[];
  loading: boolean;
  failed: boolean;
  creating: boolean;
  onChange: (name: string) => void;
  onCreate: (name: string) => void;
  onRetry: () => void;
}

export default function CategoryCombobox({ value, items, loading, failed, creating, onChange, onCreate, onRetry }: CategoryComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(-1);
  const name = search.trim();
  const normalized = name.toLocaleLowerCase("vi-VN");
  const matches = items.filter((item) => item.name.toLocaleLowerCase("vi-VN").includes(normalized));
  const exists = items.some((item) => item.name.trim().toLocaleLowerCase("vi-VN") === normalized);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  const select = (category: string) => {
    onChange(category);
    setOpen(false);
    setSearch("");
    setActive(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => {
        if (!matches.length) return -1;
        if (current < 0) return event.key === "ArrowDown" ? 0 : matches.length - 1;
        return (current + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && active >= 0 && matches[active]) select(matches[active].name);
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearch("");
      setActive(-1);
    }
  };

  return (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setOpen(false);
        setSearch("");
        setActive(-1);
      }
    }}>
      <label htmlFor={id} className="label">
        Danh mục <span className="text-rose-400">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          disabled={creating}
          value={open ? search : value}
          onFocus={() => { setOpen(true); setSearch(""); setActive(-1); }}
          onClick={() => setOpen(true)}
          onChange={(event) => { setSearch(event.target.value); setOpen(true); setActive(-1); }}
          onKeyDown={handleKeyDown}
          placeholder={value || "Tìm hoặc tạo danh mục..."}
          className="inp pr-9"
        />
        <CaretDown size={16} weight="light" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-muted" />
      </div>
      {open && (
        <div className="pop-in absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-surface-border bg-surface-card p-1 shadow-2xl shadow-black/50">
          <ul id={`${id}-list`} role="listbox" aria-label="Danh mục bài viết" className="max-h-56 overflow-y-auto">
            {matches.map((item, index) => (
              <li
                key={item.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={value === item.name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(item.name)}
                className={`cursor-pointer px-3 py-2 text-xs hover:bg-surface-elevated ${active === index ? "bg-surface-elevated" : ""} ${value === item.name ? "text-primary-green font-semibold" : "text-content-primary"}`}
              >
                {item.name}{value === item.name ? " ✓" : ""}
              </li>
            ))}
          </ul>
          {loading && <p role="status" className="px-3 py-2 text-xs text-content-muted">Đang tải danh mục...</p>}
          {failed && <button type="button" onClick={onRetry} className="px-3 py-2 text-xs text-rose-400">Không tải được danh mục. Thử lại</button>}
          {!loading && !failed && !matches.length && <p className="px-3 py-2 text-xs text-content-muted">Không có danh mục phù hợp.</p>}
          {name && !exists && !loading && !failed && (
            <button type="button" disabled={creating} onClick={() => { onCreate(name); setOpen(false); }} className="w-full border-t border-surface-border px-3 py-2 text-left text-xs font-semibold text-primary-green hover:bg-surface-elevated disabled:opacity-50">
              {creating ? "Đang tạo danh mục..." : `+ Tạo danh mục “${name}”`}
            </button>
          )}
        </div>
      )}
      <p className="hint mt-1.5">{value ? `Đã chọn: ${value}. ` : ""}Gõ để tìm hoặc tạo mới; dùng ↑ ↓ và Enter để chọn.</p>
    </div>
  );
}
