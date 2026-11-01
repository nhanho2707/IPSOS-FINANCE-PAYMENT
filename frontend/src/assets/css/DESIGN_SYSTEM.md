# Design System — IPSOS Finance Payment

> Tài liệu này định nghĩa các chuẩn về màu sắc, typography và visual token cho toàn bộ ứng dụng.
> Mọi component mới đều phải tuân thủ các quy tắc dưới đây.

---

## 1. Typography

### Font family

```css
font-family: "Roboto", "Helvetica", "Arial", sans-serif;
/* Variable: var(--main-font) */
```

Không import hoặc sử dụng font khác. Roboto đã được load qua Google Fonts trong `global.css`.

### Base font size

```css
html { font-size: 14px; }   /* root — tất cả rem tính từ đây */
body { font-size: 1rem; }   /* = 14px */
```

Mọi giá trị `font-size` trong code nên dùng `rem` để scale đồng bộ khi base thay đổi.
Chỉ dùng `px` khi cần override MUI (những chỗ đã dùng `!important`).

### Font scale

| Token | rem | px tương đương | Dùng cho |
|---|---|---|---|
| `xs` | `0.75rem` | ~10.5px | Badge, label phụ, caption |
| `sm` | `0.8125rem` | ~11.4px | Table cell, table header |
| `base` | `0.875rem` | ~12.3px | Body text, button, form input |
| `md` | `1rem` | 14px | Sidebar section title, widget title |
| `lg` | `1.0625rem` | ~14.9px | Page title (`.filter-title`), modal title |
| `xl` | `1.25rem` | ~17.5px | Heading section |
| `2xl` | `1.5rem` | 21px | Widget số liệu lớn (dashboard) |

### Font weight

| Weight | Dùng cho |
|---|---|
| `400` | Body text thông thường |
| `500` | Button, label quan trọng |
| `600` | Page title, section heading, active nav item |
| `700` | Widget số liệu lớn |

### Line height

```css
line-height: 1.5;   /* default body */
line-height: 2.5rem; /* welcome section items — do legacy, không nhân rộng */
```

---

## 2. Color Palette

### Brand

| Variable | Hex | Dùng cho |
|---|---|---|
| `--main-color` | `#009d9c` | Button primary, active nav, accent, icon màu chính |
| `--main-color-dark` | `#007a79` | Hover của button primary |

Màu brand được định nghĩa trong `src/config/ThemeConfig.ts` (`BRAND`) và đưa vào MUI theme (`palette.primary`) lẫn biến CSS.
Không dùng `#009d9c` hardcode — trong `sx` dùng `"primary.main"`, trong CSS dùng `var(--main-color)`.
Button MUI: dùng `variant="contained"` (tự lấy màu primary), không cần override bằng `!important`.

### Text

| Variable | Light | Dark | Dùng cho |
|---|---|---|---|
| `--text-color` | `#212121` | `#eaeff4` | Text chính — heading, table value, label |
| `--text-primary-color` | `#707070` | `#707070` | Text phụ — placeholder, mô tả, nav item |
| `--text-secondary-color` | `#2f469c` | `#2f469c` | Text nhấn màu xanh dương (tag, link) |
| `--text-third-color` | `#3948a4` | `#3948a4` | Variant xanh dương đậm hơn |
| `--text-forth-color` | `#009d9c` | `#009d9c` | Text accent = brand color |
| `--text-fifth-color` | `rgb(214,67,67)` | — | Text lỗi, cảnh báo |
| `--text-sixth-color` | `#000000de` | — | Text đen chuẩn MUI (87% opacity) |

### Background

| Variable | Light | Dark | Dùng cho |
|---|---|---|---|
| `--background-color` | `#ffffff` | `#1a1625` | Card, modal, sidebar, input |
| `--body-color` | `rgb(238,242,246)` | `#121212` | Page background, row striped, button icon |

### Tonal / Interactive (dùng với opacity — không có variable riêng)

Áp dụng cho hover, active states của nav item, icon wrap. Dùng inline `rgba()`:

| Trạng thái | Màu | Dùng cho |
|---|---|---|
| Icon wrap default | `rgba(0,157,156, 0.08)` | Background icon nav item |
| Icon wrap hover | `rgba(0,157,156, 0.18)` | Hover icon nav item |
| Nav item hover | `rgba(0,157,156, 0.08)` | Background link khi hover |
| Nav item active | `rgba(0,157,156, 0.12)` | Background link đang active |
| Icon wrap active | `rgba(0,157,156, 0.18)` | Background icon khi active |
| Logout button hover | `rgba(229,57,53, 0.08)` | Hover nút đăng xuất |

