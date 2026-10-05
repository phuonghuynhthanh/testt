"""Seed realistic Vietnamese demo data (a few weeks of admin activity).

Run inside the api container so it uses that stack's DB and MinIO:
    docker exec -i -w /app <api-container> python - < seed_demo.py          # seed
    docker exec -i -w /app <api-container> python - clear < seed_demo.py   # remove demo rows
Seeding refuses to run when blogs already exist; clearing only touches demo rows.
"""

import struct
import sys
import zlib
from datetime import datetime, timedelta
from uuid import uuid4

from slugify import slugify
from sqlalchemy import select

from apps.blogs.models import Blog
from apps.categories.models import Category
from apps.core.storage import StorageService
from apps.core.urls import canonical_blog_url
from apps.linkedin_posts.models import LinkedInPost
from apps.publications.models import BlogPublication
from config import settings
from config.database import DatabaseManager

NOW = datetime(2026, 10, 5, 9, 30)
AUTHOR = settings.AUTHOR or "VietQuant Team"

CATEGORIES = {
    "Giao dịch định lượng": (30, 90, 160),
    "Phân tích dữ liệu": (20, 130, 110),
    "Quản trị rủi ro": (170, 70, 50),
    "Python cho tài chính": (90, 60, 150),
    "Kiến thức nền tảng": (200, 130, 20),
    "Tin tức thị trường": (60, 70, 80),
}


# Render a flat vertical-gradient PNG using only the standard library.
def make_png(color: tuple, width: int = 1200, height: int = 630) -> bytes:
    rows = bytearray()
    for y in range(height):
        k = 0.55 + 0.45 * (1 - y / height)
        px = bytes(min(255, int(c * k + (255 - c) * 0.08)) for c in color) * width
        rows += b"\x00" + px

    # Wrap one PNG chunk with its length and CRC.
    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(bytes(rows), 6)) + chunk(b"IEND", b"")


