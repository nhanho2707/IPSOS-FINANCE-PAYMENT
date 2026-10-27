import "./LoginForm.css";
import ipsosLogo from "../../assets/img/Ipsos logo.svg"; // Assuming SVG file location
import { useState } from "react";
import axios from "axios";

import {
  TextField,
  FormControl,
  InputLabel,
  OutlinedInput,
  IconButton,
  Button,
} from "@mui/material";

import Alert from "@mui/material/Alert";
import { VisibilityOff, Visibility } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ApiConfig } from "../../config/ApiConfig";

const Login = () => {
  const location = useLocation();
  const [statusMessage, setStatusMessage] = useState(
    location.state?.sessionExpired ? "Your session has expired. Please log in again." : ""
  );
  const [showPassword, setShowPassword] = useState(false);
  //const [login, setLogin] = useState<boolean | null>(null);
  const [isError, setIsError] = useState<boolean | null>(location.state?.sessionExpired ? true : null);
  const handleClickShowPassword = () => setShowPassword(!showPassword);

  const { login } = useAuth();
  const navigate = useNavigate();

  const [inforLogin, setInforLogin] = useState({
    email: "",
    password: "",
  });
  
  const handleChangeInput = (prev: string, value: string) => {
    setInforLogin({ ...inforLogin, [prev]: value });
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(ApiConfig.account.login, {
        email: inforLogin.email,
        password: inforLogin.password,
      });


      if (response.data.status_code != 200) {
        setStatusMessage(response.data.message);
        setIsError(true);
        throw new Error(response.data.message);
      }

      if (response.data.user?.must_change_password) {
        login(response.data.token, response.data.user, '/set-password');
      } else {
        const from = location.state?.from;
        const redirectTo = from ? `${from.pathname}${from.search ?? ''}` : undefined;
        login(response.data.token, response.data.user, redirectTo);
      }

      setIsError(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setStatusMessage(error.response?.data.message ?? error.message);
        setIsError(true);
      }
    }
  };

  const handleForgotPassword = () => {
    // Handle forgot password functionality here
    navigate("/forgot-password");
  };

  return (
    <>
      <div className="LoginForm">
        <div className="header-form-login">
          <img src={ipsosLogo} alt="Ipsos Logo" />
          <h2>Welcome Back</h2>
          <p>Enter the information you enter while registering.</p>
        </div>
        <div className="form-validate">
          <div className="error-control">
            {isError && (
              <Alert severity="error">{statusMessage}</Alert> 
            )}
          </div>
          <div className="email-control">
            <TextField
              label="Email"
              variant="outlined"
              className="TextFieldLogin"
              onChange={(e) => handleChangeInput("email", e.target.value)}
            />
          </div>
          <div className="password-control">
            <FormControl className="TextFieldLogin" variant="outlined">
              <InputLabel htmlFor="outlined-adornment-password">
                Password
              </InputLabel>
              <OutlinedInput
                id="outlined-adornment-password"
                type={showPassword ? "text" : "password"}
                onChange={(e) => handleChangeInput("password", e.target.value)}
                endAdornment={
                  <IconButton onClick={handleClickShowPassword}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                }
                label="Password"
              />
            </FormControl>
          </div>
          <div className="forgot-password">
            <span onClick={handleForgotPassword}>Forgot Password ?</span>
          </div>

          <div className="btn-login">
            <Button
              sx={{
                width: "100%",
                my: 4,
                backgroundColor: "var(--main-color) !important",
                color: "#fff",
                textTransform: "none !important",
              }}
              onClick={handleLogin}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
