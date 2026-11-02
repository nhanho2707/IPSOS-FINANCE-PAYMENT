# Design System — IPSOS Finance Payment

> Tài liệu này định nghĩa các chuẩn về màu sắc, typography và visual token cho toàn bộ ứng dụng.
> Mọi component mới đều phải tuân thủ các quy tắc dưới đây.

---

## 1. Typography

### Font family

```css
font-family: "Inter", "Helvetica", "Arial", sans-serif;
/* CSS: var(--main-font) · MUI: theme.typography.fontFamily */
```

Inter được load qua Google Fonts trong `global.css` (có bộ ký tự tiếng Việt). Roboto vẫn được khai báo cho trang đáp viên và dashboard khách hàng đang gọi đích danh nó; code mới không dùng Roboto.

### Base font size

```css
html { font-size: 14px; }   /* root — tất cả rem tính từ đây */
body { font-size: 1rem; }   /* = 14px */
```

MUI tính `pxToRem` theo root 16px, nên các variant bên dưới được khai báo theo root 14px thật bằng hàm `rem(px)` trong `ThemeConfig.ts`.
Variant `h4`–`h6` và `subtitle1/2` giữ cách render cũ để không đổi trang đáp viên và dashboard khách hàng.

### Font scale

Dùng variant của MUI (`<Typography variant="body2">` hoặc `sx={{ typography: "caption" }}`). Không gõ `fontSize` dạng chuỗi (`"0.8125rem"`, `"14px"`) cho chữ; `fontSize` dạng số (`sx={{ fontSize: 20 }}`) chỉ dành cho icon. ESLint cảnh báo các trường hợp vi phạm ở trang nội bộ (xem `RULES.md`).

| Variant | Cỡ / chiều cao dòng | Weight | Dùng cho |
|---|---|---|---|
| `h1` | 22 / 28px | 600 | Tiêu đề trang |
| `h2` | 16 / 24px | 600 | Tiêu đề section, card, biểu đồ |
| `h3` | 14 / 20px | 600 | Tiêu đề nhóm nhỏ |
| `body1` | 14px | 400 | Văn bản chính, input |
| `body2` | 13 / 18px | 400 | Ô bảng, văn bản phụ, alert, phân trang |
| `caption` | 12 / 16px | 400 | Meta, chú thích, chip nhỏ |
| `overline` | 11 / 16px | 600, chữ hoa, +0.06em | Nhãn nhóm |
| `button` | 13px | 500 | Nút, tab |

Header bảng 12px / 600 / `text.secondary`, khai báo trong `MuiTableCell` của theme.

### Font weight

| Weight | Dùng cho |
|---|---|
| `400` | Văn bản thường |
| `500` | Nút, chip, label quan trọng |
| `600` | Tiêu đề, header bảng, mục nav đang chọn |
| `700` | Số liệu lớn (dashboard) |

Cột tiền và số lượng: `fontVariantNumeric: "tabular-nums"`, căn phải. Tiền luôn định dạng bằng `formatMoney()` (`src/utils/format.ts`), ví dụ `500,000,000 ₫`.

## 2. Color Palette

### Brand

| Token | Hex | Dùng cho |
|---|---|---|
| `BRAND.main` · `primary.main` · `--main-color` | `#007a79` | Nút chính, link, chữ màu brand. Chữ trắng trên nền này đạt 5,2:1 (WCAG AA) |
| `BRAND.dark` · `primary.dark` · `--main-color-dark` | `#00605f` | Hover, chữ trên nền teal nhạt |
| `BRAND.accent` · `primary.light` | `#009d9c` | Biểu đồ, focus ring, dấu chọn. Chỉ 3,3:1 trên nền trắng nên không dùng cho chữ nhỏ |
| `BRAND.soft` | `#e6f5f5` | Nền dòng được chọn |
| `BRAND.navy` · `secondary.main` | `#2f469c` | Chuỗi dữ liệu thứ hai |

Màu brand định nghĩa trong `src/config/ThemeConfig.ts` (`BRAND`) và đưa vào MUI theme (`palette`) lẫn biến CSS.
Không hardcode hex — trong `sx` dùng `"primary.main"`, trong CSS dùng `var(--main-color)`.
Button MUI: dùng `variant="contained"` (tự lấy màu primary), không override bằng `!important`.

### Neutral

| `NEUTRAL` | Hex | Dùng cho |
|---|---|---|
| `0` | `#ffffff` | Card, input (`background.paper`) |
| `50` | `#f6f7f9` | Nền khung app (`--canvas-color`, `background.default`), header bảng |
| `100` | `#f2f4f7` | Hover |
| `200` | `#e4e7ec` | Viền card, divider (`palette.divider`) |
| `300` | `#d0d5dd` | Viền input, nút phụ |
| `400` | `#98a2b3` | Placeholder, disabled (2,6:1, không dùng cho chữ cần đọc) |
| `600` | `#475467` | Chữ phụ (`text.secondary`, `--text-primary-color`) |
| `900` | `#101828` | Chữ chính (`text.primary`, `--text-color`) |

