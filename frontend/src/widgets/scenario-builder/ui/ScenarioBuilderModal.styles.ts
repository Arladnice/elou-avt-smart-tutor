import styled from 'styled-components';
import { Modal, Card, Input } from 'antd';

export const StyledModal = styled(Modal)`
  && {
    .ant-modal-content {
      background-color: ${props => props.theme.colors.surface};
      border: 1px solid ${props => props.theme.colors.border};
      border-radius: 8px;
      box-shadow: 0 12px 36px ${props => props.theme.colors.shadow};
      padding: 20px 24px;
    }

    .ant-modal-header {
      background-color: ${props => props.theme.colors.surface};
      border-bottom: 1px solid ${props => props.theme.colors.border};
      padding-bottom: 14px;
      margin-bottom: 18px;
    }

    .ant-modal-close {
      color: ${props => props.theme.colors.textMuted};
      top: 18px;
      right: 20px;

      &:hover {
        color: ${props => props.theme.colors.text};
        background-color: ${props => props.theme.colors.surfaceLight};
      }
    }

    .ant-tabs-nav {
      margin-bottom: 16px;

      &::before {
        border-bottom-color: ${props => props.theme.colors.border};
      }
    }

    .ant-tabs-tab {
      color: ${props => props.theme.colors.textMuted};

      &:hover {
        color: ${props => props.theme.colors.primary};
      }

      &.ant-tabs-tab-active .ant-tabs-tab-btn {
        color: ${props => props.theme.colors.primary};
        font-weight: 600;
      }
    }

    .ant-tabs-ink-bar {
      background: ${props => props.theme.colors.primary};
    }

    .ant-form-item-label > label {
      color: ${props => props.theme.colors.text};
      font-size: 12px;
      font-weight: 500;
    }

    .ant-input,
    .ant-input-number,
    .ant-select-selector {
      background-color: ${props => props.theme.colors.surface};
      border-color: ${props => props.theme.colors.border};
      color: ${props => props.theme.colors.text};

      &:hover, &:focus {
        border-color: ${props => props.theme.colors.primary};
      }
    }

    .ant-select-arrow {
      color: ${props => props.theme.colors.textMuted};
    }
  }
`;

export const ModalTitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};

  .title-icon {
    font-size: 18px;
    color: ${props => props.theme.colors.primary};
  }
`;

export const TopInputsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const SectionCard = styled(Card)`
  && {
    margin-bottom: 16px;
    background: ${props => props.theme.colors.surfaceLight};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 6px;
    transition: ${props => props.theme.transitions.default};

    .ant-card-head {
      border-bottom: 1px solid ${props => props.theme.colors.border};
      min-height: 38px;
      padding: 0 14px;
      background: ${props => props.theme.colors.surfaceLight};
    }

    .ant-card-head-title {
      font-size: 13px;
      font-weight: 600;
      color: ${props => props.theme.colors.text};
      padding: 8px 0;
    }

    .ant-card-body {
      padding: 14px;
    }
  }
`;

export const ParametersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const SwitchesRow = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

export const ChecklistItem = styled.div`
  padding: 12px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  margin-bottom: 10px;
  transition: ${props => props.theme.transitions.default};

  &:hover {
    border-color: ${props => props.theme.colors.borderStrong};
  }
`;

export const ChecklistGridTop = styled.div`
  display: grid;
  grid-template-columns: 2fr 2fr 1.2fr;
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const ChecklistGridBottom = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 40px;
  gap: 10px;
  align-items: flex-start;

  @media (max-width: 680px) {
    grid-template-columns: 1fr 40px;
  }
`;

export const DeleteButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 26px;
`;

export const ModalFooterActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

export const JsonControlsRow = styled.div`
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

export const JsonTextArea = styled(Input.TextArea)`
  && {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 12px;
    line-height: 1.5;
    background: ${props => props.theme.mode === 'dark' ? '#0d1319' : '#f8fafc'};
    color: ${props => props.theme.mode === 'dark' ? '#52c41a' : '#1e293b'};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 6px;
    padding: 10px 12px;

    &:hover, &:focus {
      border-color: ${props => props.theme.colors.primary};
    }
  }
`;

export const RegistryContainer = styled.div`
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
`;

export const RegistryCard = styled(Card)`
  && {
    margin-bottom: 10px;
    background: ${props => props.theme.colors.surfaceLight};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 6px;
    transition: ${props => props.theme.transitions.default};

    &:hover {
      border-color: ${props => props.theme.colors.borderStrong};
    }

    .ant-card-body {
      padding: 12px 14px;
    }
  }
`;

export const ScenarioTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ScenarioIdBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  font-family: ${props => props.theme.fonts.mono};
  color: ${props => props.theme.colors.textMuted};
  background: ${props => props.theme.colors.surfaceMuted};
  border: 1px solid ${props => props.theme.colors.border};
  padding: 1px 7px;
  border-radius: 4px;
`;

export const ScenarioDescription = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 6px;
  line-height: 1.4;
`;

export const BuiltinTag = styled.span`
  color: ${props => props.theme.colors.textMuted};
  font-size: 12px;
  font-style: italic;
  padding: 2px 8px;
  background: ${props => props.theme.colors.surfaceMuted};
  border-radius: 4px;
`;
