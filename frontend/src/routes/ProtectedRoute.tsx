import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleGate from './RoleGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: readonly string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { token, user } = useAuth();
    const location = useLocation();

    if (!token) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.must_change_password) {
      return <Navigate to="/set-password" replace />;
    }

    return <RoleGate allowedRoles={allowedRoles}>{children}</RoleGate>;
};

export default ProtectedRoute;
