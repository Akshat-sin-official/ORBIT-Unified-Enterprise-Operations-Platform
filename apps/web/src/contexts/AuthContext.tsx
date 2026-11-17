import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: (role: 'admin' | 'support' | 'dispatcher' | 'tech') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('orbit_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('orbit_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('orbit_user', JSON.stringify(res.data));
        } catch {
          setUser(null);
          localStorage.removeItem('orbit_access_token');
          localStorage.removeItem('orbit_refresh_token');
          localStorage.removeItem('orbit_user');
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userProfile, accessToken, refreshToken } = res.data;
    localStorage.setItem('orbit_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('orbit_refresh_token', refreshToken);
    }
    localStorage.setItem('orbit_user', JSON.stringify(userProfile));
    setUser(userProfile);
  };

  const loginDemo = async (role: 'admin' | 'support' | 'dispatcher' | 'tech') => {
    const emailMap = {
      admin: 'admin@orbit.local',
      support: 'support@orbit.local',
      dispatcher: 'dispatcher@orbit.local',
      tech: 'tech@orbit.local',
    };
    await login(emailMap[role], 'admin123');
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('orbit_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('orbit_access_token');
      localStorage.removeItem('orbit_refresh_token');
      localStorage.removeItem('orbit_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
