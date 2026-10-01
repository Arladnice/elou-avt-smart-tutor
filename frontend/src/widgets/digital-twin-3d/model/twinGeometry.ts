import * as THREE from 'three';
import { TWIN_COLORS } from './PlantDigitalTwin3D.config';
import type { InteractiveMeshUserData } from './types';

export interface TwinMaterials {
  steelDark: THREE.MeshStandardMaterial;
  steelLight: THREE.MeshStandardMaterial;
  steelBright: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  hazardYellow: THREE.MeshStandardMaterial;
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

export const createTwinMaterials = (): TwinMaterials => {
  return {
    steelDark: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.steelDark, roughness: 0.5, metalness: 0.8 }),
    steelLight: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.steelLight, roughness: 0.35, metalness: 0.85 }),
    steelBright: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.steelBright, roughness: 0.25, metalness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.concrete, roughness: 0.9, metalness: 0.1 }),
    hazardYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.2 }),
    crudePipe: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.crudePipe, roughness: 0.3, metalness: 0.7 }),
    gasPipe: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.gasPipe, roughness: 0.3, metalness: 0.7 }),
    waterPipe: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.waterPipe, roughness: 0.3, metalness: 0.7 }),
    steamPipe: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.steamPipe, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.85 }),
    drainPipe: new THREE.MeshStandardMaterial({ color: TWIN_COLORS.drainPipe, roughness: 0.5, metalness: 0.6 }),
    glassCutaway: new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.25,
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

/** Создает индустриальную площадку с координатной сеткой и фундаментами */
export const createIndustrialGround = (materials: TwinMaterials): THREE.Group => {
  const group = new THREE.Group();

  // Основная бетонно-металлическая плита
  const groundGeo = new THREE.PlaneGeometry(90, 44);
  const groundMat = new THREE.MeshStandardMaterial({ color: TWIN_COLORS.ground, roughness: 0.85, metalness: 0.3 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // Координатная сетка
  const grid = new THREE.GridHelper(90, 45, TWIN_COLORS.groundGrid, 0x111c2a);
  grid.position.y = 0.01;
  group.add(grid);

  // Ограждения и зоны безопасности (желтые полосы)
  const borderGeo = new THREE.BoxGeometry(86, 0.1, 0.4);
  const topBorder = new THREE.Mesh(borderGeo, materials.hazardYellow);
  topBorder.position.set(0, 0.05, -20);
  const botBorder = new THREE.Mesh(borderGeo, materials.hazardYellow);
  botBorder.position.set(0, 0.05, 20);
  group.add(topBorder, botBorder);

  return group;
};

/** Создает ректификационную колонну К-1 с внутренним уровнем */
export const createColumnK1 = (materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(13, 0, 0);

  // Фундамент
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 1.2, 32), materials.concrete);
  baseMesh.position.y = 0.6;
  group.add(baseMesh);

  // Опорная юбка
  const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 2.2, 32), materials.steelDark);
  skirtMesh.position.y = 2.3;
  group.add(skirtMesh);

  // Корпус колонны (16м в высоту, радиус 1.9)
  const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 15, 32), materials.steelLight);
  bodyMesh.position.y = 10.9;
  group.add(bodyMesh);

  // Сферический купол
  const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(1.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelBright);
  domeMesh.position.y = 18.4;
  group.add(domeMesh);

  // Кольца жесткости через каждые 2.5м
  for (let y = 4.5; y <= 17; y += 2.5) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.08, 8, 32), materials.steelBright);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }

  // Смотровая стеклянная секция (X-Ray окно на кубе колонны)
  const windowMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 4.5, 32, 1, true, -Math.PI / 3, (2 * Math.PI) / 3), materials.glassCutaway);
  windowMesh.position.y = 6;
  group.add(windowMesh);

  // Внутренний объем жидкости (динамический по L_1)
  const liquidGeo = new THREE.CylinderGeometry(1.85, 1.85, 1, 32);
  const liquidMesh = new THREE.Mesh(liquidGeo, materials.crudeLiquid);
  liquidMesh.position.set(0, 3.5, 0);
  liquidMesh.name = 'column_k1_liquid';
  group.add(liquidMesh);

  // Перегонные тарелки
  for (let y = 8; y <= 16; y += 1.6) {
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.06, 24), materials.steelDark);
    tray.position.y = y;
    group.add(tray);
  }

  // Штуцеры и фланцы
  const feedNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16), materials.steelDark);
  feedNozzle.rotation.z = Math.PI / 2;
  feedNozzle.position.set(-2.2, 5.5, 0);
  group.add(feedNozzle);

  const overheadNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16), materials.steelDark);
  overheadNozzle.position.set(0, 19.5, 0);
  group.add(overheadNozzle);

  const userData: InteractiveMeshUserData = { type: 'equipment', id: 'col-k1', equipmentId: 'K_1', name: 'Ректификационная колонна К-1' };
  bodyMesh.userData = userData;

  return { group, liquidMesh };
};

