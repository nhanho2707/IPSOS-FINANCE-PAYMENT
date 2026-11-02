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
