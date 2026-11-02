import React from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import { ArrowDropDown } from "@mui/icons-material";
import { STATUS_TONES, StatusTone } from "../config/ThemeConfig";

interface StatusChipProps {
  label: string;
  tone: StatusTone;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  showCaret?: boolean;
  maxWidth?: number | string;
  tooltip?: string;
}

export const StatusDot: React.FC<{ tone: StatusTone; size?: number }> = ({ tone, size = 8 }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      flexShrink: 0,
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: STATUS_TONES[tone].dot,
    }}
  />
);

const StatusChip: React.FC<StatusChipProps> = ({
  label,
  tone,
  onClick,
  disabled,
  showCaret,
  maxWidth,
  tooltip,
}) => {
  const colors = STATUS_TONES[tone];

  const chip = (
    <Chip
      size="small"
      clickable={Boolean(onClick)}
      onClick={onClick}
      disabled={disabled}
      icon={<StatusDot tone={tone} />}
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", minWidth: 0 }}>
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </Box>
          {showCaret && <ArrowDropDown sx={{ fontSize: "1.125rem", ml: 0.25, mr: -0.5 }} />}
        </Box>
      }
      sx={{
        maxWidth: maxWidth ?? "100%",
        height: 24,
        color: colors.fg,
        backgroundColor: colors.bg,
        "& .MuiChip-icon": { ml: 1, mr: -0.25 },
        "& .MuiChip-label": { display: "flex", minWidth: 0 },
        "&.MuiChip-clickable:hover": { backgroundColor: colors.bg, filter: "brightness(0.96)" },
      }}
    />
  );

  return tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip;
};

export default StatusChip;
