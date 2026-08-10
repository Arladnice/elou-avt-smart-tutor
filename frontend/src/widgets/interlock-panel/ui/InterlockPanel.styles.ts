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
    font-size: 10px;
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
    overflow: hidden;
    margin-right: 8px;
  }

  && .ant-table-thead > tr > th {
    padding: 4px 3px;
    background: ${props => props.theme.colors.surfaceLight};
    color: ${props => props.theme.colors.text};
    border-color: ${props => props.theme.colors.border};
    white-space: normal;
  }

  && .ant-table-tbody > tr > td {
    padding: 4px 3px;
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

  && .ant-table-thead > tr > th:nth-child(1),
  && .ant-table-tbody > tr > td:nth-child(1) {
    width: 72px;
    white-space: nowrap;
  }

  && .ant-table-thead > tr > th:nth-child(2),
  && .ant-table-tbody > tr > td:nth-child(2) {
    width: 54px;
  }

  && .ant-table-thead > tr > th:nth-child(3),
  && .ant-table-tbody > tr > td:nth-child(3) {
    width: 80px;
    white-space: nowrap;
  }

  && .ant-table-thead > tr > th:nth-child(5),
  && .ant-table-tbody > tr > td:nth-child(5) {
    width: 50px;
  }

  && .ant-table-cell {
    overflow-wrap: anywhere;
  }

  && .ant-tag {
    margin-inline-end: 0;
    padding-inline: 4px;
    white-space: nowrap;
    font-size: 10px;
  }
`;

export const Note = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  line-height: 1.4;
`;
