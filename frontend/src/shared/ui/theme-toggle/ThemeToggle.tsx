import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from './themeMode';
import * as S from './ThemeToggle.styles';

const ThemeToggle: React.FC = () => {
  const { mode, toggleMode } = useThemeMode();
  const nextModeLabel = mode === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему';

  return (
    <S.ToggleButton type="button" onClick={toggleMode} title={nextModeLabel} aria-label={nextModeLabel}>
      {mode === 'light' ? <Moon size={17} /> : <Sun size={17} />}
    </S.ToggleButton>
  );
};

export default ThemeToggle;
