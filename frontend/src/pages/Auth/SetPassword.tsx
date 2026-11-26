import "../../assets/css/components.css";
import React, { useState } from "react";
import axios from "axios";
import {
  TextField,
  Box,
  FormControl,
  Typography,
  InputAdornment,
  IconButton,
  Link,
  Button,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ApiConfig } from "../../config/ApiConfig";
import LanguageSwitch from "../../components/LanguageSwitch";
import { useTranslation } from "react-i18next";

const SetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { clearMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (password.length < 6) {
      setErrorMessage(t("auth.set.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("auth.set.mismatch"));
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        ApiConfig.account.setFirstPassword,
        { password, password_confirmation: confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      clearMustChangePassword();
      navigate("/project-management/projects", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? t("auth.genericError")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "background.default",
      }}
    >
      <Box sx={{ position: "fixed", top: 16, right: 16 }}>
        <LanguageSwitch />
      </Box>
      <Box
        component="form"
        noValidate
        onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSubmit(); }}
        sx={{
          width: "100%",
          maxWidth: 500,
          mx: 2,
          p: 4,
          borderRadius: 2,
          backgroundColor: "background.paper",
          boxShadow: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Typography variant="h5" sx={{ textAlign: "center" }}>
          {t("auth.set.title")}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
          {t("auth.set.description")}
        </Typography>

        {errorMessage && (
          <div className="message-invalid">
            <span>{errorMessage}</span>
          </div>
        )}

        <FormControl fullWidth>
          <TextField
            label={t("auth.set.newPassword")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />
        </FormControl>

        <FormControl fullWidth>
          <TextField
            label={t("auth.set.confirmPassword")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </FormControl>

        <Button
          fullWidth
          type="submit"
          endIcon={<LockResetIcon />}
          loading={loading}
          variant="contained"
        >
          {t("auth.set.submit")}
        </Button>

        <Link
          component="button"
          type="button"
          variant="body2"
          underline="hover"
          onClick={logout}
          sx={{ color: "text.secondary", alignSelf: "center" }}>
          {t("auth.backToLogin")}
        </Link>
      </Box>
    </Box>
  );
};

export default SetPassword;
