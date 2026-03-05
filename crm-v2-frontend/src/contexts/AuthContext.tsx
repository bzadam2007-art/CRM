import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'commercial';
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on mount (from localStorage)
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user as User);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.login(email, password, rememberMe);

      if (response.success && response.user) {
        setUser(response.user as User);
        return true;
      } else {
        setError(response.message || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      await authService.logout();
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.register(username, email, password);

      if (response.success && response.user) {
        setUser(response.user as User);
        return true;
      } else {
        setError(response.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    register,
    checkAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