### Text

| Variable | Giá trị | Dùng cho |
|---|---|---|
| `--text-color` | `#101828` (sinh từ `ThemeConfig.ts`) | Text chính — heading, table value, label |
| `--text-primary-color` | `#475467` (sinh từ `ThemeConfig.ts`) | Text phụ — placeholder, mô tả, nav item |
| `--text-secondary-color` | `#2f469c` | Text nhấn màu xanh dương (tag, link) |
| `--text-third-color` | `#3948a4` | Variant xanh dương đậm hơn |
| `--text-forth-color` | `#007a79` (sinh từ `ThemeConfig.ts`) | Text accent = brand color |
| `--text-fifth-color` | `rgb(214,67,67)` | Text lỗi, cảnh báo |
| `--text-sixth-color` | `#000000de` | Text đen chuẩn MUI (87% opacity) |

### Background

| Variable | Giá trị | Dùng cho |
|---|---|---|
| `--canvas-color` | `#f6f7f9` (sinh từ `ThemeConfig.ts`) | Nền khung app (`.wrapper`): card trắng nổi trên nền xám nhạt |
| `--background-color` | `#ffffff` | Card, modal, sidebar, input |
| `--body-color` | `rgb(238,242,246)` | Nền phụ (icon button, khối nhỏ); code mới dùng `NEUTRAL` |

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

| Quotation (`QUOTATION_STATUS_TONE`) | Tone | Góp ý quotation (`FEEDBACK_STATUS_TONE`) | Tone |
|---|---|---|---|
| draft | neutral | pending | warning |
| submitted | info | resolved | success |
| fm_confirmed | brand | rejected | danger |
| approved | success | | |

Tài khoản: Active = `success`, Inactive = `neutral`, Temp password = `warning`. Dự án bị disable: chip "Disabled" tone `neutral`.

Mọi trạng thái hiển thị bằng `<StatusChip label tone />` (`src/components/StatusChip.tsx`), dùng `getStatusTone(status, map)` để lấy tone. Không dùng `Chip` của MUI với `color=...` cho trạng thái, không dùng chữ trắng trên nền màu trạng thái.

Nhãn lấy từ `formatStatus(status)` (`src/utils/format.ts`): viết hoa chữ đầu và đổi tên vài giá trị backend cho dễ hiểu: `in coming` → "Upcoming", `on going` → "In field", `fm_confirmed` → "FM confirmed", `suppended` → "Suspended". Giá trị gửi lên backend giữ nguyên.

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
| `8px` (`theme.shape.borderRadius`) | Button, input, chip và các component MUI khác |
| `0.625rem` (9px) | Nav item, card row, sidebar-user |
| `0.75rem` (10.5px) | Modal box (legacy `.modal-box`) |
| `14px` | Dialog MUI (theme `MuiDialog`) |
| `1.25rem` (17.5px) | Widget card, content area |
| `50%` | Avatar, dot status |
| `8px` | Icon wrapper (nav, icon wrap) |

### Shadow

```css
/* Widget card */
box-shadow:
  rgba(145,158,171,0.30) 0 0 0.125rem 0,
  rgba(145,158,171,0.12) 0 0.75rem 1.5rem -0.25rem;

/* Modal (legacy .modal-box) */
box-shadow: 0 4px 15px rgba(0,0,0,0.15);

/* Dialog MUI (theme) */
box-shadow: 0 24px 48px -12px rgba(16,24,40,0.18);

/* Menu, popover (theme): viền divider + */
box-shadow: 0 8px 24px rgba(0,0,0,0.08);
```

Button không đổ bóng (`MuiButton.defaultProps.disableElevation` trong theme).

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

### Button

Dùng trực tiếp `Button` / `LoadingButton` của MUI, không thêm class CSS (`.btn`, `.bg-*` đã bị xoá).
Nhãn nút viết dạng thường ("Add New Project"), theme đã tắt viết hoa — không gõ cứng chữ in hoa.

| Loại | Code |
|---|---|
| Primary | `<Button variant="contained">` — mỗi trang/dialog chỉ một nút này |
| Phụ (Import, Export…) | `<Button variant="outlined" color="inherit">` — viền xám trung tính từ theme |
| Cancel / tertiary | `<Button color="inherit">` |
| Nguy hiểm (xoá, disable) | `<Button variant="contained" color="error">` |

### Dialog

| Nhu cầu | Component |
|---|---|
| Xác nhận có/không, thông báo | `ConfirmDialog` — dùng qua `useDialog()`: `openDialog({ title, message, showConfirmButton, onConfirm, tone, confirmText })` rồi render `<ConfirmDialog {...dialogProps} />` |
| Nội dung tuỳ biến (form) | `GenericDialog` (`submitDisabled`, `loading`, `tone`) |
| Nhập một đoạn text | `UniversalInputDialog` |
| Từ chối kèm lý do | `RejectDialog` |

- Thao tác xoá / chặn / disable: `tone: "danger"` và `confirmText` ghi rõ hành động ("Delete", "Disable"), không dùng "Confirm" chung chung.
- `onConfirm` trả về Promise thì dialog tự hiện loading và chỉ đóng khi xong.
- Không dùng `alert()` / `window.confirm()` của trình duyệt.

