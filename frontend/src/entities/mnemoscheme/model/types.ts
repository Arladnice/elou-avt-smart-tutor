import type { DefectId, PumpId, Sensors, ValveId } from '@/entities/telemetry';

export type EquipmentId =
  | 'N_1'
  | 'N_20'
  | 'E_1'
  | 'VESSEL_E_1'
  | 'VESSEL_E_2'
  | 'P_3'
  | 'N_2'
  | 'N_3'
  | 'N_32'
  | 'N_4'
  | 'P_1'
  | 'K_1'
  | 'K_2'
  | 'V_1'
  | 'V_2'
  | 'V_3'
  | 'V_ELOU'
  | 'V_VT';

export type PipeKind = 'crude' | 'gas' | 'steam' | 'drain' | 'fuel' | 'demulsifier' | 'utility';

export interface ProcessZoneConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface ColumnNodeConfig {
  id: string;
  tag: 'К-1' | 'К-2' | string;
  equipmentId: 'K_1' | 'K_2';
  x: number;
  y: number;
  levelBinding: 'L_1' | 'L_2';
  alertBindings: DefectId[];
  tagOffsetY?: number;
}

export interface FurnaceNodeConfig {
  id: string;
  tag: 'П-1' | 'П-3' | string;
  equipmentId: 'P_1' | 'P_3';
  x: number;
  y: number;
  flameBinding: 'Flame_P1' | 'Flame_P3';
  alertBindings: DefectId[];
}

export interface VesselNodeConfig {
  id: string;
  tag: 'Е-1' | 'Е-2' | string;
  equipmentId: 'VESSEL_E_1' | 'VESSEL_E_2';
  x: number;
  y: number;
  levelSensorBinding?: 'L_E1' | 'L_E2';
  alertBindings: DefectId[];
}

export interface PumpNodeConfig {
  id: string;
  tag: string;
  equipmentId: PumpId;
  x: number;
  y: number;
  direction?: 'left' | 'right';
  tagOffsetX?: number;
  tagOffsetY?: number;
  alertBindings?: DefectId[];
}

export interface ValveNodeConfig {
  id: string;
  label: string;
  valveId: ValveId;
  equipmentId?: EquipmentId;
  x: number;
  y: number;
  rotate?: number;
  vertical?: boolean;
  hideLabel?: boolean;
}

export interface SensorNodeConfig {
  id: string;
  tag: string;
  sensorKey: keyof Sensors;
  unit: string;
  x: number;
  y: number;
  showSparkline?: boolean;
  showLevelGauge?: boolean;
  fullScaleMm?: number;
  minLimit?: number;
  maxLimit?: number;
}

export interface PipelineConfig {
  id: string;
  d?: string;
  kind: PipeKind;
  flowBinding?: string;
  cutOffValve?: ValveId;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface LabelConfig {
  id: string;
  x: number;
  y: number;
  text: string;
  className?: 'source-label' | 'utility-label' | 'gas-release-label' | 'valve-tag' | 'column-tag' | 'equipment-tag';
  textAnchor?: 'start' | 'middle' | 'end';
}

export interface MnemoschemeConfig {
  id: string;
  name: string;
  description?: string;
  isBuiltin?: boolean;
  width: number;
  height: number;
  zones: ProcessZoneConfig[];
  columns: ColumnNodeConfig[];
  furnaces: FurnaceNodeConfig[];
  vessels: VesselNodeConfig[];
  pumps: PumpNodeConfig[];
  valves: ValveNodeConfig[];
  sensors: SensorNodeConfig[];
  pipes: PipelineConfig[];
  labels: LabelConfig[];
}
