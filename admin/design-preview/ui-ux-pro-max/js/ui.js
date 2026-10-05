/* Shared UI helpers: escaping, icons, badges, toasts, modals, pagination and form fields. */
(function () {
  // Escape text before injecting it into HTML.
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Render a Phosphor Light icon.
  const icon = (name, cls = '') => `<i class="ph-light ph-${name} ${cls}" aria-hidden="true"></i>`;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Format an ISO date as dd/mm/yyyy.
  const fmtDate = (iso) => { if (!iso) return 'Chưa cập nhật'; const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  // Format an ISO date as dd/mm/yyyy HH:mm.
  const fmtDateTime = (iso) => { if (!iso) return 'Chưa cập nhật'; const d = new Date(iso); return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  const BADGES = {
    APPROVED: ['Đã duyệt', 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'],
    PUBLISHED: ['Đã đăng', 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'],
    READY: ['Sẵn sàng', 'bg-blue-950/40 text-blue-400 border-blue-500/30'],
    PENDING: ['Chờ duyệt', 'bg-amber-950/40 text-amber-400 border-amber-500/30'],
    REVIEW_REQUIRED: ['Cần duyệt tay', 'bg-amber-950/40 text-amber-400 border-amber-500/30'],
    PUBLISHING: ['Đang đăng', 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'],
    REJECTED: ['Từ chối', 'bg-rose-950/40 text-rose-400 border-rose-500/30'],
    FAILED: ['Thất bại', 'bg-rose-950/40 text-rose-400 border-rose-500/30'],
    DRAFT: ['Bản nháp', 'bg-zinc-800 text-zinc-300 border-zinc-700'],
    INDEPENDENT_AI: ['AI độc lập', 'bg-purple-950/40 text-purple-300 border-purple-500/30'],
    BLOG_ADAPTATION: ['Từ bài blog', 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'],
    CUSTOM: ['Tự soạn', 'bg-zinc-800 text-zinc-300 border-zinc-700'],
  };
  // Render a status or source badge with semantic colors.
  function badge(status) {
    const [label, cls] = BADGES[status] || [status, 'bg-zinc-800 text-zinc-400 border-zinc-700'];
    const pulse = status === 'PUBLISHING' ? ' animate-pulse' : '';
    return `<span class="inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-xs font-medium ${cls}${pulse}"><span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>${label}</span>`;
  }

  // Thumbnail with a monogram fallback when the image fails to load.
  function thumb(url, title, cls = 'h-8 w-12') {
    const mono = esc((title || 'VQ').trim().slice(0, 2).toUpperCase());
    return `<div class="relative shrink-0 overflow-hidden rounded-lg border border-surface-border bg-surface-elevated ${cls}"><span class="absolute inset-0 grid place-items-center text-[11px] font-bold text-content-muted">${mono}</span>${url ? `<img src="${esc(url)}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" onerror="this.remove()" />` : ''}</div>`;
  }

  // Standard page header with title, description and actions.
  function pageHeader({ title, desc, actions = '' }) {
    return `<div class="page-h"><div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${actions ? `<div class="flex shrink-0 flex-wrap items-center gap-2">${actions}</div>` : ''}</div>`;
  }
  // Primary pill CTA with a nested icon circle.
  const cta = (label, attrs, ic = 'plus') => `<a ${attrs} class="btn btn-primary lg focus-ring">${icon(ic, 'text-base')}${label}</a>`;
  // Titled form section inside a bezel card.
  const section = (title, desc, body, extra = '') => `<section class="bezel ${extra}"><div class="bezel-core space-y-4 p-4"><div class="border-b border-surface-border pb-3"><h3 class="text-sm font-semibold">${title}</h3>${desc ? `<p class="mt-0.5 text-xs text-content-muted">${desc}</p>` : ''}</div>${body}</div></section>`;
  // Empty state block.
  const emptyState = ({ ic = 'files', title, desc, action = '' }) => `<div class="px-6 py-14 text-center"><div class="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-surface-border bg-surface-elevated text-content-muted">${icon(ic, 'text-2xl')}</div><h3 class="mt-3.5 text-sm font-semibold">${title}</h3><p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-content-muted">${desc}</p>${action ? `<div class="mt-4">${action}</div>` : ''}</div>`;
  // Inline text field helper (label, input, bind name).
  function field({ label, bind, value = '', placeholder = '', required = false, type = 'text', cls = '', disabled = false, attrs = '' }) {
    return `<div class="${cls}"><label class="label">${label}${required ? ' <span class="text-rose-400">*</span>' : ''}</label><input class="inp" type="${type}" data-bind="${bind}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${disabled ? 'disabled' : ''} ${attrs} /></div>`;
  }

  // Build pagination controls (data-act="page", optional page-size select).
  function pager({ page, totalPages, total, unit, size, sizes }) {
    if (!total) return '';
    const from = (page - 1) * (size || 10) + 1, to = Math.min(total, page * (size || 10));
    const b = (label, p, on, dis) => `<button data-act="page" data-page="${p}" ${dis ? 'disabled' : ''} aria-label="Trang ${p}" class="focus-ring grid h-8 min-w-8 place-items-center rounded-md border px-2 text-xs font-medium font-mono transition-colors ${on ? 'border-[#475569] bg-surface-elevated text-content-primary' : 'border-transparent text-content-secondary hover:bg-surface-elevated'} disabled:pointer-events-none disabled:opacity-30">${label}</button>`;
    const nums = [];
    for (let p = 1; p <= totalPages; p++) if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
    let html = b(icon('caret-left'), page - 1, false, page === 1);
    nums.forEach((p) => { html += p === '…' ? '<span class="px-1 text-xs text-content-muted">…</span>' : b(p, p, p === page, false); });
    html += b(icon('caret-right'), page + 1, false, page === totalPages);
    const sel = sizes ? `<select data-change="pagesize" class="inp sm !w-auto" aria-label="Số dòng mỗi trang">${sizes.map((s) => `<option value="${s}" ${s === size ? 'selected' : ''}>${s} / trang</option>`).join('')}</select>` : '';
    return `<div class="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border px-4 py-3"><p class="text-xs text-content-muted">Hiển thị ${from}-${to} trên ${total} ${unit}</p><div class="flex items-center gap-3">${sel}<div class="flex items-center gap-1">${html}</div></div></div>`;
  }

  // Show a toast with optional undo action; auto-dismisses after 5 seconds.
  function toast(message, { undo, type = 'success' } = {}) {
    const host = $('#toasts'); if (!host) return;
    const el = document.createElement('div');
    const ic = type === 'error' ? ['warning-circle', 'text-rose-400'] : type === 'info' ? ['info', 'text-sky-400'] : ['check-circle', 'text-primary-green'];
    el.className = 'pop-in flex max-w-sm items-center gap-3 rounded-lg border border-[#475569] bg-[#263147] px-3 py-2.5 text-[13px] shadow-2xl shadow-black/50';
    el.innerHTML = `${icon(ic[0], 'text-xl shrink-0 ' + ic[1])}<span>${esc(message)}</span>`;
    if (undo) {
      const b = document.createElement('button');
      b.className = 'focus-ring ml-1 shrink-0 rounded px-1 text-xs font-semibold text-primary-green underline underline-offset-2 hover:opacity-80';
      b.textContent = 'Hoàn tác';
      b.onclick = () => { undo(); el.remove(); };
      el.appendChild(b);
    }
    host.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  let confirmHandler = null;
  // Open a modal with arbitrary inner HTML; returns the wrapper element.
  function openModal(inner, { size = 'max-w-md', label = '' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap fixed inset-0 z-50 grid place-items-center p-4 fade-in';
    wrap.innerHTML = `<div class="absolute inset-0 bg-black/65 backdrop-blur-sm" data-act="modal-close"></div><div role="dialog" aria-modal="true" aria-label="${esc(label)}" class="pop-in bezel relative w-full ${size}"><div class="bezel-core max-h-[88dvh] overflow-y-auto p-6">${inner}</div></div>`;
    document.body.appendChild(wrap);
    const f = wrap.querySelector('[data-autofocus]'); if (f) setTimeout(() => f.focus(), 30);
    return wrap;
  }
  // Close the top-most modal.
  function closeModal() { const m = $$('.modal-wrap'); if (m.length) m[m.length - 1].remove(); confirmHandler = null; }
  // Open a confirmation dialog with primary or danger styling.
  function confirmDialog({ title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', variant = 'primary', onConfirm }) {
    confirmHandler = onConfirm;
    const danger = variant === 'danger';
    openModal(`<div class="flex items-start gap-4"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-full border ${danger ? 'border-rose-800/40 bg-rose-950/60 text-rose-400' : 'border-surface-border bg-surface-elevated text-primary-green'}">${icon('warning', 'text-xl')}</div><div class="flex-1 space-y-2"><h3 class="text-base font-semibold">${esc(title)}</h3><p class="text-sm leading-relaxed text-content-muted">${esc(message)}</p></div></div>
      <div class="mt-6 flex items-center justify-end gap-3 border-t border-surface-border pt-4"><button data-autofocus data-act="modal-close" class="btn btn-ghost">${cancelLabel}</button><button data-act="confirm-ok" class="btn ${danger ? 'btn-solid-danger' : 'btn-primary'}">${confirmLabel}</button></div>`, { label: title });
  }
  // Run the pending confirm callback and close the dialog.
  function runConfirm() { const h = confirmHandler; closeModal(); if (h) h(); }

  // Small loading spinner.
  const spinner = (cls = '') => `<span class="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent ${cls}"></span>`;

  window.UI = { esc, icon, $, $$, fmtDate, fmtDateTime, badge, thumb, pageHeader, cta, section, emptyState, field, pager, toast, openModal, closeModal, confirmDialog, runConfirm, spinner };
})();
