import styled from 'styled-components';
import { Modal } from 'antd';

export const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.borderStrong};
    border-radius: 12px;
    box-shadow: 0 20px 45px ${props => props.theme.colors.shadow};
    padding: 24px;
  }

  .ant-modal-header {
    background: transparent;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding-bottom: 14px;
    margin-bottom: 18px;
  }

  .ant-modal-title {
    color: ${props => props.theme.colors.text};
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ant-modal-close {
    color: ${props => props.theme.colors.textMuted};
    &:hover {
      color: ${props => props.theme.colors.text};
    }
  }
`;

export const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const TopSection = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const QrWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

export const QrCaption = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
`;

export const DescriptionCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
`;

export const HighlightBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
  background: ${props => props.theme.mode === 'dark' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.1)'};
  border: 1px solid ${props => props.theme.colors.primary};
  padding: 4px 10px;
  border-radius: 20px;
  width: fit-content;
`;

export const Heading = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

export const Subtext = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${props => props.theme.colors.textMuted};
`;

export const LinkRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  font-family: ${props => props.theme.fonts.mono};
  font-size: 11px;
  color: ${props => props.theme.colors.primary};
  word-break: break-all;
`;

export const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: ${props => props.theme.colors.primary};
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`;

export const AdvantagesCard = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const AdvantageTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const AdvantageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const AdvantageItem = styled.div`
  padding: 8px 10px;
  background: ${props => props.theme.colors.surfaceLight};
  border-left: 3px solid ${props => props.theme.colors.primary};
  border-radius: 4px;
`;

export const ItemTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 2px;
`;

export const ItemDesc = styled.div`
  font-size: 10.5px;
  color: ${props => props.theme.colors.textMuted};
  line-height: 1.4;
`;

export const CredentialsBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.08)'};
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  font-size: 11.5px;
  color: ${props => props.theme.colors.text};
`;

export const CredentialsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  font-size: 11px;
`;

export const CredentialsContent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: ${props => props.theme.colors.text};

  code {
    font-family: ${props => props.theme.fonts.mono};
    background: ${props => props.theme.colors.canvas};
    padding: 1px 5px;
    border-radius: 3px;
    color: ${props => props.theme.colors.accent};
    border: 1px solid ${props => props.theme.colors.border};
    font-weight: 600;
  }
`;

export const CredentialsNote = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  font-style: italic;
`;

