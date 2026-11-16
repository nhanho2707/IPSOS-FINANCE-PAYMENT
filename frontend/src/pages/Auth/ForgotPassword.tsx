import "../../assets/css/components.css";
import React, { useState } from "react";
import axios from "axios";
import {
  TextField,
  Box,
  FormControl,
  Typography,
  Alert,
  Link,
  Button,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useNavigate } from "react-router-dom";
import { ApiConfig } from "../../config/ApiConfig";
import LanguageSwitch from "../../components/LanguageSwitch";
import { useTranslation } from "react-i18next";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSendLink = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await axios.post(ApiConfig.account.forgotPassword, { email });

      setSuccessMessage(response.data.message);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors) {
          const first = Object.values(errors)[0] as string[];
          setErrorMessage(first[0]);
        } else {
          setErrorMessage(error.response?.data?.message ?? t("auth.genericError"));
        }
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
        onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSendLink(); }}
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
          {t("auth.reset.title")}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
          {t("auth.reset.description")}
        </Typography>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {successMessage && (
          <Alert severity="success">{successMessage}</Alert>
        )}

        <FormControl fullWidth>
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormControl>

        <Button
          fullWidth
          type="submit"
          endIcon={<SendIcon />}
          loading={loading}
          variant="contained"
          disabled={!email || !!successMessage}
        >
          {t("auth.reset.send")}
        </Button>

        <Link
          component="button"
          type="button"
          variant="body2"
          underline="hover"
          onClick={() => navigate("/login")}
          sx={{ color: "text.secondary", alignSelf: "center" }}>
          {t("auth.backToLogin")}
        </Link>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
