import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginState: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  loginState: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier s'il y a un utilisateur sauvegardé au démarrage
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        const storedToken = await AsyncStorage.getItem('@auth_token');
        
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading auth state', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const loginState = async (newUser: User, newToken: string) => {
    try {
      await AsyncStorage.setItem('@auth_user', JSON.stringify(newUser));
      await AsyncStorage.setItem('@auth_token', newToken);
      setUser(newUser);
      setToken(newToken);
    } catch (error) {
      console.error('Error saving auth state', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@auth_user');
      await AsyncStorage.removeItem('@auth_token');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error clearing auth state', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginState, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