/** Создает вакуумную колонну К-2 */
export const createColumnK2 = (materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(26, 0, 0);

  // Бетонная опора
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 1.2, 32), materials.concrete);
  baseMesh.position.y = 0.6;
  group.add(baseMesh);

  // Нижняя широкая часть куба (flash-зона)
  const bottomBody = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 32), materials.steelLight);
  bottomBody.position.y = 4.4;
  group.add(bottomBody);

  // Конический переход
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 2.5, 32), materials.steelLight);
  cone.position.y = 8.65;
  group.add(cone);

  // Верхняя вакуумная секция
  const topBody = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5.5, 32), materials.steelLight);
  topBody.position.y = 12.65;
  group.add(topBody);

  // Верхний купол
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelBright);
  dome.position.y = 15.4;
  group.add(dome);

  // Внутренний уровень L_2
  const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1, 32), materials.crudeLiquid);
  liquidMesh.position.set(0, 2.4, 0);
  liquidMesh.name = 'column_k2_liquid';
  group.add(liquidMesh);

  const userData: InteractiveMeshUserData = { type: 'equipment', id: 'col-k2', equipmentId: 'K_2', name: 'Вакуумная колонна К-2' };
  bottomBody.userData = userData;

  return { group, liquidMesh };
};

/** Создает трубчатую нагревательную печь с дымовой трубой и горелками */
export const createFurnace = (name: 'P_1' | 'P_3', posZ: number, materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(3, 0, posZ);

  // Фундамент
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.8, 5.2), materials.concrete);
  base.position.y = 0.4;
  group.add(base);

  // Корпус печи (радиантная камера)
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.6, 4.6), materials.steelDark);
  body.position.y = 3.1;
  group.add(body);

  // Скат крыши конвекционной камеры
  const roofGeo = new THREE.CylinderGeometry(0.8, 2.8, 4.6, 4);
  const roof = new THREE.Mesh(roofGeo, materials.steelDark);
  roof.rotation.z = Math.PI / 4;
  roof.rotation.y = Math.PI / 2;
  roof.position.set(0, 5.8, 0);
  group.add(roof);

  // Дымовая труба
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 9, 24), materials.steelLight);
  stack.position.set(0, 11, 0);
  group.add(stack);

  // Красно-белые кольца дневной маркировки на трубе
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 24), materials.pumpStopped);
  band.position.set(0, 14, 0);
  group.add(band);

  // Окно визуального контроля горения
  const portMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.2), materials.flameCore);
  portMesh.position.set(2.82, 2.5, 0);
  group.add(portMesh);

  // Точечный свет пламени внутри печи
  const fireLight = new THREE.PointLight(TWIN_COLORS.flameOrange, 2.5, 12, 1.2);
  fireLight.position.set(1.5, 2.5, 0);
  group.add(fireLight);

  const userData: InteractiveMeshUserData = { type: 'equipment', id: `fur-${name.toLowerCase()}`, equipmentId: name, name: `Трубчатая печь ${name === 'P_1' ? 'П-1' : 'П-3'}` };
  body.userData = userData;

  return { group, fireLight, portMesh };
};

