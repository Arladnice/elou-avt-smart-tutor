import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
`;

const Wrapper = styled.div<{ $inline: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: ${props => (props.$inline ? '100%' : '100vh')};
  min-height: ${props => (props.$inline ? '80px' : 'auto')};
  color: ${props => props.theme.colors.textMuted};
  font-family: ${props => props.theme.fonts.mono};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.theme.colors.accent};
  animation: ${pulse} 1.1s ease-in-out infinite;
`;

interface LazyFallbackProps {
  /** Текст ожидания — что именно подгружается */
  label?: string;
  /** true — заглушка внутри панели, false — на весь экран при загрузке страницы */
  inline?: boolean;
}

/** Заглушка на время загрузки отложенного чанка */
export const LazyFallback: React.FC<LazyFallbackProps> = ({ label = 'Загрузка модуля', inline = false }) => (
  <Wrapper $inline={inline}>
    <Dot />
    {label}
  </Wrapper>
);
