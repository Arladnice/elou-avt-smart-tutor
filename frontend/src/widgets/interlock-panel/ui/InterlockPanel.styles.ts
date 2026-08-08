import { Button, Table } from 'antd';
import styled from 'styled-components';
import type { InterlockRow } from '@/entities/telemetry';

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ContactBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: 6px;
  background: ${props => props.theme.colors.warningMuted};
`;

export const ContactText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  color: ${props => props.theme.colors.text};
  font-size: 12px;

  span {
    color: ${props => props.theme.colors.textMuted};
    font-size: 11px;
  }
`;

export const CallButton = styled(Button)`
  flex: 0 0 auto;
`;

export const Authorization = styled.div<{ $active: boolean }>`
  color: ${props => (props.$active ? props.theme.colors.success : props.theme.colors.warning)};
  font-size: 11px;
`;

export const InterlockTable = styled(Table<InterlockRow>)`
  && .ant-table {
    background: transparent;
    color: ${props => props.theme.colors.text};
    font-size: 11px;
  }

  && .ant-table-container {
    border-color: ${props => props.theme.colors.border};
  }

  && .ant-table-thead > tr > th {
    padding: 6px;
    background: ${props => props.theme.colors.surfaceLight};
    color: ${props => props.theme.colors.text};
    border-color: ${props => props.theme.colors.border};
    white-space: normal;
  }

  && .ant-table-tbody > tr > td {
    padding: 5px 6px;
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.textMuted};
    border-color: ${props => props.theme.colors.border};
  }

  && .ant-table-tbody > tr.primary-interlock > td {
    background: ${props => props.theme.colors.accentMuted};
  }

  && .ant-table-tbody > tr:hover > td {
    background: ${props => props.theme.colors.surfaceLight};
  }
`;

export const Note = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  line-height: 1.4;
`;
