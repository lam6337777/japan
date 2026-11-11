# Nihongo AI — Học tiếng Nhật cùng AI

Web học tiếng Nhật N5–N1: từ vựng (flashcard + ôn tập ngắt quãng), kanji (Hán Việt, thứ tự nét), ngữ pháp và hội thoại với AI bằng giọng nói.

## Kiến trúc

```
web japan/
├── frontend/          Next.js 16 + Tailwind — giao diện            → cổng 3100
├── backend/           Spring Boot 4 (Java 21) — API chính, JWT     → cổng 8080
├── chatbot/           Python FastAPI — gọi AI (DeepSeek), prompt    → cổng 8000
├── data/              script tải & xử lý dữ liệu học (Node.js)
└── docker-compose.yml PostgreSQL 17                                 → cổng 5433
```

```
Trình duyệt ──► frontend (Next.js) ──/api/*──► backend (Spring Boot) ──► chatbot (FastAPI) ──► DeepSeek
                                                    │
                                                    └──► PostgreSQL (người dùng, tiến độ, lịch sử chat)
```

- **frontend** chỉ lo giao diện. Request `/api/*` được Next.js chuyển tiếp sang backend.
- **backend** xử lý đăng nhập (JWT), lưu tiến độ học, lịch sử chat; là nơi duy nhất gọi chatbot.
- **chatbot** giữ API key AI, xây prompt theo trình độ, trả JSON (câu trả lời, kana, bản dịch, sửa lỗi, gợi ý). Chỉ nhận request có `X-Internal-Key` đúng.

## Chạy nhanh (Windows)

1. Mở **Docker Desktop** và đợi nó khởi động xong.
2. Nhấp đúp **`start.bat`**. File này tự bật database, chatbot, backend, frontend (mỗi service một cửa sổ), cài đặt những gì còn thiếu ở lần chạy đầu, rồi mở trình duyệt tại http://localhost:3100.
3. Tắt toàn bộ: nhấp đúp **`stop.bat`**. Dữ liệu trong database vẫn được giữ.

## Chạy thủ công (4 cửa sổ terminal)

**1. Database**
```bash
docker compose up -d
```

**2. Chatbot**
```bash
cd chatbot
python -m venv .venv                       # lần đầu
.venv\Scripts\python -m pip install -r requirements.txt   # lần đầu
copy .env.example .env                     # lần đầu, rồi điền DEEPSEEK_API_KEY
.venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload
```

**3. Backend**
```bash
cd backend
mvnw spring-boot:run
```
Flyway tự tạo bảng khi chạy lần đầu.

**4. Frontend**
```bash
cd frontend
npm install        # lần đầu
npm run dev        # mở http://localhost:3100
```

## Đưa lên mạng (miễn phí)

| Phần | Dịch vụ | Ghi chú |
|---|---|---|
| Database | [Neon](https://neon.com) Free | PostgreSQL |
| Backend + Chatbot | [Render](https://render.com) Free | Tự "ngủ" sau 15 phút không dùng; mở lại lần đầu chờ ~2–3 phút (đo thử với 0,1 CPU / 512MB) |
| Frontend | [Vercel](https://vercel.com) Hobby | |

1. **Neon** → tạo project → *Connect* → chọn **Java (JDBC)**. Ghi lại: URL dạng `jdbc:postgresql://<host>/<db>?sslmode=require`, user, password.
2. **Render** → *New* → *Blueprint* → chọn repo này (đọc `render.yaml`). Điền:
   - `DEEPSEEK_API_KEY` (chatbot)
   - `DB_URL`, `DB_USER`, `DB_PASSWORD` (từ Neon)
   - `CHATBOT_URL` = địa chỉ của service `nihongo-chatbot` (ví dụ `https://nihongo-chatbot.onrender.com`; nếu chưa biết, điền tạm rồi sửa sau trong *Environment*)
   `JWT_SECRET` và `CHATBOT_INTERNAL_KEY` được Render tự sinh.
3. **Vercel** → *Add New Project* → chọn repo → **Root Directory: `frontend`** → thêm biến `BACKEND_URL` = địa chỉ `nihongo-backend` trên Render → *Deploy*.

## API backend

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký `{email, password, displayName}` → `{token, user}` |
| POST | `/api/auth/login` | Đăng nhập → `{token, user}` |
| GET / PATCH | `/api/me` | Xem / sửa tên, trình độ |
| GET | `/api/progress` | Toàn bộ thẻ ôn tập + ngày đã học |
| PUT | `/api/progress/cards` | Ghi nhiều thẻ (bản nào `updatedAt` mới hơn thì thắng) |
| POST | `/api/progress/study-days` | Ghi nhận ngày học |
| POST | `/api/chat` | Gửi tin nhắn `{sessionId?, level, topic, grammar?, message?}` |
| GET | `/api/chat/sessions` | Danh sách cuộc hội thoại |
| GET / DELETE | `/api/chat/sessions/{id}` | Xem / xoá cuộc hội thoại |

## Dữ liệu học

```bash
cd data
npm run fetch                              # tải dữ liệu gốc về data/raw
npm run build                              # xử lý → frontend/public/data
npm run vi -- --level=n5 --kind=vocab      # dịch nghĩa tiếng Việt bằng DeepSeek (dùng key trong chatbot/.env)
```

- Hán Việt kanji N5, N4: `data/vi/kanji-n5.json`, `kanji-n4.json` (sửa tay được).
- Ngữ pháp: `frontend/src/data/grammar-n5.json`.

## Cấu hình

| Biến | Nơi đặt | Mặc định |
|---|---|---|
| `DEEPSEEK_API_KEY` | `chatbot/.env` | (bắt buộc để chat) |
| `CHATBOT_INTERNAL_KEY` | `chatbot/.env` + biến môi trường backend | `dev-internal-key` |
| `JWT_SECRET` | biến môi trường backend | giá trị dev — **đổi khi chạy thật** |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | biến môi trường backend | PostgreSQL ở docker-compose |
| `BACKEND_URL` | biến môi trường frontend | `http://localhost:8080` |
