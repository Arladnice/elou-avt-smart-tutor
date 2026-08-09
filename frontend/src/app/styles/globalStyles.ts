import { createGlobalStyle } from 'styled-components';
import type { ScadaThemeType } from './theme';

export const GlobalStyle = createGlobalStyle<{ theme: ScadaThemeType }>`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    color-scheme: ${props => props.theme.mode};
  }

  body {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.background};
    font-family: ${props => props.theme.fonts.main};
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::selection {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.primaryMuted};
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.surfaceLight};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.borderStrong};
    border: 2px solid ${props => props.theme.colors.surfaceLight};
    border-radius: 6px;
  }

  button, input, select {
    color: inherit;
    font-family: inherit;
    outline: none;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    box-shadow: 0 0 0 3px ${props => props.theme.colors.focusRing};
  }

  div.ant-modal-content,
  div.ant-modal-confirm-body-wrapper {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 6px;
    box-shadow: 0 16px 48px ${props => props.theme.colors.shadow};
  }

  div.ant-modal-header {
    margin-bottom: 12px;
    padding-bottom: 10px;
    background: ${props => props.theme.colors.surface};
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }

  .ant-modal-title,
  div.ant-modal-confirm-title {
    color: ${props => props.theme.colors.text};
    background: transparent;
  }

  div.ant-modal-confirm-content {
    color: ${props => props.theme.colors.textMuted};
  }

  .ant-card,
  .ant-table-wrapper,
  .ant-input,
  .ant-input-affix-wrapper,
  .ant-select-selector,
  .ant-btn {
    box-shadow: none;
  }

  .ant-switch {
    box-shadow: inset 0 0 0 1px ${props => props.theme.colors.borderStrong};
  }
`;
