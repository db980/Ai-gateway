import { createContext, useContext, useState, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../theme/theme';

interface ThemeContextType { isDark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });
export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => { const next = !isDark; setIsDark(next); localStorage.setItem('theme', next ? 'dark' : 'light'); };
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <MuiThemeProvider theme={isDark ? darkTheme : lightTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
