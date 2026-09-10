import React from 'react';
import { Trash2, Sliders } from 'lucide-react';
import type { ValveId, PumpId, Sensors } from '@/entities/telemetry';
import type { PipeKind } from '@/entities/mnemoscheme';
import * as S from './SchemeBuilder.styles';

export interface SelectedElementRef {
  category: 'columns' | 'furnaces' | 'vessels' | 'pumps' | 'valves' | 'sensors' | 'pipes' | 'labels';
  id: string;
}

export interface PropertyInspectorProps {
  selectedElement: SelectedElementRef | null;
  itemData: any | null;
  onUpdateItem: (category: SelectedElementRef['category'], id: string, patch: Record<string, any>) => void;
  onDeleteItem: (category: SelectedElementRef['category'], id: string) => void;
}

const AVAILABLE_VALVE_IDS: ValveId[] = [
  'V_1', 'V_2', 'V_3', 'V_ELOU', 'V_VT', 'V_P3_OUT', 'V_P3_RETURN', 'V_P1_IN',
  'V_K2_OUT_32', 'V_K2_OUT_4', 'FUEL_P1', 'FUEL_P3', 'V_STEAM_K1', 'V_STEAM_K2',
  'V_K2_RELIEF', 'V_E1_DRAIN', 'V_E2_DRAIN',
];

const AVAILABLE_PUMP_IDS: PumpId[] = ['N_20', 'N_2', 'N_3', 'N_4', 'N_32'];

const AVAILABLE_SENSOR_KEYS: (keyof Sensors)[] = [
  'T_1', 'T_3', 'P_1', 'L_1', 'Sal_1', 'W_1', 'P_vac', 'T_2', 'L_2', 'L_E1', 'L_E2',
];

