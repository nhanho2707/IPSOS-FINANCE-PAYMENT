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
| `--canvas-color` | `#f6f7f9` (sinh từ `ThemeConfig.ts`) | Nền khung app (AppShell dùng `background.default` cùng giá trị): card trắng nổi trên nền xám nhạt |
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
Nhãn nút viết hoa chữ đầu câu ("New project", "Import respondents"); theme đã tắt viết hoa toàn bộ — không gõ cứng chữ in hoa.

| Loại | Code |
|---|---|
| Primary | `<Button variant="contained">` — mỗi trang/dialog chỉ một nút này |
| Phụ (Import, Export…) | `<Button variant="outlined" color="inherit">` — viền xám trung tính từ theme |
| Cancel / tertiary | `<Button color="inherit">` |
| Nguy hiểm (xoá, disable) | `<Button variant="contained" color="error">` |

### Khung ứng dụng (AppShell)

`src/components/Shell/AppShell.tsx` dựng khung cho `DefaultLayout` và `ProjectLayout`: sidebar trắng bên trái, nội dung trên nền `background.default`, tối đa 1600px.

| Phần | Quy định |
|---|---|
| Sidebar | 248px; thu gọn còn 64px chỉ có icon + tooltip. Trạng thái thu gọn lưu trong `localStorage` (`ipsos.sidebar.collapsed`) |
| Điện thoại (< 768px) | Sidebar thành `Drawer` tạm thời, mở từ thanh trên cùng (nút menu, tên trang/dự án, nút tìm kiếm); đóng khi chuyển trang |
| Nhóm menu | Nhãn `overline` màu `NEUTRAL[500]`. Mục đang mở: nền `NEUTRAL[100]`, chữ `text.primary` 600, icon `primary.main`. Mục thường: chữ `NEUTRAL[600]`, icon `NEUTRAL[500]`, icon 18px |
| Tìm kiếm ⌘K / Ctrl K | `CommandPalette`: nhảy tới trang (theo nhãn và `keywords`) hoặc dự án (tên, internal code, Symphony). ↑↓ để chọn, Enter để mở |
| Người dùng | `UserMenu` ở chân sidebar: avatar chữ cái đầu, tên, vai trò; menu có Log out |

Menu khai báo trong config, không viết trong component:

- Trang cấp app: `src/config/AppNavConfig.ts` (nhóm Work, Admin; `allowedRoles` lấy từ `ROLE_ACCESS`).
- Trang trong dự án: `src/config/ProjectNavConfig.ts`, mỗi mục có `group` (`plan`, `field`, `payments`, hoặc `bottom` cho Settings), `description` và `title` nếu nhãn sidebar quá ngắn.

### Đầu trang (PageHeader)

`<PageHeader title description actions breadcrumbs status />` ở đầu mọi trang nội bộ: tiêu đề `h1` (22px), một câu mô tả `body2`, các nút ở bên phải. Trong `actions` chỉ có **một** nút `variant="contained"`; nút khác là outlined/text hoặc nằm trong menu ⋯.

### Trang trong dự án

`ProjectLayout` vẽ header cho mọi trang con: breadcrumb "Projects › tên dự án", tiêu đề và mô tả lấy từ `ProjectNavConfig`. Tên, mã và trạng thái dự án nằm ở bộ chuyển dự án (`ProjectSwitcher`) trên sidebar; bấm vào đó mở ⌘K ở chế độ chuyển dự án và giữ nguyên trang con đang xem.

- Nút của trang (Import, Add…) đặt trong `<ProjectPageActions>`: component này portal nút vào header của layout, nút vẫn dùng state và handler của trang.
- Cần dữ liệu dự án thì dùng `useProjectContext()` (`projectId`, `project`, `refreshProject`); trang con không tự hiển thị lại tên dự án.
- Dự án bị disable: header hiện `Alert` thông tin.
- **Overview** (`pages/Project/Overview.tsx`) là trang đầu tiên của mọi vai trò khi mở dự án. Mỗi thẻ chỉ tải dữ liệu mà vai trò đó được đọc (`useProjectOverview`): thống kê giao dịch cho Admin, Finance, Scripter; số quà theo trạng thái cho Admin; báo giá cho Admin, Researcher, Field Manager. Thẻ không tải được thì ghi "Not available right now" thay vì làm hỏng cả trang.

### Thẻ số liệu, nhà cung cấp, ô hai dòng

