import "./LoginForm.css";
import ipsosLogo from "../../assets/img/Ipsos logo.svg";
import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  IconButton,
  InputAdornment,
  Link,
  TextField,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { VisibilityOff, Visibility } from "@mui/icons-material";
import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ApiConfig } from "../../config/ApiConfig";

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
    <div className="LoginForm">
      <div className="header-form-login">
        <img src={ipsosLogo} alt="Ipsos" />
        <h2>Welcome back</h2>
        <p>Sign in with your Ipsos account.</p>
      </div>

      <form className="form-validate" onSubmit={handleSubmit} noValidate>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 3 }} role="alert">
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
          className="TextFieldLogin"
          sx={{ mt: 3 }}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          fullWidth
          value={credentials.password}
          onChange={handleChange("password")}
          className="TextFieldLogin"
          sx={{ mt: 3 }}
          InputProps={{
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
          }}
        />

        <div className="forgot-password">
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            Forgot password?
          </Link>
        </div>

        <LoadingButton
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          loading={submitting}
          disabled={!canSubmit}
          sx={{ mt: 4 }}
        >
          Sign in
        </LoadingButton>
      </form>
    </div>
  );
};

export default Login;
