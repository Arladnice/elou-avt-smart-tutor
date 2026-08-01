import React from 'react';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { ThemeProvider } from 'styled-components';
import { scadaTheme } from '@/app/styles/theme';
import { GlobalStyle } from '@/app/styles/globalStyles';
import { SimulatorProvider } from './SimulatorProvider';

/** Тёмная SCADA-палитра для компонентов Ant Design */
const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgElevated: '#111620',
    colorBgContainer: '#141b27',
    colorBorder: '#222c3e',
    colorText: '#e1e7f0',
    colorTextHeading: '#e1e7f0',
    colorPrimary: '#00e5ff',
  },
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConfigProvider theme={antdTheme}>
    <AntdApp>
      <ThemeProvider theme={scadaTheme}>
        <GlobalStyle theme={scadaTheme} />
        <SimulatorProvider>{children}</SimulatorProvider>
      </ThemeProvider>
    </AntdApp>
  </ConfigProvider>
);
