import { useCallback, useEffect, useState } from 'react';
import { applyTheme, initialTheme, saveTheme, type Theme } from '../lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => initialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
