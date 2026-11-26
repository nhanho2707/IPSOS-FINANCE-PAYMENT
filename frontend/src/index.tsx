import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/css/global.css";
import "./assets/css/layout.css";
import "./assets/css/components.css";
import "./assets/css/features.css";
import "./assets/css/table.css";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalStyles } from "@mui/material";
import { themeCssVariables } from "./config/ThemeConfig";
import { ToastProvider } from "./contexts/ToastContext";
import AppLocaleProvider from "./i18n/AppLocaleProvider";

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppLocaleProvider>
        <GlobalStyles styles={{ ":root": themeCssVariables }} />
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ToastProvider>
      </AppLocaleProvider>
    </I18nextProvider>
  </React.StrictMode>
);
