import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BYPASS_AUTH } from '../config/authBypass';

const ProtectedRoute = ({ children, adminOnly = false, allowedRoles = null }) => {
    const { isAuthenticated, isAdmin, hasRole, loading } = useAuth();
    const location = useLocation();

    if (BYPASS_AUTH) {
        return children;
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-white via-[var(--color-background)] to-[var(--color-surface-2)]">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"
                    role="status"
                    aria-label="Loading"
                />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && !isAdmin()) {
        return <Navigate to="/" replace />;
    }

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
