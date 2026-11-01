import { alpha, createTheme } from "@mui/material/styles";

export const BRAND = {
  main: "#009d9c",
  dark: "#007a79",
  light: "#4dbab9",
  navy: "#2f469c",
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
  brand:   { bg: "#e0f4f4", fg: "#00605f", dot: BRAND.main },
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

export const getStatusTone = (
  status: string | null | undefined,
  toneMap: Record<string, StatusTone>
): StatusTone => {
  if (!status) return "neutral";
  return toneMap[status] ?? toneMap[status.trim().toLowerCase()] ?? "neutral";
};

const FONT_FAMILY = '"Roboto", "Helvetica", "Arial", sans-serif';

// html is 14px (global.css) and MUI's default htmlFontSize is 16, so MUI rem values
// already render at the sizes in DESIGN_SYSTEM.md. Changing htmlFontSize would enlarge every MUI text by ~14%.
export const appTheme = createTheme({
  palette: {
    primary: {
      main: BRAND.main,
      dark: BRAND.dark,
      light: BRAND.light,
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
      primary: "#212121",
      secondary: "#707070",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: FONT_FAMILY,
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
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
          fontSize: "0.75rem",
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
  ...toneVariables,
  "--status-cancelled-color": STATUS_TONES.danger.fg,
};
