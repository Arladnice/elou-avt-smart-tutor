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
  width: 76px;
  height: 76px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  font-weight: 700;
  color: white;
  background-color: ${props => {
    if (props.$grade === 'A') return props.theme.colors.success;
    if (props.$grade === 'B') return props.theme.colors.primary;
    if (props.$grade === 'C') return props.theme.colors.warning;
    return props.theme.colors.danger;
  }};
  box-shadow: 0 2px 8px ${props => props.theme.colors.shadow};
  border: 3px solid ${props => props.theme.colors.surface};
`;


export const StatRow = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  background: ${props => props.theme.colors.canvas};
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
    letter-spacing: 0.1px;
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
  letter-spacing: 0.1px;
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
  background-color: ${props => props.theme.colors.canvas};
  border-radius: 4px;
`;


export const ErrorTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.danger};
`;

export const ErrorClause = styled.span`
  background: ${props => props.theme.colors.dangerMuted};
  color: ${props => props.theme.colors.danger};
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
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
  background: ${props => props.theme.colors.primaryMuted};
  border-left: 3px solid ${props => props.theme.colors.primary};
  border-radius: 0 4px 4px 0;
  margin-bottom: 6px;
  width: 100%;
`;

export const ModalTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.colors.text};
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
  color: ${props => props.theme.colors.textMuted};
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
  background: ${props => props.theme.colors.warningMuted};
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: ${props => props.theme.colors.warning};
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
  background: ${props => props.theme.colors.primary};
  border: 1px solid ${props => props.theme.colors.primary};
  color: #ffffff;
  font-weight: 600;

  &&:hover, &&:focus {
    background: ${props => props.theme.colors.accent};
    border-color: ${props => props.theme.colors.accent};
    color: #ffffff;
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
  background-color: ${props => props.theme.colors.surfaceLight};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textMuted};
  font-weight: 600;

  &&:hover, &&:focus {
    background-color: ${props => props.theme.colors.surfaceMuted};
    border-color: ${props => props.theme.colors.borderStrong};
    color: ${props => props.theme.colors.text};
  }
`;

export const StyledPdfButton = styled(Button)`
  flex: 1;
  height: 36px;
  padding: 0 8px;
  font-size: 11px;
  background-color: ${props => props.theme.colors.successMuted};
  border-color: ${props => props.theme.colors.success};
  color: ${props => props.theme.colors.success};
  font-weight: 600;

  &&:hover, &&:focus {
    background-color: ${props => props.theme.colors.success};
    border-color: ${props => props.theme.colors.success};
    color: #ffffff;
  }
`;

export const StyledExitButton = styled(Button)`
  flex: 0 0 90px;
  height: 36px;
  padding: 0 10px;
  font-size: 11px;
  background-color: ${props => props.theme.colors.surfaceLight};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textMuted};
  font-weight: 600;

  &&:hover, &&:focus {
    background-color: ${props => props.theme.colors.surfaceMuted};
    border-color: ${props => props.theme.colors.borderStrong};
    color: ${props => props.theme.colors.text};
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
  background: ${props => (props.$kind === 'action' ? props.theme.colors.warningMuted : props.theme.colors.surfaceLight)};
  border: 1px solid ${props => (props.$kind === 'action' ? props.theme.colors.warning : props.theme.colors.border)};
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
  flex: 0 0 116px;
  min-width: 116px;
  padding: 6px 6px 5px;
  border-radius: 4px;
  background: ${props => (props.$hasError ? props.theme.colors.dangerMuted : props.theme.colors.surfaceLight)};
  border: 1px solid ${props => (props.$hasError ? props.theme.colors.danger : props.theme.colors.border)};

  .action {
    width: 100%;
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
    font-weight: 700;
    color: ${props => (props.$hasError ? props.theme.colors.danger : props.theme.colors.text)};
    line-height: 1.25;
    overflow-wrap: anywhere;
    text-align: center;
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
