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
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import SendIcon from "@mui/icons-material/Send";
import { useNavigate } from "react-router-dom";
import { ApiConfig } from "../../config/ApiConfig";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

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
          setErrorMessage(error.response?.data?.message ?? "An error occurred.");
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
        <Typography variant="h5" textAlign="center">
          Reset Password
        </Typography>
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Enter your email and we will send you a link to reset your password.
        </Typography>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {successMessage && (
          <Alert severity="success">{successMessage}</Alert>
        )}

        <FormControl fullWidth>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormControl>

        <LoadingButton
          fullWidth
          type="submit"
          endIcon={<SendIcon />}
          loading={loading}
          variant="contained"
          disabled={!email || !!successMessage}
        >
          Send reset link
        </LoadingButton>

        <Link
          component="button"
          type="button"
          variant="body2"
          underline="hover"
          color="text.secondary"
          onClick={() => navigate("/login")}
          sx={{ alignSelf: "center" }}
        >
          Back to login
        </Link>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