BLOGS = [
    dict(
        days_ago=27, hour=9, category="Kiến thức nền tảng", tag="Cơ bản", state="APPROVED",
        title="Giao dịch định lượng là gì? Lộ trình cho người mới bắt đầu",
        description="Giới thiệu giao dịch định lượng, các thành phần của một chiến lược và lộ trình học hiệu quả cho người mới.",
        keywords=["giao dịch định lượng", "quant trading", "lộ trình học"],
        content="""## Giao dịch định lượng là gì?

Giao dịch định lượng (quantitative trading) là phương pháp ra quyết định mua bán dựa trên mô hình toán học và dữ liệu, thay vì cảm tính. Mỗi quyết định đều có thể kiểm chứng lại bằng số liệu lịch sử.

### Các thành phần chính của một chiến lược

1. **Ý tưởng (alpha):** giả thuyết giải thích vì sao giá có thể vận động theo một quy luật nào đó.
2. **Dữ liệu:** giá, khối lượng, báo cáo tài chính, dữ liệu thay thế.
3. **Kiểm thử ngược (backtest):** chạy chiến lược trên dữ liệu quá khứ để đánh giá hiệu quả.
4. **Quản trị rủi ro:** quy định kích thước vị thế, mức cắt lỗ và giới hạn sụt giảm.
5. **Thực thi:** đưa lệnh ra thị trường với chi phí và trượt giá thấp nhất.

### Lộ trình học đề xuất

| Giai đoạn | Nội dung | Thời gian |
|---|---|---|
| 1 | Xác suất, thống kê, đại số tuyến tính | 4-6 tuần |
| 2 | Python, pandas, numpy | 3-4 tuần |
| 3 | Backtest và đánh giá chiến lược | 4 tuần |
| 4 | Quản trị rủi ro, thực thi | 4 tuần |

> Lời khuyên: hãy bắt đầu bằng những chiến lược đơn giản như trung bình động, rồi mới chuyển sang mô hình phức tạp.

Điều quan trọng nhất là **kỷ luật**: một chiến lược tốt đến đâu cũng thất bại nếu không được tuân thủ nhất quán.
""",
    ),
    dict(
        days_ago=25, hour=14, category="Python cho tài chính", tag="Python", state="APPROVED",
        title="Lấy và làm sạch dữ liệu giá cổ phiếu Việt Nam bằng pandas",
        description="Hướng dẫn tải dữ liệu giá, xử lý giá trị thiếu và điều chỉnh cổ tức bằng pandas.",
        keywords=["pandas", "dữ liệu cổ phiếu", "python"],
        content="""## Vì sao phải làm sạch dữ liệu?

Dữ liệu giá thô thường chứa ngày nghỉ lễ, giá trị thiếu và chưa điều chỉnh cổ tức, tách cổ phiếu. Nếu bỏ qua, kết quả backtest sẽ sai lệch nghiêm trọng.

### Đọc và chuẩn hóa

```python
import pandas as pd

df = pd.read_csv("hpg.csv", parse_dates=["date"], index_col="date")
df = df.sort_index()
df = df[~df.index.duplicated(keep="last")]
```

### Xử lý giá trị thiếu

```python
df["close"] = df["close"].ffill()
df = df.dropna(subset=["open", "high", "low", "close"])
```

### Tính lợi suất

Lợi suất log được dùng phổ biến vì có tính cộng theo thời gian:

$$r_t = \\ln\\left(\\frac{P_t}{P_{t-1}}\\right)$$

```python
import numpy as np

df["ret"] = np.log(df["close"]).diff()
```

### Kiểm tra nhanh

- Số phiên giao dịch mỗi năm khoảng 250.
- Không có lợi suất ngày vượt ±7% (biên độ HOSE) trừ ngày đặc biệt.
- Khối lượng không âm.

Sau khi làm sạch, bạn có thể yên tâm chuyển sang bước xây dựng tín hiệu.
""",
    ),
    dict(
        days_ago=22, hour=10, category="Quản trị rủi ro", tag="Rủi ro", state="APPROVED",
        title="Sụt giảm tối đa (max drawdown) và cách kiểm soát trong chiến lược",
        description="Giải thích max drawdown, vì sao nó quan trọng hơn lợi nhuận trung bình và cách đặt giới hạn.",
        keywords=["max drawdown", "quản trị rủi ro", "backtest"],
        content="""## Max drawdown là gì?

Max drawdown (MDD) là mức sụt giảm lớn nhất của giá trị tài khoản từ đỉnh xuống đáy trong một giai đoạn.

$$MDD = \\max_t \\left( \\frac{\\text{Peak}_t - V_t}{\\text{Peak}_t} \\right)$$

Một chiến lược lãi 40% mỗi năm nhưng có MDD 55% rất khó theo đuổi: bạn cần lãi **122%** chỉ để hồi lại khoản lỗ đó.

### Tính MDD bằng Python

```python
equity = (1 + returns).cumprod()
peak = equity.cummax()
mdd = ((equity - peak) / peak).min()
```

### Ba cách kiểm soát

1. **Giảm kích thước vị thế** khi biến động tăng (volatility targeting).
2. **Đa dạng hóa** nhiều chiến lược ít tương quan.
3. **Ngưỡng dừng:** tạm ngừng chiến lược khi MDD vượt giới hạn đã định trước.

> Không có chiến lược nào không sụt giảm. Mục tiêu là sụt giảm trong khả năng chịu đựng của bạn.
""",
    ),
    dict(
        days_ago=19, hour=16, category="Giao dịch định lượng", tag="Chiến lược", state="APPROVED",
        title="Chiến lược giao cắt đường trung bình động: backtest trên VN30",
        description="Backtest chiến lược giao cắt SMA 20/50 trên rổ VN30, kèm đánh giá chi phí giao dịch.",
        keywords=["sma", "backtest", "vn30", "trung bình động"],
        content="""## Ý tưởng

Mua khi đường trung bình động ngắn hạn cắt lên đường dài hạn, bán khi cắt xuống. Đây là chiến lược theo xu hướng kinh điển.

### Thiết lập backtest

- Dữ liệu: các mã trong rổ VN30, giai đoạn 2018-2025.
- Tín hiệu: SMA 20 cắt SMA 50.
- Phí giao dịch: 0,15% mỗi chiều, trượt giá 0,05%.

### Kết quả tóm tắt

| Chỉ số | Chiến lược | Mua và nắm giữ |
|---|---|---|
| Lợi nhuận hằng năm | 9,8% | 11,2% |
| Biến động | 14,1% | 21,6% |
| Sharpe | 0,58 | 0,44 |
| Max drawdown | -24% | -41% |

### Nhận xét

Chiến lược không vượt trội về lợi nhuận tuyệt đối nhưng **giảm mạnh sụt giảm** nhờ thoát vị thế khi thị trường giảm kéo dài. Chi phí giao dịch ăn mất khoảng 1,3%/năm, vì vậy cần tránh tối ưu tham số quá mức.

Bài tiếp theo sẽ thử kết hợp bộ lọc biến động để giảm tín hiệu nhiễu.
""",
    ),
    dict(
        days_ago=16, hour=11, category="Phân tích dữ liệu", tag="Thống kê", state="APPROVED",
        title="Tương quan và đồng tích hợp: nền tảng của giao dịch cặp",
        description="Phân biệt tương quan và đồng tích hợp, cách kiểm định ADF cho giao dịch cặp.",
        keywords=["đồng tích hợp", "giao dịch cặp", "kiểm định adf"],
        content="""## Tương quan chưa đủ

Hai cổ phiếu có tương quan cao vẫn có thể trôi xa nhau vô hạn. Giao dịch cặp cần thứ chặt hơn: **đồng tích hợp** (cointegration), nghĩa là chênh lệch giữa chúng quay về trung bình.

### Quy trình kiểm tra

1. Hồi quy giá cổ phiếu A theo B để lấy hệ số hedge.
2. Tính chuỗi chênh lệch (spread).
3. Kiểm định ADF trên spread; nếu p-value < 0,05 thì spread dừng.

```python
from statsmodels.tsa.stattools import adfuller

spread = a - beta * b
p_value = adfuller(spread)[1]
```

### Tín hiệu vào lệnh

Dùng z-score của spread:

$$z_t = \\frac{s_t - \\mu}{\\sigma}$$

Vào lệnh khi $|z| > 2$, thoát khi $|z| < 0{,}5$.

### Cảnh báo

Quan hệ đồng tích hợp có thể **vỡ** khi doanh nghiệp thay đổi cơ bản. Hãy kiểm định lại định kỳ.
""",
    ),
    dict(
        days_ago=13, hour=9, category="Tin tức thị trường", tag="Thị trường", state="APPROVED",
        title="Tổng quan thị trường tháng 9/2026: thanh khoản và dòng tiền",
        description="Nhìn lại diễn biến VN-Index, thanh khoản và khối ngoại trong tháng 9/2026.",
        keywords=["vn-index", "thanh khoản", "tháng 9"],
        content="""## Diễn biến chung

VN-Index tháng 9 dao động trong biên độ hẹp, thanh khoản bình quân phiên cải thiện so với tháng trước. Nhóm ngân hàng và bất động sản dẫn dắt, trong khi nhóm dầu khí phân hóa.

### Điểm nhấn

- Thanh khoản trung bình tăng so với tháng 8.
- Khối ngoại giảm bán ròng ở nửa cuối tháng.
- Biến động (VN30 realized volatility) hạ nhiệt.

### Góc nhìn định lượng

Khi biến động hạ nhiệt và thanh khoản tăng, các chiến lược theo xu hướng thường có điều kiện thuận lợi hơn. Tuy nhiên đây chỉ là quan sát thống kê, không phải khuyến nghị đầu tư.

*Nội dung chỉ mang tính tham khảo và giáo dục.*
""",
    ),
    dict(
        days_ago=10, hour=15, category="Python cho tài chính", tag="Python", state="APPROVED",
        title="Xây dựng bộ khung backtest vector hóa với numpy",
        description="Cách viết backtest nhanh bằng phép toán vector hóa, tránh vòng lặp và lỗi nhìn trước dữ liệu.",
        keywords=["backtest", "numpy", "vector hóa", "look-ahead bias"],
        content="""## Vì sao vector hóa?

Vòng lặp từng ngày trong Python rất chậm. Với numpy và pandas, ta có thể tính tín hiệu và lợi nhuận cho hàng trăm mã chỉ trong vài giây.

### Bộ khung tối giản

```python
signal = (sma_fast > sma_slow).astype(int)
position = signal.shift(1).fillna(0)   # tránh nhìn trước dữ liệu
gross = position * returns
cost = position.diff().abs() * 0.0015
net = gross - cost
```

### Lỗi nhìn trước (look-ahead bias)

Lỗi phổ biến nhất: dùng tín hiệu của ngày *t* để giao dịch ngay ở giá đóng cửa ngày *t*. Luôn `shift(1)` vị thế.

### Danh sách kiểm tra

- Dữ liệu đã điều chỉnh cổ tức, tách cổ phiếu.
- Phí và trượt giá được tính đầy đủ.
- Tập kiểm thử ngoài mẫu (out-of-sample) tách biệt.
""",
    ),
    dict(
        days_ago=7, hour=10, category="Quản trị rủi ro", tag="Rủi ro", state="APPROVED",
        title="Xác định kích thước vị thế theo tiêu chí Kelly",
        description="Tiêu chí Kelly, vì sao nên dùng một phần Kelly và cách áp dụng thực tế.",
        keywords=["tiêu chí kelly", "kích thước vị thế", "quản lý vốn"],
        content="""## Tiêu chí Kelly

Kelly cho biết tỷ lệ vốn tối ưu để tối đa hóa tốc độ tăng trưởng dài hạn:

$$f^* = \\frac{p \\cdot b - (1 - p)}{b}$$

với $p$ là xác suất thắng và $b$ là tỷ lệ lãi/lỗ trung bình.

### Ví dụ

Xác suất thắng 55%, lãi/lỗ 1:1 cho $f^* = 10\\%$ vốn mỗi lệnh.

### Thực tế hơn: dùng nửa Kelly

Ước lượng $p$ và $b$ luôn có sai số, và Kelly đầy đủ gây biến động rất lớn. Hầu hết nhà giao dịch dùng **0,25-0,5 Kelly**.

| Mức Kelly | Tăng trưởng | Sụt giảm |
|---|---|---|
| 1,0 | Cao nhất | Rất lớn |
| 0,5 | ~75% mức tối đa | Giảm một nửa |
| 0,25 | ~44% mức tối đa | Thấp |
""",
    ),
    dict(
        days_ago=4, hour=13, category="Phân tích dữ liệu", tag="Machine Learning", state="PENDING",
        title="Ứng dụng học máy trong dự báo xu hướng: những cạm bẫy thường gặp",
        description="Những lỗi hay gặp khi dùng học máy cho dự báo giá: rò rỉ dữ liệu, quá khớp và chia tập sai.",
        keywords=["học máy", "quá khớp", "rò rỉ dữ liệu"],
        content="""## Cạm bẫy 1: rò rỉ dữ liệu

Chuẩn hóa dữ liệu trên toàn bộ tập trước khi chia train/test là một dạng rò rỉ thông tin từ tương lai.

## Cạm bẫy 2: chia tập ngẫu nhiên

Dữ liệu chuỗi thời gian phải được chia theo thứ tự thời gian, dùng *walk-forward validation*.

## Cạm bẫy 3: quá khớp

Thử hàng nghìn tham số trên cùng một tập dữ liệu gần như chắc chắn tìm ra một "chiến lược" đẹp nhưng vô nghĩa.

*(Bản nháp, cần bổ sung ví dụ và kết quả thực nghiệm.)*
""",
    ),
    dict(
        days_ago=2, hour=16, category="Giao dịch định lượng", tag="Chiến lược", state="PENDING",
        title="Chiến lược đảo chiều ngắn hạn trên cổ phiếu vốn hóa lớn",
        description="Thử nghiệm đảo chiều 5 ngày trên nhóm cổ phiếu vốn hóa lớn của HOSE.",
        keywords=["đảo chiều", "mean reversion", "hose"],
        content="""## Giả thuyết

Cổ phiếu vốn hóa lớn giảm mạnh trong 5 phiên có xu hướng hồi nhẹ ở các phiên sau do thanh khoản dồi dào.

## Thiết lập

- Xếp hạng lợi suất 5 ngày, mua 10% thấp nhất.
- Nắm giữ 3 phiên, cân bằng lại hằng ngày.

*(Đang chờ kết quả backtest đầy đủ và chi phí giao dịch.)*
""",
    ),
    dict(
        days_ago=9, hour=11, category="Tin tức thị trường", tag="Thị trường", state="REJECTED",
        title="Dự đoán chắc chắn tăng gấp đôi danh mục trong 3 tháng",
        description="Bài viết bị từ chối vì chứa cam kết lợi nhuận không phù hợp.",
        keywords=["lợi nhuận", "cam kết"],
        content="""## Cam kết lợi nhuận

Nội dung này bị từ chối do khẳng định lợi nhuận chắc chắn, vi phạm nguyên tắc truyền thông của công ty.
""",
    ),
]

