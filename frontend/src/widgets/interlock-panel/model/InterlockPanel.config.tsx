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
    title: 'Объект',
    dataIndex: 'tag',
    key: 'tag',
    width: 128,
    render: (tag: string, row) => (
      <div className="interlock-object">
        <span>{tag}</span>
        <div className="interlock-object__controls">
          <Tag color={row.paz_active ? 'red' : row.signal ? 'orange' : 'green'}>
            {row.paz_active ? 'ПАЗ' : row.trip ? 'Дебл.' : row.signal ? 'Сигн.' : 'Норма'}
          </Tag>
          <span className="interlock-object__bypass-label">Дебл.</span>
          <Switch
            size="small"
            checked={row.bypassed}
            disabled={disabled || !canOperate || (row.trip && !row.bypassed)}
            checkedChildren="Вкл"
            unCheckedChildren="—"
            onChange={state => onToggle(row.tag, state)}
          />
        </div>
      </div>
    ),
  },
  {
    title: 'Датчик',
    dataIndex: 'sensors',
    key: 'sensors',
    width: 142,
    render: (sensors: string[]) => sensors.map(sensor => <div key={sensor}>{sensor}</div>),
  },
  {
    title: 'Конфигурация',
    dataIndex: 'logic',
    key: 'logic',
    width: 102,
  },
  {
    title: 'Сигнализация',
    dataIndex: 'signalization',
    key: 'signalization',
    width: 124,
  },
  {
    title: 'Авария',
    dataIndex: 'trip_threshold',
    key: 'trip_threshold',
    width: 124,
  },
];
