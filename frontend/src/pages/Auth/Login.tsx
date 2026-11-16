import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import { VisibilityOff, Visibility } from "@mui/icons-material";
import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ApiConfig } from "../../config/ApiConfig";
import { BRAND } from "../../config/ThemeConfig";
import { BrandMark } from "../../components/Shell/AppShell";
import LanguageSwitch from "../../components/LanguageSwitch";
import { useTranslation } from "react-i18next";

const Login = () => {
  const location = useLocation();
  const { login, token, user } = useAuth();
  const { t } = useTranslation();

  // Kept as a flag, not text, so the message follows a language change.
  const [sessionExpired, setSessionExpired] = useState<boolean>(Boolean(location.state?.sessionExpired));
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  if (token && user) {
    return <Navigate to={user.must_change_password ? "/set-password" : "/project-management/projects"} replace />;
  }

  const handleChange = (field: "email" | "password") => (event: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage("");
    setSessionExpired(false);

    try {
      const response = await axios.post(ApiConfig.account.login, credentials);

      if (response.data.status_code !== 200) {
        setErrorMessage(response.data.message ?? t("auth.signInFailed"));
        return;
      }

      if (response.data.user?.must_change_password) {
        login(response.data.token, response.data.user, "/set-password", response.data.expires_in);
      } else {
        const from = location.state?.from;
        const redirectTo = from ? `${from.pathname}${from.search ?? ""}` : undefined;
        login(response.data.token, response.data.user, redirectTo, response.data.expires_in);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message ?? error.message);
      } else {
        setErrorMessage(t("auth.signInFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = credentials.email.trim() !== "" && credentials.password !== "";
  const alertMessage = errorMessage || (sessionExpired ? t("auth.sessionExpired") : "");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 5fr) minmax(0, 6fr)" },
        bgcolor: "background.default",
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          bgcolor: BRAND.dark,
          color: "common.white",
        }}
      >
        <BrandMark inverse />
        <Box sx={{ maxWidth: 420 }}>
          <Typography component="p" variant="h1" sx={{ color: "common.white" }}>
            {t("auth.tagline")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: "common.white", opacity: 0.8 }}>
            {t("auth.taglineDetail")}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "common.white", opacity: 0.7 }}>
          {t("auth.internalTool")}
        </Typography>
      </Box>

      <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 6 }}>
        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <LanguageSwitch />
        </Box>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 4 }}>
            <BrandMark />
          </Box>
          <Typography component="h1" variant="h1">{t("auth.signIn")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("auth.useIpsosAccount")}
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
            {alertMessage && (
              <Alert severity="error" sx={{ mb: 2.5 }} role="alert">
                {alertMessage}
              </Alert>
            )}

            <TextField
              label={t("auth.email")}
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              fullWidth
              value={credentials.email}
              onChange={handleChange("email")}
            />

            <TextField
              label={t("auth.password")}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              fullWidth
              value={credentials.password}
              onChange={handleChange("password")}
              sx={{ mt: 2.5 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
              <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ typography: "body2", fontWeight: 500 }}>
                {t("auth.forgotPassword")}
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              loading={submitting}
              disabled={!canSubmit}
              sx={{ mt: 3 }}
            >
              {t("auth.signIn")}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