# deleted-soft sample: a duplicate draft that was removed by the admin.
DELETED_BLOG = dict(
    days_ago=14, hour=8, category="Kiến thức nền tảng", tag="Cơ bản", state="PENDING",
    title="Bài thử nghiệm: giới thiệu chuỗi thời gian (bản trùng)",
    description="Bản nháp trùng lặp đã được xóa.",
    keywords=["chuỗi thời gian"],
    content="## Bản nháp trùng\n\nĐã chuyển sang bài chính thức.\n",
    deleted_days_ago=13,
)

# LinkedIn adaptations of approved Blogs: blog index -> (mode, status, extra)
BLOG_LINKEDIN = {
    0: ("SUMMARY", "PUBLISHED", "Giao dịch định lượng không phải là phép màu: đó là kỷ luật, dữ liệu và kiểm thử.\n\nBạn mới bắt đầu? Lộ trình 4 giai đoạn từ xác suất thống kê đến quản trị rủi ro sẽ giúp bạn đi đúng hướng.\n\n#VietQuant #QuantTrading #TaiChinh"),
    2: ("SUMMARY", "PUBLISHED", "Một chiến lược lãi 40% nhưng sụt giảm 55%? Bạn cần lãi 122% chỉ để hòa vốn.\n\nMax drawdown quan trọng hơn bạn nghĩ.\n\n#VietQuant #QuanTriRuiRo"),
    3: ("CUSTOM", "FAILED", "SMA 20/50 trên VN30: không vượt trội về lợi nhuận, nhưng sụt giảm giảm gần một nửa.\n\n#VietQuant #Backtest"),
    7: ("SAME", "READY", "Kelly đầy đủ rất hấp dẫn trên giấy, nhưng thực tế hãy dùng 0,25-0,5 Kelly.\n\n#VietQuant #QuanLyVon"),
}