### Status (nguồn duy nhất: `src/config/ThemeConfig.ts`)

Màu trạng thái chia thành 6 **tone**. Mỗi tone có 3 màu: `bg` (nền chip), `fg` (chữ, tương phản ≥ 5.7:1 trên `bg`) và `dot` (chấm tròn, tương phản ≥ 3:1 trên nền trắng).

| Tone | bg | fg | dot |
|---|---|---|---|
| `neutral` | `#eceff1` | `#455a64` | `#78909c` |
| `info` | `#e3f2fd` | `#0d47a1` | `#1e88e5` |
| `brand` | `#e0f4f4` | `#00605f` | `#009d9c` |
| `success` | `#e8f5e9` | `#1b5e20` | `#43a047` |
| `warning` | `#fff3e0` | `#8a4500` | `#ef6c00` |
| `danger` | `#fdecea` | `#b71c1c` | `#e53935` |

Ánh xạ trạng thái → tone:

| Project (`PROJECT_STATUS_TONE`) | Tone | Transaction / Gift (`TRANSACTION_STATUS_TONE`) | Tone |
|---|---|---|---|
| planned | neutral | pending | warning |
| in coming | info | success | success |
| on going | brand | refused | neutral |
| completed | success | failed | danger |
| on hold | warning | suppended | neutral |
| cancelled | danger | | |

Hiển thị trạng thái bằng `<StatusChip label tone />` (`src/components/StatusChip.tsx`), dùng `getStatusTone(status, map)` để lấy tone. Không dùng chữ trắng trên nền màu trạng thái.

CSS có thể dùng biến `--status-<tone>-bg|fg|dot` (được sinh từ `ThemeConfig.ts` qua `GlobalStyles`).

### Provider

| Variable | Hex | Provider |
|---|---|---|
| `--gotit-color-primary` | `#ed1c24` | GotIt đỏ |
| `--gotit-color-secondary` | `#00bd8f` | GotIt xanh |
| `--vinnet-color-primary` | `#007aff` | Vinnet xanh dương |
| `--vinnet-color-secondary` | `#7a00df` | Vinnet tím |

### Avatar (color rotation)

10 màu dùng xoay vòng cho avatar, lưu trong `--avatar-primary-color` → `--avatar-tenth-color`.
Không hardcode màu avatar trực tiếp — lấy từ variable theo index.

---

## 3. Visual Tokens

### Border radius

| Giá trị | Dùng cho |
|---|---|
| `0.375rem` (5px) | Badge nhỏ |
| `0.5rem` (7px) | Button `.btn`, toggle button |
| `0.625rem` (9px) | Nav item, card row, sidebar-user, modal button |
| `0.75rem` (10.5px) | Modal box |
| `1.25rem` (17.5px) | Widget card, content area |
| `50%` | Avatar, dot status |
| `8px` | Icon wrapper (nav, icon wrap) |

### Shadow

```css
/* Widget card */
box-shadow:
  rgba(145,158,171,0.30) 0 0 0.125rem 0,
  rgba(145,158,171,0.12) 0 0.75rem 1.5rem -0.25rem;

/* Modal */
box-shadow: 0 4px 15px rgba(0,0,0,0.15);

/* Button (.btn) */
box-shadow:
  0 0.1875rem 0.0625rem -0.125rem rgba(0,0,0,0.20),
  0 0.125rem  0.125rem  0        rgba(0,0,0,0.14),
  0 0.0625rem 0.3125rem 0        rgba(0,0,0,0.12);
```

### Transition

| Variable | Giá trị | Dùng cho |
|---|---|---|
| `--transition-02` | `all 0.2s ease` | Hover, toggle nhanh |
| `--transition-03` | `all 0.3s ease` | Sidebar open/close |
| `--transition-04` | `all 0.4s ease` | Animation chậm hơn |

Không dùng `transition: all` cho những property không cần thiết — ảnh hưởng performance.
Ưu tiên viết rõ property: `transition: background-color 0.2s ease`.

### Spacing

Dùng bội số của `0.25rem` (3.5px với base 14px):

