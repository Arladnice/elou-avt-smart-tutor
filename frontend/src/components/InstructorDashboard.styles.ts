import styled from 'styled-components';
import { Card, Radio, Button, Table, Badge } from 'antd';

export const Container = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};

  @media (max-height: 950px) {
    grid-template-rows: 48px 1fr;
  }
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 0 20px;

  @media (max-height: 950px) {
    padding: 0 16px;
  }
`;

export const Title = styled.h1`
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 16px;
    background-color: ${props => props.theme.colors.warning};
  }
`;

export const Content = styled.main`
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
  padding: 16px;
  overflow: hidden;

  @media (max-height: 950px) {
    gap: 10px;
    padding: 10px;
  }
`;

export const PanelColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;

  @media (max-height: 950px) {
    gap: 10px;
  }
`;

export const StyledCard = styled(Card)`
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 6px;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding: 0 16px;
    min-height: 40px;

    @media (max-height: 950px) {
      padding: 0 12px;
      min-height: 32px;
    }
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;

    @media (max-height: 950px) {
      font-size: 11px;
    }
  }

  .ant-card-body {
    padding: 16px;

    @media (max-height: 950px) {
      padding: 10px 12px;
    }
  }
`;

export const StretchCard = styled(StyledCard)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .ant-card-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }

  &&& {
    .ant-table-thead > tr > th {
      @media (max-height: 950px) {
        padding: 6px 8px;
        font-size: 11px;
      }
    }
    .ant-table-tbody > tr > td {
      @media (max-height: 950px) {
        padding: 6px 8px;
        font-size: 11px;
      }
    }
    .ant-pagination {
      @media (max-height: 950px) {
        margin: 8px 0 0 0;
      }
    }
  }
`;

export const FlexRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const MonitorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;

  @media (max-height: 950px) {
    gap: 8px;
    margin-bottom: 8px;
  }
`;

export const MonitorItem = styled.div`
  background-color: #111620;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-height: 950px) {
    padding: 6px;
  }

  .lbl {
    font-size: 11px;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    margin-bottom: 4px;

    @media (max-height: 950px) {
      font-size: 10px;
    }
  }

  .val {
    font-size: 18px;
    font-weight: 700;
    font-family: monospace;

    @media (max-height: 950px) {
      font-size: 15px;
    }
  }
`;

export const ConnectedBadge = styled.div`
  background-color: #111620;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DefectRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background-color: rgba(17, 22, 32, 0.6);
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-height: 950px) {
    padding: 4px 8px;
    margin-bottom: 4px;
  }
`;

export const DefectInfo = styled.div`
  display: flex;
  flex-direction: column;

  .title {
    font-size: 12px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    line-height: 1.3;

    @media (max-height: 950px) {
      font-size: 11px;
    }
  }

  .desc {
    font-size: 10.5px;
    color: ${props => props.theme.colors.textMuted};
    line-height: 1.25;

    @media (max-height: 950px) {
      font-size: 9.5px;
    }
  }
`;

export const LogArea = styled.div`
  flex: 1;
  background-color: #05070a;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 11px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const LogRow = styled.div<{ type: 'info' | 'warning' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
  color: ${props => 
    props.type === 'error' ? '#ff3333' : 
    props.type === 'warning' ? '#ffcc00' : 
    '#e1e7f0'
  };
`;

// Extracted / Wrapper styled components to eliminate inline style props

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const ConnectedBadgeStatus = styled.span<{ active: boolean }>`
  font-size: 10px;
  color: ${props => props.active ? '#00ff66' : '#5c6470'};
`;

export const ConnectedOperatorName = styled.strong<{ connected: boolean }>`
  color: ${props => props.connected ? '#00ff66' : '#7c8ba1'};
`;

export const LogoutButton = styled(Button)`
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;
`;

export const ProcessControlLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-height: 950px) {
    gap: 8px;
  }
`;

export const ScenarioLabel = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  color: #7c8ba1;
  display: block;
  margin-bottom: 6px;

  @media (max-height: 950px) {
    margin-bottom: 4px;
  }
`;

