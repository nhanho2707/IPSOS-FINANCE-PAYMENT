## Cài đặt

1. Cài [Node.js](https://nodejs.org/en/download) 22 LTS (Vite cần Node 20.19 trở lên).
2. Trong thư mục `frontend`, chạy `npm install`.
3. Chạy `npm start` rồi mở http://localhost:3000. API mặc định ở http://localhost:8000 (`src/config/ApiConfig.ts`).

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm start` (hoặc `npm run dev`) | Dev server Vite ở cổng 3000 |
| `npm run build` | Kiểm tra kiểu TypeScript rồi build vào `build/` |
| `npm run preview` | Chạy thử bản build ở cổng 3000 |
| `npm run typecheck` | Chỉ kiểm tra kiểu |
| `npm run lint` | ESLint (gồm luật chặn mã màu và cỡ chữ viết tay) |
| `npm run test:e2e` | Playwright với API giả lập (`e2e/support/mockApi.ts`); ảnh chụp lưu ở `e2e/screenshots` |
| `npm run test:e2e:baseline` rồi `npm run test:e2e:visual` | Chụp ảnh tham chiếu trên nhánh gốc, chuyển sang nhánh mới rồi so sánh; khác biệt xem trong `e2e/report` |

Lần đầu chạy Playwright trên máy mới: `npx playwright install chromium`.

## CI

`.github/workflows/frontend.yml` chạy cho mọi PR có sửa `frontend/`:

- **Lint, build and e2e** (bắt buộc qua): `npm run lint`, `npm run build`, `npm run test:e2e`. Ảnh chụp của PR nằm trong artifact `e2e-screenshots`; khi lỗi có thêm `e2e-report`.
- **Screenshots against the base branch** (chỉ cảnh báo): chụp cùng các màn hình trên nhánh gốc rồi so với PR. Màn hình nào khác sẽ được liệt kê trong phần tóm tắt của job; ảnh trước/sau và ảnh khác biệt nằm trong artifact `visual-diff` (mở `report/index.html`).
