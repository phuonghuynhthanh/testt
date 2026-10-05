/* Blog pages: list, detail, create/edit editor, research tools and public preview. */
(function () {
  const { esc, icon, $, $$, fmtDate, fmtDateTime, badge, thumb, pageHeader, cta, section, emptyState, field, pager, toast, openModal, closeModal, confirmDialog, spinner } = UI;
  const Pages = window.Pages;
  // Render Markdown to HTML (falls back to escaped text when the library is unavailable).
  const md = (s) => (window.marked ? window.marked.parse(s || '') : `<pre>${esc(s)}</pre>`);
  UI.md = md;

  /* ---------- Blog detail ---------- */
  let D = null;
  Pages.blogDetail = {
    nav: 'blog', wide: 'max-w-6xl', crumb: 'Nội dung <span class="mx-1.5">/</span> Chi tiết bài viết',
    init(id) { D = DB.blogs.get(id); },
    // Render article detail with metadata and SEO side cards.
    view() {
      const b = D;
      if (!b) return `<div class="space-y-4 py-16 text-center"><p class="text-sm text-rose-400">Không tìm thấy bài viết hoặc đã xảy ra lỗi tải dữ liệu.</p><a href="#/blog" class="btn btn-secondary">${icon('arrow-left')}Quay lại danh sách</a></div>`;
      const kw = (b.seo.keywords || []).map((k) => `<span class="chip !rounded-md">${esc(k)}</span>`).join('');
      const row = (l, v, last) => `<div class="flex items-center justify-between py-2 ${last ? '' : 'border-b border-surface-border/50'}"><span class="text-content-muted">${l}</span><span class="font-medium">${v}</span></div>`;
      return `<div class="mb-6 flex flex-col justify-between gap-4 border-b border-surface-border pb-4 sm:flex-row sm:items-center">
        <a href="#/blog" class="btn btn-ghost self-start">${icon('arrow-left')}Quay lại danh sách</a>
        <div class="flex flex-wrap items-center gap-2.5">
          ${b.state === 'PENDING' ? `<button data-act="approve" class="btn btn-outline">${icon('check')}Duyệt bài</button>` : ''}
          ${b.state === 'APPROVED' ? `<a href="#/publications/${b.id}" class="btn btn-li">${icon('linkedin-logo')}Tạo bài LinkedIn</a>` : ''}
          <a href="#/blog/default/${b.id}" class="btn btn-secondary">${icon('pencil-simple')}Chỉnh sửa</a>
          <button data-act="delete" class="btn btn-danger">${icon('trash')}Xóa bài viết</button></div></div>
      <div class="grid gap-6 lg:grid-cols-12"><div class="space-y-6 lg:col-span-8">
        <div class="bezel"><div class="bezel-core clip"><div class="space-y-4 p-6">
          <div class="flex flex-wrap items-center gap-2">${badge(b.state)}${b.category ? `<span class="chip text-cyan-300">${icon('folder', 'text-xs')}${esc(b.category)}</span>` : ''}${b.tag ? `<span class="chip text-amber-300">${icon('tag', 'text-xs')}${esc(b.tag)}</span>` : ''}</div>
          <h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">${esc(b.title)}</h1>
          <p class="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-elevated px-2.5 py-1 font-mono text-xs text-content-muted">${icon('globe', 'text-sm')}/${esc(b.slug)}</p></div>
          ${b.banner_url ? `<div class="relative h-56 border-t border-surface-border bg-surface-elevated sm:h-80"><img src="${esc(b.banner_url)}" alt="" class="h-full w-full object-cover" onerror="this.parentNode.remove()" /></div>` : ''}</div></div>
        <div class="bezel"><div class="bezel-core p-6"><h3 class="mb-4 border-b border-surface-border pb-3 text-base font-semibold">Nội dung bài viết</h3>${b.content ? `<div class="prose-vq">${md(b.content)}</div>` : '<p class="text-xs italic text-content-muted">Bài viết chưa có nội dung văn bản.</p>'}</div></div></div>
      <div class="space-y-6 lg:col-span-4">
        <div class="bezel"><div class="bezel-core p-5"><h3 class="mb-2 border-b border-surface-border pb-2.5 text-sm font-semibold">Thông tin hệ thống</h3><div class="text-xs">${row('Tác giả', esc(b.seo.author || 'VietQuant'))}${row('Ngày tạo', fmtDateTime(b.created_at))}${row('Cập nhật lần cuối', fmtDateTime(b.modified_at), true)}</div></div></div>
        <div class="bezel"><div class="bezel-core space-y-3 p-5 text-xs"><h3 class="border-b border-surface-border pb-2.5 text-sm font-semibold">Cấu hình SEO</h3>
          <div><span class="mb-0.5 block text-content-muted">Tiêu đề SEO</span><p class="font-medium">${esc(b.seo.title || 'Chưa cấu hình')}</p></div>
          <div><span class="mb-0.5 block text-content-muted">Mô tả SEO</span><p class="leading-relaxed text-content-secondary">${esc(b.seo.description || 'Chưa cấu hình')}</p></div>
          ${kw ? `<div><span class="mb-1.5 block text-content-muted">Từ khóa SEO</span><div class="flex flex-wrap gap-1.5">${kw}</div></div>` : ''}</div></div></div></div>`;
    },
    actions: {
      approve() { DB.blogs.update(D.id, { state: 'APPROVED' }); D = DB.blogs.get(D.id); toast('Đã duyệt bài viết thành công.'); Router.repaint(); },
      delete() {
        confirmDialog({ title: 'Xác nhận xóa bài viết', message: `Bạn có chắc chắn muốn xóa bài viết "${D.title}"? Bài viết sẽ được chuyển vào thùng rác.`, confirmLabel: 'Xóa bài viết', variant: 'danger', onConfirm() {
          const id = D.id; DB.blogs.remove(id); toast('Đã chuyển bài viết vào thùng rác thành công.', { undo() { DB.blogs.restore(id); } }); Router.go('/blog');
        } });
      },
    },
  };

  /* ---------- Blog create / edit editor ---------- */
  let E = null;
  const emptyBlog = () => ({ title: '', tag: '', category: '', banner_url: '', content: '', seo: { title: '', description: '', keywords: [], author: 'VietQuant' } });

  // Initialise editor state for create (no id) or edit (existing id).
  function initEditor(id) {
    let b = emptyBlog();
    if (id) { const src = DB.blogs.get(id); if (src) b = JSON.parse(JSON.stringify(src)); else { E = { missing: true }; return; } }
    if (!id) { const pre = sessionStorage.getItem('vq-prefill-title'); if (pre) { b.title = pre; b.seo.title = pre; sessionStorage.removeItem('vq-prefill-title'); } }
    E = { id: id || null, edit: !!id, source: 'ai', lang: 'vietnamese', b, edMode: 'edit', seoOpen: false, busy: {}, bannerTab: 'upload', candidates: [], px: '', prompt: '', catOpen: false, catSearch: '', catActive: -1 };
  }
  const valid = () => E.b.title.trim() && E.b.category.trim() && E.b.content.trim();
  const anyBusy = () => Object.values(E.busy).some(Boolean);

  // Enable or disable the save buttons and update the helper text.
  function syncBar() {
    const dis = !valid() || anyBusy();
    $$('[data-needs-valid]').forEach((b) => { b.disabled = dis; });
    const t = $('#barState'); if (t) t.textContent = valid() ? 'Bài viết đã sẵn sàng' : 'Đang soạn thảo bài viết';
    const ai = $('[data-act="ai-draft"]'); if (ai) ai.disabled = !(E.b.title.trim() && E.b.category.trim()) || !!E.busy.draft;
    const sg = $('[data-act="seo-ai"]'); if (sg) sg.disabled = !(E.b.title.trim() && E.b.content.trim()) || !!E.busy.seo;
  }

  // Render the category combobox dropdown content.
  function catOptions() {
    const q = E.catSearch.trim().toLocaleLowerCase('vi-VN');
    const all = DB.categories.all();
    const matches = all.filter((c) => c.name.toLocaleLowerCase('vi-VN').includes(q));
    const exists = all.some((c) => c.name.toLocaleLowerCase('vi-VN') === q);
    let html = matches.map((c, i) => `<button type="button" data-act="cat-pick" data-name="${esc(c.name)}" role="option" aria-selected="${c.name === E.b.category}" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-elevated ${i === E.catActive ? 'bg-surface-elevated' : ''}"><span>${esc(c.name)}</span>${c.name === E.b.category ? icon('check', 'text-primary-green') : ''}</button>`).join('');
    if (q && !exists) html += `<button type="button" data-act="cat-create" data-name="${esc(E.catSearch.trim())}" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-primary-green hover:bg-primary-green/10">${icon('plus-circle', 'text-base')}Tạo danh mục "${esc(E.catSearch.trim())}"</button>`;
    return html || '<p class="px-3 py-3 text-xs text-content-muted">Chưa có danh mục nào.</p>';
  }
  // Open, refresh or close the dropdown list.
  function renderCat() {
    const l = $('#catList'); if (!l) return;
    l.classList.toggle('hidden', !E.catOpen);
    if (E.catOpen) l.innerHTML = catOptions();
  }
  // Commit a category choice and close the dropdown.
  function pickCat(name) { E.b.category = name; E.catOpen = false; E.catSearch = ''; E.catActive = -1; const i = $('#catInput'); if (i) { i.value = name; i.blur(); } renderCat(); syncBar(); }

  // Insert Markdown syntax around the textarea selection.
  function applyTool(tool) {
    const ta = $('#mdArea'); if (!ta) return;
    const T = { bold: ['**', '**', 'in đậm'], italic: ['*', '*', 'in nghiêng'], code: ['`', '`', 'mã'], link: ['[', '](https://)', 'văn bản'], h2: ['\n## ', '\n', 'Tiêu đề'], h3: ['\n### ', '\n', 'Tiêu đề phụ'], ul: ['\n- ', '\n', 'mục danh sách'], ol: ['\n1. ', '\n', 'mục danh sách'], quote: ['\n> ', '\n', 'trích dẫn'], table: ['\n| Cột 1 | Cột 2 |\n| --- | --- |\n| ', ' | Giá trị |\n', 'Giá trị'] };
    const [pre, post, ph] = T[tool], s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
    ta.value = ta.value.slice(0, s) + pre + sel + post + ta.value.slice(e);
    ta.focus(); ta.setSelectionRange(s + pre.length, s + pre.length + sel.length);
    E.b.content = ta.value; E.dirty = true;
    const pv = $('#mdPreview'); if (pv) pv.innerHTML = md(E.b.content);
    syncBar();
  }

  // Build the Markdown editor card with three display modes.
  function editorCard() {
    const modes = [['edit', 'Soạn thảo', 'pencil-simple'], ['markdown', 'Markdown', 'code'], ['preview', 'Xem trước', 'eye']];
    const tools = [['bold', 'text-b', 'In đậm'], ['italic', 'text-italic', 'In nghiêng'], ['h2', 'text-h-two', 'Tiêu đề'], ['h3', 'text-h-three', 'Tiêu đề phụ'], ['ul', 'list-bullets', 'Danh sách'], ['ol', 'list-numbers', 'Danh sách số'], ['quote', 'quotes', 'Trích dẫn'], ['code', 'code', 'Mã'], ['link', 'link', 'Liên kết'], ['table', 'table', 'Bảng']];
    const aiRow = !E.edit && E.source === 'ai' ? `<div class="flex flex-wrap items-end gap-3"><div><label class="label">Ngôn ngữ bài viết</label><select data-bind="lang" class="inp sm !w-auto"><option value="vietnamese" ${E.lang === 'vietnamese' ? 'selected' : ''}>Tiếng Việt</option><option value="english" ${E.lang === 'english' ? 'selected' : ''}>English</option></select></div>
      <button data-act="ai-draft" class="btn btn-ai" ${!(E.b.title.trim() && E.b.category.trim()) || E.busy.draft ? 'disabled' : ''}>${E.busy.draft ? spinner() : icon('sparkle')}${E.busy.draft ? 'Đang tạo bản nháp...' : E.b.content ? 'Tạo lại bằng AI' : 'Tạo bản nháp bằng AI'}</button>
      ${!(E.b.title.trim() && E.b.category.trim()) ? '<p class="hint pb-2">Nhập tiêu đề và chọn danh mục để AI tạo bản nháp.</p>' : ''}</div>` : '';
    let body;
    if (E.edMode === 'edit') body = `<div class="overflow-hidden rounded-xl border border-surface-border"><div class="flex flex-wrap items-center gap-0.5 border-b border-surface-border bg-surface-elevated p-1.5">${tools.map(([t, ic, l]) => `<button type="button" class="md-tool focus-ring" data-act="md-tool" data-tool="${t}" title="${l}" aria-label="${l}">${icon(ic, 'text-lg')}</button>`).join('')}</div>
      <div class="grid lg:grid-cols-2"><textarea id="mdArea" data-bind="content" placeholder="Soạn thảo nội dung bài viết bằng Markdown..." class="h-96 w-full resize-none border-0 bg-surface-card p-4 font-mono text-[13px] leading-relaxed text-content-primary placeholder-content-muted focus:outline-none lg:border-r lg:border-surface-border">${esc(E.b.content)}</textarea>
      <div id="mdPreview" class="prose-vq hidden h-96 overflow-y-auto bg-surface-base/40 p-4 lg:block">${E.b.content ? md(E.b.content) : '<p class="text-xs text-content-muted">Bản xem trước hiển thị tại đây.</p>'}</div></div></div>`;
    else if (E.edMode === 'markdown') body = `<textarea data-bind="content" rows="16" placeholder="Nhập hoặc dán mã nguồn Markdown tại đây..." class="inp !rounded-xl font-mono !text-xs leading-relaxed">${esc(E.b.content)}</textarea>`;
    else body = `<div class="min-h-[320px] overflow-y-auto rounded-xl border border-surface-border bg-surface-elevated/40 p-6">${E.b.content.trim() ? `<div class="prose-vq">${md(E.b.content)}</div>` : '<p class="py-12 text-center text-xs text-content-muted">Chưa có nội dung để xem trước. Hãy nhập nội dung bài viết trước.</p>'}</div>`;
    return `<section class="bezel"><div class="bezel-core space-y-4 p-4"><div class="flex flex-col gap-3 border-b border-surface-border pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="text-base font-semibold">Nội dung bài viết</h3><p class="mt-0.5 text-xs text-content-muted">Định dạng Markdown tiêu chuẩn hỗ trợ soạn thảo, mã nguồn và xem trước</p></div>
      <div class="seg self-start" role="tablist">${modes.map(([v, l, ic]) => `<button role="tab" aria-selected="${E.edMode === v}" data-act="ed-mode" data-v="${v}">${icon(ic, 'text-sm')}${l}</button>`).join('')}</div></div>${aiRow}${body}</div></section>`;
  }

  // Build the banner picker (upload, AI image, stock search).
  function bannerCard() {
    const b = E.b.banner_url;
    const preview = b ? `<div class="group relative h-44 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated sm:h-56"><img src="${esc(b)}" alt="Ảnh bìa" class="h-full w-full object-cover" onerror="this.style.display='none'" /><div class="absolute right-3 top-3 flex gap-2"><button data-act="banner-clear" class="btn btn-secondary !h-8 backdrop-blur">${icon('trash', 'text-sm')}Gỡ ảnh</button></div></div>` : '';
    const tabs = [['upload', 'Tải lên', 'upload-simple'], ['ai', 'Tạo bằng AI', 'sparkle'], ['stock', 'Kho ảnh', 'images']];
    let panel = '';
    if (E.bannerTab === 'upload') panel = `<label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-surface-border bg-surface-elevated/40 px-6 py-8 text-center transition-colors hover:border-primary-green/50 hover:bg-surface-elevated">${icon('upload-simple', 'text-3xl text-content-muted')}<span class="text-sm font-medium">Chọn tệp ảnh từ thiết bị</span><span class="hint">JPEG, PNG hoặc WebP, tối đa 5MB</span><input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-change="banner-file" /></label>`;
    if (E.bannerTab === 'ai') panel = `<div class="flex flex-col gap-2 sm:flex-row"><input class="inp" data-bind="prompt" value="${esc(E.prompt)}" placeholder="Mô tả ảnh bìa, ví dụ: biểu đồ nến xanh trên nền tối" /><button data-act="banner-ai" class="btn btn-ai lg !h-[2.5rem]" ${E.busy.banner ? 'disabled' : ''}>${E.busy.banner ? spinner() : icon('sparkle')}Tạo ảnh</button></div>`;
    if (E.bannerTab === 'stock') panel = `<div class="flex flex-col gap-2 sm:flex-row"><input class="inp" data-bind="px" value="${esc(E.px)}" placeholder="Từ khóa tìm ảnh, ví dụ: stock market" /><button data-act="banner-search" class="btn btn-secondary lg !h-[2.5rem]" ${E.busy.banner ? 'disabled' : ''}>${E.busy.banner ? spinner() : icon('magnifying-glass')}Tìm ảnh</button></div>
      ${E.candidates.length ? `<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">${E.candidates.map((c, i) => `<button data-act="banner-pick" data-i="${i}" class="group relative aspect-[16/10] overflow-hidden rounded-xl border border-surface-border bg-surface-elevated transition-all hover:border-primary-green/60 focus-ring"><img src="${esc(c.imageUrl)}" alt="" class="h-full w-full object-cover transition-transform duration-700 ease-fluid group-hover:scale-105" onerror="this.remove()" /><span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-[11px]">${esc(c.photographer)}</span></button>`).join('')}</div>` : ''}`;
    return section('Ảnh bìa bài viết', 'Tùy chọn. Tải lên, tạo bằng AI hoặc chọn từ kho ảnh.', `${preview}<div class="seg" role="tablist">${tabs.map(([v, l, ic]) => `<button role="tab" aria-selected="${E.bannerTab === v}" data-act="banner-tab" data-v="${v}">${icon(ic, 'text-sm')}${l}</button>`).join('')}</div>${panel}`);
  }

  // Build the collapsible SEO configuration section.
  function seoCard() {
    const s = E.b.seo, canGen = E.b.title.trim() && E.b.content.trim();
    const body = E.seoOpen ? `<div class="border-t border-surface-border/60 px-5 pb-6 pt-4 sm:px-6"><div class="mb-4 flex flex-wrap items-center gap-3"><button data-act="seo-ai" class="btn btn-ai" ${!canGen || E.busy.seo ? 'disabled' : ''}>${E.busy.seo ? spinner() : icon('sparkle')}${E.busy.seo ? 'Đang tạo SEO...' : 'Tạo SEO bằng AI'}</button><p class="hint" role="status">${E.busy.seo ? 'Đang tạo mô tả và từ khóa; nội dung bài viết được giữ nguyên.' : canGen ? 'AI tạo mô tả và từ khóa. Bạn có thể chỉnh sửa trước khi lưu.' : 'Nhập tiêu đề và nội dung bài viết trước khi tạo SEO.'}</p></div>
      <div class="grid gap-4 md:grid-cols-2">${field({ label: 'Tiêu đề SEO', bind: 'seo.title', value: s.title, placeholder: 'Nhập tiêu đề SEO...', cls: 'md:col-span-2' })}
      <div class="md:col-span-2"><label class="label">Mô tả SEO <span class="hint ml-1 font-normal">${s.description.length}/160</span></label><textarea rows="3" class="inp" data-bind="seo.description" placeholder="Nhập mô tả tóm tắt...">${esc(s.description)}</textarea></div>
      <p class="hint rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 md:col-span-2">URL SEO được hệ thống tạo từ đường dẫn bài viết khi lưu.</p>
      ${field({ label: 'Từ khóa SEO (cách nhau bởi dấu phẩy)', bind: 'seo.keywords', value: s.keywords.join(', '), placeholder: 'keyword 1, keyword 2...' })}${field({ label: 'Tác giả', bind: 'seo.author', value: s.author, placeholder: 'VietQuant' })}</div></div>` : '';
    return `<section class="bezel"><div class="bezel-core clip"><div data-act="seo-toggle" class="flex cursor-pointer select-none items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-elevated/40 sm:p-6"><div class="space-y-1"><div class="flex items-center gap-2"><h3 class="text-base font-semibold">Cấu hình SEO</h3><span class="chip !text-[11px] text-content-muted">Không bắt buộc</span></div><p class="text-xs text-content-muted">Tối ưu thẻ tìm kiếm, tiêu đề và mô tả bài viết trên công cụ tìm kiếm</p></div>
      <button type="button" class="switch focus-ring" role="switch" aria-checked="${E.seoOpen}" aria-label="Bật cấu hình SEO"></button></div>${body}</div></section>`;
  }

  // Save a new article with the chosen state.
  function saveNew(state) {
    const b = E.b, rec = DB.blogs.create({ title: b.title.trim(), tag: b.tag.trim(), category: b.category, banner_url: b.banner_url, content: b.content, seo: Object.assign({}, b.seo, { title: b.seo.title || b.title.trim() }) }, state);
    E.dirty = false;
    toast(state === 'APPROVED' ? 'Đã lưu và đăng bài viết lên website.' : 'Đã lưu bài viết chờ duyệt.');
    Router.go(state === 'APPROVED' ? `/blog/detail/${rec.id}` : `/blog/default/${rec.id}`);
  }
  // Run the AI draft generation with busy state.
  async function runDraft() {
    E.busy.draft = true; Router.repaint();
    const r = await AI.draftBlog(E.b.title, E.b.category, E.lang);
    E.b.content = r.content; E.b.seo = Object.assign({}, E.b.seo, r.seo, { title: E.b.seo.title || E.b.title }); E.busy.draft = false;
    if (Router.name === 'blogCreate') { Router.repaint(); toast('Đã tạo bản nháp AI, chưa được lưu.'); }
  }
  // Run the AI SEO generation with busy state.
  async function runSeo() {
    E.busy.seo = true; Router.repaint();
    const r = await AI.seo(E.b.title);
    E.b.seo.description = r.description; E.b.seo.keywords = r.keywords; E.b.seo.title = E.b.seo.title || E.b.title; E.busy.seo = false;
    if (Router.name === 'blogCreate' || Router.name === 'blogEdit') { Router.repaint(); toast('Đã tạo SEO bằng AI, chưa được lưu.'); }
  }

  const editorPage = {
    nav: 'create', wide: 'max-w-5xl',
    init(id) { initEditor(id); },
    // Render the full create or edit form.
    view() {
      if (E.missing) return `<div class="space-y-4 py-16 text-center"><p class="text-sm text-rose-400">Không tìm thấy bài viết cần chỉnh sửa.</p><a href="#/blog" class="btn btn-secondary">${icon('arrow-left')}Quay lại danh sách</a></div>`;
      Router.page.crumb = E.edit ? 'Nội dung <span class="mx-1.5">/</span> Chỉnh sửa bài viết' : 'Nội dung <span class="mx-1.5">/</span> Tạo bài viết';
      $('#crumb') && ($('#crumb').innerHTML = Router.page.crumb);
      const b = E.b, src = E.edit ? '' : `<div class="seg self-start"><button data-act="src" data-v="ai" aria-selected="${E.source === 'ai'}" class="${E.source === 'ai' ? '!text-purple-300' : ''}">${icon('sparkle', 'text-sm text-purple-400')}Trợ lý AI</button><button data-act="src" data-v="manual" aria-selected="${E.source === 'manual'}">${icon('file-text', 'text-sm')}Viết thủ công</button></div>`;
      const basic = section('Thông tin cơ bản', 'Tiêu đề, danh mục và thẻ tag', `<div class="grid gap-4 md:grid-cols-2">${field({ label: 'Tiêu đề bài viết', bind: 'title', value: b.title, placeholder: 'Nhập tiêu đề bài viết...', required: true, cls: 'md:col-span-2' })}
        <div class="relative" id="catBox"><label class="label" for="catInput">Danh mục <span class="text-rose-400">*</span></label><div class="relative"><input id="catInput" class="inp pr-9" role="combobox" aria-expanded="false" autocomplete="off" value="${esc(b.category)}" placeholder="Chọn hoặc tìm danh mục..." />${icon('caret-down', 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-muted')}</div><div id="catList" role="listbox" class="pop-in absolute z-20 mt-1.5 hidden max-h-60 w-full overflow-auto rounded-xl border border-surface-border bg-surface-card p-1 shadow-2xl shadow-black/50"></div></div>
        ${field({ label: 'Thẻ tag', bind: 'tag', value: b.tag, placeholder: 'Ví dụ: Quant, Backtest, AI...' })}
        <p class="hint rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 md:col-span-2">${E.edit ? `Đường dẫn: <span class="font-mono text-content-secondary">/${esc(DB.blogs.get(E.id).slug)}</span>` : 'Đường dẫn sẽ được tạo tự động khi lưu bài.'}</p></div>`);
      const bar = E.edit
        ? `<div class="flex items-center gap-2 text-xs"><span class="font-semibold">Chỉnh sửa bài viết</span><span class="hidden text-content-muted sm:inline">Thay đổi chỉ được áp dụng sau khi lưu.</span></div><div class="flex items-center gap-3"><a href="#/blog/detail/${E.id}" class="btn btn-secondary">${icon('x')}Đóng</a><button data-act="save-edit" data-needs-valid class="btn btn-primary" ${!valid() ? 'disabled' : ''}>${icon('floppy-disk')}Lưu thay đổi</button></div>`
        : `<div class="flex items-center gap-2 text-xs"><span id="barState" class="font-semibold">${valid() ? 'Bài viết đã sẵn sàng' : 'Đang soạn thảo bài viết'}</span><span class="hidden text-content-muted sm:inline">Lưu chờ duyệt hoặc đăng ngay lên website.</span></div><div class="flex flex-wrap items-center gap-3"><button data-act="save-pending" data-needs-valid class="btn btn-secondary" ${!valid() ? 'disabled' : ''}>${icon('floppy-disk')}Lưu chờ duyệt</button><button data-act="save-publish" data-needs-valid class="btn btn-primary" ${!valid() ? 'disabled' : ''}>${icon('paper-plane-tilt')}Lưu và đăng</button></div>`;
      return `<div class="space-y-6 pb-28">${pageHeader({ title: E.edit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới', desc: E.edit ? `Cập nhật nội dung, ảnh bìa và SEO. Lần cuối: ${fmtDateTime(DB.blogs.get(E.id).modified_at)}` : 'Soạn thảo bài viết mới hoặc tạo nhanh bản nháp thông minh bằng trợ lý AI', actions: E.edit ? badge(DB.blogs.get(E.id).state) : '' })}${src}${basic}${bannerCard()}${editorCard()}${seoCard()}</div>
      <div class="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border bg-surface-base/85 backdrop-blur-xl lg:left-60"><div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">${bar}</div></div>`;
    },
    // Attach combobox listeners after each paint.
    mount() {
      const i = $('#catInput'); if (!i) return;
      i.addEventListener('focus', () => { E.catOpen = true; E.catSearch = ''; i.select(); i.setAttribute('aria-expanded', 'true'); renderCat(); });
      i.addEventListener('input', () => { E.catOpen = true; E.catSearch = i.value; E.catActive = -1; renderCat(); });
      i.addEventListener('blur', () => { E.catOpen = false; E.catSearch = ''; i.value = E.b.category; i.setAttribute('aria-expanded', 'false'); renderCat(); });
      i.addEventListener('keydown', (e) => {
        const opts = $$('#catList [data-act="cat-pick"]');
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); E.catOpen = true; if (opts.length) E.catActive = (E.catActive + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; renderCat(); }
        else if (e.key === 'Enter') { e.preventDefault(); const t = E.catActive >= 0 ? opts[E.catActive] : $('#catList [data-act="cat-create"]'); if (t) t.dataset.act === 'cat-create' ? createCat(t.dataset.name) : pickCat(t.dataset.name); }
        else if (e.key === 'Escape') { e.stopPropagation(); i.blur(); }
      });
      $('#catList').addEventListener('mousedown', (e) => e.preventDefault());
    },
    // Update state from form inputs without re-rendering.
    input(bind, val) {
      const b = E.b; E.dirty = true;
      if (bind === 'title') { if (!b.seo.title || b.seo.title === b.title) b.seo.title = val; b.title = val; }
      else if (bind === 'tag') b.tag = val;
      else if (bind === 'content') { b.content = val; const pv = $('#mdPreview'); if (pv) pv.innerHTML = val ? md(val) : ''; }
      else if (bind === 'seo.title') b.seo.title = val;
      else if (bind === 'seo.description') b.seo.description = val;
      else if (bind === 'seo.keywords') b.seo.keywords = val.split(',').map((v) => v.trim()).filter(Boolean);
      else if (bind === 'seo.author') b.seo.author = val;
      else if (bind === 'lang') E.lang = val;
      else if (bind === 'prompt') E.prompt = val;
      else if (bind === 'px') E.px = val;
      syncBar();
    },
    changes: {
      // Read the selected banner file into an object URL.
      'banner-file'(el) {
        const f = el.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) { toast('Ảnh vượt quá 5MB.', { type: 'error' }); return; }
        E.b.banner_url = URL.createObjectURL(f); E.dirty = true; Router.repaint(); toast('Đã chọn ảnh bìa.');
      },
    },
    actions: {
      src(el) { E.source = el.dataset.v; Router.repaint(); },
      'ed-mode'(el) { E.edMode = el.dataset.v; Router.repaint(); },
      'md-tool'(el) { applyTool(el.dataset.tool); },
      'cat-pick'(el) { pickCat(el.dataset.name); },
      'cat-create'(el) { createCat(el.dataset.name); },
      'ai-draft'() {
        if (E.b.content.trim()) confirmDialog({ title: 'Ghi đè nội dung bằng AI?', message: 'Nội dung bài viết hiện tại sẽ bị thay thế bằng bản nháp mới do AI sinh ra. Bạn có chắc chắn muốn tiếp tục?', confirmLabel: 'Tiếp tục tạo lại', onConfirm: runDraft });
        else runDraft();
      },
      'seo-toggle'(el, e) { if (e.target.closest('.switch') || e.currentTarget) { E.seoOpen = !E.seoOpen; Router.repaint(); } },
      'seo-ai'(el, e) {
        e.stopPropagation();
        if (E.b.seo.description.trim() || E.b.seo.keywords.length) confirmDialog({ title: 'Tạo lại SEO bằng AI?', message: 'Mô tả và từ khóa SEO hiện tại sẽ được thay thế. Nội dung bài viết, tiêu đề SEO, URL và tác giả được giữ nguyên.', confirmLabel: 'Tạo SEO', onConfirm: runSeo });
        else runSeo();
      },
      'banner-tab'(el) { E.bannerTab = el.dataset.v; Router.repaint(); },
      'banner-clear'() { E.b.banner_url = ''; Router.repaint(); },
      async 'banner-ai'() { E.busy.banner = true; Router.repaint(); E.b.banner_url = await AI.image(E.prompt || E.b.title || 'banner'); E.busy.banner = false; Router.repaint(); toast('Đã tạo ảnh bìa bằng AI.'); },
      async 'banner-search'() { E.busy.banner = true; Router.repaint(); E.candidates = await AI.pexels(E.px || E.b.category || 'finance'); E.busy.banner = false; Router.repaint(); },
      'banner-pick'(el) { E.b.banner_url = E.candidates[Number(el.dataset.i)].imageUrl; E.dirty = true; Router.repaint(); toast('Đã dùng ảnh làm ảnh bìa.'); },
      'save-pending'() { if (valid()) saveNew('PENDING'); },
      'save-publish'() { if (valid()) confirmDialog({ title: 'Lưu và đăng bài lên website?', message: 'Bài viết sẽ được lưu, duyệt và hiển thị công khai trên website ngay. Thao tác này không đăng lên LinkedIn.', confirmLabel: 'Lưu và đăng', onConfirm: () => saveNew('APPROVED') }); },
      'save-edit'() {
        if (!valid()) return; const b = E.b;
        DB.blogs.update(E.id, { title: b.title.trim(), tag: b.tag.trim(), category: b.category, banner_url: b.banner_url, content: b.content, seo: b.seo });
        E.dirty = false; toast('Đã lưu thay đổi bài viết.'); Router.repaint();
      },
    },
  };
  // Create a category inline and select it.
  function createCat(name) {
    try { const c = DB.categories.create(name); toast(`Đã tạo danh mục "${c.name}".`); pickCat(c.name); } catch (err) { toast(err.message, { type: 'error' }); }
  }
  Pages.blogCreate = Object.assign({}, editorPage);
  Pages.blogEdit = Object.assign({}, editorPage, { nav: 'blog' });

  /* ---------- Research tools ---------- */
  let R = null;
  const RB = { id: (x) => document.getElementById(x) };
  // Enable or disable research buttons based on input values.
  function syncResearch() {
    const set = (id, v) => { const el = $('#' + id); if (el) el.disabled = !v; };
    set('rTitles', R.keyword.trim() && !R.busy.titles); set('rRefs', R.keyword.trim() && !R.busy.refs);
    set('rClassify', R.links.trim() && !R.busy.classify); set('rFetch', R.url.trim() && !R.busy.fetch);
  }
  Pages.research = {
    nav: 'research', wide: 'max-w-4xl', crumb: 'Nội dung <span class="mx-1.5">/</span> Nguồn tham khảo',
    init() { R = { keyword: '', lang: 'vietnamese', titles: [], refs: [], links: '', classified: [], url: '', fetched: null, busy: {} }; },
    // Render the three research panels.
    view() {
      const tagCls = { NORMAL: 'chip', ADS: 'chip !border-amber-500/30 !bg-amber-950/40 !text-amber-300', SPAM: 'chip !border-rose-500/30 !bg-rose-950/40 !text-rose-300' };
      const catCls = { organic: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30', ad: 'bg-amber-950/40 text-amber-400 border-amber-500/30', spam: 'bg-rose-950/40 text-rose-400 border-rose-500/30', duplicate: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
      const catLbl = { organic: 'Tự nhiên', ad: 'Quảng cáo', spam: 'Rác', duplicate: 'Trùng lặp' };
      const sum = (title, inner) => `<details open class="group rounded-xl border border-surface-border bg-surface-elevated"><summary class="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">${title}${icon('caret-down', 'text-content-muted transition-transform duration-300 group-open:rotate-180')}</summary><div class="space-y-3 px-4 pb-4">${inner}</div></details>`;
      const fetched = R.fetched ? (R.fetched.success ? `<div class="rounded-lg border border-surface-border bg-surface-card p-4 text-xs"><strong class="text-sm">${esc(R.fetched.title)}</strong><p class="mt-1 text-content-muted">${esc(R.fetched.author)} · ${esc(R.fetched.language)} · ${esc(R.fetched.published_date)}</p><p class="mt-3 leading-relaxed text-content-secondary">${esc(R.fetched.text_content)}</p></div>` : `<p class="text-xs text-rose-400">${esc(R.fetched.error_message)}</p>`) : '';
      return `${pageHeader({ title: 'Tìm nguồn tham khảo', desc: 'Gợi ý tiêu đề, tìm kiếm, phân loại và trích xuất nguồn cho bài viết.' })}
      <div class="bezel"><div class="bezel-core space-y-3 p-4">
        ${sum('Gợi ý tiêu đề và tìm nguồn', `<div class="flex flex-col gap-2 sm:flex-row"><input class="inp min-w-0 flex-1" data-bind="keyword" value="${esc(R.keyword)}" placeholder="Từ khóa hoặc chủ đề..." /><select class="inp sm !h-[2.5rem] !w-auto" data-bind="lang"><option value="vietnamese">Tiếng Việt</option><option value="english" ${R.lang === 'english' ? 'selected' : ''}>English</option></select>
          <button id="rTitles" data-act="titles" class="btn btn-secondary !h-[2.5rem]" disabled>${R.busy.titles ? spinner() : icon('lightbulb')}Gợi ý tiêu đề</button><button id="rRefs" data-act="refs" class="btn btn-secondary !h-[2.5rem]" disabled>${R.busy.refs ? spinner() : icon('magnifying-glass')}Tìm nguồn</button></div>
          ${R.titles.length ? `<div class="flex flex-wrap gap-2">${R.titles.map((t, i) => `<span class="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/20 py-1 pl-3 pr-1 text-xs text-purple-200">${esc(t)}<button data-act="use-title" data-i="${i}" class="rounded-md bg-purple-500/20 px-2 py-1 text-[11px] font-semibold hover:bg-purple-500/30">Tạo bài</button></span>`).join('')}</div>` : ''}
          ${R.refs.length ? `<div class="space-y-2">${R.refs.map((r) => `<article class="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card p-3 text-xs"><div class="min-w-0 flex-1"><a href="${esc(r.url)}" target="_blank" rel="noreferrer" class="font-medium text-cyan-400 hover:underline">${esc(r.title)}</a><p class="mt-1 truncate text-content-muted">${esc(r.url)}</p></div><span class="${tagCls[r.tag]}">${r.tag === 'NORMAL' ? 'Bình thường' : r.tag === 'ADS' ? 'Quảng cáo' : 'Rác'}</span><button data-act="queue" data-url="${esc(r.url)}" class="btn btn-secondary !h-8">${icon('plus', 'text-sm')}Thêm</button></article>`).join('')}</div>` : ''}`)}
        ${sum('Phân loại liên kết', `<div class="flex items-start gap-2"><textarea rows="4" class="inp min-w-0 flex-1" data-bind="links" placeholder="Mỗi URL một dòng...">${esc(R.links)}</textarea><button id="rClassify" data-act="classify" class="btn btn-secondary !h-[2.5rem]" disabled>${R.busy.classify ? spinner() : icon('funnel')}Phân loại</button></div>
          ${R.classified.length ? `<div class="space-y-2">${R.classified.map((c) => `<div class="rounded-lg border border-surface-border bg-surface-card p-3 text-xs"><div class="flex items-center justify-between gap-3"><p class="truncate text-content-secondary">${esc(c.url)}</p><span class="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-medium ${catCls[c.category]}">${catLbl[c.category]} ${Math.round(c.confidence * 100)}%</span></div><p class="mt-1.5 text-content-muted">${esc(c.reason)}</p></div>`).join('')}</div>` : ''}`)}
        ${sum('Trích xuất nội dung từ URL', `<div class="flex gap-2"><input class="inp min-w-0 flex-1" data-bind="url" value="${esc(R.url)}" placeholder="https://example.com/article" /><button id="rFetch" data-act="fetch" class="btn btn-secondary !h-[2.5rem]" disabled>${R.busy.fetch ? spinner() : icon('download-simple')}Trích xuất</button></div>${fetched}`)}
      </div></div>`;
    },
    mount() { syncResearch(); },
    input(bind, val) { const m = { keyword: 'keyword', lang: 'lang', links: 'links', url: 'url' }; R[m[bind]] = val; syncResearch(); },
    actions: {
      async titles() { R.busy.titles = true; Router.repaint(); R.titles = await AI.titles(R.keyword.trim()); R.busy.titles = false; Router.repaint(); },
      async refs() { R.busy.refs = true; Router.repaint(); R.refs = await AI.references(R.keyword.trim()); R.busy.refs = false; Router.repaint(); },
      async classify() { R.busy.classify = true; Router.repaint(); R.classified = await AI.classify(R.links.split(/\s+/).filter(Boolean)); R.busy.classify = false; Router.repaint(); },
      async fetch() { R.busy.fetch = true; Router.repaint(); R.fetched = await AI.fetchContent(R.url.trim()); R.busy.fetch = false; Router.repaint(); if (!R.fetched.success) toast(R.fetched.error_message, { type: 'error' }); },
      // Queue a reference URL for classification without duplicates.
      queue(el) { const u = R.links.split(/\s+/).filter(Boolean); if (!u.includes(el.dataset.url)) { R.links = [...u, el.dataset.url].join('\n'); toast('Đã thêm vào danh sách phân loại.'); Router.repaint(); } },
      'use-title'(el) { sessionStorage.setItem('vq-prefill-title', R.titles[Number(el.dataset.i)]); Router.go('/blog/create-blog'); },
    },
  };

  /* ---------- Public preview ---------- */
  const P = { cat: 'ALL', shown: 6 };
  // Open the reader modal for one article.
  function readArticle(id) {
    const b = DB.blogs.get(id); if (!b) return;
    const related = DB.blogs.all().filter((x) => x.state === 'APPROVED' && x.id !== id && x.category === b.category).slice(0, 3);
    openModal(`<div class="mb-5 flex items-center justify-between"><button data-act="modal-close" class="btn btn-secondary" data-autofocus>${icon('arrow-left')}Đóng xem trước</button><span class="chip">${icon('globe', 'text-xs')}Giao diện khách truy cập</span></div>
      <article class="space-y-5"><span class="inline-block rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">${esc(b.category)}</span><h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">${esc(b.title)}</h1><p class="text-xs text-content-muted">${esc(b.seo.author)} · ${fmtDate(b.modified_at)}</p>
      ${b.banner_url ? `<div class="relative h-48 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated sm:h-72"><img src="${esc(b.banner_url)}" alt="" class="h-full w-full object-cover" onerror="this.parentNode.remove()" /></div>` : ''}<div class="prose-vq">${md(b.content)}</div></article>
      ${related.length ? `<div class="mt-8 border-t border-surface-border pt-5"><h3 class="mb-3 text-sm font-semibold">Bài viết liên quan</h3><div class="grid gap-3 sm:grid-cols-3">${related.map((r) => `<button data-act="read" data-id="${r.id}" class="rounded-xl border border-surface-border bg-surface-elevated p-3 text-left text-xs font-medium transition-colors hover:border-primary-green/40"><span class="line-clamp-3">${esc(r.title)}</span></button>`).join('')}</div></div>` : ''}`, { size: 'max-w-3xl', label: b.title });
  }
  Pages.publicPreview = {
    nav: 'preview', crumb: 'Nội dung <span class="mx-1.5">/</span> Xem như công khai',
    // Render the visitor-facing article grid.
    view() {
      const list = DB.blogs.all().filter((b) => b.state === 'APPROVED' && (P.cat === 'ALL' || b.category === P.cat)).sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
      const cats = DB.categories.all();
      const cards = list.slice(0, P.shown).map((b, i) => `<button data-act="read" data-id="${b.id}" aria-label="Đọc bài ${esc(b.title)}" class="row-in group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card text-left transition-all duration-500 ease-fluid hover:-translate-y-0.5 hover:border-primary-green/40 hover:shadow-xl hover:shadow-black/30 focus-ring" style="--i:${i}">
        <div class="p-3 pb-0">${thumb(b.banner_url, b.title, 'h-44 w-full !rounded-xl')}</div>
        <div class="flex flex-1 flex-col justify-between gap-4 p-5"><div class="space-y-2"><span class="inline-block rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">${esc(b.category || 'Bài viết')}</span><h3 class="line-clamp-2 text-base font-bold transition-colors group-hover:text-primary-green">${esc(b.title)}</h3><p class="line-clamp-2 text-xs leading-relaxed text-content-muted">${esc(b.seo.description)}</p></div>
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-green">Đọc bài${icon('arrow-right', 'transition-transform duration-500 ease-fluid group-hover:translate-x-1')}</span></div></button>`).join('');
      return `${pageHeader({ title: 'Xem như công khai', desc: 'Dữ liệu đúng như khách truy cập thấy: chỉ các bài đã duyệt, không cần đăng nhập.', actions: `<select data-change="pcat" class="inp sm !w-auto" aria-label="Danh mục"><option value="ALL">Tất cả danh mục</option>${cats.map((c) => `<option ${P.cat === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` })}
      ${list.length ? `<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">${cards}</div>${list.length > P.shown ? `<div class="mt-8 flex justify-center"><button data-act="more" class="btn btn-secondary lg">Xem thêm bài viết</button></div>` : ''}` : `<div class="bezel"><div class="bezel-core">${emptyState({ title: 'Chưa có bài viết công khai nào', desc: 'Các bài viết sau khi được duyệt sẽ hiển thị trên giao diện này cho khách truy cập.' })}</div></div>`}`;
    },
    changes: { pcat(el) { P.cat = el.value; P.shown = 6; Router.repaint(); } },
    actions: { read(el) { closeModal(); readArticle(el.dataset.id); }, more() { P.shown += 6; Router.repaint(); } },
  };
})();
