export const scadaTheme = {
  colors: {
    background: '#0a0e14', // Глубокий темный фон SCADA-системы
    surface: '#111620',    // Цвет карточек и блоков
    surfaceLight: '#1b2332', // Цвет ховеров и выделений
    border: '#222c3e',     // Границы элементов
    text: '#e1e7f0',       // Светлый текст приборных панелей
    textMuted: '#7c8ba1',  // Приглушенный серый текст
    primary: '#0070f3',    // Основной синий цвет (выбор, выделение)
    
    // Специфические SCADA-статусы (Неоновые цвета для контрастности)
    success: '#00ff66',    // Клапан открыт, датчик в норме
    warning: '#ffcc00',    // Предупреждение, выход за границы нормы
    danger: '#ff3333',     // Авария, критическое состояние, кнопка ESD
    offline: '#5c6470',    // Прибор отключен / нет связи
    accent: '#00e5ff',     // Голубой индикатор сигнала / потока жидкости
  },
  fonts: {
    main: "'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Courier New', Courier, monospace", // Для вывода телеметрии
  },
  transitions: {
    default: 'all 0.2s ease-in-out',
    glow: 'box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out',
  },
};

export type ScadaThemeType = typeof scadaTheme;
