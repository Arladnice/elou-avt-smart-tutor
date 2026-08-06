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
    width: 100,
    render: (tag: string, row) => (
      <Tag color={row.primary ? 'cyan' : 'default'}>{tag}</Tag>
    ),
  },
  {
    title: 'Деблокировка',
    dataIndex: 'bypassed',
    key: 'bypass',
    width: 112,
    render: (bypassed: boolean, row) => (
      <Switch
        size="small"
        checked={bypassed}
        disabled={disabled || !canOperate}
        checkedChildren="Вкл."
        unCheckedChildren="Снята"
        onChange={state => onToggle(row.tag, state)}
      />
    ),
  },
  {
    title: 'Логика',
    dataIndex: 'logic',
    key: 'logic',
    width: 72,
  },
  {
    title: 'Исполнительный механизм',
    dataIndex: 'mechanism',
    key: 'mechanism',
    width: 150,
  },
  {
    title: 'Статус аварии',
    dataIndex: 'alarm',
    key: 'alarm',
    width: 104,
    render: (alarm: boolean) => (
      <Tag color={alarm ? 'red' : 'green'}>{alarm ? 'Авария' : 'Норма'}</Tag>
    ),
  },
];
