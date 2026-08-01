import styled from 'styled-components';
import { Button } from 'antd';


export const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 10px 0;
`;

export const GradeBadge = styled.div<{ $grade: string }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: 900;
  color: white;
  background-color: ${props => {
    if (props.$grade === 'A') return props.theme.colors.success;
    if (props.$grade === 'B') return '#0070f3';
    if (props.$grade === 'C') return props.theme.colors.warning;
    return props.theme.colors.danger;
  }};
  box-shadow: 0 0 20px ${props => {
    if (props.$grade === 'A') return 'rgba(0, 255, 102, 0.4)';
    if (props.$grade === 'B') return 'rgba(0, 112, 243, 0.4)';
    if (props.$grade === 'C') return 'rgba(255, 204, 0, 0.4)';
    return 'rgba(255, 51, 51, 0.4)';
  }};
  border: 4px solid #111620;
`;


export const StatRow = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  background: #141b27;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
`;

export const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  span.label {
    font-size: 10px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
  }

  span.val {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 16px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
  }
`;

export const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.theme.colors.text};
  align-self: flex-start;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  width: 100%;
  padding-bottom: 4px;
`;

export const ErrorsContainer = styled.div`
  width: 100%;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const ErrorItemCard = styled.div`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  background-color: #0b0f17;
  border-radius: 4px;
`;


export const ErrorTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.danger};
`;

export const ErrorClause = styled.span`
  background: rgba(255, 51, 51, 0.15);
  color: ${props => props.theme.colors.danger};
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
  text-transform: uppercase;
`;

export const ErrorText = styled.p`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 4px;
  line-height: 1.4;
`;

export const RecItem = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text};
  line-height: 1.4;
  padding: 6px 12px;
  background: rgba(0, 229, 255, 0.05);
  border-left: 3px solid ${props => props.theme.colors.accent};
  border-radius: 0 4px 4px 0;
  margin-bottom: 6px;
  width: 100%;
`;

export const ModalTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e1e7f0;
  font-size: 15px;
`;

export const CenterTextContainer = styled.div`
  text-align: center;
`;

export const HeaderTitle = styled.h2<{ color: string }>`
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.color};
`;

export const HeaderSubtitle = styled.p`
  font-size: 11px;
  color: #7c8ba1;
  margin-top: 2px;
`;

export const ErrorItemContainer = styled.div`
  width: 100%;
`;

export const ErrorItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const FullWidthContainer = styled.div`
  width: 100%;
`;

export const AdaptiveRetrainingBanner = styled.div`
  width: 100%;
  background: rgba(255, 153, 0, 0.1);
  border: 1px dashed #ff9900;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: #ffcc00;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

export const FooterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 15px;
`;

export const PrimaryActionButton = styled(Button)`
  width: 100%;
  height: 40px;
  font-size: 12px;
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 229, 255, 0.05) 100%);
  border: 1px solid #00e5ff;
  color: #00e5ff;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.15);

  &&:hover, &&:focus {
    background: #00e5ff;
    border-color: #00e5ff;
    color: #0b0f17;
    box-shadow: 0 0 16px rgba(0, 229, 255, 0.4);
  }
`;

export const SecondaryButtonsRow = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
`;

export const StyledSecondaryButton = styled(Button)`
  flex: 1;
  height: 36px;
  padding: 0 8px;
  font-size: 11px;
  background-color: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
  color: #a0aec0;
  font-weight: 600;

  &&:hover, &&:focus {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
  }
`;

export const StyledPdfButton = styled(Button)`
  flex: 1;
  height: 36px;
  padding: 0 8px;
  font-size: 11px;
  background-color: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
  font-weight: 600;
  text-transform: uppercase;

  &&:hover, &&:focus {
    background-color: #10b981;
    border-color: #10b981;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
  }
`;

export const StyledExitButton = styled(Button)`
  flex: 0 0 90px;
  height: 36px;
  padding: 0 10px;
  font-size: 11px;
  background-color: #0a0e14;
  border-color: #222c3e;
  color: #7c8ba1;
  font-weight: 600;
  text-transform: uppercase;

  &&:hover, &&:focus {
    background-color: #222c3e;
    border-color: #222c3e;
    color: #e1e7f0;
  }
`;


/**
 * Метка момента нарушения. Бэкенд различает привязку к конкретному шагу
 * оператора и проверку итогового состояния — второе не подсвечиваем как
 * ошибочное действие, иначе оператор ищет несуществующий неверный клик.
 */
export const ErrorMoment = styled.span<{ $kind: 'action' | 'final' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: ${props => props.theme.fonts.mono};
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
  white-space: nowrap;
  color: ${props => (props.$kind === 'action' ? props.theme.colors.warning : props.theme.colors.textMuted)};
  background: ${props => (props.$kind === 'action' ? 'rgba(255, 204, 0, 0.12)' : 'rgba(124, 139, 161, 0.12)')};
  border: 1px solid ${props => (props.$kind === 'action' ? 'rgba(255, 204, 0, 0.35)' : 'rgba(124, 139, 161, 0.3)')};
`;

export const TimelineContainer = styled.div`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 8px 2px 10px;
  width: 100%;
`;

export const TimelineStepBox = styled.div<{ $hasError: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 74px;
  padding: 6px 6px 5px;
  border-radius: 4px;
  background: ${props => (props.$hasError ? 'rgba(255, 51, 51, 0.1)' : props.theme.colors.surfaceLight)};
  border: 1px solid ${props => (props.$hasError ? props.theme.colors.danger : props.theme.colors.border)};

  .action {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
    font-weight: 700;
    color: ${props => (props.$hasError ? props.theme.colors.danger : props.theme.colors.text)};
    white-space: nowrap;
  }

  .at {
    font-size: 9px;
    color: ${props => props.theme.colors.textMuted};
  }
`;

export const TimelineEmpty = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  padding: 6px 0 10px;
`;
