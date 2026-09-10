import type { DefectId, PumpId, Sensors, ValveId } from '@/entities/telemetry';

export type KnownEquipmentId =
  | 'N_1'
  | 'N_20'
  | 'N_82'
  | 'E_1'
  | 'ED_1'
  | 'ED_2'
  | 'ED_3'
  | 'ED_4'
  | 'ED_5'
  | 'ED_6'
  | 'VESSEL_E_1'
  | 'VESSEL_E_2'
  | 'VESSEL_E_15'
  | 'VESSEL_E_16'
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

export type EquipmentId = KnownEquipmentId | (string & {});

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
  equipmentId: 'K_1' | 'K_2' | string;
  x: number;
  y: number;
  levelBinding: 'L_1' | 'L_2' | string;
  alertBindings: DefectId[];
  tagOffsetY?: number;
}

export interface FurnaceNodeConfig {
  id: string;
  tag: 'П-1' | 'П-3' | string;
  equipmentId: 'P_1' | 'P_3' | string;
  x: number;
  y: number;
  flameBinding: 'Flame_P1' | 'Flame_P3' | string;
  alertBindings: DefectId[];
}

export interface VesselNodeConfig {
  id: string;
  tag: 'Е-1' | 'Е-2' | string;
  equipmentId: EquipmentId;
  x: number;
  y: number;
  orientation?: 'horizontal' | 'vertical';
  levelSensorBinding?: 'L_E1' | 'L_E2' | string;
  alertBindings: DefectId[];
}

export interface PumpNodeConfig {
  id: string;
  tag: string;
  equipmentId: PumpId | string;
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
  valveId: ValveId | string;
  equipmentId?: EquipmentId;
  kind?: 'valve' | 'mixer';
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

export type PipeRouting = 'direct' | 'elbow-hv' | 'elbow-vh' | 'step-h' | 'step-v';

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
  routing?: PipeRouting;
  midX?: number;
  midY?: number;
  startAnchor?: string;
  endAnchor?: string;
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
