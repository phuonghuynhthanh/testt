# Tài liệu triển khai production (VietQuant CMS)

Tài liệu bàn giao: mô tả **hiện tại** hệ thống đang được deploy thế nào và cách cập nhật. Không chứa bí mật (token, mật khẩu); các giá trị đó chỉ nằm trong `/opt/vietquant-cms/.env.production` trên VPS.

> Cập nhật lần đầu: 2026-10-05. Nếu cách deploy thay đổi, hãy sửa tài liệu này.

## 1. Tổng quan kiến trúc

```
Trình duyệt ──► Hostinger (frontend tĩnh, React/Vite)
                    │  gọi API qua HTTPS
                    ▼
            https://vietquant.qtus.net  ──► Nginx (VPS dùng chung của công ty)
                                              ├─ /cms-media/*  ──► MinIO  127.0.0.1:9120   (ảnh, URL đã ký)
                                              └─ /*            ──► API    127.0.0.1:8020   (FastAPI + gunicorn)
                                                                     └─► Postgres (mạng nội bộ Docker, không mở cổng)
```

| Thành phần | Chạy ở đâu | Chi tiết |
|---|---|---|
| Frontend (`admin/`) | Hostinger shared hosting | `https://salmon-ram-204391.hostingersite.com`, chỉ file tĩnh trong `public_html` |
| Backend (`backend/blog/`) | VPS `103.77.242.41` (SSH cổng **2023**) | Docker Compose project tên **`vqcms`**, thư mục `/opt/vietquant-cms` |
| Database | Container `vqcms-postgres-1` | Volume `vqcms_postgres_data`, **không** publish cổng ra host |
| Lưu ảnh | Container `vqcms-minio-1` | Volume `vqcms_minio_data`, bucket `cms-media`, chỉ nghe `127.0.0.1:9120` |
| HTTPS | Nginx + Let's Encrypt | Cert `vietquant.qtus.net`, certbot tự gia hạn (hết hạn lần đầu 2027-01-03) |

## 2. Nguyên tắc: VPS dùng chung, không đụng thứ có sẵn

VPS này chạy rất nhiều dự án khác của công ty. Quy tắc đã áp dụng và cần giữ:

- Stack này **tách biệt hoàn toàn**: project Compose `vqcms`, volume `vqcms_*`, thư mục `/opt/vietquant-cms`.
- **Không** sửa file/container/volume của dự án khác (đặc biệt `quantvn-blog` cổng 8004 là website cũ, không liên quan).
- Nginx: chỉ **thêm 1 file mới** `/etc/nginx/servers/vietquant-cms.conf`. Không sửa `gateway.conf`, `quantvn.conf`...
- Chỉ `nginx -t && systemctl reload nginx`, **không** `restart`.
- **Không** chạy `docker system prune`, `docker image prune`, `docker volume prune`, `docker compose down -v` ngoài phạm vi project `vqcms`.
- Cổng đã cấp: **8020** (API), **9120** (MinIO), cả hai chỉ bind `127.0.0.1`. Cổng 8001–8016 đã bị dự án khác dùng.

### Hạn chế tài nguyên của VPS (đã biết)
- Đĩa `/` thường ở mức ~96% (còn khoảng 2,7GB). **Không build image trên VPS.**
- RAM khoảng 6GB, trống ít, **không có swap**. Giới hạn container: api 512MB, postgres 256MB, minio 256MB.
- Nên nhờ người quản lý VPS thêm swap và dọn image không dùng (việc của họ, không tự làm).
- `ufw` đang tắt và các cổng Docker của dự án khác bind `0.0.0.0` (kể cả Postgres 5432–5436): vấn đề bảo mật chung của VPS, cần báo người quản lý.

## 3. Các file trong repo liên quan deploy

| File | Vai trò |
|---|---|
| `backend/blog/Dockerfile` | Build image API (gunicorn + uvicorn, 1 worker) |
| `backend/blog/compose.yaml` | **Chỉ cho local dev** (postgres + minio) |
| `backend/blog/compose.prod.yaml` | Stack production (api + postgres + minio), dùng cả ở local thử production và trên VPS |
| `backend/blog/.env.production.example` | Mẫu biến môi trường production (không có bí mật) |
| `backend/blog/deploy/vietquant-cms.http.conf` | Nginx giai đoạn 1: chỉ phục vụ xác thực cert |
| `backend/blog/deploy/vietquant-cms.conf` | Nginx cuối cùng: HTTPS, API và `/cms-media/` |
| `backend/blog/tools/seed_demo.py` | Nạp / xóa dữ liệu mẫu tiếng Việt (xem mục 8) |
| `backend/blog/tools/vps_survey.sh` | Khảo sát VPS chỉ-đọc trước khi deploy |
| `admin/.env.hostinger.example` | Mẫu biến môi trường build frontend cho Hostinger |
| `admin/public/.htaccess` | Chuyển mọi đường dẫn về `index.html` (React Router) |
| `DEPLOY.md` | Hướng dẫn chạy production ở local |

