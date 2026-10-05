/* App shell: hash router, sidebar layout, login page and global event delegation. */
(function () {
  const { esc, icon, $, $$, toast, closeModal, runConfirm, spinner } = UI;
  const Pages = (window.Pages = {});

  const ROUTES = [
    [/^\/login$/, 'login'], [/^\/blog$/, 'blogList'], [/^\/blog\/create-blog$/, 'blogCreate'],
    [/^\/blog\/default\/([^/]+)$/, 'blogEdit'], [/^\/blog\/detail\/([^/]+)$/, 'blogDetail'],
    [/^\/blog\/research$/, 'research'], [/^\/blog\/preview$/, 'publicPreview'], [/^\/categories$/, 'categories'],
    [/^\/publications$/, 'publications'], [/^\/publications\/([^/]+)$/, 'publicationConfig'],
    [/^\/linkedin$/, 'linkedinList'], [/^\/linkedin\/new$/, 'linkedinEditor'], [/^\/linkedin\/posts\/([^/]+)$/, 'linkedinEditor'],
  ];
  const NAV = [
    ['Nội dung', [['blog', '/blog', 'article', 'Quản lý bài viết'], ['create', '/blog/create-blog', 'plus-circle', 'Tạo bài viết'], ['research', '/blog/research', 'binoculars', 'Tìm nguồn tham khảo'], ['preview', '/blog/preview', 'eye', 'Xem như công khai'], ['categories', '/categories', 'tag', 'Danh mục']]],
    ['Phân phối', [['publications', '/publications', 'paper-plane-tilt', 'Xuất bản bài viết'], ['linkedin', '/linkedin', 'linkedin-logo', 'Quản lý LinkedIn']]],
  ];

  const Router = (window.Router = { page: null, name: null, params: [], shell: false });
  // Navigate to a path by changing the hash.
  Router.go = (path) => { if (location.hash === '#' + path) render(); else location.hash = '#' + path; };

  // Parse the current hash into a route name and params.
  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    for (const [re, name] of ROUTES) { const m = re.exec(h); if (m) return { name, params: m.slice(1) }; }
    return { name: null, params: [] };
  }

  // Build the authenticated shell (sidebar, top bar, view container).
  function shellHtml() {
    const links = NAV.map(([group, items]) => `<div class="space-y-1.5"><p class="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-content-muted">${group}</p>${items.map(([key, to, ic, label]) => `<a href="#${to}" data-nav="${key}" class="nav-link focus-ring">${icon(ic, 'text-xl shrink-0')}<span class="flex-1 truncate">${label}</span>${key === 'blog' ? '<span id="navPending" class="hidden rounded-full bg-primary-green px-1.5 py-px text-[10px] font-bold text-primary-black"></span>' : ''}</a>`).join('')}</div>`).join('');
    return `<div id="backdrop" data-act="nav-close" class="pointer-events-none fixed inset-0 z-30 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity duration-500 ease-fluid lg:hidden"></div>
    <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-surface-border bg-surface-card p-4 transition-transform duration-500 ease-fluid lg:w-60 lg:translate-x-0">
      <div class="flex items-center justify-between px-2 pb-5"><img src="../../public/logo.png" alt="VietQuant" class="h-9 w-auto object-contain" /><button data-act="nav-close" class="iconbtn focus-ring lg:hidden" aria-label="Đóng menu">${icon('x', 'text-xl')}</button></div>
      <nav class="scrollbar-hidden flex-1 space-y-6 overflow-y-auto" aria-label="Điều hướng chính">${links}</nav>
      <button data-act="logout" class="nav-link focus-ring mt-4 w-full">${icon('sign-out', 'text-xl')}<span>Đăng xuất</span></button>
    </aside>
    <div class="page-glow min-h-[100dvh] lg:pl-60">
      <header class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-surface-border bg-surface-base/80 px-4 backdrop-blur-xl sm:px-8">
        <button data-act="nav-open" class="iconbtn focus-ring lg:hidden !border-surface-border" aria-label="Mở menu">${icon('list', 'text-xl')}</button>
        <p id="crumb" class="truncate text-xs text-content-muted"></p>
        <div class="relative ml-auto"><button data-act="user-menu" class="focus-ring grid h-8 w-8 place-items-center rounded-full border border-surface-border bg-surface-elevated text-[11px] font-semibold text-content-secondary transition-colors hover:border-primary-green/40" aria-label="Tài khoản">PH</button>
          <div id="userMenu" class="pop-in absolute right-0 top-11 hidden w-60 rounded-xl border border-surface-border bg-surface-card p-1.5 shadow-2xl shadow-black/50">
            <div class="px-3 py-2"><p class="text-sm font-medium">Quản trị viên</p><p class="text-xs text-content-muted">admin@vietquant.vn</p></div>
            <button data-act="reset-data" class="nav-link w-full !py-2 text-xs">${icon('arrow-counter-clockwise', 'text-base')}Đặt lại dữ liệu mẫu</button>
            <button data-act="logout" class="nav-link w-full !py-2 text-xs">${icon('sign-out', 'text-base')}Đăng xuất</button></div></div>
      </header>
      <main id="view" class="mx-auto px-4 py-8 sm:px-8 sm:py-10"></main>
    </div><div id="toasts" class="fixed bottom-5 right-5 z-[60] flex flex-col gap-2" aria-live="polite"></div>`;
  }

  // Update sidebar active state, pending badge and breadcrumb for the current page.
  function syncShell() {
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === Router.page.nav));
    const n = DB.blogs.counts().PENDING, b = $('#navPending');
    if (b) { b.textContent = n; b.classList.toggle('hidden', n === 0); }
    $('#crumb').innerHTML = Router.page.crumb || '';
    $('#view').className = `mx-auto px-4 py-8 sm:px-8 sm:py-10 ${Router.page.wide || 'max-w-6xl'}`;
    setNav(false);
  }

  // Paint the active page into the view; optionally keep the scroll position.
  function paint(keepScroll) {
    const y = window.scrollY, page = Router.page;
    if (page.standalone) { $('#app').innerHTML = page.view(); } else { $('#view').innerHTML = `<div class="${keepScroll ? '' : 'view-in'}">${page.view()}</div>`; syncShell(); }
    if (page.mount) page.mount();
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  }
  Router.repaint = () => paint(true);

  // Resolve the route, guard authentication and render the page.
  function render() {
    const { name, params } = parse();
    if (!DB.session && name !== 'login') return Router.go('/login');
    if (DB.session && (name === 'login' || !name)) return Router.go('/blog');
    $$('.modal-wrap').forEach((m) => m.remove());
    const page = Pages[name];
    Router.page = page; Router.name = name; Router.params = params;
    if (!page.standalone && !Router.shell) { $('#app').innerHTML = shellHtml(); Router.shell = true; }
    if (page.standalone) Router.shell = false;
    if (page.init) page.init(...params);
    paint(false);
  }

  // Open or close the mobile navigation drawer.
  function setNav(open) {
    const s = $('#sidebar'), b = $('#backdrop'); if (!s) return;
    s.classList.toggle('-translate-x-full', !open);
    b.classList.toggle('opacity-0', !open); b.classList.toggle('pointer-events-none', !open);
  }

  /* Login page (standalone, no shell). */
  let loginState = { busy: false, errors: {}, user: '', pass: '' };
  Pages.login = {
    standalone: true,
    init() { loginState = { busy: false, errors: {}, user: '', pass: '' }; },
    // Render the centered login card.
    view() {
      const e = loginState.errors;
      const f = (id, label, type, ph, val) => `<div><label for="${id}" class="label !text-sm">${label}</label><input id="${id}" data-bind="${id}" type="${type}" value="${esc(val)}" placeholder="${ph}" autocomplete="${id === 'user' ? 'username' : 'current-password'}" class="inp ${e[id] ? 'err' : ''}" aria-invalid="${!!e[id]}" />${e[id] ? `<span class="mt-1.5 block text-xs text-rose-400">${e[id]}</span>` : ''}</div>`;
      return `<div class="page-glow grid min-h-[100dvh] place-items-center px-4 py-12"><div class="view-in flex w-full max-w-md flex-col items-center">
        <img src="../../public/logo.png" alt="VietQuant" class="mb-8 h-16 w-auto object-contain" />
        <div class="bezel w-full"><div class="bezel-core p-7 sm:p-8">
          <div class="mb-6 text-center"><h1 class="text-2xl font-bold tracking-tight">Đăng nhập hệ thống</h1><p class="mt-1.5 text-sm text-content-muted">Hệ thống quản trị nội dung CMS VietQuant</p></div>
          <form data-submit="login" class="space-y-5" novalidate>${f('user', 'Tên đăng nhập', 'text', 'Nhập tên đăng nhập', loginState.user)}${f('pass', 'Mật khẩu', 'password', 'Nhập mật khẩu', loginState.pass)}
            <button type="submit" class="btn btn-primary lg w-full" ${loginState.busy ? 'disabled' : ''}>${loginState.busy ? spinner() : ''}${loginState.busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button></form>
        </div></div>
        <p class="mt-5 text-xs text-content-muted">Bản thử giao diện: nhập bất kỳ tên đăng nhập và mật khẩu.</p></div></div>`;
    },
    // Keep typed values in state without re-rendering.
    input(bind, val) { loginState[bind] = val; },
    submits: {
      // Validate and simulate sign-in.
      login() {
        const errors = {};
        if (!loginState.user.trim()) errors.user = 'Tên đăng nhập là bắt buộc';
        if (!loginState.pass) errors.pass = 'Mật khẩu là bắt buộc';
        loginState.errors = errors;
        if (Object.keys(errors).length) { paint(true); return; }
        loginState.busy = true; paint(true);
        setTimeout(() => { DB.session = true; Router.go('/blog'); setTimeout(() => toast('Đăng nhập thành công'), 80); }, 800);
      },
    },
  };

  /* Core actions available on every page. */
  const CORE = {
    'modal-close': () => closeModal(),
    'confirm-ok': () => runConfirm(),
    'nav-open': () => setNav(true),
    'nav-close': () => setNav(false),
    'user-menu': () => $('#userMenu').classList.toggle('hidden'),
    logout() { DB.session = false; Router.go('/login'); },
    'reset-data'() { DB.reset(); $('#userMenu').classList.add('hidden'); toast('Đã đặt lại dữ liệu mẫu.', { type: 'info' }); render(); },
  };

  document.addEventListener('click', (e) => {
    const um = $('#userMenu');
    if (um && !e.target.closest('[data-act="user-menu"]') && !e.target.closest('#userMenu')) um.classList.add('hidden');
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const p = Router.page, fn = (p && p.actions && p.actions[el.dataset.act]) || CORE[el.dataset.act];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]'); if (!el) return;
    const p = Router.page, fn = p && p.changes && p.changes[el.dataset.change];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-bind]'); if (!el) return;
    const p = Router.page; if (p && p.input) p.input(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value, el, e);
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-submit]'); if (!f) return;
    e.preventDefault();
    const p = Router.page, fn = p && p.submits && p.submits[f.dataset.submit];
    if (fn) fn(f, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if ($$('.modal-wrap').length) closeModal(); else setNav(false); }
    const p = Router.page; if (p && p.keydown) p.keydown(e);
  });
  window.addEventListener('hashchange', render);

  // Start the app once all page modules have registered.
  window.startApp = () => render();
})();
