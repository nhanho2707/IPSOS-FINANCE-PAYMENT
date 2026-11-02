import { alpha, createTheme } from "@mui/material/styles";

export const BRAND = {
  accent: "#009d9c", // charts, focus rings, selection marks: 3.3:1 on white, so never for small text
  main: "#007a79", // filled buttons and links: white text on it is 5.2:1 (WCAG AA)
  dark: "#00605f",
  soft: "#e6f5f5",
  navy: "#2f469c",
} as const;

export const NEUTRAL = {
  0: "#ffffff",
  50: "#f6f7f9",
  100: "#f2f4f7",
  200: "#e4e7ec",
  300: "#d0d5dd",
  400: "#98a2b3",
  500: "#667085",
  600: "#475467",
  700: "#344054",
  900: "#101828",
} as const;

export type StatusTone = "neutral" | "info" | "brand" | "success" | "warning" | "danger";

export interface StatusToneColors {
  bg: string;
  fg: string;
  dot: string;
}

// fg on bg is >= 5.7:1 and dot on white is >= 3:1 (WCAG AA for text / graphics).
export const STATUS_TONES: Record<StatusTone, StatusToneColors> = {
  neutral: { bg: "#eceff1", fg: "#455a64", dot: "#78909c" },
  info:    { bg: "#e3f2fd", fg: "#0d47a1", dot: "#1e88e5" },
  brand:   { bg: "#e0f4f4", fg: "#00605f", dot: BRAND.accent },
  success: { bg: "#e8f5e9", fg: "#1b5e20", dot: "#43a047" },
  warning: { bg: "#fff3e0", fg: "#8a4500", dot: "#ef6c00" },
  danger:  { bg: "#fdecea", fg: "#b71c1c", dot: "#e53935" },
};

export const PROJECT_STATUS_TONE: Record<string, StatusTone> = {
  "planned": "neutral",
  "in coming": "info",
  "on going": "brand",
  "completed": "success",
  "on hold": "warning",
  "cancelled": "danger",
};

// Keys mirror ProjectRespondentResource::mapStatusToFrontEnd in the backend.
export const TRANSACTION_STATUS_TONE: Record<string, StatusTone> = {
  "pending": "warning",
  "success": "success",
  "refused": "neutral",
  "failed": "danger",
  "suppended": "neutral",
};

export const QUOTATION_STATUS_TONE: Record<string, StatusTone> = {
  "draft": "neutral",
  "submitted": "info",
  "fm_confirmed": "brand",
  "approved": "success",
};

export const CATI_BATCH_STATUS_TONE: Record<string, StatusTone> = {
  "active": "success",
  "blocked": "warning",
};

export const FEEDBACK_STATUS_TONE: Record<string, StatusTone> = {
  "pending": "warning",
  "resolved": "success",
  "rejected": "danger",
};

// Fixed per provider so the same colour means the same provider in badges, cards and charts.
export const PROVIDER_STYLES: Record<string, { label: string; color: string }> = {
  vinnet: { label: "Vinnet", color: BRAND.accent },
  gotit: { label: "GotIt", color: BRAND.navy },
  other: { label: "Other", color: NEUTRAL[400] },
};

export const getProviderStyle = (provider: string | null | undefined) =>
  PROVIDER_STYLES[provider?.trim().toLowerCase() ?? ""] ?? { label: provider || "—", color: NEUTRAL[400] };

export const getStatusTone = (
  status: string | null | undefined,
  toneMap: Record<string, StatusTone>
): StatusTone => {
  if (!status) return "neutral";
  return toneMap[status] ?? toneMap[status.trim().toLowerCase()] ?? "neutral";
};

const FONT_FAMILY = '"Inter", "Helvetica", "Arial", sans-serif';

