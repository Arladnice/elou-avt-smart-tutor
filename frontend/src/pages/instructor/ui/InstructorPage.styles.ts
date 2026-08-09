import styled from 'styled-components';
import { Card, Radio, Button, Table, Badge, Select } from 'antd';

export const Container = styled.div`
  display: grid;
  grid-template-rows: clamp(48px, 5.5vh, 64px) 1fr;
  height: 100vh;
  width: 100%;
  min-width: 0;
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
  padding: 0 18px;
  box-shadow: 0 1px 3px ${props => props.theme.colors.shadow};

  @media (max-height: 950px) {
    padding: 0 16px;
  }
`;

export const Title = styled.h1`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 18px;
    background-color: ${props => props.theme.colors.primary};
  }

  span {
    color: ${props => props.theme.colors.textMuted};
    font-size: 12px;
    font-weight: 500;
  }
`;

export const Content = styled.main`
  display: grid;
  grid-template-columns: minmax(680px, 1fr) minmax(860px, 1.55fr);
  grid-template-rows: minmax(0, 1fr) clamp(140px, 13vh, 200px);
  gap: clamp(10px, 0.75vw, 18px);
  width: min(100%, 2600px);
  margin: 0 auto;
  padding: clamp(10px, 0.75vw, 18px);
  box-sizing: border-box;
  overflow: hidden;

  @media (max-height: 950px) {
    grid-template-rows: minmax(0, 1fr) clamp(130px, 15vh, 160px);
    gap: 10px;
    padding: 10px;
  }

  @media (min-width: 3000px) {
    width: min(100%, 2920px);
    grid-template-columns: minmax(720px, 0.9fr) minmax(1100px, 1.7fr);
  }

  @media (max-width: 1650px) {
    grid-template-columns: minmax(560px, 0.95fr) minmax(720px, 1.45fr);
  }

  @media (max-width: 1320px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 150px;
    overflow-y: auto;
    height: auto;
    min-height: 0;
  }
`;

export const PanelColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-width: 0;
  overflow: hidden;

  @media (max-width: 1320px) {
    height: auto;
    overflow: visible;
  }

  @media (max-height: 950px) {
    gap: 10px;
  }
`;

export const StyledCard = styled(Card)`
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 5px;

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
    letter-spacing: 0.1px;

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
  min-height: 180px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .ant-card-body {
    flex: 1;
    min-height: 140px;
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
  gap: clamp(8px, 0.6vw, 14px);
  margin-bottom: clamp(10px, 0.8vw, 18px);

  @media (max-height: 950px) {
    gap: 8px;
    margin-bottom: 8px;
  }
`;

export const MonitorItem = styled.div`
  background-color: ${props => props.theme.colors.canvas};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: clamp(7px, 0.55vw, 12px);
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

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-height: 950px) {
    gap: 6px;
  }
`;

export const MetricItem = styled.div<{ $isAlert?: boolean }>`
  background-color: ${props => props.$isAlert ? props.theme.colors.dangerMuted : props.theme.colors.canvas};
  border: 1px solid ${props => (props.$isAlert ? props.theme.colors.danger : props.theme.colors.border)};
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .lbl {
    font-size: 10px;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-height: 950px) {
      font-size: 9px;
    }
  }

  .val {
    font-size: 15px;
    font-weight: 700;
    font-family: ${props => props.theme.fonts.mono};
    color: ${props => (props.$isAlert ? props.theme.colors.danger : props.theme.colors.text)};

    @media (max-height: 950px) {
      font-size: 13px;
    }
  }

  .sub {
    font-size: 9px;
    color: ${props => props.theme.colors.textMuted};
  }
`;

export const MetricsUnavailable = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  padding: 4px 0;
`;

export const ConnectedBadge = styled.div`
  background-color: ${props => props.theme.colors.surfaceLight};
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
  background-color: ${props => props.theme.colors.canvas};
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
  min-width: 0;

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
  background-color: ${props => props.theme.colors.canvas};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 10.5px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 0;

  @media (max-height: 950px) {
    padding: 6px 8px;
    font-size: 10px;
  }
`;

