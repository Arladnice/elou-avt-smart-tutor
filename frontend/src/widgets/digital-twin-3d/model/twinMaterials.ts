import * as THREE from 'three';
import { TWIN_THEMES, TWIN_COLORS } from './PlantDigitalTwin3D.config';

export interface TwinMaterials {
  steelDark: THREE.MeshStandardMaterial;
  steelLight: THREE.MeshStandardMaterial;
  steelBright: THREE.MeshStandardMaterial;
  steelTruss: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  hazardYellow: THREE.MeshStandardMaterial;
  grating: THREE.MeshStandardMaterial;
  handrail: THREE.MeshStandardMaterial;
  crudePipe: THREE.MeshStandardMaterial;
  gasPipe: THREE.MeshStandardMaterial;
  waterPipe: THREE.MeshStandardMaterial;
  steamPipe: THREE.MeshStandardMaterial;
  drainPipe: THREE.MeshStandardMaterial;
  glassCutaway: THREE.MeshPhysicalMaterial;
  crudeLiquid: THREE.MeshPhysicalMaterial;
  pumpRunning: THREE.MeshStandardMaterial;
  pumpStopped: THREE.MeshStandardMaterial;
  valveOpen: THREE.MeshStandardMaterial;
  valveClosed: THREE.MeshStandardMaterial;
  flameCore: THREE.MeshBasicMaterial;
  flameOuter: THREE.MeshBasicMaterial;
  insulatorCeramic: THREE.MeshStandardMaterial;
  electricGlow: THREE.MeshBasicMaterial;
}

export const createTwinMaterials = (themeMode: 'light' | 'dark' = 'dark'): TwinMaterials => {
  const theme = TWIN_THEMES[themeMode];

  return {
    steelDark: new THREE.MeshStandardMaterial({ color: theme.steelDark, roughness: 0.5, metalness: 0.8 }),
    steelLight: new THREE.MeshStandardMaterial({ color: theme.steelLight, roughness: 0.35, metalness: 0.85 }),
    steelBright: new THREE.MeshStandardMaterial({ color: theme.steelBright, roughness: 0.25, metalness: 0.9 }),
    steelTruss: new THREE.MeshStandardMaterial({ color: theme.steelTruss, roughness: 0.6, metalness: 0.7 }),
    concrete: new THREE.MeshStandardMaterial({ color: theme.concrete, roughness: 0.9, metalness: 0.1 }),
    hazardYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.2 }),
    grating: new THREE.MeshStandardMaterial({
      color: theme.steelDark,
      roughness: 0.7,
      metalness: 0.6,
      wireframe: false,
    }),
    handrail: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.3 }),
    crudePipe: new THREE.MeshStandardMaterial({ color: theme.crudePipe, roughness: 0.3, metalness: 0.7 }),
    gasPipe: new THREE.MeshStandardMaterial({ color: theme.gasPipe, roughness: 0.3, metalness: 0.7 }),
    waterPipe: new THREE.MeshStandardMaterial({ color: theme.waterPipe, roughness: 0.3, metalness: 0.7 }),
    steamPipe: new THREE.MeshStandardMaterial({ color: theme.steamPipe, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.85 }),
    drainPipe: new THREE.MeshStandardMaterial({ color: theme.drainPipe, roughness: 0.5, metalness: 0.6 }),
    glassCutaway: new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      transmission: 0.85,
      ior: 1.45,
    }),
    crudeLiquid: new THREE.MeshPhysicalMaterial({
      color: 0x064e3b,
      emissive: 0x022c22,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.88,
    }),
    pumpRunning: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.pumpRunning, emissive: 0x059669, emissiveIntensity: 0.6, roughness: 0.3 }),
    pumpStopped: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.pumpStopped, emissive: 0xdc2626, emissiveIntensity: 0.5, roughness: 0.3 }),
    valveOpen: new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 }),
    valveClosed: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.5 }),
    flameCore: new THREE.MeshBasicMaterial({ color: TWIN_COLORS.flameYellow }),
    flameOuter: new THREE.MeshBasicMaterial({ color: TWIN_COLORS.flameOrange, transparent: true, opacity: 0.8 }),
    insulatorCeramic: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.3, metalness: 0.2 }),
    electricGlow: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }),
  };
};

export const applyThemeToMaterials = (materials: TwinMaterials, themeMode: 'light' | 'dark') => {
  const theme = TWIN_THEMES[themeMode];
  materials.steelDark.color.setHex(theme.steelDark);
  materials.steelLight.color.setHex(theme.steelLight);
  materials.steelBright.color.setHex(theme.steelBright);
  materials.steelTruss.color.setHex(theme.steelTruss);
  materials.concrete.color.setHex(theme.concrete);
  materials.crudePipe.color.setHex(theme.crudePipe);
  materials.gasPipe.color.setHex(theme.gasPipe);
  materials.waterPipe.color.setHex(theme.waterPipe);
  materials.steamPipe.color.setHex(theme.steamPipe);
  materials.drainPipe.color.setHex(theme.drainPipe);
  materials.grating.color.setHex(theme.steelDark);
};
