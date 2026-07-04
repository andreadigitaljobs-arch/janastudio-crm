import React, { createContext, useContext, useEffect, useState } from 'react';
import { dataService } from '../services/dataService';

const AuthContext = createContext();

const toSessionUser = (staffProfile, authUser) => ({
  id: staffProfile.id,
  auth_user_id: authUser.id,
  name: staffProfile.name,
  email: staffProfile.email || authUser.email,
  role: staffProfile.role,
  username: staffProfile.username || '',
  image_url: staffProfile.image_url || null
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('jana_auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const updateAndCacheUser = (newUser) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('jana_auth_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('jana_auth_user');
    }
  };

  const loadStaffProfile = async (authUser) => {
    if (!authUser?.id) {
      updateAndCacheUser(null);
      return null;
    }

    const staffProfile = await dataService.getStaffByAuthUserId(authUser.id);
    if (!staffProfile) {
      await dataService.supabase.auth.signOut();
      updateAndCacheUser(null);
      return null;
    }

    const sessionUser = toSessionUser(staffProfile, authUser);
    updateAndCacheUser(sessionUser);
    return sessionUser;
  };

  useEffect(() => {
    let mounted = true;
    let authTimeoutId = null;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await dataService.supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          if (session?.user) {
            await loadStaffProfile(session.user);
          } else {
            updateAndCacheUser(null);
          }
        }
      } catch (error) {
        console.error('Auth session error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = dataService.supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        updateAndCacheUser(null);
        setLoading(false);
        return;
      }

      // Debounce: cancel pending auth profile load
      if (authTimeoutId) clearTimeout(authTimeoutId);
      authTimeoutId = setTimeout(async () => {
        if (!mounted) return;
        try {
          await loadStaffProfile(session.user);
        } catch (error) {
          console.error('Auth state error:', error);
        } finally {
          if (mounted) setLoading(false);
        }
      }, 300);
    });

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && mounted) {
        try {
          const { data: { session }, error } = await dataService.supabase.auth.getSession();
          if (error) throw error;
          if (session?.user) {
            await loadStaffProfile(session.user);
          }
        } catch (err) {
          console.error('Visibility session refresh failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      if (authTimeoutId) clearTimeout(authTimeoutId);
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await dataService.supabase.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password
      });

      if (error) {
        return { success: false, message: 'Correo o contrasena incorrectos' };
      }

      const profile = await loadStaffProfile(data.user);
      if (!profile) {
        return { success: false, message: 'Este usuario no esta vinculado al equipo activo' };
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error de conexion' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await dataService.supabase.auth.signOut();
    } finally {
      updateAndCacheUser(null);
      localStorage.removeItem('jana_active_tab');
      localStorage.removeItem('jana_auth_user');
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data: { user: authUser } } = await dataService.supabase.auth.getUser();
    if (!authUser) {
      updateAndCacheUser(null);
      return null;
    }
    return loadStaffProfile(authUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