export const ScenarioRadioGroup = styled(Radio.Group)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;

  @media (max-height: 950px) {
    gap: 6px;
  }
`;

export const ScenarioRadioButton = styled(Radio.Button)<{ fullWidth?: boolean }>`
  text-align: center;
  border-radius: 4px;
  ${props => props.fullWidth && `grid-column: span 2;`}

  && {
    @media (max-height: 950px) {
      font-size: 10px;
      height: auto;
      min-height: 28px;
      line-height: 1.25;
      padding: 3px 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: normal;
      text-align: center;

      & > span:last-child {
        display: block;
        white-space: normal;
        word-break: break-word;
        text-align: center;
      }
    }
  }
`;

export const ControlRow = styled.div`
  display: flex;
`;

export const FullWidthButton = styled(Button)`
  flex: 1;
`;

export const LogTime = styled.span`
  color: #7c8ba1;
  margin-right: 4px;
  flex-shrink: 0;
`;

export const LogIconWrapper = styled.span`
  margin-top: 2.5px;
  flex-shrink: 0;
`;

export const SensorValue = styled.span<{ isAlert: boolean; isWarning?: boolean }>`
  font-size: 18px;
  font-weight: 700;
  font-family: monospace;
  color: ${props => 
    props.isAlert ? '#ff3333' : 
    props.isWarning ? '#ffcc00' : 
    '#00e5ff'
  };

  @media (max-height: 950px) {
    font-size: 15px;
  }
`;

export const LiveTelemetryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  font-size: 12px;

  @media (max-height: 950px) {
    gap: 8px;
    font-size: 11px;
  }
`;

export const LiveTelemetrySpan = styled.div<{ span?: number }>`
  ${props => props.span && `grid-column: span ${props.span};`}
`;

export const ColoredValue = styled.strong<{ color: string }>`
  color: ${props => props.color};
`;

export const AlertContainer = styled.div`
  margin-top: 12px;
`;

export const EllipsisCell = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
`;

export const TableWrapper = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const StyledTable = styled(Table)`
  &&& {
    background-color: #111620;
    color: #e1e7f0;

    .ant-table {
      background: transparent;
      color: #e1e7f0;
    }

    .ant-table-cell {
      background: transparent;
      color: #e1e7f0;
      border-bottom: 1px solid ${props => props.theme.colors.border};
      white-space: nowrap;
    }

    .ant-table-row:hover .ant-table-cell {
      background: rgba(255, 255, 255, 0.05);
    }

    .ant-table-tbody > tr.ant-table-row,
    .ant-table-tbody > tr.ant-table-row .ant-table-cell {
      cursor: pointer;
    }
  }
` as typeof Table;

// Modal stylings

export const ModalTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e1e7f0;
  font-size: 15px;
  font-weight: bold;
`;

export const CloseButton = styled(Button)`
  background: #00e5ff;
  border-color: #00e5ff;
  color: #0b0f17;
  font-weight: bold;

  &&:hover, &&:focus {
    background: #33ebff;
    border-color: #33ebff;
    color: #0b0f17;
  }
`;

export const modalStyles = {
  body: {
    backgroundColor: '#0b0f17',
    color: '#e1e7f0',
    padding: '20px',
    maxHeight: '60vh',
    overflowY: 'auto' as const
  }
};

export const ModalBodyContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid #1f293d;
  padding-bottom: 12px;
`;

export const SectionTitle = styled.h4`
  color: #7c8ba1;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 8px;
`;

export const ViolationCard = styled.div`
  background-color: #211517;
  border: 1px solid #5a1a1e;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
`;

export const ViolationHeader = styled.div`
  color: #ff4d4f;
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 2px;
`;

export const ViolationText = styled.div`
  font-size: 11px;
  color: #e8cbcc;
`;

export const NoViolationsText = styled.div`
  color: #00ff66;
  font-size: 12px;
`;

export const SessionLogBox = styled.div`
  background-color: #05070a;
  border: 1px solid #1f293d;
  border-radius: 4px;
  padding: 10px;
  max-height: 180px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 11px;
