import React from "react";
import { IconButton } from "@mui/material";
import { Menu } from "@mui/icons-material";

// Mirrors the 768px breakpoint in Sidebar.css: below it the sidebar is a full-screen overlay
// and is hidden entirely while closed, so this button is the only way to open it again.
export const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

export const isMobileViewport = () => window.matchMedia(MOBILE_MEDIA_QUERY).matches;

interface MobileNavToggleProps {
  open: boolean;
  onOpen: () => void;
}

const MobileNavToggle: React.FC<MobileNavToggleProps> = ({ open, onOpen }) => (
  <IconButton
    aria-label="Open navigation"
    onClick={onOpen}
    sx={{
      display: open ? "none" : "inline-flex",
      position: "fixed",
      top: 12,
      left: 12,
      zIndex: 210,
      bgcolor: "background.paper",
      border: 1,
      borderColor: "divider",
      "&:hover": { bgcolor: "background.paper" },
      "@media (min-width: 768px)": { display: "none" },
    }}
  >
    <Menu />
  </IconButton>
);

export default MobileNavToggle;
