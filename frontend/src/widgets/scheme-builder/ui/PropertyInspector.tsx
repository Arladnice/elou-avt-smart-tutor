import React, { useMemo } from 'react';
import { Trash2, Sliders } from 'lucide-react';
import type { ValveId, PumpId, Sensors } from '@/entities/telemetry';
import type { MnemoschemeConfig, PipeKind, SnapPort } from '@/entities/mnemoscheme';
import { getSnapPorts, findMatchingPort } from '@/entities/mnemoscheme';
import * as S from './SchemeBuilder.styles';

export interface SelectedElementRef {
  category: 'columns' | 'furnaces' | 'vessels' | 'pumps' | 'valves' | 'sensors' | 'pipes' | 'labels';
  id: string;
}

export interface PropertyInspectorProps {
  scheme?: MnemoschemeConfig;
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

const AVAILABLE_FLOW_BINDINGS: { key: string; label: string }[] = [
  { key: '', label: 'Без анимации (статическая)' },
  { key: 'k1Feed', label: 'Подача сырья в колонну К-1' },
  { key: 'elouFeed', label: 'Подача сырой нефти в блок ЭЛОУ' },
  { key: 'washWater', label: 'Подача промывочной воды (Н-82)' },
  { key: 'elouDrain', label: 'Дренажный коллектор соленой воды (в Е-16)' },
  { key: 'trappedOil', label: 'Отвод уловленной нефти из Е-16' },
  { key: 'k1Relief', label: 'Сброс газов К-1 на факел' },
  { key: 'k1Loop', label: 'Циркуляция остатка К-1 (П-3)' },
  { key: 'k2Feed', label: 'Подача полугудрона в печь П-1 и К-2' },
  { key: 'k1BottomOutflow', label: 'Выход кубового остатка К-1' },
  { key: 'k2Outflow32', label: 'Откачка гудрона насосом Н-32' },
  { key: 'k2Outflow4', label: 'Откачка гудрона насосом Н-4' },
  { key: 'demulsifier', label: 'Подача деэмульгатора (ЭЛОУ)' },
  { key: 'e1Drain', label: 'Дренаж соленой воды Э-1' },
  { key: 'e2Drain', label: 'Дренаж соленой воды Э-2' },
  { key: 'steamK1', label: 'Паропровод водяного пара в К-1' },
  { key: 'steamK2', label: 'Паропровод водяного пара в К-2' },
  { key: 'fuelP1', label: 'Топливный газ на горелки П-1' },
  { key: 'fuelP3', label: 'Топливный газ на горелки П-3' },
];

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  scheme,
  selectedElement,
  itemData,
  onUpdateItem,
  onDeleteItem,
}) => {
  const availablePorts = useMemo(
    () => (scheme ? getSnapPorts(scheme, selectedElement?.id) : []),
    [scheme, selectedElement?.id]
  );

  const groupedPorts = useMemo(() => {
    const groups: Record<string, SnapPort[]> = {};
    availablePorts.forEach(port => {
      const groupName = port.categoryLabel || 'Оборудование';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(port);
    });
    return groups;
  }, [availablePorts]);

  const matchedStartPort = useMemo(
    () => findMatchingPort(availablePorts, itemData?.x1, itemData?.y1),
    [availablePorts, itemData?.x1, itemData?.y1]
  );

  const matchedEndPort = useMemo(
    () => findMatchingPort(availablePorts, itemData?.x2, itemData?.y2),
    [availablePorts, itemData?.x2, itemData?.y2]
  );

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

      {/* Емкости: ориентация */}
      {category === 'vessels' && (
        <S.FormGroup>
          <S.FormLabel>Ориентация аппарата</S.FormLabel>
          <S.FormSelect
            value={itemData.orientation || 'horizontal'}
            onChange={e => handleFieldChange('orientation', e.target.value)}
          >
            <option value="horizontal">Горизонтальная (Емкость / Электродегидратор)</option>
            <option value="vertical">Вертикальная (Гидрозатвор / Ловушка нефти)</option>
          </S.FormSelect>
        </S.FormGroup>
      )}

      {/* Клапаны: Label, вид и valveId */}
      {category === 'valves' && (
        <>
          <S.FormGroup>
            <S.FormLabel>Тип устройства</S.FormLabel>
            <S.FormSelect
              value={itemData.kind || 'valve'}
              onChange={e => handleFieldChange('kind', e.target.value)}
            >
              <option value="valve">Клапан / Задвижка</option>
              <option value="mixer">Смесительное устройство (Инжектор воды)</option>
            </S.FormSelect>
          </S.FormGroup>
          <S.FormGroup>
            <S.FormLabel>Подпись устройства</S.FormLabel>
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
              {!AVAILABLE_VALVE_IDS.includes(itemData.valveId) && (
                <option value={itemData.valveId}>
                  {itemData.valveId} (пользовательский)
                </option>
              )}
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
              {!AVAILABLE_PUMP_IDS.includes(itemData.equipmentId) && (
                <option value={itemData.equipmentId}>
                  {itemData.equipmentId} (пользовательский)
                </option>
              )}
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

          <S.FormGroup>
            <S.FormLabel>Привязка технологического потока</S.FormLabel>
            <S.FormSelect
              value={itemData.flowBinding || ''}
              onChange={e => handleFieldChange('flowBinding', e.target.value || undefined)}
            >
              {AVAILABLE_FLOW_BINDINGS.map(f => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </S.FormSelect>
          </S.FormGroup>

          <S.FormGroup>
            <S.FormLabel>Отсечной клапан (перекрывающий поток)</S.FormLabel>
            <S.FormSelect
              value={itemData.cutOffValve || ''}
              onChange={e => handleFieldChange('cutOffValve', e.target.value || undefined)}
            >
              <option value="">Без отсечки (постоянный)</option>
              {AVAILABLE_VALVE_IDS.map(v => (
                <option key={v} value={v}>
                  {v}
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

          {itemData.x1 !== undefined && itemData.x2 !== undefined && (
            <>
              <S.FormGroup>
                <S.FormLabel>Форма трассировки (углы 90°)</S.FormLabel>
                <S.RoutingButtonGroup>
                  <S.RoutingButton
                    type="button"
                    $isActive={!itemData.routing || itemData.routing === 'direct'}
                    onClick={() => handleFieldChange('routing', 'direct')}
                  >
                    <S.RoutingGlyph>──</S.RoutingGlyph>
                    Прямая
                  </S.RoutingButton>
                  <S.RoutingButton
                    type="button"
                    $isActive={itemData.routing === 'elbow-hv'}
                    onClick={() => handleFieldChange('routing', 'elbow-hv')}
                  >
                    <S.RoutingGlyph>┌─</S.RoutingGlyph>
                    Г (H-V)
                  </S.RoutingButton>
                  <S.RoutingButton
                    type="button"
                    $isActive={itemData.routing === 'elbow-vh'}
                    onClick={() => handleFieldChange('routing', 'elbow-vh')}
                  >
                    <S.RoutingGlyph>└─</S.RoutingGlyph>
                    Г (V-H)
                  </S.RoutingButton>
                  <S.RoutingButton
                    type="button"
                    $isActive={itemData.routing === 'step-h'}
                    onClick={() => handleFieldChange('routing', 'step-h')}
                  >
                    <S.RoutingGlyph>─┐└</S.RoutingGlyph>
                    Ступенька H
                  </S.RoutingButton>
                  <S.RoutingButton
                    type="button"
                    $isActive={itemData.routing === 'step-v'}
                    onClick={() => handleFieldChange('routing', 'step-v')}
                  >
                    <S.RoutingGlyph>┌─┘</S.RoutingGlyph>
                    Ступенька V
                  </S.RoutingButton>
                </S.RoutingButtonGroup>
              </S.FormGroup>

              {itemData.routing === 'step-h' && (
                <S.FormGroup>
                  <S.FormLabel>Смещение изгиба X (перемычка)</S.FormLabel>
                  <S.CoordinateRow>
                    <S.FormInput
                      type="number"
                      value={
                        itemData.midX !== undefined
                          ? itemData.midX
                          : Math.round((itemData.x1 + itemData.x2) / 20) * 10
                      }
                      onChange={e => handleNumberChange('midX', e)}
                    />
                    <S.ActionButton
                      type="button"
                      onClick={() =>
                        handleFieldChange(
                          'midX',
                          Math.round((itemData.x1 + itemData.x2) / 20) * 10
                        )
                      }
                    >
                      По центру
                    </S.ActionButton>
                  </S.CoordinateRow>
                </S.FormGroup>
              )}

              {itemData.routing === 'step-v' && (
                <S.FormGroup>
                  <S.FormLabel>Смещение изгиба Y (перемычка)</S.FormLabel>
                  <S.CoordinateRow>
                    <S.FormInput
                      type="number"
                      value={
                        itemData.midY !== undefined
                          ? itemData.midY
                          : Math.round((itemData.y1 + itemData.y2) / 20) * 10
                      }
                      onChange={e => handleNumberChange('midY', e)}
                    />
                    <S.ActionButton
                      type="button"
                      onClick={() =>
                        handleFieldChange(
                          'midY',
                          Math.round((itemData.y1 + itemData.y2) / 20) * 10
                        )
                      }
                    >
                      По центру
                    </S.ActionButton>
                  </S.CoordinateRow>
                </S.FormGroup>
              )}

              <S.FormGroup>
                <S.FormLabel>Выравнивание геометрии</S.FormLabel>
                <S.CoordinateRow>
                  <S.ActionButton
                    type="button"
                    onClick={() => handleFieldChange('y2', itemData.y1)}
                  >
                    Горизонтально
                  </S.ActionButton>
                  <S.ActionButton
                    type="button"
                    onClick={() => handleFieldChange('x2', itemData.x1)}
                  >
                    Вертикально
                  </S.ActionButton>
                </S.CoordinateRow>
              </S.FormGroup>

              <S.FormGroup>
                <S.FormLabel>Прикрепить начало (X1, Y1) к аппарату</S.FormLabel>
                <S.FormSelect
                  value={matchedStartPort ? matchedStartPort.id : (itemData.startAnchor || '')}
                  onChange={e => {
                    const portId = e.target.value;
                    if (!portId) {
                      onUpdateItem(category, id, { startAnchor: undefined });
                      return;
                    }
                    const port = availablePorts.find(p => p.id === portId);
                    if (port) {
                      onUpdateItem(category, id, {
                        x1: port.x,
                        y1: port.y,
                        startAnchor: port.id,
                      });
                    }
                  }}
                >
                  <option value="">
                    {matchedStartPort
                      ? `Привязано: ${matchedStartPort.label} (${matchedStartPort.x}, ${matchedStartPort.y})`
                      : 'Выберите штуцер оборудования...'}
                  </option>
                  {Object.entries(groupedPorts).map(([groupLabel, ports]) => (
                    <optgroup key={groupLabel} label={groupLabel}>
                      {ports.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.x}, {p.y})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </S.FormSelect>
              </S.FormGroup>

              <S.FormGroup>
                <S.FormLabel>Прикрепить конец (X2, Y2) к аппарату</S.FormLabel>
                <S.FormSelect
                  value={matchedEndPort ? matchedEndPort.id : (itemData.endAnchor || '')}
                  onChange={e => {
                    const portId = e.target.value;
                    if (!portId) {
                      onUpdateItem(category, id, { endAnchor: undefined });
                      return;
                    }
                    const port = availablePorts.find(p => p.id === portId);
                    if (port) {
                      onUpdateItem(category, id, {
                        x2: port.x,
                        y2: port.y,
                        endAnchor: port.id,
                      });
                    }
                  }}
                >
                  <option value="">
                    {matchedEndPort
                      ? `Привязано: ${matchedEndPort.label} (${matchedEndPort.x}, ${matchedEndPort.y})`
                      : 'Выберите штуцер оборудования...'}
                  </option>
                  {Object.entries(groupedPorts).map(([groupLabel, ports]) => (
                    <optgroup key={groupLabel} label={groupLabel}>
                      {ports.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.x}, {p.y})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </S.FormSelect>
              </S.FormGroup>
            </>
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
