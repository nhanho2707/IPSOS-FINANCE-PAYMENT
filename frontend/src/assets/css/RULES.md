# CSS Rules — IPSOS Finance Payment

> Xem thêm: **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** — chuẩn màu sắc, typography, spacing, shadow cho toàn trang.

## Cấu trúc file

| File | Dùng cho | Import ở đâu |
|---|---|---|
| `global.css` | CSS variables (`:root`), dark mode, font import | `index.tsx` |
| `layout.css` | App shell: `.wrapper`, `.content`, `.content-detail` | `index.tsx` |
| `components.css` | Shared utilities: `.row`, action menu, typography helpers | `index.tsx` |
| `features.css` | Widget, welcome section, legend, chart, subtotal | `index.tsx` |
| `table.css` | Table, filter bar, pagination | `index.tsx` |
| `modal.css` | Modal box, modal footer, modal buttons | Import trực tiếp trong component dùng modal |
| `techcombank.css` | Techcombank panel layout, màu sắc riêng | Import trong `TechcombankLayout.tsx` |

**Không tạo thêm file CSS mới.** Mở rộng các file hiện có theo đúng phân loại trên.

---

## Khi nào dùng CSS file, khi nào dùng MUI `sx`

| Dùng CSS file | Dùng MUI `sx` |
|---|---|
| Style áp dụng cho nhiều component khác nhau | Style chỉ dùng cho 1 component cụ thể |
| Override MUI global (`.MuiTableCell-head`, v.v.) | Layout, spacing, màu sắc của 1 component |
| Style cần cascade (pseudo-class, media query phức tạp) | Responsive đơn giản (`sx={{ display: { xs: 'none', md: 'flex' } }}`) |
| Style có sẵn từ trước chưa migrate | Code mới |

> **Mục tiêu dài hạn**: di chuyển `features.css` dần sang `sx` khi refactor từng page. `global.css`, `layout.css`, `components.css`, `table.css` giữ nguyên dạng CSS file.

---

## Quy tắc đặt tên class

- **kebab-case**: `.filter-title`, `.btn-modal-footer`, `.widget-container`
- Prefix theo context: `.tcb-*` (Techcombank), `.modal-*` (modal), `.table-*` / `.filter-*` (table)
- Không dùng camelCase hay PascalCase trong CSS

---

## CSS Variables

Tất cả variables khai báo trong `global.css` `:root`. Không hardcode màu trực tiếp trong component — dùng variable.

```css
/* SAI */
color: #212121;

/* ĐÚNG */
color: var(--text-color);
```

### Variables quan trọng

| Variable | Giá trị light | Giá trị dark | Dùng cho |
|---|---|---|---|
| `--text-color` | `#212121` | `#eaeff4` | Text chính toàn app |
| `--background-color` | `#fff` | `#1a1625` | Background card/modal |
| `--body-color` | `rgb(238,242,246)` | `#121212` | Background page |
| `--main-color` | `#009d9c` | `#009d9c` | Brand color, button primary |
| `--sidebar-expanded` | `15.625rem` | — | Width sidebar mở |
| `--sidebar-collapsed` | `5.5rem` | — | Width sidebar đóng |
| `--transition-02` | `all 0.2s ease` | — | Transition nhanh |

---

## Responsive breakpoints

Dùng đúng breakpoint đã định nghĩa. **Không hardcode pixel** trong media query.

```css
/* SAI */
@media (max-width: 768px) { ... }

/* ĐÚNG — dùng var() */
/* Nhưng var() không hoạt động trong @media query (CSS spec limitation)
   nên ghi giá trị số tương ứng với variable đã đặt tên trong comment */

@media (max-width: 1024px) { ... }  /* --breakpoint-lg */
@media (max-width: 768px)  { ... }  /* --breakpoint-md */
@media (max-width: 480px)  { ... }  /* --breakpoint-sm */
```

| Variable | Giá trị | Tên |
|---|---|---|
| `--breakpoint-sm` | `480px` | Mobile nhỏ |
| `--breakpoint-md` | `768px` | Tablet |
| `--breakpoint-lg` | `1024px` | Laptop |
| `--breakpoint-xl` | `1280px` | Desktop lớn |

---

## Những điều không được làm

- **Không dùng `!important`** trừ khi override MUI (MUI inject style sau nên đôi khi cần thiết — ghi comment lý do)
- **Không hardcode màu** ngoài `global.css` — dùng variable
- **Không tạo thêm CSS file** ngoài các file đã có
- **Không viết inline style** trong JSX (trừ style dynamic cần tính toán runtime)
- **Không dùng `font-style`** để set font family — phải dùng `font-family`

---

## Bugs đã sửa (để tham khảo)

| Bug | Nguyên nhân | Fix |
|---|---|---|
| `--text-color` undefined ở light mode | Chỉ khai báo trong `body.dark`, không có trong `:root` | Thêm `--text-color: #212121` vào `:root` |
| `font-style: var(--main-font)` không có tác dụng | Sai property — `font-style` nhận `italic/normal`, không nhận font name | Đổi thành `font-family` |
| `.modal-box` không canh giữa | MUI Modal không tự center content | Thêm `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)` |
| `components.css` quá tạp | Trộn layout + utility + feature vào 1 file | Tách ra `layout.css` và `features.css` |
