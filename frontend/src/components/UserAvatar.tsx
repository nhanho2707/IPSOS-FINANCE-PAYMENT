import React from "react";
import { Avatar, Tooltip } from "@mui/material";
import { STATUS_TONES, StatusTone } from "../config/ThemeConfig";

const AVATAR_TONES: StatusTone[] = ["brand", "info", "success", "warning", "neutral"];

// The same person always gets the same colour, without storing one.
const toneFor = (seed: string): StatusTone => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[hash % AVATAR_TONES.length];
};

export const initialsOf = (name: string): string => {
    const words = name.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
    if (words.length === 0) return "?";
    const first = words[0].charAt(0);
    const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
};

interface UserAvatarProps {
    name: string | null | undefined;
    size?: number;
    // Off when the name is already written next to the avatar.
    showTooltip?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 24, showTooltip = true }) => {
    const label = name?.trim() || "Unknown";
    const tone = STATUS_TONES[toneFor(label)];

    const avatar = (
        <Avatar
            alt={label}
            sx={{ width: size, height: size, bgcolor: tone.bg, color: tone.fg, typography: "caption", fontWeight: 600 }}
        >
            {initialsOf(label)}
        </Avatar>
    );

    return showTooltip ? <Tooltip title={label}>{avatar}</Tooltip> : avatar;
};

export default UserAvatar;
