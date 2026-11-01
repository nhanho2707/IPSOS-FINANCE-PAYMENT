import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { hasRole } from "../config/RoleConfig";

interface RoleGateProps {
    allowedRoles?: readonly string[];
    children: React.ReactNode;
}

const RoleGate: React.FC<RoleGateProps> = ({ allowedRoles, children }) => {
    const { user } = useAuth();

    if (!hasRole(user?.role, allowedRoles)) {
        return (
            <Navigate
                to="/error"
                state={{
                    errorCode: 3,
                    errorMessage: "You do not have permission to access this page.",
                }}
                replace
            />
        );
    }

    return <>{children}</>;
};

export default RoleGate;
