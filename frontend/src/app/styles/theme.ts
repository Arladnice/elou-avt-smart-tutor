export type ThemeMode = 'light' | 'dark';

/**
 * Нейтральная HMI-палитра: цвет сообщает о состоянии процесса, а не служит
 * декором. Светлая схема используется по умолчанию, тёмная — для затемнённых
 * операторных и сохраняет ту же семантику состояний.
 */
export const lightTheme = {
  mode: 'light' as ThemeMode,
  colors: {
    background: '#e9edf1',
    surface: '#ffffff',
    surfaceLight: '#f2f4f6',
    surfaceMuted: '#e3e8ed',
    canvas: '#f7f8f9',
    border: '#c3cbd4',
    borderStrong: '#98a4b1',
    text: '#202a35',
    textMuted: '#5f6d7a',
    primary: '#245f8f',
    accent: '#246b78',
    success: '#23734d',
    warning: '#a15c00',
    danger: '#b42318',
    offline: '#77838f',
    primaryMuted: '#e5eef5',
    accentMuted: '#e3eff1',
    successMuted: '#e5f1eb',
    warningMuted: '#f8eddc',
    dangerMuted: '#f8e7e5',
    overlay: 'rgba(19, 28, 38, 0.42)',
    shadow: 'rgba(28, 39, 49, 0.12)',
    focusRing: 'rgba(36, 95, 143, 0.2)',
  },
  fonts: {
    main: "'Segoe UI', Arial, sans-serif",
    mono: "Consolas, 'Courier New', monospace",
  },
  transitions: {
    default: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
    glow: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
};

export type ScadaThemeType = typeof lightTheme;

export const darkTheme: ScadaThemeType = {
  mode: 'dark',
  colors: {
    background: '#10151b',
    surface: '#181e25',
    surfaceLight: '#222a33',
    surfaceMuted: '#2a333d',
    canvas: '#0d1217',
    border: '#35404c',
    borderStrong: '#596776',
    text: '#e6e9ed',
    textMuted: '#9aa6b2',
    primary: '#70a8d2',
    accent: '#70aeb7',
    success: '#66b38b',
    warning: '#e0a04b',
    danger: '#e66a61',
    offline: '#7f8993',
    primaryMuted: '#1d3040',
    accentMuted: '#1d3336',
    successMuted: '#1d3429',
    warningMuted: '#3a2d1d',
    dangerMuted: '#3b2423',
    overlay: 'rgba(0, 0, 0, 0.66)',
    shadow: 'rgba(0, 0, 0, 0.28)',
    focusRing: 'rgba(112, 168, 210, 0.22)',
  },
  fonts: lightTheme.fonts,
  transitions: lightTheme.transitions,
};

/** Обратная совместимость для модулей, которые импортировали старое имя. */
export const scadaTheme = lightTheme;