| Giá trị | Dùng phổ biến |
|---|---|
| `0.25rem` | Gap nhỏ, margin badge |
| `0.5rem` | Padding button nhỏ |
| `0.625rem` | Gap nav item, padding card |
| `0.75rem` | Gap filter bar |
| `1rem` | Padding sidebar, section gap |
| `1.5rem` | Content padding (tablet) |
| `2rem` | Modal padding |

---

## 4. Component Patterns

### Button primary

```css
background-color: var(--main-color);
color: #fff;
font-size: 0.875rem;   /* base */
font-weight: 500;
border-radius: 0.5rem;
padding: 0.5rem 1.375rem;
```

### Button destructive (logout, cancel)

```css
color: #e53935;
background: transparent;
font-size: 0.875rem;
font-weight: 500;
/* hover: background-color: rgba(229,57,53,0.08) */
```

### Form input

```css
font-size: 0.875rem;   /* = base */
width: 100%;           /* .textfield-add */
```

### Table

Tất cả bảng dùng component `ReusableTable` — không viết `<Table>` one-off.
Style được áp qua `sx` prop trực tiếp, **không** override `.MuiTableCell-*` trong CSS.

#### Container (Paper wrapper)

```tsx
<Paper elevation={0} sx={{
  border: "1px solid",
  borderColor: "var(--body-color)",
  borderRadius: "12px",
  overflow: "hidden",
  backgroundColor: "var(--background-color)",
}} />
```

#### Header cell

```tsx
sx={{
  backgroundColor: "var(--body-color)",
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: "var(--text-color)",
  py: 1.25,
  px: 1.5,
  borderBottom: "2px solid",
  borderBottomColor: "rgba(0, 157, 156, 0.2)",   // teal nhẹ
  whiteSpace: "nowrap",
}}
```

#### Body cell

```tsx
sx={{
  fontSize: "0.8125rem",
  color: "var(--text-color)",
  py: 1,
  px: 1.5,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}}
```

#### Row hover

```tsx
sx={{
  transition: "background-color 0.15s ease",
  "&:hover": { backgroundColor: "rgba(0, 157, 156, 0.05)" },
  "&:last-child td": { border: 0 },
}}
```

#### Toolbar (topToolbar prop)

- Render **bên ngoài** `TableContainer` để không cuộn theo bảng
- Wrap trong `<Box sx={{ px: 2, py: 1.25 }}>` + `<Divider />` bên dưới
- Dùng `topToolbar` prop của `ReusableTable` — không thêm JSX trực tiếp vào component

#### Empty state

```tsx
// Tự động render khi data.length === 0
// Icon: InboxOutlinedIcon, opacity 0.5
// Text: "Không có dữ liệu", fontSize 0.875rem, màu --text-primary-color
```

#### Loading state

```tsx
// CircularProgress size=28, thickness=4, màu var(--main-color)
// Căn giữa toàn bộ colSpan, py: 6
```

#### Pagination

- Nằm trong card, ngăn cách bởi `<Divider />`
- `rowsPerPageOptions`: `[10, 25, 50, 100]`
- Font size đồng bộ `0.8125rem`

#### Quy tắc chung

| Quy tắc | Lý do |
|---|---|
| Dùng `sx` thay vì class CSS cho cell | Tránh specificity conflict với MUI stylesheet |
| Không đặt `height` cứng trên row | Để content tự điều chỉnh, tránh overflow |
| `tableLayout: "fixed"` + `width` trên column | Ngăn layout shift khi data load |
| `stickyHeader` luôn bật | Header luôn visible khi scroll dọc |
| `maxHeight: calc(100vh - 240px)` | Giữ bảng trong viewport, tránh page scroll |

### Active nav item (sidebar)

```css
background-color: rgba(0,157,156, 0.12);
color: var(--main-color);
font-weight: 600;
/* icon wrap: rgba(0,157,156, 0.18) */
```

---

## 5. Dark Mode

Dark mode toggle qua `document.body.classList.toggle("dark")`.

Chỉ có 4 variable thay đổi trong dark mode — chỉ cần dùng đúng variable, dark mode tự hoạt động:

| Variable | Light | Dark |
|---|---|---|
| `--background-color` | `#ffffff` | `#1a1625` |
| `--body-color` | `rgb(238,242,246)` | `#121212` |
| `--text-color` | `#212121` | `#eaeff4` |
| (màu khác) | giữ nguyên | giữ nguyên |

**Quy tắc**: Không hardcode màu `#fff` hay `#212121` trong component — dùng variable để được dark mode miễn phí.