Các file `.env*` thật (chứa bí mật) bị git ignore; chỉ commit file `*.example`.

## 4. Trên VPS có gì

```
/opt/vietquant-cms/
├── compose.prod.yaml        # bản sao từ repo
├── .env.production          # BÍ MẬT, chmod 600, chỉ nằm trên VPS
├── vietquant-cms.conf       # bản sao file nginx cuối
└── vietquant-cms.http.conf  # bản sao file nginx giai đoạn 1
/etc/nginx/servers/vietquant-cms.conf    # file nginx đang chạy
/var/www/vqcms-acme/                     # webroot cho certbot
```

Container: `vqcms-api-1`, `vqcms-postgres-1`, `vqcms-minio-1`. Image: `vqcms-api:<số>` (nạp bằng `docker load`), `postgres:16-alpine` (có sẵn trên VPS), `minio/minio:RELEASE.2025-07-23T15-54-02Z` (nạp bằng `docker load`).

> **Lưu ý MinIO:** Docker Hub không còn cho kéo `minio/minio`, nên image được đóng gói từ máy dev (`docker save`) rồi nạp lên VPS. Compose ghim đúng phiên bản trên.

### Biến môi trường quan trọng (`.env.production`)
| Biến | Giá trị / ý nghĩa |
|---|---|
| `API_IMAGE` | Tag image API đang chạy, ví dụ `vqcms-api:1` |
| `API_HOST_PORT` / `MINIO_HOST_PORT` | `8020` / `9120` |
| `ALLOWED_ORIGINS` | `https://salmon-ram-204391.hostingersite.com,https://vietquant.com,https://www.vietquant.com` (CORS, ngăn cách bằng dấu phẩy; phải khớp chính xác scheme + domain, không có `/` cuối) |
| `MINIO_PUBLIC_ENDPOINT` / `MINIO_PUBLIC_SECURE` | `vietquant.qtus.net` / `true`: host dùng để **ký URL ảnh** cho trình duyệt |
| `RATE_LIMIT_TRUST_PROXY` | `true` (an toàn vì Nginx **ghi đè** `X-Forwarded-For`) |
| `ADMIN_PASSWORD_HASH` | Hash argon2, **phải đặt trong dấu nháy đơn** (chứa ký tự `$`) |
| `DATABASE_HOST`, `MINIO_ENDPOINT` | Compose tự ghi đè thành `postgres` và `minio:9000` |

Muốn thấy các khóa còn lại, xem `backend/blog/.env.production.example`.

## 5. Cập nhật code

### 5.1 Backend (build ở máy dev, KHÔNG build trên VPS)
```bash
# Máy dev (Git Bash)
cd backend/blog
docker build -t vqcms-api:2 .                     # tăng số tag mỗi lần
docker save vqcms-api:2 | ssh -p 2023 root@103.77.242.41 "docker load"
```
```bash
# VPS
cd /opt/vietquant-cms
sed -i 's/^API_IMAGE=.*/API_IMAGE=vqcms-api:2/' .env.production
docker compose -p vqcms --env-file .env.production -f compose.prod.yaml up -d --no-build api
docker logs vqcms-api-1 --tail 20
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8020/docs   # kỳ vọng 200
```
`up -d api` chỉ tạo lại container API; Postgres và MinIO giữ nguyên nên dữ liệu không mất.

**Quay lui:** đặt lại `API_IMAGE` về tag cũ và chạy lại lệnh `up -d`. Chỉ xóa image cũ (`docker rmi vqcms-api:<cũ>`) sau khi bản mới ổn định; **không** dùng `docker image prune`.

### 5.2 Thay đổi cấu trúc database (quan trọng)
Backend dùng `create_all` và một vài hàm migration thủ công lúc khởi động: chỉ **tạo bảng mới**, **không tự thêm cột** vào bảng đã có. Khi thêm/đổi cột cần viết migration (`ALTER TABLE`) trước khi deploy, nếu không API sẽ lỗi. Luôn sao lưu trước:
```bash
docker exec vqcms-postgres-1 pg_dump -U <DATABASE_USERNAME> <DATABASE_NAME> | gzip > ~/vqcms-backup-$(date +%F).sql.gz
```

### 5.3 Đổi biến môi trường
Sửa `/opt/vietquant-cms/.env.production` trên VPS rồi chạy lại lệnh `up -d` (mục 5.1) để container nhận giá trị mới. Không đưa bí mật vào git hay chat.

### 5.4 Frontend (Hostinger)
```bash
cd admin
npm run build:hostinger        # ra thư mục dist-hostinger/ (dùng .env.hostinger, trỏ API về vietquant.qtus.net)
```
Trong hPanel: File Manager, `public_html`, **xóa thư mục `assets` cũ**, rồi upload toàn bộ nội dung `dist-hostinger/` (kể cả `.htaccess`). Tải lại trình duyệt bằng Ctrl+Shift+R. Kiểm tra tab Network thấy request tới `https://vietquant.qtus.net/...`.