// html is 14px (global.css) while MUI's pxToRem assumes 16px. The variants below are sized against the
// real root, so variant="body2" renders exactly 13px. MUI's internal sizes and the h4–h6/subtitle variants
// keep their current rendering, which keeps the respondent pages and client dashboards unchanged.
const rem = (px: number) => `${Number((px / 14).toFixed(4))}rem`;

export const appTheme = createTheme({
  palette: {
    primary: {
      main: BRAND.main,
      dark: BRAND.dark,
      light: BRAND.accent,
      contrastText: "#ffffff",
    },
    secondary: {
      main: BRAND.navy,
      contrastText: "#ffffff",
    },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error: { main: "#d32f2f" },
    info: { main: "#0288d1" },
    text: {
      primary: NEUTRAL[900],
      secondary: NEUTRAL[600],
    },
    divider: NEUTRAL[200],
    background: {
      default: NEUTRAL[50],
      paper: NEUTRAL[0],
    },
  },
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontSize: rem(22), lineHeight: rem(28), fontWeight: 600, letterSpacing: "-0.01em" },
    h2: { fontSize: rem(16), lineHeight: rem(24), fontWeight: 600, letterSpacing: 0 },
    h3: { fontSize: rem(14), lineHeight: rem(20), fontWeight: 600, letterSpacing: 0 },
    body2: { fontSize: rem(13), lineHeight: rem(18) },
    caption: { fontSize: rem(12), lineHeight: rem(16) },
    overline: { fontSize: rem(11), lineHeight: rem(16), fontWeight: 600, letterSpacing: "0.06em" },
    button: { fontSize: rem(13), fontWeight: 500, textTransform: "none" },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        // Secondary actions: <Button variant="outlined" color="inherit">
        outlinedInherit: {
          borderColor: NEUTRAL[300],
          color: NEUTRAL[700],
          "&:hover": { borderColor: NEUTRAL[300], backgroundColor: NEUTRAL[50] },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: NEUTRAL[300] },
          "&:hover:not(.Mui-focused):not(.Mui-error):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline": {
            borderColor: NEUTRAL[400],
          },
          "&.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(BRAND.accent, 0.18)}` },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.accent, borderWidth: 1 },
          "&.Mui-error.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.16)}` },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.error.main },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: rem(13),
          borderColor: NEUTRAL[200],
        },
        head: {
          fontSize: rem(12),
          fontWeight: 600,
          color: NEUTRAL[600],
          backgroundColor: NEUTRAL[50],
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.MuiTableRow-hover:hover": { backgroundColor: NEUTRAL[50] },
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: BRAND.soft },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        sizeSmall: {
          fontSize: rem(12),
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: NEUTRAL[900],
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 0,
          paddingInline: 2,
          marginRight: 24,
          color: NEUTRAL[600],
          "&.Mui-selected": { color: NEUTRAL[900] },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: `0 24px 48px -12px ${alpha(NEUTRAL[900], 0.18)}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: rem(16),
          fontWeight: 600,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: `0 8px 24px ${alpha("#000", 0.08)}`,
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: rem(12),
        },
      },
    },
  },
});

const toneVariables = (Object.keys(STATUS_TONES) as StatusTone[]).reduce<Record<string, string>>(
  (vars, tone) => {
    vars[`--status-${tone}-bg`] = STATUS_TONES[tone].bg;
    vars[`--status-${tone}-fg`] = STATUS_TONES[tone].fg;
    vars[`--status-${tone}-dot`] = STATUS_TONES[tone].dot;
    return vars;
  },
  {}
);

// Exposes the theme tokens to the legacy CSS files so both share one source of truth.
export const themeCssVariables: Record<string, string> = {
  "--main-color": BRAND.main,
  "--main-color-dark": BRAND.dark,
  "--text-forth-color": BRAND.main,
  "--canvas-color": NEUTRAL[50],
  "--text-color": NEUTRAL[900],
  "--text-primary-color": NEUTRAL[600],
  ...toneVariables,
  "--status-cancelled-color": STATUS_TONES.danger.fg,
};
