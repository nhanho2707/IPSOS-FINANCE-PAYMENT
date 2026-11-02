import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import "./ErrorPage.css";

interface ErrorPageState {
  errorCode?: number;
  errorMessage?: string;
  blockedApi?: string;
}

const DEFAULT_ERROR_CODE = 404;
const DEFAULT_ERROR_MESSAGE = "Sorry, the page you are looking for does not exist.";

const ErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Router state is gone after a refresh or when /error is opened directly.
  const { errorCode = DEFAULT_ERROR_CODE, errorMessage = DEFAULT_ERROR_MESSAGE, blockedApi } =
    (location.state ?? {}) as ErrorPageState;
  const canGoBack = location.key !== "default";

  return (
    <div className="page404">
      <div className="center">
        <div className="error">
          <div className="number">4</div>
          <div className="illustration">
            <div className="circle" />
            <div className="clip">
              <div className="paper">
                <div className="face">
                  <div className="eyes">
                    <div className="eye eye-left" />
                    <div className="eye eye-right" />
                  </div>
                  <div className="rosyCheeks rosyCheeks-left" />
                  <div className="rosyCheeks rosyCheeks-right" />
                  <div className="mouth" />
                </div>
              </div>
            </div>
          </div>
          <div className="number">{String(errorCode).slice(-1)}</div>
        </div>
        <div className="text-404">{errorMessage}</div>
        {blockedApi && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, fontFamily: "monospace" }}>
            {blockedApi}
          </Typography>
        )}
        <Stack direction="row" spacing={1.5} sx={{ mt: 4 }}>
          <Button variant="contained" component={RouterLink} to="/project-management/projects">
            Back to projects
          </Button>
          {canGoBack && (
            <Button variant="outlined" color="inherit" onClick={() => navigate(-1)}>
              Go back
            </Button>
          )}
        </Stack>
      </div>
    </div>
  );
};

export default ErrorPage;