const PIPE_KINDS: PipeKind[] = ['crude', 'gas', 'steam', 'drain', 'fuel', 'demulsifier', 'utility'];

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  selectedElement,
  itemData,
  onUpdateItem,
  onDeleteItem,
}) => {
  if (!selectedElement || !itemData) {
    return (
      <S.InspectorSidebar>
        <S.InspectorTitle>Свойства объекта</S.InspectorTitle>
        <S.EmptySelectionNotice>
          <Sliders size={28} />
          <span>Выберите элемент на схеме для редактирования его параметров</span>
        </S.EmptySelectionNotice>
      </S.InspectorSidebar>
    );
  }

  const { category, id } = selectedElement;

  const handleFieldChange = (field: string, val: any) => {
    onUpdateItem(category, id, { [field]: val });
  };

  const handleNumberChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    handleFieldChange(field, isNaN(num) ? 0 : num);
  };

  return (
    <S.InspectorSidebar>
      <S.InspectorTitle>Свойства: {itemData.tag || itemData.label || itemData.text || itemData.id}</S.InspectorTitle>

      {/* Координаты X, Y (для узлов с x, y) */}
      {itemData.x !== undefined && itemData.y !== undefined && (
        <S.CoordinateRow>
          <S.FormGroup>
            <S.FormLabel>Координата X</S.FormLabel>
            <S.FormInput
              type="number"
              value={itemData.x}
              onChange={e => handleNumberChange('x', e)}
            />
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Координата Y</S.FormLabel>
            <S.FormInput
              type="number"
              value={itemData.y}
              onChange={e => handleNumberChange('y', e)}
            />
          </S.FormGroup>
        </S.CoordinateRow>
      )}

      {/* Тег / Название */}
      {itemData.tag !== undefined && (
        <S.FormGroup>
          <S.FormLabel>Тег / Маркировка</S.FormLabel>
          <S.FormInput
            type="text"
            value={itemData.tag}
            onChange={e => handleFieldChange('tag', e.target.value)}
          />
        </S.FormGroup>
      )}

      {/* Клапаны: Label и valveId */}
      {category === 'valves' && (
        <>
          <S.FormGroup>
            <S.FormLabel>Подпись клапана</S.FormLabel>
            <S.FormInput
              type="text"
              value={itemData.label || ''}
              onChange={e => handleFieldChange('label', e.target.value)}
            />
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Физический клапан в симуляторе</S.FormLabel>
            <S.FormSelect
              value={itemData.valveId}
              onChange={e => handleFieldChange('valveId', e.target.value)}
            >
              {AVAILABLE_VALVE_IDS.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </S.FormSelect>
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Поворот (°)</S.FormLabel>
            <S.FormSelect
              value={itemData.rotate || (itemData.vertical ? 90 : 0)}
              onChange={e => {
                const rot = parseInt(e.target.value, 10);
                handleFieldChange('rotate', rot);
                handleFieldChange('vertical', rot === 90 || rot === 270);
              }}
            >
              <option value={0}>0° (Горизонтально)</option>
              <option value={90}>90° (Вертикально вниз)</option>
              <option value={180}>180° (Обратно)</option>
              <option value={270}>270° (Вертикально вверх)</option>
            </S.FormSelect>
          </S.FormGroup>
        </>
      )}

      {/* Насосы: pumpId и направление */}
      {category === 'pumps' && (
        <>
          <S.FormGroup>
            <S.FormLabel>Физический насос в симуляторе</S.FormLabel>
            <S.FormSelect
              value={itemData.equipmentId}
              onChange={e => handleFieldChange('equipmentId', e.target.value)}
            >
              {AVAILABLE_PUMP_IDS.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </S.FormSelect>
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Направление потока</S.FormLabel>
            <S.FormSelect
              value={itemData.direction || 'right'}
              onChange={e => handleFieldChange('direction', e.target.value)}
            >
              <option value="right">Вправо →</option>
              <option value="left">← Влево</option>
            </S.FormSelect>
          </S.FormGroup>
        </>
      )}

      {/* Датчики: sensorKey, unit, sparkline, gauge */}
      {category === 'sensors' && (
        <>
          <S.FormGroup>
            <S.FormLabel>Параметр телеметрии</S.FormLabel>
            <S.FormSelect
              value={itemData.sensorKey}
              onChange={e => handleFieldChange('sensorKey', e.target.value)}
            >
              {AVAILABLE_SENSOR_KEYS.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </S.FormSelect>
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Единица измерения</S.FormLabel>
            <S.FormInput
              type="text"
              value={itemData.unit || ''}
              onChange={e => handleFieldChange('unit', e.target.value)}
            />
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>График динамики (тренд)</S.FormLabel>
            <S.FormSelect
              value={itemData.showSparkline ? 'true' : 'false'}
              onChange={e => handleFieldChange('showSparkline', e.target.value === 'true')}
            >
              <option value="false">Отключен</option>
              <option value="true">Включен</option>
            </S.FormSelect>
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Индикатор шкалы (уровнемер)</S.FormLabel>
            <S.FormSelect
              value={itemData.showLevelGauge ? 'true' : 'false'}
              onChange={e => handleFieldChange('showLevelGauge', e.target.value === 'true')}
            >
              <option value="false">Отключен</option>
              <option value="true">Включен</option>
            </S.FormSelect>
          </S.FormGroup>
          {itemData.showLevelGauge && (
            <S.FormGroup>
              <S.FormLabel>Полная шкала (мм)</S.FormLabel>
              <S.FormInput
                type="number"
                value={itemData.fullScaleMm || 2000}
                onChange={e => handleNumberChange('fullScaleMm', e)}
              />
            </S.FormGroup>
          )}
        </>
      )}

      {/* Трубопроводы */}
      {category === 'pipes' && (
        <>
          <S.FormGroup>
            <S.FormLabel>Тип технологической среды</S.FormLabel>
            <S.FormSelect
              value={itemData.kind}
              onChange={e => handleFieldChange('kind', e.target.value)}
            >
              {PIPE_KINDS.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </S.FormSelect>
          </S.FormGroup>
          {itemData.d !== undefined && (
            <S.FormGroup>
              <S.FormLabel>Геометрия SVG Path (d)</S.FormLabel>
              <S.FormInput
                type="text"
                value={itemData.d}
                onChange={e => handleFieldChange('d', e.target.value)}
              />
            </S.FormGroup>
          )}
          {itemData.x1 !== undefined && (
            <S.CoordinateRow>
              <S.FormGroup>
                <S.FormLabel>X1</S.FormLabel>
                <S.FormInput
                  type="number"
                  value={itemData.x1}
                  onChange={e => handleNumberChange('x1', e)}
                />
              </S.FormGroup>
              <S.FormGroup>
                <S.FormLabel>Y1</S.FormLabel>
                <S.FormInput
                  type="number"
                  value={itemData.y1}
                  onChange={e => handleNumberChange('y1', e)}
                />
              </S.FormGroup>
            </S.CoordinateRow>
          )}
          {itemData.x2 !== undefined && (
            <S.CoordinateRow>
              <S.FormGroup>
                <S.FormLabel>X2</S.FormLabel>
                <S.FormInput
                  type="number"
                  value={itemData.x2}
                  onChange={e => handleNumberChange('x2', e)}
                />
              </S.FormGroup>
              <S.FormGroup>
                <S.FormLabel>Y2</S.FormLabel>
                <S.FormInput
                  type="number"
                  value={itemData.y2}
                  onChange={e => handleNumberChange('y2', e)}
                />
              </S.FormGroup>
            </S.CoordinateRow>
          )}
        </>
      )}

      {/* Метки */}
      {category === 'labels' && (
        <S.FormGroup>
          <S.FormLabel>Текст надписи</S.FormLabel>
          <S.FormInput
            type="text"
            value={itemData.text}
            onChange={e => handleFieldChange('text', e.target.value)}
          />
        </S.FormGroup>
      )}

      <S.DeleteActionWrapper>
        <S.FullWidthActionButton
          $variant="danger"
          onClick={() => onDeleteItem(category, id)}
        >
          <Trash2 size={14} /> Удалить элемент
        </S.FullWidthActionButton>
      </S.DeleteActionWrapper>
    </S.InspectorSidebar>
  );
};