STANDALONE_LINKEDIN = [
    dict(days_ago=26, status="PUBLISHED", topic="Giới thiệu cộng đồng VietQuant",
         content="Chào mừng bạn đến với VietQuant: nơi chia sẻ kiến thức giao dịch định lượng bằng tiếng Việt.\n\nMỗi tuần chúng tôi đăng một bài về dữ liệu, mô hình và quản trị rủi ro.\n\n#VietQuant #QuantTrading"),
    dict(days_ago=20, status="PUBLISHED", topic="Sai lầm khi backtest",
         content="Backtest đẹp không có nghĩa là chiến lược tốt.\n\nBa lỗi hay gặp: nhìn trước dữ liệu, bỏ qua chi phí giao dịch và tối ưu tham số quá mức.\n\n#VietQuant #Backtest"),
    dict(days_ago=12, status="PUBLISHED", topic="Sharpe ratio",
         content="Sharpe ratio cho biết bạn nhận được bao nhiêu lợi nhuận trên mỗi đơn vị rủi ro.\n\nNhưng đừng quên: Sharpe cao trên dữ liệu ít vẫn có thể là ngẫu nhiên.\n\n#VietQuant #Sharpe"),
    dict(days_ago=6, status="FAILED", topic="Dòng tiền khối ngoại",
         content="Dòng tiền khối ngoại và biến động thị trường: góc nhìn từ dữ liệu.\n\n#VietQuant #ThiTruong",
         error={"code": "token_expired", "message": "Mã truy cập LinkedIn đã hết hạn. Vui lòng cấp lại quyền rồi thử xuất bản lại.", "providerStatus": 401, "retryable": False, "duplicateRisk": False, "retryAfterMs": None, "attempts": 1}),
    dict(days_ago=3, status="DRAFT", topic="Python cho nhà phân tích định lượng",
         content="Bạn nên học Python theo thứ tự nào để làm quant?\n\n1. numpy, pandas\n2. Trực quan hóa dữ liệu\n3. Backtest\n\n#VietQuant #Python"),
    dict(days_ago=1, status="READY", topic="Quản lý vốn",
         content="Quản lý vốn quan trọng hơn chọn mã.\n\nHãy xác định rủi ro tối đa mỗi lệnh trước khi vào vị thế.\n\n#VietQuant #QuanLyVon"),
]


