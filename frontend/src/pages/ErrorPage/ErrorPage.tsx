import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ErrorOutlineOutlined, LockOutlined, SearchOff } from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import EmptyState from "../../components/EmptyState";
import { BrandMark } from "../../components/Shell/AppShell";

interface ErrorPageState {
  errorCode?: number;
  errorMessage?: string;
  blockedApi?: string;
}

const DEFAULT_ERROR_CODE = 404;
const DEFAULT_ERROR_MESSAGE = "Sorry, the page you are looking for does not exist.";

const ERROR_TITLES: Record<number, { title: string; icon: React.ElementType }> = {
  404: { title: "Page not found", icon: SearchOff },
  403: { title: "No access to this page", icon: LockOutlined },
};

const ErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Router state is gone after a refresh or when /error is opened directly.
  const { errorCode = DEFAULT_ERROR_CODE, errorMessage = DEFAULT_ERROR_MESSAGE, blockedApi } =
    (location.state ?? {}) as ErrorPageState;
  const canGoBack = location.key !== "default";

  // Some callers send only the last digit of the HTTP status (4 for 404, 3 for 403).
  const code = errorCode < 10 ? 400 + errorCode : errorCode;
  const { title, icon } = ERROR_TITLES[code] ?? { title: "Something went wrong", icon: ErrorOutlineOutlined };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, px: 2, py: 6, bgcolor: "background.default" }}>
      <BrandMark />
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 520, border: 1, borderColor: "divider", borderRadius: "12px" }}>
        <Typography variant="overline" component="p" sx={{ color: "text.secondary", textAlign: "center", pt: 3 }}>
          Error {code}
        </Typography>
        <EmptyState
          icon={icon}
          title={title}
          description={
            <>
              {errorMessage}
              {blockedApi && (
                <Typography component="span" variant="caption" sx={{ display: "block", mt: 1, fontFamily: "monospace", overflowWrap: "anywhere" }}>
                  {blockedApi}
                </Typography>
              )}
            </>
          }
          action={
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center" }}>
              <Button variant="contained" component={RouterLink} to="/project-management/projects">
                Back to projects
              </Button>
              {canGoBack && (
                <Button variant="outlined" color="inherit" onClick={() => navigate(-1)}>
                  Go back
                </Button>
              )}
            </Stack>
          }
        />
      </Paper>
    </Box>
  );
};

export default ErrorPage;
