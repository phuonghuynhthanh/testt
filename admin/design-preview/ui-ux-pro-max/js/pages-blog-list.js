/* Blog list page (dense variant): KPI strip, sortable table, bulk actions, detail drawer and keyboard shortcuts. */
(function () {
  const { esc, icon, $, pageHeader, cta, toast, confirmDialog } = UI;
  const Pages = window.Pages;

  // Same demo clock as the seed data, so "last 7 days" stays meaningful whenever the page is opened.
  const ANCHOR = Date.parse('2026-10-05T09:30:00+07:00');
  const DAY = 86400000;
  const ORDER = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
  const STATES = {
    PENDING: { label: 'Chờ duyệt', cls: 'st-pending', ic: 'clock' },
    APPROVED: { label: 'Đã duyệt', cls: 'st-approved', ic: 'check-circle' },
    REJECTED: { label: 'Từ chối', cls: 'st-rejected', ic: 'x-circle' },
  };
  const S = { state: '', cat: '', q: '', sort: 'modified', dir: 'desc', page: 1, size: 10, sel: new Set(), active: -1, drawerId: null, lastRow: null, loading: true, seen: false };
  let searchTimer;

  // Lowercase text and strip Vietnamese diacritics so "kiem dinh" matches "kiểm định".
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  // Zero-pad a number to two digits.
  const p2 = (n) => String(n).padStart(2, '0');
  // Format an ISO date as dd/MM HH:mm, adding the year when it differs from the demo year.
  function fmtShort(iso) {
    const d = new Date(iso);
    const y = d.getFullYear() !== new Date(ANCHOR).getFullYear() ? '/' + d.getFullYear() : '';
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}${y} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
  // Format an ISO date with the full year for detail views.
  function fmtFull(iso) {
    const d = new Date(iso);
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
  // Render a status badge with icon and text, never color alone.
  const stBadge = (st) => { const m = STATES[st]; return `<span class="st ${m.cls}">${icon(m.ic)}${m.label}</span>`; };

  // Small thumbnail with a monogram fallback when the image cannot load.
  function thumb(b) {
    const mono = esc(b.title.trim().slice(0, 2).toUpperCase());
    return `<span class="th"><b aria-hidden="true">${mono}</b>${b.banner_url ? `<img src="${esc(b.banner_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  }

  // Count items per day for the last n days, oldest first, based on creation time.
  function dayBuckets(list, n = 14) {
    const end = new Date(ANCHOR); end.setHours(24, 0, 0, 0);
    const out = Array(n).fill(0);
    list.forEach((b) => {
      const t = Math.min(Date.parse(b.created_at), end - 1);
      const i = Math.floor((end - t) / DAY);
      if (i >= 0 && i < n) out[n - 1 - i]++;
    });
    return out;
  }
  // Render a tiny bar sparkline from daily counts.
  function spark(counts) {
    const max = Math.max(1, ...counts);
    const bars = counts.map((c, i) => {
      const h = c ? Math.max(4, (c / max) * 20) : 1.5;
      return `<rect x="${i * 4}" y="${22 - h}" width="3" height="${h}" rx="1" fill="currentColor" opacity="${c ? (i > 6 ? 1 : .6) : .25}"/>`;
    }).join('');
    return `<svg width="56" height="22" viewBox="0 0 56 22" role="img" aria-label="Bài viết tạo mới mỗi ngày trong 14 ngày: ${counts.join(', ')}">${bars}</svg>`;
  }

  // Blogs matching category and search, ignoring the status filter.
  function base() {
    const q = fold(S.q).trim();
    return DB.blogs.all().filter((b) => (!S.cat || b.category === S.cat) && (!q || fold(b.title).includes(q) || b.slug.includes(q) || fold(b.tag).includes(q)));
  }
  // Blogs after all filters, sorted by the current column.
  function getView() {
    const dir = S.dir === 'asc' ? 1 : -1;
    return base().filter((b) => !S.state || b.state === S.state).sort((a, b) => {
      let r;
      if (S.sort === 'title') r = a.title.localeCompare(b.title, 'vi');
      else if (S.sort === 'category') r = a.category.localeCompare(b.category, 'vi');
      else if (S.sort === 'state') r = ORDER[a.state] - ORDER[b.state];
      else r = Date.parse(a.modified_at) - Date.parse(b.modified_at);
      return r * dir;
    });
  }

  // Render the KPI cards that double as status filters.
  function renderKpis() {
    const all = DB.blogs.all();
    const defs = [['', 'Tổng bài viết', 'files'], ['PENDING', 'Chờ duyệt', 'clock'], ['APPROVED', 'Đã duyệt', 'check-circle'], ['REJECTED', 'Từ chối', 'x-circle']];
    $('#kpis').innerHTML = defs.map(([k, label, ic]) => {
      const list = k ? all.filter((b) => b.state === k) : all;
      const bk = dayBuckets(list);
      const prev = bk.slice(0, 7).reduce((a, b) => a + b, 0);
      const cur = bk.slice(7).reduce((a, b) => a + b, 0);
      return `<button class="kpi${S.state === k ? ' on' : ''}" data-act="kpi" data-state="${k}" aria-pressed="${S.state === k}">
        <span class="kpi-h"><span>${label}</span>${icon(ic)}</span>
        <span class="kpi-v mono">${list.length}</span>
        <span class="kpi-f"><span><span class="mono">+${cur}</span> trong 7 ngày<br>trước đó <span class="mono">${prev}</span></span>${spark(bk)}</span>
      </button>`;
    }).join('');
    const c = DB.blogs.counts();
    $('#subtitle').innerHTML = `<span class="mono">${c.all}</span> bài viết · <span class="mono">${c.PENDING}</span> đang chờ duyệt`;
    const np = $('#navPending'); if (np) { np.hidden = !c.PENDING; np.textContent = c.PENDING; }
  }

  // Render the status filter buttons with counts for the current category and search.
  function renderTabs() {
    const b = base();
    const n = (k) => (k ? b.filter((x) => x.state === k).length : b.length);
    $('#tabs').innerHTML = [['', 'Tất cả'], ['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối']]
      .map(([k, l]) => `<button data-act="tab" data-state="${k}" aria-pressed="${S.state === k}">${l}<span class="n mono">${n(k)}</span></button>`).join('');
  }

  // Render the sortable header cell for one column.
  function th(key, label, cls = '') {
    const on = S.sort === key;
    const ic = on ? (S.dir === 'asc' ? 'caret-up' : 'caret-down') : 'caret-up-down';
    return `<th class="${cls}" scope="col" aria-sort="${on ? (S.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button class="sort" data-act="sort" data-key="${key}">${label}${icon(ic)}</button></th>`;
  }

  // Render the table body, header, selection state and footer pager.
  function renderTable() {
    const view = getView();
    const total = view.length;
    const pages = Math.max(1, Math.ceil(total / S.size));
    S.page = Math.min(S.page, pages);
    const ids = new Set(view.map((b) => b.id));
    S.sel.forEach((id) => { if (!ids.has(id)) S.sel.delete(id); });
    const rows = view.slice((S.page - 1) * S.size, S.page * S.size);
    const el = $('#table');

    if (S.loading) {
      const sk = Array.from({ length: 6 }, () => `<tr><td class="c-chk"></td><td class="c-ttl"><span class="skel" style="width:${50 + Math.random() * 40}%"></span></td><td class="c-cat"><span class="skel" style="width:70%"></span></td><td class="c-state"><span class="skel" style="width:80px"></span></td><td class="c-date"><span class="skel" style="width:80px"></span></td><td class="c-act"></td></tr>`).join('');
      el.innerHTML = `<table class="tbl" aria-busy="true"><caption class="sr">Đang tải danh sách</caption><tbody>${sk}</tbody></table>`;
      $('#foot').innerHTML = '';
      return;
    }

    if (!rows.length) {
      const filtered = S.state || S.cat || S.q;
      el.innerHTML = `<div class="empty"><span class="ic">${icon(filtered ? 'funnel' : 'files')}</span><h3>${filtered ? 'Không có bài viết phù hợp' : 'Chưa có bài viết'}</h3><p>${filtered ? 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.' : 'Tạo bài viết đầu tiên để bắt đầu.'}</p>${filtered ? '<button class="btn btn-ghost lg" data-act="clear">Xóa bộ lọc</button>' : '<a class="btn btn-primary lg" href="#/blog/create-blog">Tạo bài viết</a>'}</div>`;
      $('#foot').innerHTML = '<span>0 kết quả</span>';
      renderBulk();
      return;
    }

    const body = rows.map((b, i) => {
      const sel = S.sel.has(b.id);
      return `<tr class="${sel ? 'sel' : ''}${i === S.active ? ' kb' : ''}" data-id="${b.id}" data-i="${i}">
        <td class="c-chk"><label class="chk"><input type="checkbox" data-change="sel" data-id="${b.id}" ${sel ? 'checked' : ''} aria-label="Chọn bài ${esc(b.title)}"></label></td>
        <td class="c-ttl"><div class="c-title">${thumb(b)}<div class="t-main"><button class="t-btn" data-act="open" data-id="${b.id}" title="${esc(b.title)}">${esc(b.title)}</button><span class="sub"><span class="slug mono">/${esc(b.slug)}</span><span class="cat-in">${esc(b.category)}</span></span></div></div></td>
        <td class="c-cat" data-label="Danh mục">${esc(b.category || 'Chưa phân loại')}</td>
        <td class="c-state">${stBadge(b.state)}</td>
        <td class="c-date mono" title="${fmtFull(b.modified_at)}">${fmtShort(b.modified_at)}</td>
        <td class="c-act"><span class="row">
          <button class="ib" data-act="open" data-id="${b.id}" title="Xem nhanh" aria-label="Xem nhanh ${esc(b.title)}">${icon('eye')}</button>
          <a class="ib" href="#/blog/default/${b.id}" title="Chỉnh sửa" aria-label="Chỉnh sửa ${esc(b.title)}">${icon('pencil-simple')}</a>
          ${b.state === 'APPROVED' ? `<a class="ib li" href="#/publications/${b.id}" title="Tạo bài LinkedIn" aria-label="Tạo bài LinkedIn từ ${esc(b.title)}">${icon('linkedin-logo')}</a>` : `<button class="ib ok" data-act="approve" data-id="${b.id}" title="Duyệt" aria-label="Duyệt ${esc(b.title)}">${icon('check')}</button>`}
          <button class="ib bad" data-act="delete" data-id="${b.id}" title="Xóa" aria-label="Xóa ${esc(b.title)}">${icon('trash')}</button>
        </span></td>
      </tr>`;
    }).join('');

    el.innerHTML = `<table class="tbl">
      <caption class="sr">Danh sách bài viết, ${total} kết quả</caption>
      <colgroup><col class="w-chk"><col><col class="w-cat"><col class="w-state"><col class="w-date"><col class="w-act"></colgroup>
      <thead><tr><th scope="col"><label class="chk"><input type="checkbox" id="sel-all" data-change="selpage" aria-label="Chọn tất cả bài trên trang này"></label></th>${th('title', 'Tiêu đề')}${th('category', 'Danh mục', 'c-cat')}${th('state', 'Trạng thái')}${th('modified', 'Cập nhật')}<th scope="col"><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${body}</tbody></table>`;

    const all = $('#sel-all');
    const onPage = rows.filter((b) => S.sel.has(b.id)).length;
    all.checked = onPage === rows.length; all.indeterminate = onPage > 0 && onPage < rows.length;
    renderFoot(total, pages, rows.length);
    renderBulk();
  }

  // Render the footer with range text, page size and page buttons.
  function renderFoot(total, pages, shown) {
    const from = (S.page - 1) * S.size + 1;
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - S.page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    const btns = nums.map((n) => n === '…' ? '<span aria-hidden="true">…</span>' : `<button class="pg mono" data-act="page" data-page="${n}" ${n === S.page ? 'aria-current="page"' : ''} aria-label="Trang ${n}">${n}</button>`).join('');
    $('#foot').innerHTML = `<div class="foot-l"><span>Hiển thị <span class="mono">${from}–${from + shown - 1}</span> trên <span class="mono">${total}</span></span>
      <label>Mỗi trang <select class="sel" data-change="size" aria-label="Số dòng mỗi trang">${[10, 25, 50].map((n) => `<option value="${n}" ${n === S.size ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <nav class="pager" aria-label="Phân trang"><button class="pg" data-act="page" data-page="${S.page - 1}" ${S.page === 1 ? 'disabled' : ''} aria-label="Trang trước">${icon('caret-left')}</button>${btns}<button class="pg" data-act="page" data-page="${S.page + 1}" ${S.page === pages ? 'disabled' : ''} aria-label="Trang sau">${icon('caret-right')}</button></nav>`;
  }

  // Show or hide the bulk bar depending on the selection.
  function renderBulk() {
    const n = S.sel.size;
    $('#bulk').hidden = !n;
    $('#tb-inner').inert = n > 0;
    $('#bulk-n').textContent = n;
  }

  // Re-render every dynamic region.
  function render() {
    renderKpis(); renderTabs(); renderTable();
    if (S.drawerId) renderDrawer();
  }

  // Change the state of blogs and offer an undo that restores state and timestamp.
  function setState(ids, next) {
    const prev = ids.map((id) => { const b = DB.blogs.get(id); return b && b.state !== next ? { id, state: b.state, at: b.modified_at } : null; }).filter(Boolean);
    if (!prev.length) return;
    prev.forEach((p) => DB.blogs.update(p.id, { state: next }));
    toast(`${STATES[next].label}: ${prev.length} bài viết`, {
      undo() {
        prev.forEach((p) => { const b = DB.blogs.get(p.id); if (b) { b.state = p.state; b.modified_at = p.at; } });
        DB.save(); render();
      },
    });
    render();
  }

  // Soft-delete blogs and offer an undo that restores them.
  function removeBlogs(ids) {
    ids.forEach((id) => { DB.blogs.remove(id); S.sel.delete(id); });
    toast(`Đã xóa ${ids.length} bài viết`, { undo() { ids.forEach((id) => DB.blogs.restore(id)); render(); } });
    render();
  }

  // Ask for confirmation before deleting, then remove with undo.
  function confirmRemove(ids) {
    const one = ids.length === 1 ? DB.blogs.get(ids[0]) : null;
    confirmDialog({
      title: one ? 'Xác nhận xóa bài viết' : `Xóa ${ids.length} bài viết?`,
      message: one ? `Bạn có chắc chắn muốn xóa bài viết "${one.title}"? Bạn có thể hoàn tác ngay sau đó.` : 'Các bài viết sẽ bị ẩn khỏi danh sách. Bạn có thể hoàn tác ngay sau đó.',
      confirmLabel: 'Xóa', variant: 'danger', onConfirm() { removeBlogs(ids); },
    });
  }

  // Build and download a CSV of the current filtered list (UTF-8 BOM for Excel).
  function exportCsv() {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const list = getView();
    const lines = [['Tiêu đề', 'Slug', 'Danh mục', 'Trạng thái', 'Cập nhật'].map(q).join(',')]
      .concat(list.map((b) => [b.title, b.slug, b.category, STATES[b.state].label, fmtFull(b.modified_at)].map(q).join(',')));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'bai-viet.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Đã xuất ${list.length} dòng ra CSV`);
  }

  // Render the SEO character counter with a warning when over the recommended length.
  function len(s, max) {
    const n = (s || '').length;
    return `<span class="len mono${n > max ? ' warn' : ''}">${n}/${max} ký tự${n > max ? ' · quá dài' : ''}</span>`;
  }

  // Render the detail drawer for the current blog and refresh its prev/next state.
  function renderDrawer() {
    const b = DB.blogs.get(S.drawerId);
    const d = $('#drawer');
    if (!b) { closeDrawer(); return; }
    const list = getView(); const idx = list.findIndex((x) => x.id === b.id);
    const seo = b.seo || {};
    d.innerHTML = `<div class="d-head">
        ${stBadge(b.state)}
        <span class="pos mono" aria-live="polite">${idx >= 0 ? `${idx + 1} / ${list.length}` : ''}</span>
        <button class="ib" data-act="d-prev" aria-label="Bài trước" ${idx <= 0 ? 'disabled' : ''}>${icon('caret-up')}</button>
        <button class="ib" data-act="d-next" aria-label="Bài sau" ${idx < 0 || idx >= list.length - 1 ? 'disabled' : ''}>${icon('caret-down')}</button>
        <button class="ib" data-act="d-close" aria-label="Đóng chi tiết" id="d-close">${icon('x')}</button>
      </div>
      <div class="d-body">
        <div class="banner"><b aria-hidden="true">${esc(b.title.slice(0, 2).toUpperCase())}</b>${b.banner_url ? `<img src="${esc(b.banner_url)}" alt="Ảnh bìa bài viết" onerror="this.remove()">` : ''}</div>
        <h2 id="d-title">${esc(b.title)}</h2>
        <dl class="meta">
          <dt>Danh mục</dt><dd>${esc(b.category || 'Chưa phân loại')}</dd>
          <dt>Slug</dt><dd class="mono">/${esc(b.slug)}</dd>
          <dt>Tag</dt><dd><span class="tags">${(b.tag || '').split(',').filter((t) => t.trim()).map((t) => `<span class="tag">${esc(t.trim())}</span>`).join('') || '—'}</span></dd>
          <dt>Tác giả</dt><dd>${esc(seo.author || '—')}</dd>
          <dt>Tạo lúc</dt><dd class="mono">${fmtFull(b.created_at)}</dd>
          <dt>Cập nhật</dt><dd class="mono">${fmtFull(b.modified_at)}</dd>
        </dl>
        <div><h3 class="sec-t">SEO</h3><div class="seo">
          <div><div>${esc(seo.title || '—')}</div>${len(seo.title, 60)}</div>
          <div><div>${esc(seo.description || '—')}</div>${len(seo.description, 160)}</div>
          <div class="tags">${(seo.keywords || []).map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</div>
        </div></div>
        <div><h3 class="sec-t">Nội dung</h3><div class="md">${UI.md(b.content)}</div></div>
      </div>
      <div class="d-foot">
        <button class="btn btn-primary lg" data-act="d-approve" ${b.state === 'APPROVED' ? 'disabled' : ''}>${icon('check')}Duyệt</button>
        <button class="btn btn-ghost lg" data-act="d-reject" ${b.state === 'REJECTED' ? 'disabled' : ''}>${icon('x-circle')}Từ chối</button>
        <a class="btn btn-ghost lg" href="#/blog/default/${b.id}">${icon('pencil-simple')}Sửa</a>
        <a class="btn btn-ghost lg" href="#/blog/detail/${b.id}">${icon('arrow-square-out')}Trang chi tiết</a>
        <span class="sp"></span>
        <button class="btn btn-danger lg" data-act="d-delete">${icon('trash')}Xóa</button>
      </div>`;
  }

  // Open the detail drawer for a blog and remember the row to refocus afterwards.
  function openDrawer(id) {
    S.drawerId = id; S.lastRow = id;
    renderDrawer();
    const d = $('#drawer');
    if (!d.open) d.showModal();
    d.classList.remove('closing');
    const body = $('.d-body', d); if (body) body.scrollTop = 0;
    const c = $('#d-close'); if (c) c.focus();
  }

  // Close the drawer with a short exit animation.
  function closeDrawer() {
    const d = $('#drawer');
    if (!d || !d.open) return;
    d.classList.add('closing');
    setTimeout(() => { d.close(); d.classList.remove('closing'); }, 150);
  }

  // Move the drawer to the previous or next blog in the current list.
  function stepDrawer(delta) {
    const list = getView(); const i = list.findIndex((x) => x.id === S.drawerId);
    const n = list[i + delta];
    if (!n) return;
    S.drawerId = n.id; S.lastRow = n.id; renderDrawer();
    const d = $('#drawer'); $('.d-body', d).scrollTop = 0;
    (d.querySelector(`[data-act="${delta < 0 ? 'd-prev' : 'd-next'}"]:not(:disabled)`) || $('#d-close')).focus();
  }

  // Set a filter value and go back to page one.
  function setFilter(patch) { Object.assign(S, patch, { page: 1, active: -1 }); render(); }

  // Sync the density segmented control with the body attribute.
  function syncDensity() {
    document.querySelectorAll('[data-act="density"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === document.body.dataset.density)));
  }

  Pages.blogList = {
    nav: 'blog', wide: 'dense-main', crumb: '<span>Nội dung</span><i class="ph-light ph-caret-right"></i><b>Quản lý bài viết</b>',
    // Reset transient state when the page is entered.
    init() { S.sel.clear(); S.drawerId = null; S.active = -1; S.loading = !S.seen; },
    // Render the page skeleton; dynamic regions are filled in mount().
    view() {
      const cats = DB.categories.all();
      return `${pageHeader({ title: 'Quản lý bài viết', desc: '<span id="subtitle" aria-live="polite"></span>', actions: cta('Tạo bài viết', 'href="#/blog/create-blog"') })}
      <section class="kpis" id="kpis" aria-label="Tổng quan trạng thái"></section>
      <section class="panel" aria-label="Danh sách bài viết">
        <div class="toolbar">
          <div class="tb-inner" id="tb-inner">
            <div class="filters" id="tabs" role="group" aria-label="Lọc theo trạng thái"></div>
            <div class="tb-right">
              <label class="search"><span class="sr">Tìm bài viết</span>${icon('magnifying-glass')}<input class="field" id="q" data-bind="search" type="search" value="${esc(S.q)}" placeholder="Tìm tiêu đề, slug, tag" autocomplete="off" /><kbd aria-hidden="true">/</kbd></label>
              <select class="sel" data-change="cat" aria-label="Lọc theo danh mục"><option value="">Tất cả danh mục</option>${cats.map((x) => `<option ${S.cat === x.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
              <select class="sel only-m" data-change="sortm" aria-label="Sắp xếp theo">
                ${[['modified:desc', 'Mới cập nhật'], ['modified:asc', 'Cũ nhất'], ['title:asc', 'Tiêu đề A–Z'], ['state:asc', 'Trạng thái']].map(([v, l]) => `<option value="${v}" ${v === S.sort + ':' + S.dir ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
              <div class="seg" role="group" aria-label="Mật độ hàng">
                <button data-act="density" data-v="compact" aria-pressed="true">${icon('list-bullets')}Gọn</button>
                <button data-act="density" data-v="cozy" aria-pressed="false">${icon('rows')}Thoáng</button>
              </div>
              <button class="btn btn-ghost" data-act="export">${icon('download-simple')}Xuất CSV</button>
            </div>
          </div>
          <div class="bulk" id="bulk" role="region" aria-label="Thao tác hàng loạt" hidden>
            <span class="cnt"><span class="mono" id="bulk-n">0</span> đã chọn</span>
            <button class="btn btn-ghost" data-act="bulk-approve">${icon('check')}Duyệt</button>
            <button class="btn btn-ghost" data-act="bulk-reject">${icon('x-circle')}Từ chối</button>
            <button class="btn btn-danger" data-act="bulk-delete">${icon('trash')}Xóa</button>
            <span class="sp"></span>
            <button class="btn btn-ghost" data-act="bulk-clear">Bỏ chọn</button>
          </div>
        </div>
        <div id="table"></div>
        <div class="foot" id="foot"></div>
      </section>
      <p class="keys" aria-hidden="true"><span><kbd>/</kbd>Tìm kiếm</span><span><kbd>j</kbd><kbd>k</kbd>Di chuyển hàng</span><span><kbd>Enter</kbd>Mở nhanh</span><span><kbd>x</kbd>Chọn hàng</span><span><kbd>Esc</kbd>Đóng</span></p>
      <dialog class="drawer" id="drawer" aria-labelledby="d-title"></dialog>`;
    },
    // Fill dynamic regions and wire drawer events that cannot be delegated.
    mount() {
      const saved = document.body.dataset.density || 'compact'; document.body.dataset.density = saved;
      syncDensity(); render();
      const d = $('#drawer');
      d.addEventListener('click', (e) => { if (e.target === d) closeDrawer(); });
      d.addEventListener('close', () => {
        S.drawerId = null;
        const b = document.querySelector(`[data-id="${S.lastRow}"] .t-btn`); if (b) b.focus();
      });
      if (S.loading) setTimeout(() => { S.seen = true; S.loading = false; if (Router.name === 'blogList') render(); }, 350);
    },
    // Debounced search input.
    input(bind, val) { if (bind !== 'search') return; clearTimeout(searchTimer); searchTimer = setTimeout(() => setFilter({ q: val }), 120); },
    changes: {
      cat(el) { setFilter({ cat: el.value }); },
      size(el) { S.size = +el.value; S.page = 1; renderTable(); },
      sortm(el) { const [k, d] = el.value.split(':'); setFilter({ sort: k, dir: d }); },
      // Toggle one row in the selection and keep keyboard focus on the same checkbox.
      sel(el) {
        el.checked ? S.sel.add(el.dataset.id) : S.sel.delete(el.dataset.id);
        renderTable();
        const again = document.querySelector(`[data-change="sel"][data-id="${el.dataset.id}"]`); if (again) again.focus();
      },
      // Select or clear every row on the current page.
      selpage(el) {
        getView().slice((S.page - 1) * S.size, S.page * S.size).forEach((b) => (el.checked ? S.sel.add(b.id) : S.sel.delete(b.id)));
        renderTable();
      },
    },
    actions: {
      kpi(el) { setFilter({ state: S.state === el.dataset.state ? '' : el.dataset.state }); },
      tab(el) { setFilter({ state: el.dataset.state }); },
      // Toggle sort direction or switch to another column.
      sort(el) {
        const k = el.dataset.key;
        setFilter(S.sort === k ? { dir: S.dir === 'asc' ? 'desc' : 'asc' } : { sort: k, dir: k === 'modified' ? 'desc' : 'asc' });
        const nb = document.querySelector(`.sort[data-key="${k}"]`); if (nb) nb.focus();
      },
      page(el) { S.page = Number(el.dataset.page); S.active = -1; renderTable(); },
      clear() { const q = $('#q'); if (q) q.value = ''; setFilter({ state: '', cat: '', q: '' }); Router.repaint(); },
      density(el) { document.body.dataset.density = el.dataset.v; syncDensity(); },
      export() { exportCsv(); },
      open(el) { openDrawer(el.dataset.id); },
      approve(el) { setState([el.dataset.id], 'APPROVED'); },
      delete(el) { confirmRemove([el.dataset.id]); },
      'bulk-approve'() { setState([...S.sel], 'APPROVED'); },
      'bulk-reject'() { setState([...S.sel], 'REJECTED'); },
      'bulk-clear'() { S.sel.clear(); renderTable(); },
      'bulk-delete'() { confirmRemove([...S.sel]); },
      'd-close'() { closeDrawer(); },
      'd-prev'() { stepDrawer(-1); },
      'd-next'() { stepDrawer(1); },
      'd-approve'() { setState([S.drawerId], 'APPROVED'); },
      'd-reject'() { setState([S.drawerId], 'REJECTED'); },
      // Close the drawer first so the confirm modal is not hidden behind the top layer.
      'd-delete'() { const id = S.drawerId; closeDrawer(); setTimeout(() => confirmRemove([id]), 170); },
    },
    // Keyboard shortcuts for list navigation (ignored while typing or inside modals).
    keydown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target instanceof Element ? e.target : document.body;
      const typing = t.closest('input, textarea, select, [contenteditable]');
      if ($('.modal-wrap')) return;
      const d = $('#drawer');
      if (d && d.open) {
        if (typing) return;
        if (e.key === 'j' || e.key === 'ArrowDown') stepDrawer(1); else if (e.key === 'k' || e.key === 'ArrowUp') stepDrawer(-1);
        return;
      }
      if (typing) return;
      const rows = [...document.querySelectorAll('.tbl tbody tr[data-i]')];
      if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
      else if ((e.key === 'j' || e.key === 'k') && rows.length) {
        S.active = Math.max(0, Math.min(rows.length - 1, S.active + (e.key === 'j' ? 1 : -1)));
        rows.forEach((r, i) => r.classList.toggle('kb', i === S.active));
        rows[S.active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'x' && S.active >= 0 && rows[S.active]) {
        const id = rows[S.active].dataset.id; S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); renderTable();
      } else if (e.key === 'Enter' && S.active >= 0 && rows[S.active] && !t.closest('button, a')) openDrawer(rows[S.active].dataset.id);
    },
  };
})();