# Create categories, blogs, publications and LinkedIn records with realistic dates.
def main() -> None:
    DatabaseManager()
    DatabaseManager.create_database_tables()
    StorageService.initialize()
    session = DatabaseManager.session
    if session.query(Blog).count():
        raise SystemExit("Blogs already exist; refusing to seed.")

    # Reuse categories that already exist (the app seeds some at startup).
    cats = {}
    for name in CATEGORIES:
        cat = session.scalar(select(Category).where(Category.slug == slugify(name)))
        if cat is None:
            cat = Category(name=name, slug=slugify(name), created_at=NOW - timedelta(days=30))
            session.add(cat)
        cat.deleted_at = None
        cats[name] = cat
    session.commit()

    blogs = []
    for spec in BLOGS + [DELETED_BLOG]:
        created = (NOW - timedelta(days=spec["days_ago"])).replace(hour=spec["hour"], minute=(spec["days_ago"] * 7) % 60)
        slug = slugify(spec["title"], lowercase=True, separator="-")
        banner = StorageService.store_image_bytes(make_png(CATEGORIES[spec["category"]]), "image/png", slug)
        stamp = created.strftime("%Y-%m-%d %H:%M:%S")
        blog = Blog(
            tag=spec["tag"], title=spec["title"], banner_url=banner, link_post=slug,
            content=spec["content"], state=spec["state"], category=spec["category"],
            category_id=cats[spec["category"]].id,
            seo={"title": spec["title"], "description": spec["description"], "banner_url": banner,
                 "url": canonical_blog_url(slug), "keywords": spec["keywords"], "author": AUTHOR,
                 "published_time": stamp, "modified_time": stamp},
            created_at=created, modified_at=created + timedelta(hours=2),
        )
        if "deleted_days_ago" in spec:
            blog.deleted_at = NOW - timedelta(days=spec["deleted_days_ago"])
        session.add(blog)
        blogs.append(blog)
    session.commit()

    # Linked LinkedIn adaptations and per-Blog publication rows.
    for index, blog in enumerate(blogs[: len(BLOGS)]):
        if blog.state != "APPROVED":
            continue
        publication = BlogPublication(blog_id=blog.id, publish_web=True, created_at=blog.created_at, modified_at=blog.created_at)
        if index in BLOG_LINKEDIN:
            mode, status, text = BLOG_LINKEDIN[index]
            published = status == "PUBLISHED"
            at = blog.created_at + timedelta(hours=3)
            record = LinkedInPost(
                content=text, topic=blog.title, media_mode="none", media=[], source_type="BLOG_ADAPTATION",
                link_placement="IN_POST", status=status,
                provider_post_id=f"urn:li:share:{7300000000000000000 + index * 1111}" if published else None,
                published_link_url=blog.seo["url"] if published else None,
                published_at=at if published else None,
                last_error=({"code": "rate_limited", "message": "LinkedIn tạm giới hạn số lần đăng. Vui lòng thử lại sau ít phút.", "providerStatus": 429, "retryable": True, "duplicateRisk": False, "retryAfterMs": 60000, "attempts": 2} if status == "FAILED" else None),
                created_at=at, modified_at=at,
            )
            session.add(record)
            session.flush()
            publication.publish_linkedin = True
            publication.linkedin_mode = mode
            publication.linkedin_link_placement = "IN_POST"
            publication.linkedin_include_web_link = True
            publication.linkedin_record_id = record.id
            publication.linkedin_status = status
            publication.linkedin_post_id = record.provider_post_id
            publication.linkedin_published_at = record.published_at
        session.add(publication)

    # Standalone LinkedIn posts.
    for index, spec in enumerate(STANDALONE_LINKEDIN):
        at = (NOW - timedelta(days=spec["days_ago"])).replace(hour=8, minute=15)
        published = spec["status"] == "PUBLISHED"
        session.add(LinkedInPost(
            content=spec["content"], topic=spec["topic"], media_mode="none", media=[],
            source_type="CUSTOM", link_placement="NONE", status=spec["status"],
            provider_post_id=f"urn:li:share:{7310000000000000000 + index * 2222}" if published else None,
            published_at=at if published else None, last_error=spec.get("error"),
            created_at=at, modified_at=at,
        ))
    session.commit()
    print("Seeded:", session.query(Blog).count(), "blogs,", session.query(LinkedInPost).count(), "LinkedIn posts")


