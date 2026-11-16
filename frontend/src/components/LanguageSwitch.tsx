import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTranslation } from "react-i18next";
import { changeLanguage, currentLanguage, Language, LANGUAGES } from "../i18n/i18n";

// For pages outside the app shell (sign-in, password); inside it the choice is in the account menu.
const LanguageSwitch: React.FC = () => {
    const { t } = useTranslation();

    return (
        <ToggleButtonGroup
            exclusive
            size="small"
            value={currentLanguage()}
            onChange={(_event, value: Language | null) => value && changeLanguage(value)}
            aria-label={t("common.language.label")}
        >
            {LANGUAGES.map((code) => (
                <ToggleButton key={code} value={code} lang={code} aria-label={t(`common.language.${code}`)} sx={{ px: 1.25, py: 0.25, typography: "caption", fontWeight: 600 }}>
                    {code.toUpperCase()}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
};

export default LanguageSwitch;