`;

export const SessionLogRow = styled.div<{ type?: 'info' | 'warning' | 'error' }>`
  margin-bottom: 4px;
  color: ${props => 
    props.type === 'error' ? '#ff4d4f' : 
    props.type === 'warning' ? '#ffcc00' : 
    '#e1e7f0'
  };
`;

export const ArchiveMessage = styled.div`
  color: #7c8ba1;
  font-style: italic;
`;

export const ModalSection = styled.div`
  margin-bottom: 20px;
`;

export const StatusText = styled.span<{ color: string }>`
  color: ${props => props.color};
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
`;

export const StatusBadge = styled(Badge)<{ $color?: string }>`
  && {
    .ant-badge-status-text {
      color: ${props => props.$color || props.theme.colors.text};
    }
  }
`;

export const ScoreText = styled.strong<{ color: string }>`
  color: ${props => props.color};
  white-space: nowrap;
`;

export const NowrapSpan = styled.span`
  white-space: nowrap;
`;

export const TableCardTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;

  .main-title {
    font-weight: 600;
  }

  .sub-hint {
    font-size: 11px;
    font-weight: 400;
    text-transform: none;
    color: ${props => props.theme.colors.textMuted};
  }
`;

export const TopCardsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;

  @media (max-height: 950px) {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 10px;
    align-items: stretch;
  }
`;

export const TimeControlRow = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-height: 950px) {
    margin-top: 8px;
    gap: 6px;
  }
`;

export const SnapshotControlRow = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-height: 950px) {
    margin-top: 6px;
    gap: 6px;
  }
`;

export const ActionButton = styled(Button)`
  && {
    flex: 1;
    height: 32px;
    font-size: 12px;

    @media (max-height: 950px) {
      height: 26px;
      font-size: 11px;
      padding: 0 4px;
    }
  }
`;

export const SpeedButton = styled(Button)`
  && {
    width: 45px;
    height: 32px;
    padding: 0;

    @media (max-height: 950px) {
      width: 36px;
      height: 26px;
    }
  }
`;

export const CompactScenarioLabel = styled(ScenarioLabel)`
  margin-bottom: 0;
  
  @media (max-height: 950px) {
    margin-bottom: 0;
  }
`;

/* Метрики Инфраструктуры и Настройки Зонтичного мониторинга */
export const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 0 16px;
  background-color: #0b0f17;
  gap: 16px;
  flex-shrink: 0;
`;

export const TabItem = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#00e5ff' : 'transparent'};
  color: ${props => props.active ? '#00e5ff' : props.theme.colors.textMuted};
  font-size: 12px;
  font-weight: 600;
  padding: 10px 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    color: #00e5ff;
  }

  @media (max-height: 950px) {
    font-size: 11px;
    padding: 8px 2px;
  }
`;

export const InfraGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  
  @media (max-height: 950px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 10px;
  }
`;

export const MetricCard = styled.div<{ active?: boolean }>`
  background-color: #0b0f17;
  border: 1px solid ${props => props.active ? '#00ff66' : props.theme.colors.border};
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .title {
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 700;
    color: ${props => props.theme.colors.textMuted};
  }

  .val {
    font-size: 18px;
    font-weight: bold;
    color: ${props => props.theme.colors.text};
    
    @media (max-height: 950px) {
      font-size: 15px;
    }
  }

  .desc {
    font-size: 9px;
    color: ${props => props.theme.colors.textMuted};
  }
`;

export const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  padding: 16px;
  flex: 1;
  overflow-y: auto;

  @media (max-height: 950px) {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
  }
`;

export const SettingBox = styled.div`
  background-color: #0b0f17;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .header {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: #00e5ff;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding-bottom: 4px;
  }
`;

export const MuteItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 4px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.05);

  .label {
    color: ${props => props.theme.colors.text};
  }

  .desc {
    font-size: 9px;
    color: ${props => props.theme.colors.textMuted};
    margin-left: 6px;
  }
`;


