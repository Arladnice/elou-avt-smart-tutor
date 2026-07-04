import { createGlobalStyle } from 'styled-components';
import type { ScadaThemeType } from './theme';

export const GlobalStyle = createGlobalStyle<{ theme: ScadaThemeType }>`
  /* Сброс стилей */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    font-family: ${props => props.theme.fonts.main};
    overflow: hidden; /* Дашборд должен помещаться на одном экране без прокрутки тела страницы */
    height: 100vh;
    width: 100vw;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Стилизация скроллбара под SCADA-стиль */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.surfaceLight};
  }

  /* Отключение дефолтных рамок кнопок и инпутов */
  button, input, select {
    font-family: inherit;
    outline: none;
    border: none;
    background: none;
    color: inherit;
  }

  /* Глобальное переопределение стилей модальных окон Ant Design (без !important) */
  div.ant-modal-content {
    background-color: #111620;
    border: 1px solid #222c3e;
    color: #e1e7f0;
    padding: 24px;
  }
  div.ant-modal-header {
    background-color: #111620;
    border-bottom: 1px solid #222c3e;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .ant-modal-title {
    color: #e1e7f0;
    background-color: #111620;
  }
`;
