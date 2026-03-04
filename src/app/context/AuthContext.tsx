import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    avatarUrl:
      typeof supabaseUser.user_metadata?.avatar_url === 'string'
        ? supabaseUser.user_metadata.avatar_url
        : undefined,
  });

  const refreshUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser(mapSupabaseUser(data.user));
    }
  };

  // Sync with supabase session on mount.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(mapSupabaseUser(data.session.user));
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session?.user) {
      return false;
    }
    setUser(mapSupabaseUser(data.session.user));
    return true;
  };

  const signup = async (
    email: string,
    password: string,
    confirmPassword: string,
  ) => {
    if (password !== confirmPassword) return false;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      return false;
    }
    setUser(mapSupabaseUser(data.user));
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
