import type { EquipmentId } from '@/entities/mnemoscheme/model/types';
import type { PumpId, ValveId } from '@/entities/telemetry';

export type CameraPreset = 'overview' | 'elou' | 'furnaces_at' | 'vt' | 'cinematic';

export interface CameraPresetConfig {
  id: CameraPreset;
  label: string;
  iconName: string;
  position: [number, number, number];
  target: [number, number, number];
  description: string;
}

export interface Hotspot3D {
  id: string;
  label: string;
  sublabel?: string;
  worldPos: [number, number, number];
  equipmentId?: EquipmentId;
  pumpId?: PumpId;
  valveId?: ValveId;
  category: 'column' | 'furnace' | 'vessel' | 'pump' | 'valve' | 'sensor';
  valueGetter?: (sensors: Record<string, number>, setpoints: Record<string, number>) => string;
  unit?: string;
}

export interface InteractiveMeshUserData {
  type: 'pump' | 'valve' | 'equipment';
  id: string;
  equipmentId?: EquipmentId;
  pumpId?: PumpId;
  valveId?: ValveId;
  name: string;
}
