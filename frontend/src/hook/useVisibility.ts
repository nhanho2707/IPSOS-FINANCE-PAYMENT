import { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { buildVisibility, hasRole } from "../config/RoleConfig";

export const useVisibility = () => {
    const { user } = useAuth();
    const role = user?.role;
    const visibility = useMemo(() => buildVisibility(role), [role]);

    const canView = useCallback((path: string): boolean => {
        const value = path.split(".").reduce<unknown>((node, key) => {
            if (typeof node === "object" && node !== null) {
                return (node as Record<string, unknown>)[key];
            }
            return undefined;
        }, visibility);
        return value === true;
    }, [visibility]);

    const can = useCallback((allowedRoles: readonly string[]) => hasRole(role, allowedRoles), [role]);

    return { role, visibility, canView, can };
};
