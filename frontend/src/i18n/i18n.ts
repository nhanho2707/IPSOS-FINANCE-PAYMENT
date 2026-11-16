import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import enCommon from "./locales/en/common.json";
import enNav from "./locales/en/nav.json";
import enAuth from "./locales/en/auth.json";
import enDashboard from "./locales/en/dashboard.json";
import enStatistics from "./locales/en/statistics.json";
import enFinance from "./locales/en/finance.json";
import enTransactions from "./locales/en/transactions.json";
import enGifts from "./locales/en/gifts.json";
import enProjects from "./locales/en/projects.json";
import enQuotation from "./locales/en/quotation.json";
import enCati from "./locales/en/cati.json";
import enInterviewers from "./locales/en/interviewers.json";
import enAccounts from "./locales/en/accounts.json";
import enSettings from "./locales/en/settings.json";
import viCommon from "./locales/vi/common.json";
import viNav from "./locales/vi/nav.json";
import viAuth from "./locales/vi/auth.json";
import viDashboard from "./locales/vi/dashboard.json";
import viStatistics from "./locales/vi/statistics.json";
import viFinance from "./locales/vi/finance.json";
import viTransactions from "./locales/vi/transactions.json";
import viGifts from "./locales/vi/gifts.json";
import viProjects from "./locales/vi/projects.json";
import viQuotation from "./locales/vi/quotation.json";
import viCati from "./locales/vi/cati.json";
import viInterviewers from "./locales/vi/interviewers.json";
import viAccounts from "./locales/vi/accounts.json";
import viSettings from "./locales/vi/settings.json";

export type Language = "en" | "vi";

export const LANGUAGES: Language[] = ["en", "vi"];

const STORAGE_KEY = "language";
const DEFAULT_LANGUAGE: Language = "en";

const en = {
    common: enCommon, nav: enNav, auth: enAuth, dashboard: enDashboard,
    projects: enProjects, gifts: enGifts, transactions: enTransactions, finance: enFinance, statistics: enStatistics,
    settings: enSettings, accounts: enAccounts, interviewers: enInterviewers, cati: enCati, quotation: enQuotation,
};

// Typed against English, so a key missing from a Vietnamese file fails the type check.
const vi: typeof en = {
    common: viCommon, nav: viNav, auth: viAuth, dashboard: viDashboard,
    projects: viProjects, gifts: viGifts, transactions: viTransactions, finance: viFinance, statistics: viStatistics,
    settings: viSettings, accounts: viAccounts, interviewers: viInterviewers, cati: viCati, quotation: viQuotation,
};

export const resources = { en: { translation: en }, vi: { translation: vi } };

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "translation";
        resources: { translation: typeof en };
    }
}

type LeafKeys<T, Prefix extends string = ""> = {
    [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

// A key that names one piece of text (not a group of them), for labels kept in config files
// and translated where they are shown.
export type TranslationKey = LeafKeys<typeof en>;

const readStoredLanguage = (): Language => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return LANGUAGES.includes(stored as Language) ? (stored as Language) : DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE;
    }
};

const applyLanguage = (language: string) => {
    document.documentElement.lang = language;
    dayjs.locale(language);
};

i18n.use(initReactI18next).init({
    resources,
    lng: readStoredLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
        escapeValue: false, // React already escapes values
    },
});

applyLanguage(i18n.language);

i18n.on("languageChanged", (language) => {
    applyLanguage(language);
    try {
        window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
        // Private windows can refuse storage; the choice then lasts until the page is reloaded.
    }
});

// Text for a key held in a config file. i18next types a union of keys as returning any of their values,
// so this pins it to the string a leaf key always is. Call it in a component that uses useTranslation(),
// so the text changes with the language.
export const tKey = (key: TranslationKey): string => i18n.t(key) as string;

// Values that come from the data (gender, income band...) are looked up by name and shown as they are when unknown.
export const translateDataValue = (prefix: string, value: string): string =>
    i18n.t(`${prefix}.${value}` as TranslationKey, { defaultValue: value });

export const currentLanguage = (): Language => (i18n.language === "vi" ? "vi" : "en");

export const changeLanguage = (language: Language) => i18n.changeLanguage(language);

export default i18n;
