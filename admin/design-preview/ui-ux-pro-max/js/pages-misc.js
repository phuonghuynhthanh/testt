/* Category management and the publication (approved blog) list. */
(function () {
  const { esc, icon, $, fmtDate, badge, thumb, pageHeader, cta, emptyState, pager, toast, openModal, closeModal, confirmDialog } = UI;
  const Pages = window.Pages;

  /* ---------- Categories ---------- */
  const C = { page: 1, editing: null, name: '' };

  // Open the create or rename modal.
  function openForm(cat) {
    C.editing = cat || null; C.name = cat ? cat.name : '';
    const title = cat ? 'Cập nhật danh mục' : 'Tạo danh mục mới';
    openModal(`<form data-submit="cat-save" class="space-y-4"><h2 class="text-lg font-bold tracking-tight">${title}</h2>
      <div><label class="label" for="catName">Tên danh mục <span class="text-rose-400">*</span></label><input id="catName" data-autofocus data-bind="cat-name" class="inp" value="${esc(C.name)}" placeholder="Nhập tên danh mục..." autocomplete="off" maxlength="80" /></div>
      <div class="flex items-center justify-end gap-3 border-t border-surface-border pt-4"><button type="button" data-act="modal-close" class="btn btn-ghost">Hủy bỏ</button><button id="catSave" type="submit" class="btn btn-primary" ${C.name.trim() ? '' : 'disabled'}>Lưu danh mục</button></div></form>`, { label: title });
  }

  Pages.categories = {
    nav: 'categories', wide: 'max-w-5xl', crumb: 'Nội dung <span class="mx-1.5">/</span> Danh mục',
    // Render the category table with pagination.
    view() {
      const r = DB.categories.list(C.page, 10); C.page = r.page;
      const rows = r.items.map((c, i) => `<tr class="hrow row-in transition-colors duration-300 hover:bg-surface-hover/50" style="--i:${i}"><td class="px-3 py-2 font-medium">${esc(c.name)}</td><td class="px-3 py-2 text-xs text-content-muted">${DB.categories.usage(c.name)} bài viết</td><td class="whitespace-nowrap px-3 py-2 text-xs text-content-muted">${fmtDate(c.modified_at)}</td>
        <td class="px-3 py-2 text-right"><div class="row-actions inline-flex items-center gap-1"><button data-act="edit" data-id="${c.id}" class="iconbtn cyan focus-ring" title="Sửa danh mục" aria-label="Sửa danh mục">${icon('pencil-simple', 'text-lg')}</button><button data-act="delete" data-id="${c.id}" class="iconbtn danger focus-ring" title="Xóa danh mục" aria-label="Xóa danh mục">${icon('trash', 'text-lg')}</button></div></td></tr>`).join('');
      const body = r.total ? `<div class="overflow-x-auto"><table class="w-full min-w-[560px] text-left text-sm"><thead class="border-b border-surface-border bg-surface-elevated/60 text-xs font-semibold uppercase tracking-[0.05em] text-content-muted"><tr><th class="px-3 py-2">Tên danh mục</th><th class="px-3 py-2">Đang dùng</th><th class="px-3 py-2">Ngày cập nhật</th><th class="px-3 py-2 text-right">Thao tác</th></tr></thead><tbody class="divide-y divide-surface-border">${rows}</tbody></table></div>${pager({ page: r.page, totalPages: r.totalPages, total: r.total, unit: 'danh mục', size: 10 })}`
        : emptyState({ ic: 'folder', title: 'Chưa có danh mục nào', desc: 'Tạo danh mục đầu tiên để gán cho các bài viết trên hệ thống.', action: `<button data-act="new" class="btn btn-primary">${icon('plus')}Tạo danh mục ngay</button>` });
      return `${pageHeader({ title: 'Danh mục bài viết', desc: 'Quản lý hệ thống phân loại danh mục cho các bài viết CMS.', actions: cta('Tạo danh mục', 'href="#" data-act="new"') })}<section class="bezel"><div class="bezel-core clip">${body}</div></section>`;
    },
    // Keep the save button disabled until a name is typed.
    input(bind, val) { if (bind !== 'cat-name') return; C.name = val; const b = $('#catSave'); if (b) b.disabled = !val.trim(); },
    submits: {
      // Create or rename a category from the modal form.
      'cat-save'() {
        const name = C.name.trim(); if (!name) return;
        try {
          if (C.editing) { DB.categories.update(C.editing.id, name); toast('Đã cập nhật danh mục.'); } else { DB.categories.create(name); toast('Đã tạo danh mục.'); }
          closeModal(); Router.repaint();
        } catch (err) { toast(err.message, { type: 'error' }); }
      },
    },
    actions: {
      new(el, e) { e.preventDefault(); openForm(); },
      edit(el) { openForm(DB.categories.all().find((c) => c.id === el.dataset.id)); },
      page(el) { C.page = Number(el.dataset.page); Router.repaint(); },
      // Confirm and soft-delete a category with undo.
      delete(el) {
        const c = DB.categories.all().find((x) => x.id === el.dataset.id), used = DB.categories.usage(c.name);
        confirmDialog({ title: 'Xác nhận xóa danh mục', message: `Danh mục "${c.name}" sẽ được xóa khỏi danh sách sử dụng nhưng không bị xóa vĩnh viễn khỏi cơ sở dữ liệu.${used ? ` Hiện có ${used} bài viết đang dùng danh mục này.` : ''}`, confirmLabel: 'Xóa danh mục', variant: 'danger', onConfirm() {
          DB.categories.remove(c.id); toast('Đã xóa danh mục.', { undo() { DB.categories.restore(c.id); Router.repaint(); } }); Router.repaint();
        } });
      },
    },
  };

  /* ---------- Publications (approved blogs available for LinkedIn) ---------- */
  const Pub = { page: 1, search: '' };
  let timer;
  // Build the list area (rows and pager) for the publication search.
  function pubBody() {
    const r = DB.blogs.list({ state: 'APPROVED', search: Pub.search, page: Pub.page, size: 6 }); Pub.page = r.page;
    if (!r.total) return emptyState({ title: 'Không tìm thấy bài viết', desc: 'Duyệt bài trong Quản lý bài viết để bài xuất hiện tại đây và có thể tạo bài LinkedIn.' });
    const rows = r.items.map((b, i) => {
      const p = DB.posts.byBlog(b.id);
      return `<li class="hrow row-in grid items-center gap-x-4 gap-y-3 px-3 py-2.5 transition-colors duration-300 hover:bg-surface-hover/50 md:grid-cols-[minmax(0,1fr)_9rem_11rem] md:px-3" style="--i:${i}">
        <div class="flex min-w-0 items-center gap-3.5">${thumb(b.banner_url, b.title)}<div class="min-w-0"><p class="truncate text-sm font-semibold" title="${esc(b.title)}">${esc(b.title)}</p><p class="mt-0.5 text-[11px] text-content-muted">${esc(b.category || 'Chưa phân loại')}</p></div></div>
        <div>${p ? badge(p.status) : '<span class="text-xs text-content-muted">Chưa có bài LinkedIn</span>'}</div>
        <div class="md:text-right"><a href="#/publications/${b.id}" class="btn btn-li !h-8">${icon('paper-plane-tilt', 'text-sm')}${p ? 'Mở bài LinkedIn' : 'Tạo bài LinkedIn'}</a></div></li>`;
    }).join('');
    return `<div class="hidden grid-cols-[minmax(0,1fr)_9rem_11rem] gap-4 border-b border-surface-border bg-surface-elevated/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-content-muted md:grid"><span>Bài viết</span><span>LinkedIn</span><span class="text-right">Thao tác</span></div><ul class="divide-y divide-surface-border">${rows}</ul>${pager({ page: r.page, totalPages: r.totalPages, total: r.total, unit: 'bài viết', size: 6 })}`;
  }
  Pages.publications = {
    nav: 'publications', crumb: 'Phân phối <span class="mx-1.5">/</span> Xuất bản bài viết',
    // Render the workflow hint, search and approved-article list.
    view() {
      return `${pageHeader({ title: 'Xuất bản bài viết', desc: 'Chọn bài website đã duyệt để tạo và đăng bài LinkedIn.' })}
      <div class="mb-5 flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-950/20 p-4 text-xs leading-relaxed text-teal-300">${icon('path', 'mt-0.5 shrink-0 text-lg text-primary-green')}<span><strong>Quy trình:</strong> chọn bài website, soạn nội dung LinkedIn, chọn ảnh và liên kết, rồi đăng LinkedIn. Chỉ bước cuối mới đăng thật.</span></div>
      <section class="bezel"><div class="bezel-core clip"><div class="border-b border-surface-border p-3.5"><div class="relative sm:w-80">${icon('magnifying-glass', 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-content-muted')}<input data-bind="search" type="search" value="${esc(Pub.search)}" placeholder="Tìm theo tiêu đề hoặc đường dẫn..." class="inp sm !pl-9" autocomplete="off" /></div></div><div id="pubArea"></div></div></section>`;
    },
    mount() { $('#pubArea').innerHTML = pubBody(); },
    input(bind, val) { if (bind !== 'search') return; clearTimeout(timer); timer = setTimeout(() => { Pub.search = val; Pub.page = 1; $('#pubArea').innerHTML = pubBody(); }, 180); },
    actions: { page(el) { Pub.page = Number(el.dataset.page); $('#pubArea').innerHTML = pubBody(); } },
  };
})();