# Delete only the rows and banner objects this script created.
def clear() -> None:
    DatabaseManager()
    session = DatabaseManager.session
    slugs = [slugify(spec["title"], lowercase=True, separator="-") for spec in BLOGS + [DELETED_BLOG]]
    blogs = session.query(Blog).filter(Blog.link_post.in_(slugs)).all()
    blog_ids = [blog.id for blog in blogs]
    topics = [blog.title for blog in blogs] + [spec["topic"] for spec in STANDALONE_LINKEDIN]
    publications = session.query(BlogPublication).filter(BlogPublication.blog_id.in_(blog_ids)).all()
    record_ids = [p.linkedin_record_id for p in publications if p.linkedin_record_id]
    for publication in publications:
        session.delete(publication)
    session.flush()
    posts = session.query(LinkedInPost).filter(
        (LinkedInPost.id.in_(record_ids)) | (LinkedInPost.topic.in_(topics))
    ).all()
    for post in posts:
        session.delete(post)
    client = StorageService._get_client()
    for blog in blogs:
        for obj in client.list_objects(settings.MINIO_BUCKET, prefix=blog.link_post + "/", recursive=True):
            client.remove_object(settings.MINIO_BUCKET, obj.object_name)
        session.delete(blog)
    session.commit()
    print("Removed:", len(blogs), "blogs,", len(posts), "LinkedIn posts")


clear() if "clear" in sys.argv[1:] else main()
