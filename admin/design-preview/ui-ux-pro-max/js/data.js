/* Data layer: seed data, localStorage persistence, CRUD helpers and mocked AI services. */
(function () {
  const LS_KEY = 'vq-preview-uiux-v1';
  const DAY = 86400000;
  const NOW = new Date('2026-10-05T09:30:00+07:00').getTime();

  // Return an ISO timestamp for N days (and optional hours) before the fixed demo "now".
  const ago = (days, hours = 0) => new Date(NOW - days * DAY - hours * 3600000).toISOString();
  // Create a short random id with a prefix.
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  // Resolve after a delay to simulate network latency.
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Convert Vietnamese text into a URL-safe slug.
  function slugify(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  }

  // Build a realistic Markdown article body from a title and category.
  function article(title, category, lang) {
    if (lang === 'english') {
      return `## Overview\n\n${title} is a practical question for systematic traders on the Vietnamese market. This draft walks through the data, the method and the main risks.\n\n## Method\n\n- Use daily adjusted prices from 2018 to 2026\n- Split data into 70% in-sample and 30% out-of-sample\n- Include 0.15% transaction cost per side\n\n| Metric | In-sample | Out-of-sample |\n| --- | --- | --- |\n| Sharpe | 1.42 | 0.87 |\n| Max drawdown | -11.3% | -16.8% |\n\n## Risks\n\n> Backtests flatter strategies. Treat every number as an upper bound.\n\n## Conclusion\n\nThe edge is real but thin. Position sizing matters more than signal tuning.\n`;
    }
    return `## Bối cảnh\n\nTrong nhóm **${category.toLowerCase()}**, câu hỏi "${title}" xuất hiện khá thường xuyên trong cộng đồng giao dịch định lượng tại Việt Nam. Bài viết này đi qua dữ liệu, phương pháp và các rủi ro cần lưu ý trước khi áp dụng vào tài khoản thật.\n\n## Dữ liệu và giả định\n\n- Giá điều chỉnh theo ngày, giai đoạn 2018 đến 2026\n- Chia mẫu: 70% huấn luyện, 30% kiểm định ngoài mẫu\n- Phí giao dịch 0,15% mỗi chiều, trượt giá 0,05%\n- Loại bỏ cổ phiếu có thanh khoản dưới 2 tỷ đồng mỗi phiên\n\n## Kết quả chính\n\n| Chỉ số | Trong mẫu | Ngoài mẫu |\n| --- | --- | --- |\n| Sharpe | 1,42 | 0,87 |\n| Lợi nhuận hàng năm | 18,6% | 11,2% |\n| Sụt giảm tối đa | -11,3% | -16,8% |\n| Tỷ lệ thắng | 54,1% | 51,7% |\n\nĐoạn mã dưới đây tính tín hiệu z-score trên cửa sổ 20 phiên:\n\n\`\`\`python\nimport pandas as pd\n\ndef zscore(close: pd.Series, window: int = 20) -> pd.Series:\n    mean = close.rolling(window).mean()\n    std = close.rolling(window).std()\n    return (close - mean) / std\n\nsignal = zscore(df["close"]).shift(1)  # tránh look-ahead\n\`\`\`\n\n## Rủi ro cần lưu ý\n\n> Kết quả backtest luôn đẹp hơn thực tế. Hãy coi mọi con số là giới hạn trên.\n\n1. Hiệu suất ngoài mẫu giảm gần một nửa so với trong mẫu\n2. Biên độ giá ±7% mỗi phiên làm tăng rủi ro khi đặt lệnh cắt lỗ\n3. Thanh khoản mỏng ở nhóm midcap làm lệch giá thực hiện\n\n## Kết luận\n\nLợi thế có thật nhưng mỏng. Quản trị vị thế quan trọng hơn việc tinh chỉnh tín hiệu.\n`;
  }

  const CATEGORY_NAMES = ['Chiến lược giao dịch', 'Phân tích kỹ thuật', 'Quản trị rủi ro', 'Dữ liệu thị trường', 'Machine Learning', 'Phân tích cơ bản', 'Định lượng vĩ mô', 'Hạ tầng giao dịch', 'Quyền chọn và phái sinh', 'Danh mục đầu tư', 'Tin tức thị trường', 'Hướng dẫn công cụ'];

  // Build the initial dataset used on first load and on reset.
  function seed() {
    const categories = CATEGORY_NAMES.map((name, i) => ({ id: 'c' + (i + 1), name, modified_at: ago(i * 3 + 1), deleted: false }));

    const blogRows = [
      ['Mean reversion trên rổ VN30: kiểm định 8 năm dữ liệu', 0, 'PENDING', 6, 'Quant, Backtest'],
      ['Cách đặt stop-loss theo ATR khi biên độ ±7% mỗi phiên', 2, 'PENDING', 5, 'Rủi ro, ATR'],
      ['Xây pipeline làm sạch dữ liệu tick từ HOSE', 3, 'APPROVED', 2, 'Dữ liệu, Python'],
      ['LSTM có thực sự dự báo được VN-Index?', 4, 'REJECTED', 7, 'AI, Machine Learning'],
      ['Momentum đa khung thời gian cho cổ phiếu midcap', 0, 'APPROVED', 3, 'Momentum, Midcap'],
      ['Đọc Bollinger Bands đúng cách khi thanh khoản mỏng', 1, 'APPROVED', 4, 'Kỹ thuật, Bollinger'],
      ['Position sizing theo Kelly phân số: ví dụ trên danh mục 2 tỷ', 2, 'PENDING', 1, 'Kelly, Vị thế'],
      ['So sánh nguồn dữ liệu giá điều chỉnh: ba nhà cung cấp tại VN', 3, 'APPROVED', 8, 'Dữ liệu, Nhà cung cấp'],
      ['Backtest không rò rỉ: sai lầm look-ahead thường gặp', 0, 'APPROVED', 9, 'Backtest, Look-ahead'],
      ['Random forest chọn đặc trưng cho tín hiệu giao dịch ngắn hạn', 4, 'APPROVED', 10, 'Random forest, Đặc trưng'],
      ['Mô hình Ichimoku trên khung H1: còn hiệu quả sau phí?', 1, 'REJECTED', 11, 'Ichimoku, Intraday'],
      ['Value at Risk lịch sử và tham số cho danh mục cổ phiếu', 2, 'APPROVED', 13, 'VaR, Danh mục'],
    ];
    const blogs = blogRows.map(([title, cat, state, d, tag], i) => {
      const category = CATEGORY_NAMES[cat];
      return {
        id: 'b' + (i + 1), title, tag, category, state, deleted: false,
        slug: slugify(title), banner_url: 'https://picsum.photos/seed/vq-' + slugify(title) + '/1200/630',
        content: article(title, category),
        seo: { title, description: `${title}. Phân tích dữ liệu, phương pháp kiểm định và rủi ro khi áp dụng thực tế tại thị trường Việt Nam.`, keywords: tag.split(', ').concat(['giao dịch định lượng']), author: 'VietQuant' },
        created_at: ago(d + 2), modified_at: ago(d, i),
      };
    });

    const post = (i, o) => Object.assign({
      id: 'p' + i, topic: '', content: '', sourceType: 'CUSTOM', status: 'DRAFT', mediaMode: 'none', media: [],
      factCheck: { requires: false, notes: [] }, linkPlacement: 'NONE', blogId: null, publishedLinkUrl: null,
      publishedAt: null, lastError: null, deleted: false, createdAt: ago(3), modifiedAt: ago(3),
    }, o);
    const posts = [
      post(1, { topic: 'Sai lầm look-ahead khi backtest', sourceType: 'BLOG_ADAPTATION', blogId: 'b9', status: 'PUBLISHED', linkPlacement: 'IN_POST', publishedLinkUrl: 'https://www.linkedin.com/feed/update/urn:li:share:7118842201', publishedAt: ago(4), modifiedAt: ago(4), content: 'Backtest đẹp không đồng nghĩa với chiến lược tốt.\n\nChúng tôi vừa rà soát 40 chiến lược nội bộ và thấy 11 chiến lược dùng dữ liệu của ngày hôm sau để ra tín hiệu hôm nay. Chỉ cần thêm một lệnh shift(1), Sharpe giảm từ 1,9 xuống 0,8.\n\nBài chi tiết trên website VietQuant.\n\n#Backtest #QuantFinance #VietQuant' }),
      post(2, { topic: 'Vì sao midcap khó giao dịch momentum', sourceType: 'INDEPENDENT_AI', status: 'READY', modifiedAt: ago(1), content: 'Momentum hoạt động tốt trên bluechip, nhưng midcap thì khác.\n\nThanh khoản mỏng làm giá thực hiện lệch trung bình 0,4% mỗi lệnh. Với chiến lược đảo vị thế hàng tuần, khoản này đủ ăn hết lợi nhuận.\n\nBạn đang xử lý chi phí trượt giá thế nào?\n\n#Momentum #Midcap #ChungKhoanVietNam' }),
      post(3, { topic: 'Kelly phân số cho tài khoản nhỏ', sourceType: 'CUSTOM', status: 'DRAFT', modifiedAt: ago(0, 5), content: 'Kelly đầy đủ cho kết quả tối ưu về lý thuyết, nhưng biến động vốn quá lớn. Một nửa Kelly giữ được khoảng 75% tốc độ tăng trưởng với sụt giảm chỉ bằng một nửa.' }),
      post(4, { topic: 'Cập nhật dữ liệu tick HOSE', sourceType: 'BLOG_ADAPTATION', blogId: 'b3', status: 'FAILED', modifiedAt: ago(2), content: 'Pipeline làm sạch dữ liệu tick từ HOSE của chúng tôi vừa xử lý xong 3,2 tỷ dòng giao dịch.\n\nBa lỗi hay gặp nhất: lệnh khớp trùng, mốc thời gian lệch múi giờ và giá khớp ngoài biên độ.\n\n#DataEngineering #HOSE', lastError: { code: 'LINKEDIN_RATE_LIMIT', message: 'LinkedIn trả về 429. Hệ thống sẽ cho phép thử lại sau ít phút.', retryable: true, attempts: 2 } }),
      post(5, { topic: 'Ichimoku sau phí giao dịch', sourceType: 'INDEPENDENT_AI', status: 'REVIEW_REQUIRED', modifiedAt: ago(3), content: 'Ichimoku trên khung H1 cho Sharpe 1,1 trước phí và còn 0,2 sau phí 0,15% mỗi chiều. Số lệnh mỗi năm quá cao.', factCheck: { requires: true, notes: ['Sharpe 1,1 và 0,2 cần đối chiếu với bảng kết quả backtest.', 'Phí 0,15% mỗi chiều cần khớp biểu phí hiện tại của công ty chứng khoán.'] }, lastError: { code: 'PUBLISH_UNCERTAIN', message: 'Kết quả đăng chưa rõ ràng. Kiểm tra Trang Doanh nghiệp LinkedIn để tránh đăng trùng.', duplicateRisk: true } }),
      post(6, { topic: 'Ba nguồn dữ liệu giá điều chỉnh', sourceType: 'BLOG_ADAPTATION', blogId: 'b8', status: 'PUBLISHED', publishedLinkUrl: 'https://www.linkedin.com/feed/update/urn:li:share:7116201133', publishedAt: ago(8), modifiedAt: ago(8), content: 'Chúng tôi so sánh giá điều chỉnh của ba nhà cung cấp cho 400 mã cổ phiếu. Sai khác lớn nhất nằm ở cổ phiếu chia tách và trả cổ tức bằng cổ phiếu.' }),
      post(7, { topic: 'Quản trị rủi ro khi biên độ ±7%', sourceType: 'INDEPENDENT_AI', status: 'DRAFT', modifiedAt: ago(5), content: 'Biên độ ±7% mỗi phiên khiến lệnh cắt lỗ dễ bị trượt qua giá kích hoạt. ATR 14 phiên là điểm khởi đầu hợp lý để đặt khoảng cách.' }),
      post(8, { topic: 'Random forest và đặc trưng ngắn hạn', sourceType: 'CUSTOM', status: 'PUBLISHED', publishedLinkUrl: 'https://www.linkedin.com/feed/update/urn:li:share:7113004455', publishedAt: ago(12), modifiedAt: ago(12), content: 'Random forest cho thứ hạng độ quan trọng đặc trưng rất tiện, nhưng đừng đọc nó như quan hệ nhân quả.\n\n#MachineLearning #Quant' }),
      post(9, { topic: 'Value at Risk lịch sử', sourceType: 'BLOG_ADAPTATION', blogId: 'b12', status: 'READY', modifiedAt: ago(6), content: 'VaR lịch sử 95% trên danh mục 2 tỷ đồng cho mức lỗ một ngày khoảng 31 triệu. Con số này thay đổi mạnh khi cửa sổ dữ liệu ngắn lại từ 500 xuống 120 phiên.' }),
    ];
    const history = [
      { topic: 'Sai lầm look-ahead khi backtest', providerPostId: 'urn:li:share:7118842201', content: 'Backtest đẹp không đồng nghĩa với chiến lược tốt...', publishedAt: ago(4) },
      { topic: 'Ba nguồn dữ liệu giá điều chỉnh', providerPostId: 'urn:li:share:7116201133', content: 'Chúng tôi so sánh giá điều chỉnh của ba nhà cung cấp...', publishedAt: ago(8) },
      { topic: 'Random forest và đặc trưng ngắn hạn', providerPostId: 'urn:li:share:7113004455', content: 'Random forest cho thứ hạng độ quan trọng đặc trưng...', publishedAt: ago(12) },
    ];
    return { v: 2, session: false, categories, blogs, posts, history };
  }

  let data;
  // Load persisted data or fall back to the seed.
  function load() {
    try { data = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { data = null; }
    if (!data || data.v !== 2) data = seed();
  }
  // Persist current data; ignore storage failures.
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } }
  // Restore the original sample data but keep the login session.
  function reset() { const s = data.session; data = seed(); data.session = s; save(); }
  load();

  // Slice a list into one page with metadata.
  function paginate(list, page, size) {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const p = Math.min(Math.max(1, page), totalPages);
    return { items: list.slice((p - 1) * size, p * size), total, totalPages, page: p };
  }
  // Newest-first ordering by modified time.
  const byModified = (a, b) => new Date(b.modified_at || b.modifiedAt) - new Date(a.modified_at || a.modifiedAt);
  const norm = (s) => (s || '').toLowerCase();

  const DB = {
    get session() { return data.session; },
    set session(v) { data.session = v; save(); },
    reset, save,

    /* Categories */
    categories: {
      all: () => data.categories.filter((c) => !c.deleted),
      list: (page, size) => paginate(data.categories.filter((c) => !c.deleted).sort(byModified), page, size),
      create(name) {
        const n = name.trim();
        if (data.categories.some((c) => !c.deleted && norm(c.name) === norm(n))) throw new Error('Danh mục này đã tồn tại.');
        const c = { id: uid('c'), name: n, modified_at: new Date().toISOString(), deleted: false };
        data.categories.push(c); save(); return c;
      },
      update(id, name) {
        const n = name.trim();
        if (data.categories.some((c) => !c.deleted && c.id !== id && norm(c.name) === norm(n))) throw new Error('Danh mục này đã tồn tại.');
        const c = data.categories.find((x) => x.id === id);
        data.blogs.forEach((b) => { if (b.category === c.name) b.category = n; });
        c.name = n; c.modified_at = new Date().toISOString(); save(); return c;
      },
      remove(id) { data.categories.find((c) => c.id === id).deleted = true; save(); },
      restore(id) { data.categories.find((c) => c.id === id).deleted = false; save(); },
      usage: (name) => data.blogs.filter((b) => !b.deleted && b.category === name).length,
    },

    /* Blogs */
    blogs: {
      get: (id) => data.blogs.find((b) => b.id === id && !b.deleted),
      all: () => data.blogs.filter((b) => !b.deleted),
      counts() {
        const l = data.blogs.filter((b) => !b.deleted);
        return { all: l.length, PENDING: l.filter((b) => b.state === 'PENDING').length, APPROVED: l.filter((b) => b.state === 'APPROVED').length, REJECTED: l.filter((b) => b.state === 'REJECTED').length };
      },
      list({ state, category, search, page = 1, size = 10 }) {
        const q = norm(search).trim();
        const l = data.blogs.filter((b) => !b.deleted && (!state || b.state === state) && (!category || b.category === category) && (!q || norm(b.title).includes(q) || b.slug.includes(q))).sort(byModified);
        return paginate(l, page, size);
      },
      create(input, state) {
        const now = new Date().toISOString();
        const b = Object.assign({ id: uid('b'), deleted: false, state, created_at: now, modified_at: now, slug: slugify(input.title) || uid('bai-viet-') }, input);
        data.blogs.unshift(b); save(); return b;
      },
      update(id, patch) { const b = data.blogs.find((x) => x.id === id); Object.assign(b, patch, { modified_at: new Date().toISOString() }); save(); return b; },
      remove(id) { data.blogs.find((b) => b.id === id).deleted = true; save(); },
      restore(id) { data.blogs.find((b) => b.id === id).deleted = false; save(); },
    },

    /* LinkedIn posts */
    posts: {
      get: (id) => data.posts.find((p) => p.id === id && !p.deleted),
      byBlog: (blogId) => data.posts.find((p) => p.blogId === blogId && !p.deleted),
      list({ status, sourceType, page = 1, size = 10 }) {
        const l = data.posts.filter((p) => !p.deleted && (!status || p.status === status) && (!sourceType || p.sourceType === sourceType)).sort(byModified);
        return paginate(l, page, size);
      },
      save(post) {
        const now = new Date().toISOString();
        if (!post.id) delete post.id;
        const i = data.posts.findIndex((p) => p.id === post.id);
        if (i >= 0) data.posts[i] = Object.assign(data.posts[i], post, { modifiedAt: now });
        else { post = Object.assign({ id: uid('p'), deleted: false, createdAt: now }, post, { modifiedAt: now }); data.posts.unshift(post); }
        save(); return data.posts.find((p) => p.id === post.id);
      },
      remove(id) { data.posts.find((p) => p.id === id).deleted = true; save(); },
      restore(id) { data.posts.find((p) => p.id === id).deleted = false; save(); },
    },

    history: { list: () => data.history, add(item) { data.history.unshift(item); save(); } },
  };

  /* Mocked AI and external services: every call resolves after a short delay. */
  const AI = {
    // Generate a blog draft (content and SEO) from the title and category.
    async draftBlog(title, category, lang) {
      await wait(1400);
      return { content: article(title, category, lang), seo: { title, description: `${title}. Phân tích dữ liệu, phương pháp kiểm định và rủi ro khi áp dụng thực tế.`, keywords: [slugify(category).replace(/-/g, ' '), 'giao dịch định lượng', 'backtest'], author: 'VietQuant' } };
    },
    // Generate SEO description and keywords from article text.
    async seo(title) {
      await wait(1000);
      return { description: `${title}. Tóm tắt phương pháp, kết quả ngoài mẫu và các rủi ro chính khi áp dụng vào thị trường chứng khoán Việt Nam.`, keywords: ['giao dịch định lượng', 'backtest', 'chứng khoán Việt Nam', 'quản trị rủi ro'] };
    },
    // Suggest article titles from a keyword.
    async titles(keyword) {
      await wait(900);
      return [`${keyword}: hướng dẫn thực hành cho nhà đầu tư cá nhân`, `5 sai lầm thường gặp khi áp dụng ${keyword}`, `${keyword} trên thị trường Việt Nam: bằng chứng từ 8 năm dữ liệu`, `So sánh ${keyword} với chiến lược mua và giữ`];
    },
    // Search reference links for a keyword.
    async references(keyword) {
      await wait(1100);
      const k = slugify(keyword) || 'quant';
      return [
        { title: `${keyword} - Investopedia`, url: `https://www.investopedia.com/terms/${k}`, tag: 'NORMAL' },
        { title: `Nghiên cứu về ${keyword} trên HOSE (SSRN)`, url: `https://papers.ssrn.com/abstract=${k}-hose`, tag: 'NORMAL' },
        { title: `Mua khóa học ${keyword} giảm 70%`, url: `https://khoahoc-dautu.example/${k}-sale`, tag: 'ADS' },
        { title: `${keyword} cho người mới bắt đầu (QuantStart)`, url: `https://www.quantstart.com/articles/${k}`, tag: 'NORMAL' },
      ];
    },
    // Classify a list of links into organic, ad, spam or duplicate.
    async classify(urls) {
      await wait(1000);
      const seen = new Set();
      return urls.map((url) => {
        if (seen.has(url)) return { url, category: 'duplicate', confidence: 0.99, reason: 'Liên kết đã xuất hiện trong danh sách.' };
        seen.add(url);
        if (/sale|khuyen|giam|promo|ads/i.test(url)) return { url, category: 'ad', confidence: 0.91, reason: 'URL có dấu hiệu quảng cáo khóa học hoặc khuyến mãi.' };
        if (/bet|casino|free-money/i.test(url)) return { url, category: 'spam', confidence: 0.96, reason: 'Tên miền thuộc nhóm nội dung rác.' };
        return { url, category: 'organic', confidence: 0.84, reason: 'Nội dung biên tập, có tác giả và nguồn trích dẫn.' };
      });
    },
    // Extract readable content from a URL.
    async fetchContent(url) {
      await wait(1200);
      if (!/^https?:\/\//i.test(url)) return { success: false, error_message: 'URL không hợp lệ. Hãy bắt đầu bằng http:// hoặc https://' };
      return { success: true, url, title: 'Backtesting trading strategies: pitfalls and best practices', author: 'QuantStart Team', language: 'en', published_date: '2025-11-14', text_content: 'A backtest is a historical simulation of a trading strategy. The most common errors are look-ahead bias, survivorship bias and overfitting to a single market regime. To limit them, use walk-forward validation, include realistic costs and keep a final holdout period untouched until the very end of research.' };
    },
    // Draft LinkedIn copy from a topic or an existing blog.
    async linkedin({ topic, context, audience, blog, mode, lang }) {
      await wait(1500);
      const aud = audience ? ` dành cho ${audience.toLowerCase()}` : '';
      const requires = /[0-9]/.test(topic + context) || mode === 'SUMMARY';
      if (blog && mode === 'SAME') return { content: blog.content.replace(/^## .*$/gm, '').replace(/[|*>`#-]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1400), factCheck: { requires: false, notes: [] } };
      const t = blog ? blog.title : topic;
      const body = lang === 'english'
        ? `${t}\n\nMost traders look at returns first. We look at what happens when the signal is wrong.\n\nIn our latest test, out-of-sample Sharpe fell from 1.42 to 0.87 once costs were included. The edge survives, but only with careful sizing.\n\nHow do you stress-test your own signals?\n\n#QuantFinance #Backtesting #VietQuant`
        : `${t}${aud}\n\nPhần lớn nhà giao dịch nhìn vào lợi nhuận trước. Chúng tôi nhìn vào điều xảy ra khi tín hiệu sai.\n\nTrong thử nghiệm mới nhất, Sharpe ngoài mẫu giảm từ 1,42 xuống 0,87 sau khi tính phí. Lợi thế vẫn còn, nhưng chỉ khi quản trị vị thế cẩn thận.\n\nBạn kiểm tra độ bền của tín hiệu bằng cách nào?\n\n#GiaoDichDinhLuong #Backtest #VietQuant`;
      return { content: body, factCheck: requires ? { requires: true, notes: ['Sharpe 1,42 và 0,87 cần đối chiếu với bảng kết quả gốc.', 'Mức phí giao dịch cần khớp với giả định trong bài.'] } : { requires: false, notes: [] } };
    },
    // Suggest LinkedIn topics.
    async topics() {
      await wait(900);
      return ['Vì sao Sharpe ngoài mẫu luôn thấp hơn trong mẫu', 'Ba cách kiểm tra look-ahead trước khi chạy backtest', 'Position sizing: Kelly một nửa có đủ an toàn?', 'Dữ liệu tick HOSE: những lỗi làm méo tín hiệu'];
    },
    // Search stock photos by keywords (placeholder images).
    async pexels(keywords) {
      await wait(900);
      const k = slugify(keywords) || 'finance';
      return Array.from({ length: 6 }, (_, i) => ({ id: `${k}-${i}`, provider: 'pexels', imageUrl: `https://picsum.photos/seed/px-${k}-${i}/640/420`, altText: '', photographer: ['Anh Tuấn', 'Minh Châu', 'Hoài Nam', 'Lan Phương', 'Đức Huy', 'Thu Hà'][i] }));
    },
    // Generate a banner image from a prompt (placeholder images).
    async image(prompt) {
      await wait(1600);
      return `https://picsum.photos/seed/ai-${slugify(prompt) || 'banner'}-${Math.floor(Math.random() * 999)}/1200/630`;
    },
    wait,
  };

  window.DB = DB; window.AI = AI; window.slugify = slugify; window.article = article; window.uid = uid;
})();