### Số, tiền, ngày

Dùng hàm trong `src/utils/format.ts`; không gọi `numeral`, `toLocaleString` hay `dayjs().format()` để hiển thị.

| Hàm | Ví dụ | Dùng cho |
|---|---|---|
| `formatMoney(v)` | `500,000,000 ₫` | Số tiền (mọi số tiền trong app là VND) |
| `formatNumber(v)` | `1,834` | Số lượng; cột tiền mà tiêu đề đã ghi "(VND)" |
| `formatPercent(r)` | `2.1%` | Tỷ lệ |
| `formatDate(v)` | `02 Nov 2026` | Ngày |
| `formatDateTime(v)` | `02 Nov 2026, 14:05` | Ngày giờ |
| `formatDateRange(a, b)` | `1 Oct – 30 Nov 2026` | Khoảng thời gian, ví dụ thời gian field |

`DD MMM YYYY` không bị đọc nhầm giữa thói quen dd/mm và mm/dd. Date picker của MUI X dùng chung định dạng này qua `LocalizationProvider` trong `index.tsx`; không bọc thêm `LocalizationProvider` trong component. Ngày gửi lên API vẫn là `YYYY-MM-DD`.

### Toast

Thông báo ngắn, không chặn thao tác: `const { showToast } = useToast(); showToast("Saved", "success")` (`src/contexts/ToastContext.tsx`).

### Trang trong dự án

`ProjectLayout` đã hiển thị breadcrumbs và header dự án (tên, trạng thái, internal code, symphony, thời gian field).
Trang con không tự hiển thị lại "Project Name / Symphony"; cần dữ liệu dự án thì dùng `useProjectContext()` (`projectId`, `project`, `refreshProject`).
Thêm trang mới trong dự án: khai báo trong `src/config/ProjectNavConfig.ts` để sidebar và breadcrumbs cùng nhận.

### Form input

```css
font-size: 0.875rem;   /* = base */
width: 100%;           /* .textfield-add */
```

### Table

Tất cả bảng dùng component `ReusableTable` — không viết `<Table>` one-off.
Màu và cỡ chữ của header, ô, hover lấy từ theme (`MuiTableCell`, `MuiTableRow` trong `ThemeConfig.ts`). Trong `ReusableTable` chỉ còn padding, chiều rộng cột và cách xử lý tràn chữ.

| Phần | Quy định |
|---|---|
| Container | `Paper elevation={0}`, viền `divider`, bo 12px, nền `background.paper` |
| Header | 12px / 600 / `text.secondary` trên nền `NEUTRAL[50]`, `py: 1.25` |
| Ô | 13px (`body2`), `text.primary`, `py: 1`, `px: 1.5`; chữ dài cắt bằng ellipsis |
| Cột điều khiển | `type: "boolean"` hoặc `"menu"` (checkbox, switch, nút hành động): không cắt, `px: 1` |
| Hover dòng | `<TableRow hover>` → nền `NEUTRAL[50]` |
| `dense` | Bảng nhiều cột (Gifts, Transactions của dự án): chữ 12px, `px: 1`, dùng tới khi bảng được thiết kế lại với ô hai dòng |

#### Toolbar (topToolbar prop)

- Render **bên ngoài** `TableContainer` để không cuộn theo bảng
- Wrap trong `<Box sx={{ px: 2, py: 1.25 }}>` + `<Divider />` bên dưới
- Dùng `topToolbar` prop của `ReusableTable` — không thêm JSX trực tiếp vào component

#### Empty state

Tự động render khi `data.length === 0`: icon `InboxOutlinedIcon` (opacity 0.5) và `emptyText` màu `text.secondary`.

#### Loading state

Lần tải đầu hiện 5 dòng `Skeleton`; tải lại khi đã có dữ liệu hiện `LinearProgress` 3px trên đầu bảng.

#### Pagination

- Nằm trong card, ngăn cách bởi `<Divider />`
- `rowsPerPageOptions`: `[10, 25, 50, 100]`
- Luôn truyền `total`, `page`, `onPageChange`. Dữ liệu tải một lần (ví dụ bảng giá tỉnh) thì cắt trang ở client và truyền `total = rows.length`

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

## 5. Ngôn ngữ & Dark mode

- Giao diện nội bộ dùng **tiếng Anh** cho mọi nhãn, nút, tiêu đề và thông báo. Ngoại lệ: trang đáp viên (`CustomVoucher`, `CustomVoucherLog`) và màn hình phỏng vấn viên (`MiniCATI`) giữ tiếng Việt.
- Giữ nguyên tiêu đề cột trong file Excel import/export (ví dụ "Tỉnh thành", "Đơn giá quà 1") vì đó là định dạng file người dùng đang dùng.
- App **không có dark mode** (đã gỡ phần CSS hỏng). Nếu cần làm lại, dùng `colorSchemes` của MUI trong `ThemeConfig.ts`.