| Component | Dùng cho |
|---|---|
| `StatCard` | Một con số chính: `label`, `value` (h1, tabular), `caption`, `tone` (`warning`/`danger` chỉ khi cần chú ý), `action` góc phải (chip cảnh báo), `children` (thanh tiến độ, link) |
| `ProviderBadge` | Kênh Vinnet / GotIt / Other với màu cố định (`PROVIDER_STYLES` trong `ThemeConfig.ts`: Vinnet teal, GotIt navy). Dùng cùng màu cho badge, thẻ số dư và biểu đồ |
| `CellStack` | Ô hai dòng trong bảng: dòng chính 13px/500, dòng phụ 12px `text.secondary` ("Tên" trên "mã · Symphony", "mã đáp viên" trên "số điện thoại") |
| `SampleProgress` | Tiến độ mẫu: số đã có / mục tiêu, %, thanh màu teal; cam kèm "behind" khi dự án đang field mà % hoàn thành thấp hơn phần thời gian field đã qua quá 10 điểm; xanh khi đạt 100% |
| `UserAvatar` | Chữ cái đầu trên nền tone cố định theo tên (cùng người luôn cùng màu) |
| `DateRangeField` | Một ô chọn khoảng ngày (preset tháng này, tháng trước, 30 ngày) thay cho hai ô From/To |

Ngưỡng "Low balance" và số ngày dùng để ước tính số dư còn dùng được bao lâu nằm trong `src/config/FinanceConfig.ts`.

#### Trạng thái quà (Gifts)

Backend gom trạng thái lưu trong DB thành bốn nhóm (`ProjectRespondent::giftStatus`): `pending` (Pending), `success` (Sent), `refused` (Refused) và `failed` (mọi trạng thái khác, kể cả lỗi nhà cung cấp). Tab trạng thái trên Gifts và Projects lấy số đếm từ `meta.status_counts` của API, đếm theo từ khoá tìm kiếm hiện tại. Quà lỗi hiện lý do ngay dưới chip và không gửi lại được từ trang này.

### Dialog, drawer và thông báo

| Nhu cầu | Component |
|---|---|
| Xác nhận có/không | `ConfirmDialog` qua `useDialog()`: `openDialog({ title, message, showConfirmButton: true, onConfirm, tone, confirmText })` rồi render `<ConfirmDialog {...dialogProps} />` |
| Form ngắn | `FormDialog` (`src/components/Dialogs/FormDialog.tsx`): paper là `<form>` nên Enter gửi form; `error` hiện `Alert` phía trên các field; `loading`, `submitDisabled`, `tone` |
| Chi tiết, lịch sử, form dài | `DetailDrawer` (`src/components/DetailDrawer.tsx`): panel bên phải, header và footer cố định, thân cuộn |
| Nội dung tuỳ biến khác | `GenericDialog` |
| Nhập một đoạn text | `UniversalInputDialog` |
| Từ chối kèm lý do | `RejectDialog` |

- **Không mở dialog chỉ để báo tin.** Báo thành công/lỗi ngắn: toast `const { showToast } = useToast(); showToast("Saved", "success")`. Kết quả cần đọc kỹ (gửi quà hàng loạt, dòng bị bỏ qua khi import): `Alert` ngay trong trang, qua prop `banner` của `ResourceTable`.
- Thao tác xoá / chặn / disable: `tone: "danger"` và `confirmText` ghi rõ hành động ("Delete", "Disable"), không dùng "Confirm" chung chung.
- `onConfirm` trả về Promise thì dialog tự hiện loading và chỉ đóng khi xong.
- Field trong `FormDialog`: `TextField size="small"` có nhãn; form hai cột dùng `Box` grid `{ xs: "1fr", sm: "1fr 1fr" }`; ngày dùng `DatePicker`.
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

### Trang danh sách (ResourceTable)

Trang danh sách dùng `ResourceTable` (`src/components/Table/ResourceTable.tsx`): một card gồm tab trạng thái, toolbar, thanh thao tác hàng loạt, banner kết quả, bảng và phân trang. `ResourceTable` bọc `ReusableTable`; chỉ dùng `ReusableTable` trực tiếp cho bảng nằm trong component khác (drawer, panel thống kê). Không viết `<Table>` one-off.