> **Bẫy đã gặp:** `npm run build` (ra `dist/`) là bản cho test local, trỏ `localhost:8010`. Nếu upload nhầm bản này thì đăng nhập sẽ hỏng. Luôn dùng `build:hostinger` và `dist-hostinger/` cho Hostinger.

## 6. Nginx và SSL

- Cấu hình cuối: `backend/blog/deploy/vietquant-cms.conf` → `/etc/nginx/servers/vietquant-cms.conf` (thư mục `servers/` được include sẵn bởi `gateway.conf`).
- Cert được cấp bằng `certbot certonly --webroot -w /var/www/vqcms-acme -d vietquant.qtus.net` nên certbot **không** sửa cấu hình Nginx. Gia hạn tự động bằng tác vụ của certbot.
- `/cms-media/` chỉ cho `GET`/`HEAD`, chuyển vào MinIO với header `Host` giữ nguyên (cần cho chữ ký URL).
- `X-Forwarded-For` bị ghi đè bằng `$remote_addr` (không append): bộ giới hạn tốc độ của app tin vào header này.
- Luôn kiểm tra rồi mới nạp lại:
  ```bash
  nginx -t 2>&1 | grep -v ssl_stapling   # các cảnh báo ssl_stapling là của cert cũ, bỏ qua
  systemctl reload nginx
  ```
- Quay lui Nginx: xóa `/etc/nginx/servers/vietquant-cms.conf`, `nginx -t`, `systemctl reload nginx`.

## 7. Kiểm tra sức khỏe & xử lý sự cố

```bash
cd /opt/vietquant-cms
docker compose -p vqcms --env-file .env.production -f compose.prod.yaml ps
docker stats --no-stream | grep vqcms
curl -s -o /dev/null -w "%{http_code}\n" https://vietquant.qtus.net/docs
ss -tlnp | grep -E ":8020|:9120"          # phải chỉ hiện 127.0.0.1
```

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Đăng nhập báo "Thông tin đăng nhập không hợp lệ" | Sai mật khẩu, bị giới hạn 5 lần/phút, **hoặc frontend đang trỏ nhầm API** (xem tab Network: request phải tới `vietquant.qtus.net`) |
| Trình duyệt báo lỗi CORS / request không có Status | `ALLOWED_ORIGINS` sai domain frontend, hoặc đã upload nhầm bản `dist/` local |
| Ảnh banner không hiện | `MINIO_PUBLIC_ENDPOINT` sai, hoặc Nginx thiếu `location /cms-media/` |
| API 502 từ Nginx | Container `vqcms-api-1` đang restart; xem `docker logs vqcms-api-1 --tail 50` |
| Container MinIO bị khởi động lại | Chạm trần RAM 256MB; theo dõi `docker stats` (có `restart: unless-stopped`) |
| Trang danh sách gọi `page=0` → 422 | Lỗi cũ đã sửa; đảm bảo dùng bản frontend mới nhất |

## 8. Dữ liệu mẫu (demo) và dữ liệu thật

`backend/blog/tools/seed_demo.py` nạp dữ liệu tiếng Việt như admin đã dùng vài tuần:
```bash
# Upload file lên VPS rồi chạy trong container API
docker exec -i -w /app vqcms-api-1 python - < seed_demo.py          # nạp (từ chối nếu đã có blog)
docker exec -i -w /app vqcms-api-1 python - clear < seed_demo.py   # xóa đúng các dòng demo + ảnh banner
```
**Cảnh báo:** bài APPROVED hiển thị công khai qua `GET /blog/client/blogs`, và các bản ghi LinkedIn "đã đăng" là **giả**. Hãy chạy `clear` trước khi dùng thật. Bài viết thật không bị `clear` xóa.

## 9. Bảo mật

- Bí mật production (`JWT_SECRET`, mật khẩu DB, khóa MinIO, token LinkedIn/Gemini/Cloudflare...) chỉ nằm trong `/opt/vietquant-cms/.env.production` (`chmod 600`). Các giá trị JWT/DB/MinIO được sinh riêng cho production, khác với local.
- Token LinkedIn là **thật**: thao tác "Xuất bản LinkedIn" sẽ đăng lên Company Page thật. Cẩn thận khi thử.
- Nếu nghi ngờ lộ bí mật: đổi giá trị trong `.env.production`, chạy lại `up -d`, và thu hồi/cấp lại token ở nhà cung cấp.
- Giữ nguyên các dịch vụ Docker khác trên VPS; không mở thêm cổng ra `0.0.0.0`.

## 10. Danh sách việc còn lại / rủi ro đã biết

- [ ] Nhờ người quản lý VPS: thêm swap, dọn image không dùng (~21GB có thể thu hồi), bật tường lửa.
- [ ] Thiết lập sao lưu Postgres định kỳ (cron `pg_dump`); hiện chưa có.
- [ ] Giám sát RAM của MinIO (đang dùng gần trần 256MB lúc rảnh).
- [ ] Cân nhắc đổi `DOMAIN_URL` nếu domain website công khai không phải `vietquant.com`.
- [ ] Chưa có quy trình CI/CD: deploy hiện thủ công theo mục 5.
