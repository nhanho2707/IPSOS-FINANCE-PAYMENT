import axios from "axios";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface UserDetail {
    first_name: string,
    last_name: string,
    role: string,
    must_change_password?: boolean
}

interface AuthContextType {
    user: UserDetail | null;
    token: string | null;
    login: (token: string, user: UserDetail, redirectTo?: string, expiresIn?: number | null) => void;
    logout: () => void;
    clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'authToken';
const USER_KEY = 'user';
// When the token stops working, as a time on this browser's clock (milliseconds).
const EXPIRES_AT_KEY = 'authTokenExpiresAt';
// setTimeout fires at once for anything longer than this (about 24.8 days).
const MAX_TIMER_DELAY = 2_147_483_647;

const clearStoredSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
};

const storedExpiresAt = (): number | null => {
    const value = Number(localStorage.getItem(EXPIRES_AT_KEY) ?? NaN);
    return Number.isFinite(value) ? value : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [ token, setToken ] = useState<string | null>(localStorage.getItem('authToken'));
    const [ user, setUser ] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    // `expired` shows "Your session has expired" on the login page and brings the user back here after signing in.
    const endSession = useCallback((expired: boolean) => {
        setToken(null);
        setUser(null);
        clearStoredSession();

        navigate('/login', {
            state: expired
                ? { from: { pathname: window.location.pathname, search: window.location.search }, sessionExpired: true }
                : undefined,
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");

        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));

        setLoading(false);
    }, []);

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const storedToken = localStorage.getItem('authToken');
                const sentToken = axios.isAxiosError(error) ? String(error.config?.headers?.Authorization ?? '') : '';

                // Only the app's own login token: CATI endpoints use a separate token and must not log the user out.
                if (axios.isAxiosError(error) && error.response?.status === 401 && storedToken && sentToken === `Bearer ${storedToken}`) {
                    endSession(true);
                }

                if (axios.isAxiosError(error) && error.response?.status === 403) {
                    const method = error.config?.method?.toUpperCase() ?? '';
                    const url = error.config?.url ?? '';
                    
                    navigate('/error', {
                        state: {
                            errorCode: 403,
                            errorMessage: 'You do not have permission to perform this action.',
                            blockedApi: `${method} ${url}`,
                        },
                        replace: true,
                    });
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptorId);
    }, [navigate, endSession]);

    // Sign out when the token expires instead of waiting for the next request to fail. Timers stall while the
    // computer sleeps or the tab is in the background, so check again whenever the user comes back to the tab.
    useEffect(() => {
        if (!token) return;

        let timer: number | undefined;
        const check = () => {
            window.clearTimeout(timer);

            // Another tab signed out, or its own timer already cleared the shared session.
            if (!localStorage.getItem(TOKEN_KEY)) {
                endSession(true);
                return;
            }

            const expiresAt = storedExpiresAt();
            if (expiresAt === null) return;

            const remaining = expiresAt - Date.now();
            if (remaining <= 0) {
                endSession(true);
                return;
            }
            timer = window.setTimeout(check, Math.min(remaining, MAX_TIMER_DELAY));
        };
        const checkWhenVisible = () => {
            if (document.visibilityState === 'visible') check();
        };

        check();
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', checkWhenVisible);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', checkWhenVisible);
        };
    }, [token, endSession]);

    // `expiresIn` is in seconds from now (server-side `expires_in`), so a wrong clock on this computer does not matter.
    const login = (token: string, userData: UserDetail, redirectTo?: string, expiresIn?: number | null) => {
        setToken(token);
        setUser(userData);

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        if (expiresIn && expiresIn > 0) {
            localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
        } else {
            localStorage.removeItem(EXPIRES_AT_KEY);
        }

        navigate(redirectTo || '/project-management/projects', { replace: true });
    };

    const logout = () => endSession(false);

    const clearMustChangePassword = () => {
        setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, must_change_password: false };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, clearMustChangePassword }}>
          {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if(!context){
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
