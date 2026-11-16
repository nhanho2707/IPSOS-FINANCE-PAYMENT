import React from "react";
import { useTranslation } from "react-i18next";
import { tKey, TranslationKey } from "./i18n";

// Translated text as an element, for defaults in components that render without hooks of their own.
const T: React.FC<{ k: TranslationKey }> = ({ k }) => {
    useTranslation();
    return <>{tKey(k)}</>;
};

export default T;