| Prop | Dùng cho |
|---|---|
| `tabs`, `tab`, `onTabChange` | Tab trạng thái có số đếm; `alert: true` tô đỏ số cần chú ý |
| `search` | Ô tìm kiếm; giá trị chỉ được báo khi người dùng ngừng gõ 300ms |
| `filters` | `FilterChip`: chip nét đứt "+ Label" khi chưa đặt, "Label: giá trị ×" khi đã đặt. Có sẵn `DateRangeFilter` (khoảng ngày + preset năm) và `SelectFilter` (chọn một); bộ lọc bật/tắt dùng `FilterChip active onClick` |
| `toolbarActions` | Nút cấp bảng ở bên phải toolbar (Export, Select all pending…) |
| `bulkBar` | `BulkActionBar` khi có dòng được chọn: số dòng, một nút chính, "Clear selection", và thanh tiến độ khi đang chạy |
| `banner` | `Alert` kết quả cần đọc |
| `emptyState` | `EmptyState` với tiêu đề, mô tả và đúng một hành động để thoát trạng thái trống ("Import respondents", "Search all start dates") |
| `onRowClick` | Bấm vào dòng để mở; click trên nút, link, checkbox, menu và popover mở từ ô không kích hoạt |
| `stickyColumns` | `{ first, last }` giữ cột chọn / cột hành động khi bảng cuộn ngang |

Hành động trên từng dòng: `RowActions` ở cột cuối (`type: "menu"`, `align: "right"`). Tối đa một nút nhẹ hiển thị sẵn (`primary`, ví dụ "Send gift" outlined), còn lại vào menu ⋯ có nhãn; mục nguy hiểm `tone: "danger"` nằm cuối menu sau đường kẻ; mục bị khoá ghi lý do bằng `disabledReason`.

Màu và cỡ chữ của header, ô, hover lấy từ theme (`MuiTableCell`, `MuiTableRow` trong `ThemeConfig.ts`). Trong `ReusableTable` chỉ còn padding, chiều rộng cột và cách xử lý tràn chữ.

| Phần | Quy định |
|---|---|
| Container | `Paper elevation={0}`, viền `divider`, bo 12px, nền `background.paper` |
| Header | 12px / 600 / `text.secondary` trên nền `NEUTRAL[50]`, `py: 1.25` |
| Ô | 13px (`body2`), `text.primary`, `py: 1`, `px: 1.5`; chữ dài cắt bằng ellipsis |
| Cột điều khiển | `type: "boolean"` hoặc `"menu"` (checkbox, switch, nút hành động): không cắt, `px: 1` |
| Hover dòng | `<TableRow hover>` → nền `NEUTRAL[50]` |
| `dense` | Bảng nhiều cột (Gifts, Transactions của dự án): chữ 12px, `px: 1`, dùng tới khi bảng được thiết kế lại với ô hai dòng |

#### Loading state

Lần tải đầu hiện 5 dòng `Skeleton`; tải lại khi đã có dữ liệu hiện `LinearProgress` 3px trên đầu bảng.

#### Pagination

- Nằm trong card, ngăn cách bởi `<Divider />`; ẩn khi `total` bằng 0
- `rowsPerPageOptions`: `[10, 25, 50, 100]`
- Luôn truyền `total`, `page`, `onPageChange`. Dữ liệu tải một lần (ví dụ bảng giá tỉnh) thì cắt trang ở client và truyền `total = rows.length`
- Đổi từ khoá tìm kiếm hoặc bộ lọc thì đưa về trang đầu (`setPage(0)`)

#### Quy tắc chung

| Quy tắc | Lý do |
|---|---|
| Dùng `sx` thay vì class CSS cho cell | Tránh specificity conflict với MUI stylesheet |
| Không đặt `height` cứng trên row | Để content tự điều chỉnh, tránh overflow |
| `tableLayout: "fixed"` + `width` trên column | Ngăn layout shift khi data load |
| `stickyHeader` luôn bật | Header luôn visible khi scroll dọc |
| `maxHeight: calc(100vh - 240px)` | Giữ bảng trong viewport, tránh page scroll |

---

## 5. Ngôn ngữ & Dark mode

- Giao diện nội bộ dùng **tiếng Anh** cho mọi nhãn, nút, tiêu đề và thông báo. Ngoại lệ: trang đáp viên (`CustomVoucher`, `CustomVoucherLog`) và màn hình phỏng vấn viên (`MiniCATI`) giữ tiếng Việt.
- Giữ nguyên tiêu đề cột trong file Excel import/export (ví dụ "Tỉnh thành", "Đơn giá quà 1") vì đó là định dạng file người dùng đang dùng.
- App **không có dark mode** (đã gỡ phần CSS hỏng). Nếu cần làm lại, dùng `colorSchemes` của MUI trong `ThemeConfig.ts`.

