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
    const links = NAV.map(([group, items]) => `<div class="nav-g">${group}</div>${items.map(([key, to, ic, label]) => `<a href="#${to}" data-nav="${key}" class="focus-ring">${icon(ic)}<span class="flex-1 truncate">${label}</span>${key === 'blog' ? '<span id="navPending" class="count mono" hidden></span>' : ''}</a>`).join('')}`).join('');
    return `<div class="app">
      <aside class="side" id="sidebar" aria-label="Điều hướng chính">
        <div class="brand"><span class="brand-mark" aria-hidden="true">VQ</span><div><b>VietQuant</b><small>Admin</small></div><button data-act="nav-close" class="iconbtn focus-ring ml-auto lg:hidden" aria-label="Đóng menu">${icon('x', 'text-lg')}</button></div>
        <nav class="nav">${links}</nav>
        <div class="side-foot"><span class="dot" aria-hidden="true"></span><span>Dữ liệu mẫu (localStorage)</span></div>
      </aside>
      <div class="scrim" id="backdrop" data-act="nav-close"></div>
      <div class="min-w-0">
        <header class="top">
          <button data-act="nav-open" class="iconbtn menu-btn focus-ring" aria-label="Mở menu">${icon('list', 'text-xl')}</button>
          <div id="crumb" class="crumb"></div>
          <div class="top-r">
            <span class="chip hide-m">${icon('flask')}Bản thiết kế thử</span>
            <div class="relative"><button data-act="user-menu" class="avatar focus-ring" aria-label="Menu tài khoản" aria-haspopup="true">AD</button>
              <div id="userMenu" class="pop-in absolute right-0 top-10 z-50 hidden w-60 rounded-lg border border-[#475569] bg-surface-card p-1.5 shadow-2xl shadow-black/50">
                <div class="px-3 py-2"><p class="text-sm font-medium">Quản trị viên</p><p class="text-xs text-content-muted">admin@vietquant.vn</p></div>
                <button data-act="reset-data" class="nav-link w-full">${icon('arrow-counter-clockwise', 'text-base')}Đặt lại dữ liệu mẫu</button>
                <button data-act="logout" class="nav-link w-full">${icon('sign-out', 'text-base')}Đăng xuất</button></div></div>
          </div>
        </header>
        <main id="view"></main>
      </div>
    </div><div id="toasts" class="fixed bottom-4 left-4 z-[60] flex flex-col gap-2" aria-live="polite"></div>`;
  }

  // Update sidebar active state, pending badge and breadcrumb for the current page.
  function syncShell() {
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === Router.page.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const n = DB.blogs.counts().PENDING, b = $('#navPending');
    if (b) { b.textContent = n; b.hidden = n === 0; }
    $('#crumb').innerHTML = Router.page.crumb || '';
    $('#view').className = Router.page.wide || '';
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
  function setNav(open) { document.body.classList.toggle('nav-open', open); }

  /* Login page (standalone, no shell). */
  let loginState = { busy: false, errors: {}, user: '', pass: '' };
  Pages.login = {
    standalone: true,
    init() { loginState = { busy: false, errors: {}, user: '', pass: '' }; },
    // Render the centered login card.
    view() {
      const e = loginState.errors;
      const f = (id, label, type, ph, val) => `<div><label for="${id}" class="label !text-sm">${label}</label><input id="${id}" data-bind="${id}" type="${type}" value="${esc(val)}" placeholder="${ph}" autocomplete="${id === 'user' ? 'username' : 'current-password'}" class="inp ${e[id] ? 'err' : ''}" aria-invalid="${!!e[id]}" />${e[id] ? `<span class="mt-1.5 block text-xs text-rose-400">${e[id]}</span>` : ''}</div>`;
      return `<div class="grid min-h-[100dvh] place-items-center px-4 py-12"><div class="view-in flex w-full max-w-md flex-col items-center">
        <img src="../../public/logo.png" alt="VietQuant" class="mb-8 h-16 w-auto object-contain" />
        <div class="bezel w-full"><div class="bezel-core p-6">
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
