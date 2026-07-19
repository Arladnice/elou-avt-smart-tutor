import type { ColumnsType } from 'antd/es/table';
import type { Session } from '../services/api';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { StatusText, ScoreText, EllipsisCell, NowrapSpan } from './InstructorDashboard.styles';

// Helper: Format duration from seconds to MM:SS
export const formatDuration = (v: number): string => {
  return `${Math.floor(v / 60)}м ${v % 60}с`;
};

// Helper: Get grade and color based on score and status
export const getScoreDetails = (score: number, status: string) => {
  if (status === 'accident') {
    return { color: '#ff3333', grade: 'F' };
  }
  if (score >= 85) return { color: '#00ff66', grade: 'A' };
  if (score >= 70) return { color: '#0070f3', grade: 'B' };
  if (score >= 50) return { color: '#ffcc00', grade: 'C' };
  return { color: '#ff3333', grade: 'F' };
};

export const SCENARIO_NAMES: Record<string, string> = {
  startup: 'Пуск установки ЭЛОУ-АВТ',
  shutdown: 'Аварийный останов печи П-1',
  column_shutdown: 'Останов колонны К-1',
  overpressure_relief: 'Ликвидация роста давления',
  recirculation: 'Перевод на рециркуляцию',
};

export const getTableColumns = (): ColumnsType<Session> => [
  {
    title: 'Оператор',
    dataIndex: 'operator_name',
    key: 'operator_name',
    render: (v: string) => <EllipsisCell title={v}>{v}</EllipsisCell>
  },
  {
    title: 'Сценарий',
    dataIndex: 'scenario_id',
    key: 'scenario_id',
    render: (v: string) => {
      const name = SCENARIO_NAMES[v] || v;
      return <EllipsisCell title={name}>{name}</EllipsisCell>;
    }
  },
  {
    title: 'Время (с)',
    dataIndex: 'duration_sec',
    key: 'duration_sec',
    render: (v: number) => <NowrapSpan>{formatDuration(v)}</NowrapSpan>
  },
  {
    title: 'Оценка (DTW)',
    dataIndex: 'score',
    key: 'score',
    render: (v: number, record: Session) => {
      const { color, grade } = getScoreDetails(v, record.status);
      return <ScoreText color={color}>{grade} ({v}%)</ScoreText>;
    }
  },
  {
    title: 'ИБ Контроль (ГОСТ)',
    dataIndex: 'integrity_valid',
    key: 'integrity_valid',
    render: (valid: boolean) => valid ? (
      <StatusText color="#00ff66">
        <ShieldCheck size={14} /> OK
      </StatusText>
    ) : (
      <StatusText color="#ff3333">
        <ShieldAlert size={14} /> Нарушена!
      </StatusText>
    )
  }
];