export const LogRow = styled.div<{ type: 'info' | 'warning' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
  color: ${props => 
    props.type === 'error' ? props.theme.colors.danger :
    props.type === 'warning' ? props.theme.colors.warning :
    props.theme.colors.text
  };
`;

// Extracted / Wrapper styled components to eliminate inline style props

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ConnectedBadgeStatus = styled.span<{ $active: boolean }>`
  font-size: 10px;
  color: ${props => props.$active ? props.theme.colors.success : props.theme.colors.offline};
`;

export const ConnectedOperatorName = styled.strong<{ $connected: boolean }>`
  color: ${props => props.$connected ? props.theme.colors.success : props.theme.colors.textMuted};
`;

export const LogoutButton = styled(Button)`
  font-size: 11px;
  font-weight: 600;
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
  color: ${props => props.theme.colors.textMuted};
  display: block;
  margin-bottom: 6px;

  @media (max-height: 950px) {
    margin-bottom: 4px;
  }
`;

export const InstructorLogCard = styled(StretchCard)`
  grid-column: 1 / -1;
  min-height: 0;

  .ant-card-head {
    min-height: 34px;
  }

  .ant-card-body {
    min-height: 0;
    padding: 8px 12px 10px;
  }

  @media (max-height: 950px) {
    .ant-card-head {
      min-height: 30px;
    }

    .ant-card-body {
      padding: 6px 10px 8px;
    }
  }
`;

export const AlarmSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 10px;
  font-weight: 600;
`;

export const CriticalAlarmCount = styled.span`
  color: ${props => props.theme.colors.danger};
`;

export const WarningAlarmCount = styled.span`
  color: ${props => props.theme.colors.warning};
`;

export const ScenarioHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;

  ${ScenarioLabel} { margin-bottom: 0; }
`;

export const BuilderButton = styled(Button)`
  && {
    color: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
    font-size: 11px;
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

export const ScenarioRadioGroupWithMargin = styled(ScenarioRadioGroup)`
  margin-bottom: 12px;
`;

export const ScenarioRadioButton = styled(Radio.Button)<{ $fullWidth?: boolean }>`
  text-align: center;
  border-radius: 4px;
  ${props => props.$fullWidth && `grid-column: span 2;`}


  &&& {
    height: auto;
    min-height: 40px;
    line-height: 1.3;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: normal;
    text-align: center;
    font-size: 13px;

    & > span:last-child {
      display: block;
      white-space: normal;
      word-break: break-word;
      text-align: center;
      width: 100%;
    }

    @media (max-height: 950px) {
      font-size: 11px;
      min-height: 32px;
      line-height: 1.25;
      padding: 4px 6px;
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
  color: ${props => props.theme.colors.textMuted};
  margin-right: 4px;
  flex-shrink: 0;
`;

export const LogIconWrapper = styled.span`
  margin-top: 2.5px;
  flex-shrink: 0;
`;

export const SensorValue = styled.span<{ $isAlert: boolean; $isWarning?: boolean }>`
  font-size: 18px;
  font-weight: 700;
  font-family: monospace;
  color: ${props => 
    props.$isAlert ? props.theme.colors.danger :
    props.$isWarning ? props.theme.colors.warning :
    props.theme.colors.text
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
    background-color: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};

    .ant-table {
      background: transparent;
      color: ${props => props.theme.colors.text};
    }

    .ant-table-cell {
      background: transparent;
      color: ${props => props.theme.colors.text};
      border-bottom: 1px solid ${props => props.theme.colors.border};
      white-space: nowrap;
    }

    .ant-table-cell:first-child {
      padding-left: 16px;
      @media (max-height: 950px) {
        padding-left: 12px;
      }
    }

    .ant-table-cell:last-child {
      padding-right: 16px;
      @media (max-height: 950px) {
        padding-right: 12px;
      }
    }

    .ant-table-row:hover .ant-table-cell {
      background: ${props => props.theme.colors.surfaceLight};
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
  color: ${props => props.theme.colors.text};
  font-size: 15px;
  font-weight: bold;
`;

export const CloseButton = styled(Button)`
  background: ${props => props.theme.colors.primary};
  border-color: ${props => props.theme.colors.primary};
  color: #ffffff;
  font-weight: bold;

  &&:hover, &&:focus {
    background: ${props => props.theme.colors.accent};
    border-color: ${props => props.theme.colors.accent};
    color: #ffffff;
  }
`;

export const ModalBodyContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 12px;
`;

export const SectionTitle = styled.h4`
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 8px;
`;

export const ViolationCard = styled.div`
  background-color: ${props => props.theme.colors.dangerMuted};
  border: 1px solid ${props => props.theme.colors.danger};
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
`;

export const ViolationHeader = styled.div`
  color: ${props => props.theme.colors.danger};
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 2px;
`;

export const ViolationText = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text};
`;

export const NoViolationsText = styled.div`
  color: ${props => props.theme.colors.success};
  font-size: 12px;
`;

export const SessionLogBox = styled.div`
  background-color: ${props => props.theme.colors.canvas};
  border: 1px solid ${props => props.theme.colors.border};
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
    props.type === 'error' ? props.theme.colors.danger :
    props.type === 'warning' ? props.theme.colors.warning :
    props.theme.colors.text
  };
`;

export const ArchiveMessage = styled.div`
  color: ${props => props.theme.colors.textMuted};
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
  display: grid;
  grid-template-columns: minmax(330px, 1.15fr) minmax(300px, 0.85fr);
  gap: 16px;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;

  > .ant-card {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  > .ant-card > .ant-card-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  @media (max-height: 950px) {
    gap: 10px;
  }

  @media (max-width: 1100px) {
    display: flex;
    flex-direction: column;
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
  background-color: ${props => props.theme.colors.surfaceLight};
  gap: 16px;
  flex-shrink: 0;
`;

export const TabItem = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.textMuted};
  font-size: 12px;
  font-weight: 600;
  padding: 10px 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: ${props => props.theme.transitions.default};

  &:hover {
    color: ${props => props.theme.colors.primary};
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
  background-color: ${props => props.theme.colors.canvas};
  border: 1px solid ${props => props.active ? props.theme.colors.success : props.theme.colors.border};
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
  background-color: ${props => props.theme.colors.canvas};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .header {
    font-size: 12px;
    font-weight: 700;
    color: ${props => props.theme.colors.primary};
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
  border-bottom: 1px dashed ${props => props.theme.colors.border};

  .label {
    color: ${props => props.theme.colors.text};
  }

  .desc {
    font-size: 9px;
    color: ${props => props.theme.colors.textMuted};
    margin-left: 6px;
  }
`;

export const SessionSelect = styled(Select)`
  min-width: 220px;
  max-width: 320px;
  margin-left: 8px;
`;


// Оценка сработавших алармов инструктором (GAP-6: Closed Loop Feedback).
// Живут здесь, а не в виджете журнала: оператору эндпоинт отдаёт 403,
// поэтому единственный потребитель — эта страница.
export const FeedbackWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  vertical-align: middle;
`;

export const FeedbackActionBtn = styled.button<{ $fbType: 'confirm' | 'reject' }>`
  background-color: ${props => props.$fbType === 'confirm' ? props.theme.colors.successMuted : props.theme.colors.dangerMuted};
  border: 1px solid ${props => props.$fbType === 'confirm' ? props.theme.colors.success : props.theme.colors.danger};
  color: ${props => props.$fbType === 'confirm' ? props.theme.colors.success : props.theme.colors.danger};
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme.transitions.default};

  &:hover {
    opacity: 0.85;
    transform: scale(1.03);
  }
`;

export const FeedbackBadge = styled.span<{ $fbType: 'confirmed' | 'false_alarm' }>`
  font-size: 10px;
  font-weight: 600;
  margin-left: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  color: ${props => props.$fbType === 'confirmed' ? props.theme.colors.success : props.theme.colors.danger};
  background-color: ${props => props.$fbType === 'confirmed' ? props.theme.colors.successMuted : props.theme.colors.dangerMuted};
  border: 1px solid ${props => props.$fbType === 'confirmed' ? props.theme.colors.success : props.theme.colors.danger};
`;
