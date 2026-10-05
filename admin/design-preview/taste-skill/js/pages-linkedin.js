/* LinkedIn pages: management list and the shared post editor (standalone and blog adaptation). */
(function () {
  const { esc, icon, $, $$, fmtDate, fmtDateTime, badge, thumb, pageHeader, section, emptyState, pager, toast, confirmDialog, spinner } = UI;
  const Pages = window.Pages;
  const MAX_CHARS = 3000;

  // Simulate publishing a post: PUBLISHING first, then PUBLISHED.
  async function publishPost(id) {
    DB.posts.save({ id, status: 'PUBLISHING', lastError: null });
    if (typeof afterStatus === 'function') afterStatus(id);
    await AI.wait(1900);
    const p = DB.posts.save({ id, status: 'PUBLISHED', publishedAt: new Date().toISOString(), publishedLinkUrl: 'https://www.linkedin.com/feed/update/urn:li:share:' + Math.floor(7e9 + Math.random() * 1e9), lastError: null });
    DB.history.add({ topic: p.topic, providerPostId: p.publishedLinkUrl.split('/').pop(), content: p.content.slice(0, 60) + '...', publishedAt: p.publishedAt });
    toast('Đã xuất bản bài đăng lên LinkedIn.');
    if (typeof afterStatus === 'function') afterStatus(id);
  }
  let afterStatus = null;

  /* ---------- LinkedIn list ---------- */
  const L = { page: 1, size: 10, status: '', source: '', showHistory: false, verified: null, verifying: false, syncing: false };
  const STATUS_OPTS = [['', 'Mọi trạng thái'], ['DRAFT', 'Bản nháp'], ['READY', 'Sẵn sàng'], ['PUBLISHING', 'Đang đăng'], ['PUBLISHED', 'Đã đăng'], ['FAILED', 'Lỗi'], ['REVIEW_REQUIRED', 'Cần duyệt tay']];
  const SOURCE_OPTS = [['', 'Mọi nguồn'], ['INDEPENDENT_AI', 'AI độc lập'], ['BLOG_ADAPTATION', 'Từ bài blog'], ['CUSTOM', 'Tự soạn']];

  // Build one LinkedIn post row.
  function postRow(p, i) {
    const first = (p.content || '').split('\n').find((l) => l.trim()) || '(Chưa có nội dung)';
    const act = p.status === 'READY' ? `<button data-act="publish" data-id="${p.id}" class="btn btn-li !h-8 !px-3">${icon('paper-plane-tilt', 'text-sm')}Đăng</button>`
      : p.status === 'FAILED' ? `<button data-act="publish" data-id="${p.id}" class="btn btn-danger !h-8 !px-3">${icon('arrow-clockwise', 'text-sm')}Thử lại</button>`
      : p.status === 'PUBLISHING' ? '<span class="px-2 text-xs italic text-content-muted">Đang đăng...</span>' : '';
    const open = p.status === 'PUBLISHED' ? `<button data-act="open-li" data-id="${p.id}" class="iconbtn green focus-ring" title="Mở bài trên LinkedIn" aria-label="Mở bài trên LinkedIn">${icon('arrow-square-out', 'text-lg')}</button>` : '';
    const locked = p.status === 'PUBLISHING';
    return `<li class="hrow row-in grid gap-x-4 gap-y-3 px-4 py-3.5 transition-colors duration-300 hover:bg-surface-hover/50 lg:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_6rem_12.5rem] lg:items-center lg:px-5" style="--i:${i}">
      <div class="min-w-0"><a href="#/linkedin/posts/${p.id}" class="focus-ring block truncate rounded text-sm font-semibold transition-colors duration-300 hover:text-primary-green" title="${esc(first)}">${esc(p.topic || first)}</a><p class="line-clamp-2 mt-1 text-xs leading-relaxed text-content-muted">${esc(first)}</p></div>
      <div>${badge(p.sourceType)}</div><div>${badge(p.status)}</div><div class="text-xs text-content-muted">${fmtDate(p.modifiedAt)}</div>
      <div class="row-actions flex flex-wrap items-center gap-1 lg:justify-end">${act}${open}<a href="#/linkedin/posts/${p.id}" class="iconbtn cyan focus-ring" title="${p.status === 'PUBLISHED' ? 'Xem chi tiết' : 'Chỉnh sửa bài đăng'}" aria-label="Chi tiết">${icon(p.status === 'PUBLISHED' ? 'eye' : 'pencil-simple', 'text-lg')}</a><button data-act="delete" data-id="${p.id}" ${locked ? 'disabled' : ''} class="iconbtn danger focus-ring" title="Xóa bài khỏi CMS" aria-label="Xóa bài khỏi CMS">${icon('trash', 'text-lg')}</button></div></li>`;
  }
  // Render the list body with empty state and pager.
  function listBody() {
    const r = DB.posts.list({ status: L.status, sourceType: L.source, page: L.page, size: L.size }); L.page = r.page;
    if (!r.total) return emptyState({ ic: 'linkedin-logo', title: L.status || L.source ? 'Không có bài phù hợp bộ lọc' : 'Chưa có bài LinkedIn độc lập', desc: 'Tạo bài viết LinkedIn mới từ công cụ AI hoặc nhập nội dung thủ công để xuất bản.', action: L.status || L.source ? '<button data-act="reset" class="btn btn-ghost">Xóa bộ lọc</button>' : `<a href="#/linkedin/new" class="btn btn-li">${icon('plus')}Tạo bài LinkedIn</a>` });
    return `<div class="hidden grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_6rem_12.5rem] gap-4 border-b border-surface-border bg-surface-elevated/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-content-muted lg:grid"><span>Nội dung</span><span>Nguồn</span><span>Trạng thái</span><span>Cập nhật</span><span class="text-right">Thao tác</span></div><ul class="divide-y divide-surface-border">${r.items.map(postRow).join('')}</ul>${pager({ page: r.page, totalPages: r.totalPages, total: r.total, unit: 'bài đăng', size: L.size, sizes: [5, 10, 20] })}`;
  }
  // Render the Company Page history drawer.
  function historyHtml() {
    if (!L.showHistory) return '';
    const items = DB.history.list();
    return `<div class="pop-in mb-5 rounded-2xl border border-surface-border bg-surface-card p-4"><div class="mb-3 flex items-center justify-between gap-3"><h3 class="flex items-center gap-2 text-xs font-semibold">${icon('clock-counter-clockwise', 'text-base text-[#6cb4f5]')}Lịch sử Company Page</h3><button data-act="sync" class="btn btn-secondary !h-8" ${L.syncing ? 'disabled' : ''}>${L.syncing ? spinner() : icon('arrows-clockwise', 'text-sm')}${L.syncing ? 'Đang đồng bộ...' : 'Đồng bộ lịch sử'}</button></div>
      <ul class="space-y-2">${items.slice(0, 5).map((h) => `<li class="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 text-xs"><div class="flex justify-between gap-3"><strong class="truncate">${esc(h.topic)}</strong><span class="shrink-0 text-content-muted">${fmtDate(h.publishedAt)}</span></div><p class="mt-1 truncate text-content-muted">${esc(h.content)}</p></li>`).join('')}</ul></div>`;
  }
  // Refresh list area, history drawer and toolbar state.
  function refreshList() { $('#liBody').innerHTML = listBody(); const h = $('#liHistory'); if (h) h.innerHTML = historyHtml(); }

  Pages.linkedinList = {
    nav: 'linkedin', crumb: 'Phân phối <span class="mx-1.5">/</span> Quản lý LinkedIn',
    init() { afterStatus = () => { if (Router.name === 'linkedinList') refreshList(); }; },
    // Render the toolbar, history drawer and post table.
    view() {
      const sel = (id, opts, val) => `<select data-change="${id}" class="inp sm !w-auto" aria-label="${id}">${opts.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      return `${pageHeader({ title: 'Quản lý LinkedIn', desc: 'Quản lý bài đăng LinkedIn độc lập. Bài chuyển từ blog được tạo trong mục Xuất bản bài viết.', actions: `<a href="#/linkedin/new" class="btn btn-li lg">${icon('plus')}Tạo bài LinkedIn</a>` })}
      <div class="mb-5 flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface-card p-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-3">${sel('status', STATUS_OPTS, L.status)}${sel('source', SOURCE_OPTS, L.source)}${L.status || L.source ? `<button data-act="reset" class="btn btn-ghost !h-9">${icon('x', 'text-sm')}Xóa bộ lọc</button>` : ''}</div>
        <div class="flex flex-wrap items-center gap-3">${L.verified ? `<span class="chip !border-emerald-500/30 !bg-emerald-950/40 !text-emerald-400">${icon('check-circle', 'text-sm')}Kết nối sẵn sàng đăng bài</span>` : ''}
          <button data-act="verify" class="btn btn-secondary" ${L.verifying ? 'disabled' : ''}>${L.verifying ? spinner() : icon('plugs-connected')}Kiểm tra kết nối LinkedIn</button>
          <button data-act="history" class="btn btn-secondary" aria-pressed="${L.showHistory}">${icon('clock-counter-clockwise')}${L.showHistory ? 'Ẩn lịch sử Company Page' : 'Hiện lịch sử Company Page'}</button></div></div>
      <div id="liHistory"></div><section class="bezel"><div class="bezel-core clip"><div id="liBody"></div></div></section>`;
    },
    mount() { refreshList(); },
    changes: {
      status(el) { L.status = el.value; L.page = 1; Router.repaint(); },
      source(el) { L.source = el.value; L.page = 1; Router.repaint(); },
      pagesize(el) { L.size = Number(el.value); L.page = 1; refreshList(); },
    },
    actions: {
      page(el) { L.page = Number(el.dataset.page); refreshList(); },
      reset() { L.status = ''; L.source = ''; L.page = 1; Router.repaint(); },
      history() { L.showHistory = !L.showHistory; Router.repaint(); },
      async verify() { L.verifying = true; Router.repaint(); await AI.wait(1100); L.verifying = false; L.verified = true; Router.repaint(); toast('Kết nối LinkedIn hợp lệ, có thể đăng bài.'); },
      async sync() { L.syncing = true; refreshList(); await AI.wait(1200); L.syncing = false; if (Router.name === 'linkedinList') refreshList(); toast('Đã đồng bộ lịch sử LinkedIn.'); },
      publish(el) { const p = DB.posts.get(el.dataset.id); toast(p.status === 'FAILED' ? 'Đang thử lại xuất bản bài đăng LinkedIn.' : 'Đã kích hoạt xuất bản bài đăng LinkedIn.', { type: 'info' }); publishPost(p.id); },
      'open-li'(el) { toast('Bản thử: liên kết LinkedIn chỉ mang tính minh họa.', { type: 'info' }); },
      delete(el) {
        const p = DB.posts.get(el.dataset.id);
        confirmDialog({ title: 'Xác nhận xóa bài khỏi CMS', message: 'Thao tác này chỉ xóa bản ghi khỏi CMS nội bộ và không xóa bài đã xuất bản thực tế trên LinkedIn.', confirmLabel: 'Xóa khỏi CMS', variant: 'danger', onConfirm() {
          DB.posts.remove(p.id); toast('Đã xóa bài khỏi CMS.', { undo() { DB.posts.restore(p.id); refreshList(); } }); refreshList();
        } });
      },
    },
  };

  /* ---------- Shared editor ---------- */
  let S = null;
  const AUDIENCES = ['Nhà đầu tư cá nhân', 'Quản lý quỹ', 'Kỹ sư dữ liệu', 'Sinh viên tài chính'];
  const MODES = [['SUMMARY', 'Tóm tắt bằng AI', 'Tạo bản tóm tắt để bạn kiểm tra và chỉnh sửa.', 'sparkle'], ['SAME', 'Chuyển nguyên bài', 'Chuyển bài website thành văn bản LinkedIn.', 'copy'], ['CUSTOM', 'Tự viết', 'Soạn nội dung LinkedIn theo ý bạn.', 'pencil-simple']];
  const locked = () => S.status === 'PUBLISHED' || S.status === 'PUBLISHING';

  // Load editor state for a standalone post (optional id) or a blog adaptation.
  function initEditor(kind, key) {
    S = { kind, id: null, blog: null, authorMode: 'ai', mode: 'SUMMARY', lang: 'vietnamese', topic: '', context: '', audience: null, linkPlacement: 'NONE', content: '', mediaMode: 'none', media: [], candidates: [], keywords: '', factCheck: { requires: false, notes: [] }, ack: false, status: 'DRAFT', sourceType: kind === 'blog' ? 'BLOG_ADAPTATION' : 'INDEPENDENT_AI', lastError: null, publishedLinkUrl: null, topics: [], busy: {}, missing: false };
    let p = null;
    if (kind === 'blog') { S.blog = DB.blogs.get(key); if (!S.blog || S.blog.state !== 'APPROVED') { S.missing = true; return; } S.topic = S.blog.title; p = DB.posts.byBlog(key); }
    else if (key) { p = DB.posts.get(key); if (!p) { S.missing = true; return; } }
    if (p) Object.assign(S, { id: p.id, topic: p.topic || S.topic, content: p.content, status: p.status, mediaMode: p.mediaMode, media: JSON.parse(JSON.stringify(p.media || [])), factCheck: p.factCheck || S.factCheck, linkPlacement: p.linkPlacement, sourceType: p.sourceType, lastError: p.lastError, publishedLinkUrl: p.publishedLinkUrl, authorMode: p.sourceType === 'CUSTOM' ? 'manual' : 'ai', ack: !p.factCheck?.requires || !!p.factCheck.ack, mode: p.sourceType === 'BLOG_ADAPTATION' && !p.content ? 'SUMMARY' : S.mode });
    else if (kind === 'blog') S.linkPlacement = 'IN_POST';
  }

  // Compute the publish pre-flight checklist.
  function checks() {
    const n = S.media.length, c = S.content.trim().length;
    const mediaOk = S.mediaMode === 'none' ? n === 0 : S.mediaMode === 'single-image' ? n === 1 : n >= 2 && n <= 20;
    const list = [{ ok: c > 0 && c <= MAX_CHARS, label: c > MAX_CHARS ? `Nội dung vượt ${MAX_CHARS} ký tự` : 'Có nội dung bài đăng' }];
    if (S.kind === 'standalone') list.unshift({ ok: !!S.topic.trim(), label: 'Có chủ đề bài đăng' });
    list.push({ ok: mediaOk, label: S.mediaMode === 'none' ? 'Không kèm ảnh' : S.mediaMode === 'single-image' ? 'Đã chọn 1 ảnh' : 'Đã chọn 2-20 ảnh' });
    if (n) list.push({ ok: S.media.every((m) => (m.altText || '').trim()), label: 'Mọi ảnh có mô tả' });
    if (S.factCheck.requires) list.push({ ok: S.ack, label: 'Đã xác nhận kiểm tra thông tin' });
    return list;
  }
  const canPublish = () => !locked() && checks().every((x) => x.ok) && !Object.values(S.busy).some(Boolean);

  // Render the LinkedIn-style preview card.
  function previewCard() {
    const slug = S.blog ? S.blog.slug : '';
    let text = esc(S.content || 'Nội dung bài đăng sẽ hiển thị tại đây.').replace(/#[\p{L}\p{N}_]+/gu, (h) => `<span class="text-[#6cb4f5]">${h}</span>`).replace(/\n/g, '<br>');
    if (S.linkPlacement === 'IN_POST' && slug) text += `<br><br><span class="text-[#6cb4f5]">vietquant.vn/${esc(slug)}</span>`;
    const imgs = S.media.slice(0, 4), grid = imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
    return `<div class="overflow-hidden rounded-2xl border border-surface-border bg-[#1b1f23]"><div class="flex items-center gap-3 p-4"><span class="grid h-11 w-11 place-items-center rounded-md bg-primary-black text-xs font-bold text-primary-green ring-1 ring-surface-border">VQ</span><div><p class="text-sm font-semibold">VietQuant</p><p class="text-[11px] text-content-muted">Công ty · Vừa xong</p></div></div>
      <p class="whitespace-pre-line px-4 pb-3 text-[13px] leading-relaxed text-content-secondary">${text}</p>
      ${imgs.length ? `<div class="grid ${grid} gap-0.5">${imgs.map((m) => `<div class="relative ${imgs.length === 1 ? 'h-56' : 'h-32'} bg-surface-elevated"><img src="${esc(m.imageUrl)}" alt="${esc(m.altText || '')}" class="absolute inset-0 h-full w-full object-cover" onerror="this.remove()" /></div>`).join('')}</div>` : ''}
      <div class="flex items-center justify-around border-t border-surface-border px-2 py-2 text-xs text-content-muted"><span class="flex items-center gap-1.5">${icon('thumbs-up', 'text-base')}Thích</span><span class="flex items-center gap-1.5">${icon('chat-circle', 'text-base')}Bình luận</span><span class="flex items-center gap-1.5">${icon('repeat', 'text-base')}Chia sẻ</span></div></div>`;
  }
  // Render the sticky side column: preview, checklist and actions.
  function sideHtml() {
    const cs = checks(), failed = S.status === 'FAILED', pub = S.status === 'PUBLISHED', ing = S.status === 'PUBLISHING';
    const status = pub ? `<div class="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">${icon('check-circle', 'mr-1 text-base align-middle')}Bài đã được đăng lên LinkedIn.${S.publishedLinkUrl ? `<p class="mt-1 truncate font-mono text-[11px] text-emerald-200/80">${esc(S.publishedLinkUrl)}</p>` : ''}</div>`
      : failed ? `<div class="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">${icon('warning-circle', 'mr-1 text-base align-middle')}${esc((S.lastError && S.lastError.message) || 'Đăng bài thất bại.')}</div>`
      : S.status === 'REVIEW_REQUIRED' ? `<div class="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-300">${icon('warning', 'mr-1 text-base align-middle')}${esc((S.lastError && S.lastError.message) || 'Cần kiểm tra thủ công trước khi đăng.')}</div>` : '';
    return `<div class="bezel"><div class="bezel-core space-y-3 p-4"><div class="flex items-center justify-between"><h4 class="text-sm font-semibold">Điều kiện đăng</h4>${badge(S.status)}</div>
        <ul class="space-y-1.5 text-xs">${cs.map((c) => `<li class="flex items-center gap-2 ${c.ok ? 'text-content-secondary' : 'text-content-muted'}">${icon(c.ok ? 'check-circle' : 'circle', `text-base ${c.ok ? 'text-primary-green' : ''}`)}${c.label}</li>`).join('')}</ul>${status}
        <div class="flex flex-wrap gap-2 pt-1"><button data-act="save" class="btn btn-secondary flex-1" ${locked() || S.busy.save ? 'disabled' : ''}>${icon('floppy-disk')}Lưu bản nháp</button>
          ${failed ? `<button data-act="publish" class="btn btn-solid-danger flex-1" ${!canPublish() ? 'disabled' : ''}>${icon('arrow-clockwise')}Thử lại xuất bản</button>` : `<button data-act="publish" class="btn btn-li flex-1" ${!canPublish() ? 'disabled' : ''}>${ing ? spinner() : icon('paper-plane-tilt')}${ing ? 'Đang đăng...' : 'Đăng lên LinkedIn'}</button>`}</div></div></div>
      <div><p class="mb-2 text-xs font-medium text-content-muted">Xem trước trên LinkedIn</p>${previewCard()}</div>`;
  }
  // Refresh only the side column (keeps focus in text fields).
  function refreshSide() {
    const s = $('#liSide'); if (s) s.innerHTML = sideHtml();
    const c = $('#liCount'); if (c) { c.textContent = `${S.content.length}/${MAX_CHARS}`; c.classList.toggle('text-rose-400', S.content.length > MAX_CHARS); }
  }

  // Build the media (images) section.
  function mediaSection() {
    const dis = locked() ? 'disabled' : '';
    const picker = S.mediaMode === 'none' ? '' : `<div class="flex flex-col gap-2 sm:flex-row"><input class="inp" data-bind="keywords" value="${esc(S.keywords)}" placeholder="Từ khóa tìm ảnh Pexels..." ${dis} /><button data-act="px-search" class="btn btn-secondary !h-[2.5rem]" ${dis || S.busy.px ? 'disabled' : ''}>${S.busy.px ? spinner() : icon('magnifying-glass')}Tìm ảnh</button>
      <label class="btn btn-secondary !h-[2.5rem] cursor-pointer ${locked() ? 'pointer-events-none opacity-40' : ''}">${icon('upload-simple')}Tải ảnh lên<input type="file" accept="image/*" class="hidden" data-change="upload" ${dis} /></label></div>
      ${S.candidates.length ? `<div class="grid grid-cols-3 gap-2 sm:grid-cols-6">${S.candidates.map((c, i) => `<button data-act="cand" data-i="${i}" class="relative aspect-square overflow-hidden rounded-lg border border-surface-border bg-surface-elevated transition-all hover:border-primary-green/60 focus-ring" title="Thêm ảnh của ${esc(c.photographer)}"><img src="${esc(c.imageUrl)}" alt="" class="h-full w-full object-cover" onerror="this.remove()" /></button>`).join('')}</div>` : ''}
      <p class="hint">Đã chọn: <strong class="text-content-primary">${S.media.length}</strong> ảnh ${S.mediaMode === 'multi-image' ? '(cần 2-20 ảnh)' : '(cần 1 ảnh)'}</p>
      ${S.media.length ? `<ul class="space-y-2">${S.media.map((m, i) => `<li class="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated p-2.5">${thumb(m.imageUrl, 'Ảnh', 'h-14 w-20')}<input class="inp sm" data-bind="alt-${i}" value="${esc(m.altText || '')}" placeholder="Mô tả ảnh (bắt buộc)..." ${dis} /><div class="flex shrink-0"><button data-act="m-up" data-i="${i}" class="iconbtn" ${locked() || i === 0 ? 'disabled' : ''} title="Đưa ảnh lên trước" aria-label="Đưa ảnh lên trước">${icon('arrow-up')}</button><button data-act="m-down" data-i="${i}" class="iconbtn" ${locked() || i === S.media.length - 1 ? 'disabled' : ''} title="Đưa ảnh xuống sau" aria-label="Đưa ảnh xuống sau">${icon('arrow-down')}</button><button data-act="m-rm" data-i="${i}" class="iconbtn danger" ${dis} title="Gỡ ảnh" aria-label="Gỡ ảnh">${icon('x')}</button></div></li>`).join('')}</ul>` : ''}`;
    return section('Hình ảnh bài đăng', 'Tìm ảnh Pexels hoặc tải ảnh trực tiếp từ thiết bị', `<div class="flex items-center gap-2"><label class="hint">Chế độ ảnh:</label><select class="inp sm !w-auto" data-bind="mediaMode" ${dis}><option value="none" ${S.mediaMode === 'none' ? 'selected' : ''}>Không kèm ảnh</option><option value="single-image" ${S.mediaMode === 'single-image' ? 'selected' : ''}>Một ảnh</option><option value="multi-image" ${S.mediaMode === 'multi-image' ? 'selected' : ''}>Nhiều ảnh (2-20)</option></select></div>${picker}`);
  }

  // Build the main form column.
  function formHtml() {
    const dis = locked() ? 'disabled' : '';
    let head = '';
    if (S.kind === 'standalone') {
      head = `<div class="seg self-start"><button data-act="author" data-v="ai" aria-selected="${S.authorMode === 'ai'}" class="${S.authorMode === 'ai' ? '!text-purple-300' : ''}" ${dis}>${icon('sparkle', 'text-sm text-purple-400')}Tạo bằng AI</button><button data-act="author" data-v="manual" aria-selected="${S.authorMode === 'manual'}" ${dis}>${icon('pencil-simple', 'text-sm')}Viết thủ công</button></div>`;
    } else {
      head = section('Bài viết nguồn', null, `<div class="flex items-center gap-3.5">${thumb(S.blog.banner_url, S.blog.title)}<div class="min-w-0"><p class="truncate text-sm font-semibold">${esc(S.blog.title)}</p><p class="mt-0.5 text-[11px] text-content-muted">${esc(S.blog.category)} · /${esc(S.blog.slug)}</p></div><a href="#/blog/detail/${S.blog.id}" class="btn btn-ghost ml-auto !h-8">${icon('eye', 'text-sm')}Xem bài</a></div>`)
        + section('1. Chọn cách soạn bài LinkedIn', null, `<div class="grid gap-3 sm:grid-cols-3">${MODES.map(([v, l, d, ic]) => `<button data-act="mode" data-v="${v}" ${dis} class="rounded-xl border p-3.5 text-left text-xs transition-all duration-300 ${S.mode === v ? 'border-primary-green bg-primary-green/10' : 'border-surface-border bg-surface-elevated hover:border-content-muted/40'}"><span class="mb-1.5 flex items-center gap-2 text-sm font-semibold">${icon(ic, 'text-base ' + (S.mode === v ? 'text-primary-green' : 'text-content-muted'))}${l}</span><span class="block leading-relaxed text-content-muted">${d}</span></button>`).join('')}</div><p class="hint">Đổi cách soạn giữ nguyên nội dung hiện tại. Bạn có thể chỉnh sửa nội dung trước khi đăng.</p>`);
    }
    const ai = S.kind === 'standalone' && S.authorMode === 'ai';
    const topicBlock = S.kind === 'standalone' ? `<div><label class="label">Chủ đề bài đăng <span class="text-rose-400">*</span></label><input class="inp" data-bind="topic" value="${esc(S.topic)}" placeholder="Nhập chủ đề bài đăng..." ${dis} /></div>` : '';
    const aiBlock = ai ? `<div><label class="label">Ngữ cảnh bổ sung</label><textarea rows="3" class="inp" data-bind="context" placeholder="Luận điểm, dữ liệu hoặc góc nhìn cần AI sử dụng..." ${dis}>${esc(S.context)}</textarea></div>
      <div><label class="label">Đối tượng độc giả</label><div class="flex flex-wrap gap-2"><button data-act="aud" data-v="" class="chip transition-colors ${S.audience === null ? '!border-purple-500/40 !bg-purple-500/25 !text-purple-100' : 'hover:bg-surface-hover'}">Tự động</button>${AUDIENCES.map((a) => `<button data-act="aud" data-v="${esc(a)}" class="chip transition-colors ${S.audience === a ? '!border-purple-500/40 !bg-purple-500/25 !text-purple-100' : 'hover:bg-surface-hover'}">${a}</button>`).join('')}</div></div>` : '';
    const showGen = S.kind === 'standalone' ? ai : S.mode !== 'CUSTOM';
    const lang = S.kind === 'blog' ? S.mode === 'SUMMARY' : ai;
    const genRow = showGen ? `<div class="flex flex-wrap items-end gap-3">${lang ? `<div><label class="label">Ngôn ngữ</label><select class="inp sm !w-auto" data-bind="lang" ${dis}><option value="vietnamese" ${S.lang === 'vietnamese' ? 'selected' : ''}>Tiếng Việt</option><option value="english" ${S.lang === 'english' ? 'selected' : ''}>English</option></select></div>` : ''}
      <button data-act="gen" class="btn btn-ai" ${dis || S.busy.gen || (S.kind === 'standalone' && !S.topic.trim()) ? 'disabled' : ''}>${S.busy.gen ? spinner() : icon('sparkle')}${S.busy.gen ? 'Đang tạo bằng AI...' : S.content ? 'Tạo lại bằng AI' : 'Tạo bản nháp bằng AI'}</button>
      ${S.kind === 'standalone' ? `<button data-act="topics" class="btn btn-ghost" ${dis || S.busy.topics ? 'disabled' : ''}>${S.busy.topics ? spinner() : icon('lightbulb')}Gợi ý chủ đề</button>` : ''}</div>
      ${S.topics.length ? `<div class="flex flex-wrap gap-2">${S.topics.map((t, i) => `<button data-act="topic" data-i="${i}" class="rounded-lg border border-purple-500/30 bg-purple-950/20 px-3 py-1.5 text-left text-xs text-purple-200 transition-colors hover:bg-purple-900/40">${esc(t)}</button>`).join('')}</div>` : ''}` : '';
    const content = section(S.kind === 'blog' ? '2. Nội dung LinkedIn' : 'Chủ đề và nội dung', 'Chủ đề bài đăng và văn bản xuất bản', `${topicBlock}${aiBlock}${genRow}
      <div><div class="mb-1.5 flex items-center justify-between"><label class="label !mb-0">Nội dung bài đăng <span class="text-rose-400">*</span></label><span id="liCount" class="hint tabular-nums">${S.content.length}/${MAX_CHARS}</span></div><textarea rows="11" class="inp" data-bind="content" placeholder="Nhập nội dung bài LinkedIn..." ${dis}>${esc(S.content)}</textarea></div>
      <div><label class="label">Vị trí liên kết website</label><div class="seg">${[['NONE', 'Không chèn liên kết'], ['IN_POST', 'Chèn liên kết trong bài']].map(([v, l]) => `<button data-act="place" data-v="${v}" aria-selected="${S.linkPlacement === v}" ${dis}>${l}</button>`).join('')}</div>${S.kind === 'blog' ? '<p class="hint mt-2">Hệ thống xác định URL bài website khi đăng; nội dung đã duyệt luôn không chứa URL.</p>' : ''}</div>`);
    const fact = S.factCheck.requires ? `<section class="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5"><h3 class="flex items-center gap-2 text-sm font-semibold text-amber-300">${icon('warning', 'text-lg text-amber-400')}Kiểm tra tính chính xác của nội dung</h3>${S.factCheck.notes.length ? `<ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200/90">${S.factCheck.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="mt-2 text-xs text-amber-200/90">Nội dung này cần được người quản trị kiểm tra thủ công trước khi xuất bản.</p>'}
      <label class="mt-3 flex cursor-pointer items-center gap-2.5 text-xs text-amber-200"><input type="checkbox" data-bind="ack" ${S.ack ? 'checked' : ''} ${dis} class="h-4 w-4 accent-[#07e86c]" />Tôi xác nhận đã kiểm tra và đối chiếu các thông tin trên là chính xác.</label></section>` : '';
    return `<div class="space-y-6">${head}${content}${mediaSection()}${fact}</div>`;
  }

  // Save the draft to the database; returns the stored record.
  function persist() {
    const ok = checks().every((c) => c.ok);
    const rec = DB.posts.save({ id: S.id || undefined, topic: S.topic, content: S.content, sourceType: S.sourceType, status: S.status === 'FAILED' || S.status === 'REVIEW_REQUIRED' ? S.status : (ok ? 'READY' : 'DRAFT'), mediaMode: S.mediaMode, media: S.media, factCheck: Object.assign({}, S.factCheck, { ack: S.ack }), linkPlacement: S.linkPlacement, blogId: S.blog ? S.blog.id : null });
    const first = !S.id; S.id = rec.id; S.status = rec.status; return { rec, first };
  }

  function makePage(kind) {
    return {
      nav: kind === 'blog' ? 'publications' : 'linkedin', wide: 'max-w-6xl',
      init(key) { initEditor(kind, key); afterStatus = (id) => { if (S && S.id === id) { const p = DB.posts.get(id); if (p) { S.status = p.status; S.lastError = p.lastError; S.publishedLinkUrl = p.publishedLinkUrl; } if (/^(linkedinEditor|publicationConfig)$/.test(Router.name)) Router.repaint(); } }; },
      // Render header, form column and sticky preview column.
      view() {
        const back = kind === 'blog' ? ['#/publications', 'Quay lại Xuất bản bài viết'] : ['#/linkedin', 'Quay lại Quản lý LinkedIn'];
        Router.page.crumb = kind === 'blog' ? 'Phân phối <span class="mx-1.5">/</span> Xuất bản <span class="mx-1.5">/</span> Bài LinkedIn' : 'Phân phối <span class="mx-1.5">/</span> LinkedIn <span class="mx-1.5">/</span> ' + (S.id ? 'Chi tiết' : 'Tạo mới');
        if (S.missing) return `<div class="space-y-4 py-16 text-center"><p class="text-sm text-rose-400">Không tìm thấy bài viết hoặc bài chưa được duyệt.</p><a href="${back[0]}" class="btn btn-secondary">${icon('arrow-left')}${back[1]}</a></div>`;
        const title = kind === 'blog' ? 'Soạn bài LinkedIn từ blog' : S.id ? 'Chi tiết bài LinkedIn' : 'Tạo bài đăng LinkedIn';
        return `<a href="${back[0]}" class="btn btn-ghost mb-5">${icon('arrow-left')}${back[1]}</a>${pageHeader({ title, desc: 'Biên soạn, kiểm tra tính xác thực và đăng bài trực tiếp lên LinkedIn.', actions: S.id ? badge(S.status) : '' })}
          <div class="grid items-start gap-6 lg:grid-cols-12"><div class="lg:col-span-7">${formHtml()}</div><aside id="liSide" class="space-y-5 lg:sticky lg:top-20 lg:col-span-5">${sideHtml()}</aside></div>`;
      },
      // Update editor state from inputs and refresh only the dependent parts.
      input(bind, val, el) {
        if (bind === 'topic') S.topic = val; else if (bind === 'context') S.context = val; else if (bind === 'content') S.content = val;
        else if (bind === 'lang') S.lang = val; else if (bind === 'keywords') S.keywords = val;
        else if (bind === 'ack') S.ack = val;
        else if (bind === 'mediaMode') { S.mediaMode = val; if (val === 'none') S.media = []; else if (val === 'single-image' && S.media.length > 1) S.media = S.media.slice(0, 1); Router.repaint(); return; }
        else if (bind.startsWith('alt-')) S.media[Number(bind.slice(4))].altText = val;
        if (bind === 'topic') { const g = $('[data-act="gen"]'); if (g && S.kind === 'standalone') g.disabled = !val.trim() || S.busy.gen; }
        refreshSide();
      },
      changes: {
        // Add an uploaded image as a local object URL.
        upload(el) {
          const f = el.files[0]; if (!f) return;
          if (!addMedia({ id: 'up-' + uid(''), provider: 'upload', imageUrl: URL.createObjectURL(f), altText: '', photographer: '' })) return;
          Router.repaint(); toast('Đã tải ảnh lên.');
        },
      },
      actions: {
        author(el) { S.authorMode = el.dataset.v; S.sourceType = el.dataset.v === 'ai' ? 'INDEPENDENT_AI' : 'CUSTOM'; Router.repaint(); },
        mode(el) { S.mode = el.dataset.v; Router.repaint(); },
        aud(el) { S.audience = el.dataset.v || null; Router.repaint(); },
        place(el) { S.linkPlacement = el.dataset.v; Router.repaint(); },
        topic(el) { S.topic = S.topics[Number(el.dataset.i)]; Router.repaint(); },
        async topics() { S.busy.topics = true; Router.repaint(); S.topics = await AI.topics(); S.busy.topics = false; Router.repaint(); },
        // Generate content, asking before overwriting existing text.
        gen() {
          const run = async () => {
            S.busy.gen = true; Router.repaint();
            const r = await AI.linkedin({ topic: S.topic, context: S.context, audience: S.audience, blog: S.blog, mode: S.mode, lang: S.lang });
            S.content = r.content; S.factCheck = r.factCheck; S.ack = !r.factCheck.requires; S.busy.gen = false; Router.repaint(); toast('Đã tạo bản nháp, chưa được lưu.');
          };
          if (S.content.trim()) confirmDialog({ title: 'Ghi đè nội dung bằng AI?', message: 'Nội dung LinkedIn hiện tại sẽ bị thay thế bằng bản nháp mới. Bạn có chắc chắn muốn tiếp tục?', confirmLabel: 'Tiếp tục tạo lại', onConfirm: run }); else run();
        },
        async 'px-search'() { S.busy.px = true; Router.repaint(); S.candidates = await AI.pexels(S.keywords || S.topic || 'finance'); S.busy.px = false; Router.repaint(); },
        cand(el) { if (addMedia(S.candidates[Number(el.dataset.i)])) Router.repaint(); },
        'm-up'(el) { const i = Number(el.dataset.i); [S.media[i - 1], S.media[i]] = [S.media[i], S.media[i - 1]]; Router.repaint(); },
        'm-down'(el) { const i = Number(el.dataset.i); [S.media[i + 1], S.media[i]] = [S.media[i], S.media[i + 1]]; Router.repaint(); },
        'm-rm'(el) { S.media.splice(Number(el.dataset.i), 1); Router.repaint(); },
        // Save the draft; a new standalone post moves to its detail route.
        save() {
          if (!S.topic.trim() && !S.content.trim()) { toast('Hãy nhập chủ đề hoặc nội dung trước khi lưu.', { type: 'error' }); return; }
          const { first } = persist(); toast('Đã lưu bản nháp LinkedIn.');
          if (first && kind === 'standalone') Router.go('/linkedin/posts/' + S.id); else Router.repaint();
        },
        // Confirm and publish the post (retry uses the same flow).
        publish() {
          if (!canPublish()) return;
          confirmDialog({ title: 'Xác nhận đăng lên LinkedIn', message: 'Bài viết sẽ được đăng công khai trên Trang Doanh nghiệp LinkedIn. Hãy kiểm tra kỹ nội dung và ảnh trước khi tiếp tục.', confirmLabel: 'Đăng ngay', onConfirm() {
            const id = persist().rec.id; publishPost(id);
          } });
        },
      },
    };
  }
  // Add a media asset while respecting the selected mode limits.
  function addMedia(asset) {
    if (S.mediaMode === 'none') { toast('Hãy chọn chế độ ảnh trước khi thêm ảnh.', { type: 'error' }); return false; }
    if (S.media.some((m) => m.id === asset.id)) return false;
    if (S.mediaMode === 'single-image') S.media = [Object.assign({}, asset)];
    else if (S.media.length >= 20) { toast('Tối đa 20 ảnh.', { type: 'error' }); return false; }
    else S.media.push(Object.assign({}, asset));
    return true;
  }
  Pages.linkedinEditor = makePage('standalone');
  Pages.publicationConfig = makePage('blog');
})();
