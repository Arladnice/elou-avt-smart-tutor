import { Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { InterlockRow } from '@/entities/telemetry';

interface ColumnOptions {
  canOperate: boolean;
  disabled: boolean;
  onToggle: (tag: string, state: boolean) => void;
}

export const getInterlockColumns = ({
  canOperate,
  disabled,
  onToggle,
}: ColumnOptions): ColumnsType<InterlockRow> => [
  {
    title: 'Позиция',
    dataIndex: 'tag',
    key: 'tag',
    width: 72,
    render: (tag: string, row) => (
      <Tag color={row.primary ? 'cyan' : 'default'}>{tag}</Tag>
    ),
  },
  {
    title: 'Дебл.',
    dataIndex: 'bypassed',
    key: 'bypass',
    width: 54,
    render: (bypassed: boolean, row) => (
      <Switch
        size="small"
        checked={bypassed}
        disabled={disabled || !canOperate}
        checkedChildren="Вкл"
        unCheckedChildren="—"
        onChange={state => onToggle(row.tag, state)}
      />
    ),
  },
  {
    title: 'Логика',
    dataIndex: 'logic',
    key: 'logic',
    width: 80,
  },
  {
    title: 'Исп. механизм',
    dataIndex: 'mechanism',
    key: 'mechanism',
  },
  {
    title: 'Статус',
    dataIndex: 'alarm',
    key: 'alarm',
    width: 50,
    render: (alarm: boolean) => (
      <Tag color={alarm ? 'red' : 'green'}>{alarm ? 'Авар.' : 'Норма'}</Tag>
    ),
  },
];
