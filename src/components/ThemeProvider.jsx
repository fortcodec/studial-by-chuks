import React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';

export function ThemeProvider({ children, attribute = 'class', defaultTheme = 'system', enableSystem = true, ...props }) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const nextTheme = useNextTheme();
  const currentTheme = nextTheme.resolvedTheme || nextTheme.theme;
  const isDark = currentTheme === 'dark';

  const toggleTheme = () => {
    nextTheme.setTheme(isDark ? 'light' : 'dark');
  };

  return {
    ...nextTheme,
    isDark,
    toggleTheme,
  };
}

export default ThemeProvider;
