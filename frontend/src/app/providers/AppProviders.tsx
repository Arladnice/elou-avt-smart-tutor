import React, { useMemo, useState } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import { ThemeProvider } from 'styled-components';
import { darkTheme, lightTheme, type ThemeMode } from '@/app/styles/theme';
import { GlobalStyle } from '@/app/styles/globalStyles';
import { ThemeModeContext } from '@/shared/ui';
import { SimulatorProvider } from './SimulatorProvider';

const THEME_STORAGE_KEY = 'ktk_theme';

const readInitialMode = (): ThemeMode => {
  const savedMode = localStorage.getItem(THEME_STORAGE_KEY);
  return savedMode === 'dark' ? 'dark' : 'light';
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode);
  const currentTheme = mode === 'light' ? lightTheme : darkTheme;

  const themeModeValue = useMemo(() => ({
    mode,
    toggleMode: () => {
      setMode(currentMode => {
        const nextMode = currentMode === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_STORAGE_KEY, nextMode);
        return nextMode;
      });
    },
  }), [mode]);

  const componentTheme = useMemo(() => ({
    algorithm: mode === 'light' ? antdTheme.defaultAlgorithm : antdTheme.darkAlgorithm,
    token: {
      colorBgBase: currentTheme.colors.background,
      colorBgContainer: currentTheme.colors.surface,
      colorBgElevated: currentTheme.colors.surface,
      colorBorder: currentTheme.colors.border,
      colorBorderSecondary: currentTheme.colors.border,
      colorText: currentTheme.colors.text,
      colorTextHeading: currentTheme.colors.text,
      colorTextSecondary: currentTheme.colors.textMuted,
      colorPrimary: currentTheme.colors.primary,
      colorSuccess: currentTheme.colors.success,
      colorWarning: currentTheme.colors.warning,
      colorError: currentTheme.colors.danger,
      borderRadius: 4,
      borderRadiusLG: 6,
      fontFamily: currentTheme.fonts.main,
      boxShadow: `0 8px 24px ${currentTheme.colors.shadow}`,
    },
  }), [currentTheme, mode]);

  return (
    <ThemeModeContext.Provider value={themeModeValue}>
      <ConfigProvider theme={componentTheme}>
        <AntdApp>
          <ThemeProvider theme={currentTheme}>
            <GlobalStyle theme={currentTheme} />
            <SimulatorProvider>{children}</SimulatorProvider>
          </ThemeProvider>
        </AntdApp>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
};
