import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK = {
  background: '#0a0a1a',
  card: '#12122a',
  primary: '#4f8ef7',
  text: '#ffffff',
  subtext: '#8888aa',
  border: '#1e1e3a',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  statusBar: 'light',
};

const LIGHT = {
  background: '#f0f4ff',
  card: '#ffffff',
  primary: '#2563eb',
  text: '#0a0a1a',
  subtext: '#666688',
  border: '#dde3ff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  statusBar: 'dark',
};

const ThemeContext = createContext({ theme: DARK, isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('dark_mode').then(val => {
      setIsDark(val !== 'false');
    });
  }, []);

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('dark_mode', next ? 'true' : 'false');
  }

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
