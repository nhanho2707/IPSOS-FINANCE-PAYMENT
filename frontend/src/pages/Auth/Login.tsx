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

const Login = () => {
  const location = useLocation();
  const { login, token, user } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string>(
    location.state?.sessionExpired ? "Your session has expired. Please sign in again." : ""
  );
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

    try {
      const response = await axios.post(ApiConfig.account.login, credentials);

      if (response.data.status_code !== 200) {
        setErrorMessage(response.data.message ?? "Sign in failed. Please try again.");
        return;
      }

      if (response.data.user?.must_change_password) {
        login(response.data.token, response.data.user, "/set-password");
      } else {
        const from = location.state?.from;
        const redirectTo = from ? `${from.pathname}${from.search ?? ""}` : undefined;
        login(response.data.token, response.data.user, redirectTo);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message ?? error.message);
      } else {
        setErrorMessage("Sign in failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = credentials.email.trim() !== "" && credentials.password !== "";

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
            Field projects, quotations and respondent gifts in one place.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: "common.white", opacity: 0.8 }}>
            Plan the quotation, follow fieldwork and send incentives through Vinnet and GotIt.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "common.white", opacity: 0.7 }}>
          Ipsos Vietnam · internal tool
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 6 }}>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 4 }}>
            <BrandMark />
          </Box>
          <Typography component="h1" variant="h1">Sign in</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Use your Ipsos account.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2.5 }} role="alert">
                {errorMessage}
              </Alert>
            )}

            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              fullWidth
              value={credentials.email}
              onChange={handleChange("email")}
            />

            <TextField
              label="Password"
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
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                Forgot password?
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
              Sign in
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
