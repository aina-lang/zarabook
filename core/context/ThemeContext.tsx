import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textDim: string;
  textMuted: string;
  primary: string;
  border: string;
  input: string;
  badge: string;
  badgeText: string;
}

const darkTheme: ThemeColors = {
  background: '#0d0f14',
  card: '#151820',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  textMuted: '#475569',
  primary: '#f97316',
  border: '#22262f',
  input: '#151820',
  badge: 'rgba(249,115,22,0.15)',
  badgeText: '#f97316',
};

const lightTheme: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textDim: '#475569',
  textMuted: '#94a3b8',
  primary: '#f97316',
  border: '#e2e8f0',
  input: '#f1f5f9',
  badge: 'rgba(249,115,22,0.1)',
  badgeText: '#ea580c',
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('user-theme');
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
        } else if (systemColorScheme) {
          setTheme(systemColorScheme);
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    AsyncStorage.setItem('user-theme', newTheme).catch(e => {
       console.error('Failed to save theme', e);
    });
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