/** Создает горизонтальный электродегидратор ЭЛОУ */
export const createDesalter = (tag: string, x: number, z: number, materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Опоры седловые
  const saddle1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 2.6), materials.concrete);
  saddle1.position.set(-1.8, 0.6, 0);
  const saddle2 = saddle1.clone();
  saddle2.position.set(1.8, 0.6, 0);
  group.add(saddle1, saddle2);

  // Горизонтальный корпус
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.4, 24), materials.steelLight);
  cyl.rotation.z = Math.PI / 2;
  cyl.position.y = 2.45;
  const userData: InteractiveMeshUserData = { type: 'equipment', id: `ed-${tag.toLowerCase()}`, equipmentId: tag, name: `Электродегидратор ${tag}` };
  cyl.userData = userData;
  group.add(cyl);


  // Эллиптические днища
  const cap1 = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelLight);
  cap1.rotation.z = -Math.PI / 2;
  cap1.position.set(-2.2, 2.45, 0);
  const cap2 = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelLight);
  cap2.rotation.z = Math.PI / 2;
  cap2.position.set(2.2, 2.45, 0);
  group.add(cap1, cap2);

  // Высоковольтные изоляторы ввода на куполе
  const ins1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.1, 16), materials.insulatorCeramic);
  ins1.position.set(-1, 4.0, 0);
  const ins2 = ins1.clone();
  ins2.position.set(1, 4.0, 0);
  group.add(ins1, ins2);

  // Неоновые кольца электрического поля
  const haloGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 20);
  const halo1 = new THREE.Mesh(haloGeo, materials.electricGlow);
  halo1.rotation.x = Math.PI / 2;
  halo1.position.set(-1, 4.5, 0);
  const halo2 = halo1.clone();
  halo2.position.set(1, 4.5, 0);
  group.add(halo1, halo2);

  return { group, halo1, halo2 };
};

/** Создает промышленный центробежный насос с интерактивным кликом */
export const createPump3D = (pumpId: 'N_20' | 'N_82' | 'N_2' | 'N_3' | 'N_4' | 'N_32', x: number, z: number, label: string, materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Фундамент насосного агрегата
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1.4), materials.concrete);
  base.position.y = 0.2;
  group.add(base);

  // Электродвигатель
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.3, 20), materials.steelDark);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(-0.5, 0.88, 0);
  group.add(motor);

  // Корпус улитки насоса
  const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 24), materials.steelBright);
  volute.rotation.z = Math.PI / 2;
  volute.position.set(0.55, 0.88, 0);
  group.add(volute);

  // Напорный патрубок
  const discharge = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 16), materials.steelBright);
  discharge.position.set(0.55, 1.4, 0);
  group.add(discharge);

  // Световой индикатор состояния (зеленый/красный)
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), materials.pumpRunning);
  beacon.position.set(0, 1.5, 0.6);
  beacon.name = `beacon_${pumpId}`;
  group.add(beacon);

  const userData: InteractiveMeshUserData = {
    type: 'pump',
    id: `pump-${pumpId.toLowerCase()}`,
    pumpId,
    equipmentId: pumpId,
    name: `Насос ${label}`,
  };
  volute.userData = userData;
  motor.userData = userData;

  return { group, beacon };
};

/** Создает запорно-регулирующий клапан с маховиком/приводом */
export const createValve3D = (valveId: 'V_1' | 'V_2' | 'V_3' | 'V_WATER_MAIN', x: number, y: number, z: number, label: string, materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Корпус клапана
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16), materials.steelDark);
  body.rotation.z = Math.PI / 2;
  group.add(body);

  // Шток и сервопривод
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), materials.steelLight);
  stem.position.y = 0.45;
  group.add(stem);

  // Маховик
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 16), materials.valveOpen);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.75;
  wheel.name = `wheel_${valveId}`;
  group.add(wheel);

  const userData: InteractiveMeshUserData = {
    type: 'valve',
    id: `valve-${valveId.toLowerCase()}`,
    valveId,
    equipmentId: valveId,
    name: `Клапан ${label}`,
  };
  body.userData = userData;
  wheel.userData = userData;

  return { group, wheel };
};
