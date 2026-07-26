'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App as AntApp, ConfigProvider } from 'antd';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { darkTheme, lightTheme } from './tokens';

type Mode = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
  /** False until the stored preference has been read, so nothing flashes. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: 'light', toggle: () => {}, ready: false });

export const useThemeMode = () => useContext(ThemeContext);

export const THEME_STORAGE_KEY = 'shorty-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start light so server and first client render agree; the real
  // preference is applied in the effect below (the inline script in the
  // document head has already painted the correct colours by then).
  const [mode, setMode] = useState<Mode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Mode | null;
    const preferred: Mode =
      stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setMode(preferred);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode, ready]);

  const toggle = useCallback(() => setMode((current) => (current === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo<ThemeContextValue>(() => ({ mode, toggle, ready }), [mode, toggle, ready]);

  return (
    <AntdRegistry>
      <ThemeContext.Provider value={value}>
        <ConfigProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </ThemeContext.Provider>
    </AntdRegistry>
  );
}

/**
 * Runs before first paint to stamp the saved theme on <html>, so a returning
 * dark-mode visitor never sees a white flash.
 */
export const themeInitScript = `
(function(){try{
  var s=localStorage.getItem('${THEME_STORAGE_KEY}');
  var m=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=m;
  document.documentElement.style.colorScheme=m;
}catch(e){}})();
`;
