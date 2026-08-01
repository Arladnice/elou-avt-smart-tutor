import type { ColumnsType } from 'antd/es/table';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatDuration } from '@/shared/lib';
import type { TrainingRecord } from '@/entities/training-record';
import { StatusText, ScoreText, EllipsisCell, NowrapSpan } from '../ui/InstructorPage.styles';

/** Буквенная оценка и её цвет по баллу DTW; авария — сразу F */
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
  elou_salt_breakthrough: 'Проскок солей и воды из ЭЛОУ',
  vt_vacuum_failure: 'Срыв вакуума вакуумного блока ВТ',
};

export const SCENARIO_SHORT_NAMES: Record<string, string> = {
  startup: 'Пуск ЭЛОУ-АВТ',
  shutdown: 'Останов П-1',
  column_shutdown: 'Останов К-1',
  overpressure_relief: 'Рост давления',
  recirculation: 'Рециркуляция',
  elou_salt_breakthrough: 'Сбой ЭЛОУ',
  vt_vacuum_failure: 'Срыв вакуума ВТ',
};

export const getTableColumns = (): ColumnsType<TrainingRecord> => [
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
    render: (v: number, record: TrainingRecord) => {
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
