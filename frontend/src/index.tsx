import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./assets/css/global.css";
import "./assets/css/layout.css";
import "./assets/css/components.css";
import "./assets/css/features.css";
import "./assets/css/table.css";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalStyles, ThemeProvider } from "@mui/material";
import { appTheme, themeCssVariables } from "./config/ThemeConfig";
import { ToastProvider } from "./contexts/ToastContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DATE_FORMAT } from "./utils/format";

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        dateFormats={{ keyboardDate: DATE_FORMAT }}
        localeText={{ fieldMonthPlaceholder: ({ contentType }) => (contentType === "letter" ? "MMM" : "MM") }}
      >
        <GlobalStyles styles={{ ":root": themeCssVariables }} />
        <ToastProvider>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </I18nextProvider>
        </ToastProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
