import React, { useMemo } from "react";
import { ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { enUS as materialEn, viVN as materialVi } from "@mui/material/locale";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { enUS as pickersEn, viVN as pickersVi } from "@mui/x-date-pickers/locales";
import { useTranslation } from "react-i18next";
import { appThemeOptions } from "../config/ThemeConfig";


const LOCALES = {
    en: { material: materialEn, pickers: pickersEn },
    vi: { material: materialVi, pickers: pickersVi },
};

// The theme (table pagination, autocomplete...) and the date pickers follow the chosen language.
const AppLocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { i18n } = useTranslation();
    const language = i18n.language === "vi" ? "vi" : "en";

    const theme = useMemo(() => createTheme(appThemeOptions, LOCALES[language].material), [language]);
    const localeText = useMemo(() => ({
        ...LOCALES[language].pickers.components.MuiLocalizationProvider.defaultProps.localeText,
        // A month shown as a word (Nov) is a letter placeholder, not "MM".
        fieldMonthPlaceholder: ({ contentType }: { contentType: string }) => (contentType === "letter" ? "MMM" : "MM"),
    }), [language]);

    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={language}
                dateFormats={{ keyboardDate: "DD MMM YYYY" }}
                localeText={localeText}
            >
                {children}
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default AppLocaleProvider;
