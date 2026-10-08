// src/contexts/AuthContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { showSuccess, showError, showInfo } from '@/app/utils/toast';
import { User } from "@/app/types";
import { apiFetch, API_URL } from '@/services/api';
import { clearApiCache } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<any>;
  signup: (userData: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (err) {
        console.error('Failed to parse user data:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      //  Clear any stale cached data from a previous session BEFORE logging in
      clearApiCache();

      const response = await fetch(`${API_URL}/api/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Invalid credentials');
      }

      const data = await response.json();

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      if (data.user?.role) localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
      showSuccess(`Welcome back, ${data.user.first_name}!`);
    } catch (error: any) {
      showError(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = () => {
    // Clear cache + invalidate react-query
    clearApiCache();

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    setUser(null);
    showInfo("Logged out successfully");
  };

  function extractErrorMessage(error: any): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error.detail) return String(error.detail);
    if (error.email) return Array.isArray(error.email) ? error.email[0] : error.email;
    if (error.password) return Array.isArray(error.password) ? error.password[0] : error.password;
    // fallback: first key's first value
    const firstKey = Object.keys(error)[0];
    if (firstKey) {
      const v = error[firstKey];
      return Array.isArray(v) ? v[0] : String(v);
    }
    return '';
  }
  const register = async (userData: any) => {
    const res = await apiFetch('/api/users/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const msg = extractErrorMessage(error) || 'Registration failed';
      showError(msg);
      throw new Error(msg);
    }
    const result = await res.json();
    showSuccess(`User ${result.first_name} ${result.last_name} registered successfully!`);
    return result;
  };

  const signup = async (userData: any) => {
    const res = await apiFetch('/api/users/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const msg = extractErrorMessage(error) || 'Signup failed';
      showError(msg);
      throw new Error(msg);
    }
    const result = await res.json();
    showSuccess(`Account created! Welcome, ${result.first_name}`);
    return result;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, signup, loading }}>
      {children}
    </AuthContext.Provider>
  );
}