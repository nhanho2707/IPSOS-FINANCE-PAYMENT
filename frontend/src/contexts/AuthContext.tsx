import axios from "axios";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
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
    login: (token: string, user: UserDetail, redirectTo?: string) => void;
    logout: () => void;
    clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [ token, setToken ] = useState<string | null>(localStorage.getItem('authToken'));
    const [ user, setUser ] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

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
                    setToken(null);
                    setUser(null);

                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');

                    navigate('/login', {
                        state: {
                            from: { pathname: window.location.pathname, search: window.location.search },
                            sessionExpired: true,
                        },
                        replace: true,
                    });
                }

                if (axios.isAxiosError(error) && error.response?.status === 403) {
                    const method = error.config?.method?.toUpperCase() ?? '';
                    const url = error.config?.url ?? '';
                    
                    navigate('/error', {
                        state: {
                            errorCode: 403,
                            errorMessage: 'Bạn không có quyền thực hiện thao tác này.',
                            blockedApi: `${method} ${url}`,
                        },
                        replace: true,
                    });
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptorId);
    }, [navigate]);

    const login = (token: string, userData: UserDetail, redirectTo?: string) => {
        setToken(token);
        setUser(userData);

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));

        navigate(redirectTo || '/project-management/projects', { replace: true });
    };

    const logout = () => {
        setToken(null);
        setUser(null);

        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        navigate('/login', { replace: true });
    };

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
