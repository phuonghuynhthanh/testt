const assert = require('node:assert/strict');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { checkContrast } = require('./contrast-check.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Run against the local Vite server; optionally set PLAYWRIGHT_MODULE to the bundled runtime.

// Exercise the real UI against isolated API fixtures; no provider request leaves the browser.
async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'msedge' });
  try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const origin = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5175';
  await context.addCookies([{ name: 'authSession', value: encodeURIComponent(JSON.stringify({ accessToken: 'mock-only' })), url: origin }]);
  const page = await context.newPage();
  const calls = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let sourceState = 'APPROVED';
  let failPublish = false;
  let failSeo = false;
  let failCategory = false;
  const categories = [{ id: 'quant', name: 'Quant' }];
  const blog = { id: 'source', title: 'Bài website mẫu', category: 'Quant', tag: '', content: 'Nội dung website\n\n[Liên kết mẫu](https://example.test)\n\n![Ảnh](https://example.test/images/banner.png "Chú thích ảnh mẫu")\n\n```unknown\nMã mẫu\n```\n\n```js\n// Chú thích mã\nconst value = "Ví dụ";\n```', link_post: 'bai-mau', banner_url: 'images/banner.png', state: 'APPROVED', seo: { title: 'Bài mẫu', description: '', author: 'VietQuant', keywords: [], url: '' } };
  const standalone = { id: 'standalone', topic: 'Bài LinkedIn mẫu', content: 'Nội dung LinkedIn mẫu', sourceType: 'CUSTOM', status: 'READY', mediaMode: 'none', media: [], factCheck: { requiresHumanFactCheck: false, factCheckNotes: [] }, generation: {}, modifiedAt: '2026-10-01T10:00:00Z' };
  blog.content += '\n\n## Tiêu đề mục\nNội dung dưới tiêu đề';
  let pub = { id: 'publication', blogId: 'source', publishWeb: false, publishLinkedin: false, linkedinMode: 'CUSTOM', linkedinContent: null, linkedinIncludeWebLink: false, linkedinStatus: 'NOT_SELECTED', linkedinMediaMode: 'none', linkedinMedia: [], linkedinFactCheck: null, linkedinGenerated: null, linkedinError: null };
  const image = { provider: 'pexels', providerId: 'image-1', sourceUrl: 'https://example.test/image', imageUrl: 'https://example.test/image.png', photographer: 'Mock', attribution: 'Mock image', altText: 'Ảnh mẫu', order: 1 };
  // Fulfill every API operation locally and block unrelated external traffic.
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    // Let browser navigation load the SPA, even when a page path resembles an API path.
    if (url.origin === origin && method === 'GET' && request.resourceType() === 'document') return route.continue();
    let data;
    let status = 200;
    if (path.endsWith('/images/banner.png')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==', 'base64') });
    } else if (path.endsWith('/linkedin/posts') && method === 'GET') {
      data = { items: [standalone], page: 1, pageSize: 20, total: 1, totalPages: 1 };
    } else if (path.endsWith('/linkedin/posts/standalone')) {
      data = standalone;
    } else if (path.includes('/publications/blogs/source')) {
      const body = request.postDataJSON();
      calls.push({ path, method, body });
      if (method === 'PUT') {
        pub = { ...pub, ...body };
        data = pub;
      } else if (path.endsWith('/linkedin/draft')) {
        assert.equal(body.includeWebLink, false, 'Generated text must not embed a stale canonical link');
        data = { content: 'Bản chuyển từ website', media: { mode: 'none', images: [] }, factualReview: { requiresHumanFactCheck: false, factCheckNotes: [] }, generated: {} };
      } else if (path.endsWith('/media/suggest')) {
        data = { items: [image] };
      } else if (path.endsWith('/linkedin/retry')) {
        pub = { ...pub, linkedinStatus: 'PUBLISHED', linkedinError: null };
        data = pub;
      } else if (method === 'POST' && path.endsWith('/linkedin')) {
        pub = { ...pub, linkedinMode: body.mode, linkedinContent: body.content, linkedinMedia: body.media, linkedinMediaMode: body.media.length > 1 ? 'multi-image' : body.media.length ? 'single-image' : 'none', linkedinIncludeWebLink: body.includeWebLink, linkedinFactCheck: body.factCheck, linkedinGenerated: body.generation, linkedinStatus: body.action === 'SAVE_DRAFT' ? 'READY' : failPublish ? 'FAILED' : 'PUBLISHED', linkedinError: failPublish && body.action === 'PUBLISH_NOW' ? { message: 'Lỗi giả lập', retryable: true } : null };
        if (failPublish && body.action === 'PUBLISH_NOW') { status = 502; data = { detail: 'Lỗi giả lập' }; } else data = pub;
      } else data = pub;
    } else if (path.endsWith('/linkedin/media/upload')) {
      calls.push({ path, method });
      data = { provider: 'upload', objectKey: 'mock/image.png', fileName: 'mock.png', altText: '', order: 1 };
    } else if (path.endsWith('/blog/admin/blogs')) {
      calls.push({ path, method, state: url.searchParams.get('state') });
      const items = url.searchParams.get('state') === 'APPROVED' && sourceState !== 'APPROVED' ? [] : [{ ...blog, state: sourceState }];
      data = { items, page: 1, pageSize: 20, total: items.length, totalPages: 1 };
    } else if (path.endsWith('/blog/client/blogs')) {
      data = { blogs: [blog], next_req: null };
    } else if (path.endsWith('/blog/link/bai-mau')) {
      data = { ...blog, related_blogs: [] };
    } else if (path.endsWith('/blog/admin/source')) {
      data = { ...blog, state: sourceState };
    } else if (path.endsWith('/blog/is-duplicate-link-post')) {
      data = false;
    } else if (path.endsWith('/openai/seo-keywords') || path.endsWith('/openai/seo-description')) {
      calls.push({ path, method, body: request.postDataJSON() });
      if (failSeo) { status = 500; data = { detail: 'Lỗi AI giả lập' }; }
      else data = path.endsWith('/seo-keywords') ? ['AI SEO', 'Quant', 'AI SEO'] : 'Mô tả SEO do AI tạo';
    } else if (/\/categories\/?$/.test(path) && request.resourceType() !== 'document') {
      if (method === 'POST') {
        calls.push({ path, method, body: request.postDataJSON() });
        if (failCategory) { status = 400; data = { detail: 'Lỗi tạo danh mục giả lập' }; }
        else { data = { id: 'new-category', name: request.postDataJSON().name }; categories.push(data); }
      } else data = { items: categories, page: 1, total: categories.length, totalPages: 1 };
    } else if ((path.endsWith('/blog') && method === 'POST') || (path.endsWith('/blog/source') && method === 'PUT')) {
      calls.push({ path, method, body: request.postData() });
      sourceState = request.postData()?.includes('"state":"APPROVED"') ? 'APPROVED' : 'PENDING';
      data = { ...blog, state: sourceState };
    } else if (url.origin === origin && method === 'GET') {
      return route.continue();
    } else return route.fulfill({ status: 404, body: 'Blocked by smoke test' });
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto(origin + '/publications');
  await page.getByRole('link', { name: 'Tạo bài LinkedIn', exact: true }).waitFor();
  await checkContrast(page, 'publication list');
  assert(calls.some((call) => call.state === 'APPROVED'));
  await page.getByRole('link', { name: 'Tạo bài LinkedIn', exact: true }).click();
  const text = page.getByPlaceholder('Soạn thảo nội dung bài đăng LinkedIn...');
  await text.fill('Nội dung do người quản trị soạn');
  await checkContrast(page, 'publication editor');
  assert.equal(await page.getByText('Đính kèm liên kết bài viết trên website', { exact: false }).locator('input').isChecked(), false);
  await page.getByRole('button', { name: 'Lưu bản nháp LinkedIn', exact: true }).click();
  await page.getByText('Trạng thái LinkedIn: Sẵn sàng', { exact: true }).waitFor();
  assert.equal(calls.filter((call) => call.body?.action === 'PUBLISH_NOW').length, 0);
  await page.reload();
  await text.waitFor();
  assert.equal(await text.inputValue(), 'Nội dung do người quản trị soạn');
  await page.getByRole('radio', { name: /Chuyển nguyên bài/ }).check();
  await page.getByRole('button', { name: 'Tạo lại', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ nội dung', exact: true }).click();
  assert.equal(await text.inputValue(), 'Nội dung do người quản trị soạn');
  await page.getByRole('button', { name: 'Tạo lại', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo lại', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('textarea')?.value === 'Bản chuyển từ website');
  await page.getByRole('radio', { name: /Tóm tắt bằng AI/ }).check();
  await page.getByRole('button', { name: 'Tạo lại', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo lại', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu bản nháp LinkedIn', exact: true }).waitFor({ state: 'visible' });
  await page.getByLabel('Chế độ ảnh').selectOption('single-image');
  await page.getByPlaceholder('Từ khóa Pexels...').fill('quant');
  await page.getByRole('button', { name: 'Tìm ảnh', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn', exact: true }).click();
  await page.getByLabel('Chế độ ảnh').selectOption('multi-image');
  await page.locator('input[type=file]').setInputFiles({ name: 'mock.png', mimeType: 'image/png', buffer: Buffer.from('mock-image') });
  await page.getByLabel('Mô tả ảnh').nth(1).fill('Ảnh tải lên');
  await page.getByRole('button', { name: 'Đưa ảnh lên trước' }).nth(1).click();
  const link = page.getByText('Đính kèm liên kết bài viết trên website', { exact: false }).locator('input');
  await link.check();
  await link.locator('..').hover();
  await checkContrast(page, 'selected canonical-link option and image selection');
  await page.getByRole('button', { name: 'Lưu bản nháp LinkedIn', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('textarea')?.disabled);
  const saved = calls.filter((call) => call.body?.action === 'SAVE_DRAFT').at(-1).body;
  assert.equal(saved.includeWebLink, true);
  assert.equal(saved.media[0].provider, 'upload');
  assert.deepEqual(saved.media.map((item) => item.order), [1, 2]);
  await page.reload();
  await text.waitFor();
  assert.equal(await link.isChecked(), true);
  assert.equal(await page.getByLabel('Chế độ ảnh').inputValue(), 'multi-image');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('aside')?.getBoundingClientRect().right <= 0);
  await page.locator('main').evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const bounds = await page.getByRole('button', { name: 'Lưu bản nháp LinkedIn', exact: true }).boundingBox();
  assert(bounds.y >= 0 && bounds.y + bounds.height <= 844 && bounds.x >= 0 && bounds.x + bounds.width <= 390);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await checkContrast(page, 'mobile publication editor');
  await page.screenshot({ path: join(process.env.SMOKE_ARTIFACT_DIR || tmpdir(), 'publication-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => document.querySelector('aside')?.getBoundingClientRect().left === 0);
  await page.screenshot({ path: join(process.env.SMOKE_ARTIFACT_DIR || tmpdir(), 'publication-desktop.png'), fullPage: true });
  await link.uncheck();
  failPublish = true;
  await page.getByRole('button', { name: 'Đăng lên LinkedIn', exact: true }).click();
  assert.equal(calls.filter((call) => call.body?.action === 'PUBLISH_NOW').length, 0);
  await page.getByRole('button', { name: 'Đăng bài ngay', exact: true }).click();
  await page.getByText('Trạng thái LinkedIn: Đăng thất bại', { exact: true }).waitFor();
  assert.equal(await text.inputValue(), 'Bản chuyển từ website');
  assert.equal(calls.filter((call) => call.body?.action === 'PUBLISH_NOW').at(-1).body.includeWebLink, false);
  pub = { ...pub, linkedinError: { message: 'Không cho phép thử lại', retryable: false } };
  await page.reload();
  await text.waitFor();
  assert.equal(await page.getByRole('button', { name: 'Thử lại LinkedIn', exact: true }).count(), 0);
  pub = { ...pub, linkedinError: { message: 'Cho phép thử lại', retryable: true } };
  await page.reload();
  await page.getByRole('button', { name: 'Thử lại LinkedIn', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Thử lại LinkedIn', exact: true }).click();
  await page.getByText('Trạng thái LinkedIn: Đã đăng', { exact: true }).waitFor();
  assert(calls.some((call) => call.method === 'POST' && call.path.endsWith('/linkedin/retry')));

  for (const status of ['PUBLISHING', 'PUBLISHED', 'REVIEW_REQUIRED']) {
    pub = { ...pub, linkedinStatus: status };
    await page.reload();
    await text.waitFor();
    assert(await text.isDisabled());
    assert.equal(await text.evaluate((element) => getComputedStyle(element).opacity), '1');
    await checkContrast(page, `read-only publication ${status}`);
    assert.equal(await page.getByRole('button', { name: 'Đăng lên LinkedIn', exact: true }).count(), 0);
  }
  sourceState = 'PENDING';
  await page.reload();
  await page.getByText(/Bài website chưa được duyệt/).waitFor();
  assert.equal(await text.count(), 0);
  sourceState = 'APPROVED';
  const beforeCrud = calls.length;
  await page.goto(origin + '/blog/default/source');
  await page.waitForFunction(() => document.querySelector('input[name="title"]')?.value === 'Bài website mẫu');
  await checkContrast(page, 'website edit');
  await page.getByRole('button', { name: 'Tạo SEO bằng AI', exact: true }).click();
  await page.getByRole('dialog', { name: 'Tạo nội dung SEO', exact: true }).waitFor();
  await checkContrast(page, 'SEO AI dialog');
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByRole('button', { name: 'Mở trình soạn thảo Markdown', exact: true }).click();
  await page.locator('.markdown-editor-wrapper .cm-line').first().waitFor();
  await checkContrast(page, 'rich Markdown editor, code and table of contents');
  const blockSelect = page.locator('.mdxeditor-toolbar [role=combobox]');
  if (await blockSelect.count()) {
    await blockSelect.first().click();
    await page.getByRole('listbox').waitFor();
    assert(await page.getByRole('listbox').evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Boolean(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + 10)?.closest('.mdxeditor-select-content'));
    }), 'Editor menus must be visible above the full-screen overlay');
    await checkContrast(page, 'rich editor block menu');
    await page.screenshot({ path: join(process.env.SMOKE_ARTIFACT_DIR || tmpdir(), 'markdown-contrast.png'), fullPage: true });
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Mã Markdown', exact: true }).click();
  await checkContrast(page, 'raw Markdown editor overlay');
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
  await checkContrast(page, 'Markdown preview overlay');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByText('Cập nhật bài viết thành công.', { exact: true }).waitFor();
  assert.equal(calls.slice(beforeCrud).filter((call) => call.path.includes('/publications/')).length, 0);
  await page.goto(origin + '/blog/create-blog');
  await page.getByPlaceholder('Nhập tiêu đề bài viết...').fill('Bài mới');
  await checkContrast(page, 'website create');
  await page.getByRole('combobox', { name: 'Danh mục' }).fill('Quant');
  await page.getByRole('combobox', { name: 'Danh mục' }).press('ArrowDown');
  await page.getByRole('combobox', { name: 'Danh mục' }).press('Enter');
  await page.getByRole('button', { name: 'Chế độ xem và sửa mã Markdown' }).click();
  await page.getByPlaceholder('Nhập hoặc dán mã nguồn Markdown tại đây...').fill('Nội dung bài mới');
  await page.getByRole('button', { name: 'Lưu chờ duyệt', exact: true }).click();
  await page.waitForURL('**/blog/default/source');
  assert.equal(calls.slice(beforeCrud).filter((call) => call.path.includes('/publications/')).length, 0);
  assert.equal(calls.slice(beforeCrud).filter((call) => call.method === 'POST' && call.path.endsWith('/blog')).length, 1);
  assert(calls.slice(beforeCrud).find((call) => call.method === 'POST' && call.path.endsWith('/blog')).body.includes('SAVE_PENDING'));
  await page.goto(origin + '/publications');
  await page.getByText('Không tìm thấy bài viết', { exact: true }).waitFor();
  await page.goto(origin + '/blog');
  await page.getByRole('button', { name: 'Duyệt bài viết', exact: true }).click();
  await page.getByText('Đã duyệt bài viết thành công.', { exact: true }).waitFor();
  await checkContrast(page, 'website management');
  assert(calls.filter((call) => call.method === 'PUT' && call.path.endsWith('/blog/source')).at(-1).body.includes('"state":"APPROVED"'));
  await page.goto(origin + '/publications');
  await page.getByRole('link', { name: 'Tạo bài LinkedIn', exact: true }).waitFor();
  const beforePublish = calls.length;
  await page.goto(origin + '/blog/create-blog');
  await page.getByPlaceholder('Nhập tiêu đề bài viết...').fill('Bài đăng ngay');
  await page.getByRole('combobox', { name: 'Danh mục' }).fill('Quant');
  await page.getByRole('option', { name: 'Quant', exact: true }).click();
  await page.getByRole('button', { name: 'Chế độ xem và sửa mã Markdown' }).click();
  await page.getByPlaceholder('Nhập hoặc dán mã nguồn Markdown tại đây...').fill('Nội dung đăng ngay');
  await page.getByRole('button', { name: 'Lưu và đăng', exact: true }).click();
  assert.equal(calls.slice(beforePublish).filter((call) => call.method === 'POST').length, 0);
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();

  await page.getByRole('button', { name: 'Lưu và đăng', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu và đăng', exact: true }).click();
  await page.waitForURL('**/blog/detail/source');
  const createCall = calls.slice(beforePublish).find((call) => call.method === 'POST' && call.path.endsWith('/blog'));
  assert(createCall.body.includes('PUBLISH_NOW') && createCall.body.includes('"state":"APPROVED"'));
  assert.equal(calls.slice(beforePublish).filter((call) => call.path.includes('/publications/')).length, 0);
  await page.waitForFunction(() => Array.from(document.images).some((image) => image.alt === 'Bài website mẫu' && image.naturalWidth > 0));
  await checkContrast(page, 'website detail');
  const bannerSrc = await page.getByRole('img', { name: 'Bài website mẫu', exact: true }).getAttribute('src');
  assert(bannerSrc.endsWith('/images/banner.png') && !bannerSrc.includes('/blog/detail/'));
  blog.banner_url = 'https://example.test/images/banner.png';
  await page.reload();
  await page.waitForFunction(() => Array.from(document.images).some((image) => image.alt === 'Bài website mẫu' && image.naturalWidth > 0));
  assert.equal(await page.getByRole('img', { name: 'Bài website mẫu', exact: true }).getAttribute('src'), blog.banner_url);
  await page.goto(origin + '/linkedin');
  await page.getByRole('row').filter({ hasText: 'Bài LinkedIn mẫu' }).waitFor();
  await checkContrast(page, 'LinkedIn management');
  await page.getByRole('row').filter({ hasText: 'Bài LinkedIn mẫu' }).locator('td').nth(2).click();
  await page.waitForURL('**/linkedin/posts/standalone');
  await page.getByPlaceholder('Soạn nội dung bài đăng LinkedIn...').waitFor();
  await checkContrast(page, 'LinkedIn detail');
  await page.goto(origin + '/linkedin');
  await page.getByRole('link', { name: 'Bài LinkedIn mẫu', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/linkedin/posts/standalone');
  await page.goto(origin + '/linkedin');
  await page.getByRole('button', { name: 'Xóa bài khỏi CMS', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  assert.equal(new URL(page.url()).pathname, '/linkedin');
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
  standalone.status = 'PUBLISHED';
  await page.goto(origin + '/linkedin/posts/standalone');
  const lockedContent = page.getByPlaceholder('Soạn nội dung bài đăng LinkedIn...');
  await lockedContent.waitFor();
  assert(await lockedContent.isDisabled());
  assert.equal(await lockedContent.evaluate((element) => getComputedStyle(element).opacity), '1');
  await checkContrast(page, 'read-only independent LinkedIn post');

  // Cover remaining shared-theme routes and dialogs before authoring the next article.
  await page.goto(origin + '/categories');
  await page.getByRole('heading', { name: 'Danh mục bài viết', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Tạo danh mục', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await checkContrast(page, 'category list and dialog');
  await page.goto(origin + '/blog/research');
  await page.getByPlaceholder('Từ khóa hoặc chủ đề...').waitFor();
  await checkContrast(page, 'research workspace');
  await page.goto(origin + '/linkedin/new');
  await page.getByPlaceholder('Nhập chủ đề bài đăng...').fill('Chủ đề mẫu');
  await checkContrast(page, 'LinkedIn create');
  await page.goto(origin + '/blog/preview');
  await page.getByRole('button', { name: 'Đọc bài Bài website mẫu', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'Bài website mẫu', exact: true }).waitFor();
  await checkContrast(page, 'public reader preview');
  await page.goto(origin + '/login');
  await page.getByPlaceholder('Nhập tên đăng nhập').waitFor();
  await checkContrast(page, 'login');

  // Verify inline category selection/creation and SEO-only AI updates without backend changes.
  await page.goto(origin + '/blog/create-blog');
  await page.getByRole('switch', { name: 'Hiện cấu hình SEO' }).click();
  await checkContrast(page, 'SEO fields and controls');
  assert(await page.getByRole('button', { name: 'Tạo SEO bằng AI', exact: true }).isDisabled());
  await page.getByPlaceholder('Nhập tiêu đề bài viết...').fill('Bài kiểm tra SEO');
  const category = page.getByRole('combobox', { name: 'Danh mục' });
  await category.fill('qUa');
  await checkContrast(page, 'category combobox');
  await category.press('ArrowUp');
  await category.press('Enter');
  assert.equal(await category.inputValue(), 'Quant');
  await category.fill('Danh mục chưa tạo');
  await category.press('Escape');
  assert.equal(await category.inputValue(), 'Quant');
  failCategory = true;
  await category.fill('Danh mục mới');
  await page.getByRole('button', { name: '+ Tạo danh mục “Danh mục mới”', exact: true }).click();
  await page.getByText('Lỗi tạo danh mục giả lập', { exact: true }).waitFor();
  assert.equal(await category.inputValue(), 'Quant');
  failCategory = false;
  await category.fill('Danh mục mới');
  await page.getByRole('button', { name: '+ Tạo danh mục “Danh mục mới”', exact: true }).click();
  await page.getByText('Đã tạo danh mục “Danh mục mới”.', { exact: true }).waitFor();
  assert.equal(await category.inputValue(), 'Danh mục mới');
  assert.equal(new URL(page.url()).pathname, '/blog/create-blog');
  await page.getByRole('button', { name: 'Chế độ xem và sửa mã Markdown' }).click();
  const articleContent = page.getByPlaceholder('Nhập hoặc dán mã nguồn Markdown tại đây...');
  await articleContent.fill('Nội dung gốc không được thay thế');
  const seoTitle = page.getByPlaceholder('Nhập tiêu đề SEO...');
  const description = page.getByPlaceholder('Nhập mô tả tóm tắt...');
  await seoTitle.fill('Tiêu đề SEO thủ công');
  await page.getByRole('button', { name: 'Tạo SEO bằng AI', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('textarea[placeholder="Nhập mô tả tóm tắt..."]')?.value === 'Mô tả SEO do AI tạo');
  assert.equal(await articleContent.inputValue(), 'Nội dung gốc không được thay thế');
  assert.equal(await seoTitle.inputValue(), 'Tiêu đề SEO thủ công');
  assert.equal(await page.getByPlaceholder('keyword 1, keyword 2...').inputValue(), 'AI SEO, Quant');
  assert(calls.filter((call) => call.path.includes('/openai/seo-')).every((call) => call.body.blog_content === 'Nội dung gốc không được thay thế'));
  await description.fill('Mô tả thủ công cần giữ');
  const seoCalls = calls.filter((call) => call.path.includes('/openai/seo-')).length;
  await page.getByRole('button', { name: 'Tạo SEO bằng AI', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
  assert.equal(calls.filter((call) => call.path.includes('/openai/seo-')).length, seoCalls);
  failSeo = true;
  await page.getByRole('button', { name: 'Tạo SEO bằng AI', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo SEO', exact: true }).click();
  await page.getByText('Không thể tạo dữ liệu SEO', { exact: true }).waitFor();
  assert.equal(await description.inputValue(), 'Mô tả thủ công cần giữ');
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
  failSeo = false;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('aside')?.getBoundingClientRect().right <= 0);
  await page.locator('.Toastify__close-button').evaluateAll((buttons) => buttons.forEach((button) => button.click()));
  await page.locator('main').evaluate((element) => { element.scrollTop = 0; });
  await category.fill('Danh');
  await page.getByRole('option', { name: /^Danh mục mới/ }).waitFor();
  const dropdownBounds = await page.getByRole('listbox', { name: 'Danh mục bài viết' }).boundingBox();
  assert(dropdownBounds.x >= 0 && dropdownBounds.x + dropdownBounds.width <= 390);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: join(process.env.SMOKE_ARTIFACT_DIR || tmpdir(), 'blog-category-mobile.png'), fullPage: true });
  await category.press('Escape');
  await page.getByRole('button', { name: 'Tạo SEO bằng AI', exact: true }).scrollIntoViewIfNeeded();
  await checkContrast(page, 'mobile SEO editor');
  await page.screenshot({ path: join(process.env.SMOKE_ARTIFACT_DIR || tmpdir(), 'blog-seo-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Lưu chờ duyệt', exact: true }).click();
  await page.waitForURL('**/blog/default/source');
  const savedArticle = calls.filter((call) => call.method === 'POST' && call.path.endsWith('/blog')).at(-1).body;
  assert(savedArticle.includes('Danh mục mới') && savedArticle.includes('Mô tả thủ công cần giữ') && savedArticle.includes('Tiêu đề SEO thủ công'));
  assert.deepEqual(errors, []);
  console.log('PASS: rendered text/placeholder contrast >= 4.5:1 across admin routes, dialogs, Markdown/code previews and mobile; inline categories, SEO, website and LinkedIn workflows');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
