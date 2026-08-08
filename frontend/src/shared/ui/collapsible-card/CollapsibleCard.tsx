import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import * as S from './CollapsibleCard.styles';

interface CollapsibleCardProps {
  /** Текст заголовка секции */
  title: React.ReactNode;
  /** Иконка перед заголовком (lucide-react) */
  icon?: React.ReactNode;
  /** Содержимое секции */
  children: React.ReactNode;
  /** Начальное состояние: true = свёрнут */
  defaultCollapsed?: boolean;
  /** Подсветка аварийного режима (красная рамка) */
  isEmergency?: boolean;
  /** Дополнительный контент справа от заголовка (например, фильтры) */
  extra?: React.ReactNode;
  /** Растянуть карточку на доступную высоту контейнера */
  fill?: boolean;
}

/**
 * Универсальный сворачиваемый контейнер для секций боковой панели SCADA.
 * По клику на заголовок плавно скрывает/показывает содержимое,
 * освобождая пространство для других компонентов.
 */
const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  icon,
  children,
  defaultCollapsed = false,
  isEmergency = false,
  extra,
  fill = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <S.Container $isEmergency={isEmergency} $fill={fill}>
      <S.Header $collapsed={collapsed} onClick={() => setCollapsed(prev => !prev)}>
        <S.TitleWrapper>
          <S.CollapseIcon $collapsed={collapsed}>
            <ChevronRight size={14} />
          </S.CollapseIcon>
          {icon}
          {title}
        </S.TitleWrapper>
        {extra && !collapsed && (
          <S.ExtraWrapper onClick={e => e.stopPropagation()}>
            {extra}
          </S.ExtraWrapper>
        )}
      </S.Header>
      <S.Body $collapsed={collapsed} $fill={fill}>
        {children}
      </S.Body>
    </S.Container>
  );

};

export default CollapsibleCard;
