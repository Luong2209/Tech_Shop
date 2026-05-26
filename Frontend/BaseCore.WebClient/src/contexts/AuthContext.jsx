import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { BYPASS_AUTH } from '../config/authBypass';

const DEV_BYPASS_USER = {
    userId: '0',
    username: 'dev-bypass',
    fullName: 'Dev (auth bypass)',
    role: 'Admin',
};

const AuthContext = createContext(null);

const isTokenExpired = (token) => {
    try {
        const base64Url = String(token).split('.')[1] || '';
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded));
        return payload.exp ? payload.exp * 1000 <= Date.now() : false;
    } catch {
        return true;
    }
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (BYPASS_AUTH) {
            setUser(DEV_BYPASS_USER);
            setLoading(false);
            return;
        }

        try {
            const storedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (storedUser && token) {
                if (isTokenExpired(token)) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                } else {
                    setUser(JSON.parse(storedUser));
                }
            }
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await authApi.login(username, password);
            const userData = response.data;
            if (!userData.token || isTokenExpired(userData.token)) {
                return { success: false, message: 'Login failed' };
            }

            localStorage.setItem('token', userData.token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true, user: userData };
        } catch (error) {
            const data = error.response?.data;
            const message = data?.message || data?.detail || data?.title || 'Login failed';
            return { success: false, message };
        }
    };

    const register = async (data) => {
        try {
            const response = await authApi.register(data);
            return { success: true, data: response.data };
        } catch (error) {
            const data = error.response?.data;
            const message = data?.message || data?.detail || data?.title || 'Registration failed';
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const isAdmin = () => {
        return user?.role === 'Admin';
    };

    const hasRole = (roles = []) => {
        if (!user?.role) return false;
        if (!Array.isArray(roles) || roles.length === 0) return true;
        return roles.includes(user.role);
    };

    const value = {
        user,
        login,
        register,
        logout,
        isAdmin,
        hasRole,
        isAuthenticated: !!user,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
