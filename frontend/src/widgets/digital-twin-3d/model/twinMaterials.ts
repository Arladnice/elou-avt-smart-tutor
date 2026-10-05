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
  k2Liquid: THREE.MeshPhysicalMaterial;
  vesselShell: THREE.MeshPhysicalMaterial;
  levelRing: THREE.MeshBasicMaterial;
  levelRingK2: THREE.MeshBasicMaterial;
  levelCap: THREE.MeshBasicMaterial;
  levelCapK2: THREE.MeshBasicMaterial;
  levelGaugeTrack: THREE.MeshStandardMaterial;
  levelGaugePip: THREE.MeshBasicMaterial;
  desalterWater: THREE.MeshPhysicalMaterial;
  desalterOil: THREE.MeshPhysicalMaterial;
  desalterElectrode: THREE.MeshStandardMaterial;
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
      color: 0x059669,
      emissive: 0x10b981,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9,
    }),
    k2Liquid: new THREE.MeshPhysicalMaterial({
      color: 0xb45309,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9,
    }),
    vesselShell: new THREE.MeshPhysicalMaterial({
      color: themeMode === 'dark' ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: themeMode === 'dark' ? 0.38 : 0.32,
      roughness: 0.22,
      metalness: 0.45,
      transmission: 0.45,
      ior: 1.35,
      depthWrite: false,
    }),
    levelRing: new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 1.0,
    }),
    levelRingK2: new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 1.0,
    }),
    levelCap: new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
    }),
    levelCapK2: new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
    }),
    levelGaugeTrack: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7,
    }),
    levelGaugePip: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 1.0,
    }),
    desalterWater: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.75,
      roughness: 0.2,
    }),
    desalterOil: new THREE.MeshPhysicalMaterial({
      color: 0x78350f,
      emissive: 0x451a03,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.75,
      roughness: 0.2,
    }),
    desalterElectrode: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.8,
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

export const applyXRayToMaterials = (materials: TwinMaterials, showXRay: boolean, themeMode: 'light' | 'dark' = 'dark') => {
  const theme = TWIN_THEMES[themeMode];
  if (showXRay) {
    materials.vesselShell.color.setHex(themeMode === 'dark' ? 0x38bdf8 : 0x0284c7);
    materials.vesselShell.transparent = true;
    materials.vesselShell.opacity = themeMode === 'dark' ? 0.38 : 0.32;
    materials.vesselShell.roughness = 0.22;
    materials.vesselShell.metalness = 0.45;
    materials.vesselShell.transmission = 0.45;
    materials.vesselShell.depthWrite = false;
  } else {
    materials.vesselShell.color.setHex(theme.steelLight);
    materials.vesselShell.transparent = false;
    materials.vesselShell.opacity = 1.0;
    materials.vesselShell.roughness = 0.35;
    materials.vesselShell.metalness = 0.85;
    materials.vesselShell.transmission = 0;
    materials.vesselShell.depthWrite = true;
  }
  materials.vesselShell.needsUpdate = true;
};

export const applyMediumHighlight = (materials: TwinMaterials, activeMedium: string | null) => {
  const pipeMats: Record<string, THREE.MeshStandardMaterial> = {
    crude: materials.crudePipe,
    gas: materials.gasPipe,
    water: materials.waterPipe,
    steam: materials.steamPipe,
    drain: materials.drainPipe,
  };

  Object.entries(pipeMats).forEach(([mediumKey, mat]) => {
    if (!activeMedium || activeMedium === 'all') {
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.roughness = 0.3;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    } else if (mediumKey === activeMedium) {
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.roughness = 0.15;
      mat.emissive.copy(mat.color);
      mat.emissiveIntensity = 0.5;
    } else {
      mat.transparent = true;
      mat.opacity = 0.15;
      mat.roughness = 0.6;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
    mat.needsUpdate = true;
  });
};

export const applyFlowsToMaterials = (
  materials: TwinMaterials,
  showFlows: boolean,
  activeMedium: string | null = null,
) => {
  const pipeMats: Record<string, THREE.MeshStandardMaterial> = {
    crude: materials.crudePipe,
    gas: materials.gasPipe,
    water: materials.waterPipe,
    steam: materials.steamPipe,
    drain: materials.drainPipe,
  };

  Object.entries(pipeMats).forEach(([mediumKey, mat]) => {
    const isMediumFilterActive = Boolean(activeMedium && activeMedium !== 'all');
    const isThisMedium = mediumKey === activeMedium;

    if (isMediumFilterActive) {
      if (isThisMedium) {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.roughness = 0.15;
        mat.emissive.copy(mat.color);
        mat.emissiveIntensity = showFlows ? 0.65 : 0.4;
      } else {
        mat.transparent = true;
        mat.opacity = 0.15;
        mat.roughness = 0.6;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    } else {
      if (showFlows) {
        mat.transparent = true;
        mat.opacity = 0.88;
        mat.roughness = 0.22;
        mat.emissive.copy(mat.color);
        mat.emissiveIntensity = 0.28;
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.roughness = 0.3;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
    mat.needsUpdate = true;
  });
};
