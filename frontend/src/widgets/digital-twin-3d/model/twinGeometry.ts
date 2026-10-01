import * as THREE from 'three';
import { TWIN_COLORS } from './PlantDigitalTwin3D.config';
import type { InteractiveMeshUserData } from './types';
import type { TwinMaterials } from './twinMaterials';
import { createColumnCatwalk, createCagedLadder } from './twinStructure';

/** Создает ректификационную колонну К-1 с внутренним уровнем, площадками и лестницами */
export const createColumnK1 = (materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(13, 0, 0);

  // Бетонный массивный фундамент
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 1.2, 32), materials.concrete);
  baseMesh.position.y = 0.6;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Опорная юбка с люком-лазом
  const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 2.4, 32), materials.steelDark);
  skirtMesh.position.y = 2.4;
  skirtMesh.castShadow = true;
  group.add(skirtMesh);

  // Люк-лаз на юбке
  const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 16), materials.steelBright);
  manhole.rotation.x = Math.PI / 2;
  manhole.position.set(0, 2.2, 2.2);
  group.add(manhole);

  // Корпус колонны (16м в высоту, радиус 1.9м)
  const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 15, 32), materials.steelLight);
  bodyMesh.position.y = 11.1;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Сферический купол шлема
  const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(1.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelBright);
  domeMesh.position.y = 18.6;
  group.add(domeMesh);

  // Кольцевые ребра жесткости
  for (let y = 4.8; y <= 18; y += 2.4) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.94, 0.06, 8, 32), materials.steelTruss);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }

  // 4 кольцевые площадки обслуживания (Catwalks) с ограждениями
  const catwalkHeights = [5.6, 9.6, 13.6, 17.6];
  catwalkHeights.forEach(h => {
    group.add(createColumnCatwalk(1.9, h, materials));
  });

  // Вертикальная переходная лестница с корзиной безопасности
  group.add(createCagedLadder(3.0, 17.6, 1.9, Math.PI * 0.75, materials));

  // Смотровая стеклянная секция (X-Ray окно на кубе колонны)
  const windowMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.92, 1.92, 4.5, 32, 1, true, -Math.PI / 3, (2 * Math.PI) / 3),
    materials.glassCutaway
  );
  windowMesh.position.y = 6.2;
  group.add(windowMesh);

  // Внутренний динамический уровень жидкости (L_1)
  const liquidGeo = new THREE.CylinderGeometry(1.85, 1.85, 1, 32);
  const liquidMesh = new THREE.Mesh(liquidGeo, materials.crudeLiquid);
  liquidMesh.position.set(0, 3.8, 0);
  liquidMesh.name = 'column_k1_liquid';
  group.add(liquidMesh);

  // Перегонные тарелки
  for (let y = 8.5; y <= 16.5; y += 1.6) {
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.05, 24), materials.steelDark);
    tray.position.y = y;
    group.add(tray);
  }

  // Верхний узел шлема с предохранительными клапанами СППК
  const spkBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 16), materials.steelDark);
  spkBase.position.set(0, 19.8, 0);
  const spkBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.6), materials.valveClosed);
  spkBody.position.set(0, 20.6, 0);
  const spkVent = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.4, 12), materials.gasPipe);
  spkVent.position.set(0, 22.0, 0);
  group.add(spkBase, spkBody, spkVent);

  const userData: InteractiveMeshUserData = { type: 'equipment', id: 'col-k1', equipmentId: 'K_1', name: 'Ректификационная колонна К-1' };
  bodyMesh.userData = userData;

  return { group, liquidMesh };
};

/** Создает вакуумную колонну К-2 */
export const createColumnK2 = (materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(26, 0, 0);

  // Бетонная опора
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 1.2, 32), materials.concrete);
  baseMesh.position.y = 0.6;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Нижняя широкая часть куба (flash-секция)
  const bottomBody = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 32), materials.steelLight);
  bottomBody.position.y = 4.4;
  bottomBody.castShadow = true;
  group.add(bottomBody);

  // Конический переход
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 2.5, 32), materials.steelLight);
  cone.position.y = 8.65;
  cone.castShadow = true;
  group.add(cone);

  // Верхняя вакуумная секция
  const topBody = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5.5, 32), materials.steelLight);
  topBody.position.y = 12.65;
  topBody.castShadow = true;
  group.add(topBody);

  // Верхний купол
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelBright);
  dome.position.y = 15.4;
  group.add(dome);

  // 3 кольцевые площадки обслуживания (Catwalks)
  group.add(createColumnCatwalk(2.2, 5.2, materials));
  group.add(createColumnCatwalk(1.6, 9.8, materials));
  group.add(createColumnCatwalk(1.6, 14.6, materials));

  // Вертикальная лестница с защитой
  group.add(createCagedLadder(2.5, 14.6, 1.9, Math.PI * 0.75, materials));

  // Внутренний динамический уровень L_2
  const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1, 32), materials.crudeLiquid);
  liquidMesh.position.set(0, 2.4, 0);
  liquidMesh.name = 'column_k2_liquid';
  group.add(liquidMesh);

  // Вакуумная эжекторная линия на шлеме
  const vacLine = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.0, 16), materials.gasPipe);
  vacLine.position.set(0, 16.5, 0);
  group.add(vacLine);

  const userData: InteractiveMeshUserData = { type: 'equipment', id: 'col-k2', equipmentId: 'K_2', name: 'Вакуумная колонна К-2' };
  bottomBody.userData = userData;

  return { group, liquidMesh };
};

/** Создает трубчатую нагревательную печь с внешним металлокаркасом и дымовой трубой */
export const createFurnace = (name: 'P_1' | 'P_3', posZ: number, materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(3, 0, posZ);

  // Бетонная фундаментная плита
  const fBase = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.8, 6.6), materials.concrete);
  fBase.position.y = 0.4;
  fBase.receiveShadow = true;
  group.add(fBase);

  // Радиантная камера печи (прямоугольный корпус)
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.5, 5.4), materials.steelDark);
  body.position.y = 3.55;
  body.castShadow = true;
  group.add(body);

  // Внешний стальной каркас жесткости (колонны по углам и пояса)
  const cornerColGeo = new THREE.BoxGeometry(0.25, 5.6, 0.25);
  const cx = 2.75;
  const cz = 2.75;
  [
    [-cx, -cz],
    [cx, -cz],
    [-cx, cz],
    [cx, cz],
  ].forEach(([x, z]) => {
    const col = new THREE.Mesh(cornerColGeo, materials.steelTruss);
    col.position.set(x, 3.55, z);
    group.add(col);
  });

  // Горизонтальные пояса жесткости
  [2.2, 4.2, 6.2].forEach(y => {
    const beltX1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 0.16), materials.steelTruss);
    beltX1.position.set(0, y, cz);
    const beltX2 = beltX1.clone();
    beltX2.position.set(0, y, -cz);
    group.add(beltX1, beltX2);
  });

  // Конвективная секция (шатровая переходная кровля)
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.8, 1.8, 4), materials.steelLight);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 7.2;
  roof.castShadow = true;
  group.add(roof);

  // Дымовая труба (высота 15м)
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 11, 24), materials.steelDark);
  stack.position.y = 13.5;
  stack.castShadow = true;
  group.add(stack);

  // Площадка экоконтроля и отбора проб на дымовой трубе
  const stackPlatform = createColumnCatwalk(0.85, 12.0, materials);
  group.add(stackPlatform);

  // Красный сигнальный оголовок трубы
  const stackTop = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 1.2, 24), materials.valveClosed);
  stackTop.position.y = 18.8;
  group.add(stackTop);

  // Смотровые окна радиантной камеры с пламенем
  const portMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.2), materials.flameCore);
  portMesh.position.set(0, 2.5, 2.72);
  group.add(portMesh);

  // Динамический точечный свет от пламени
  const fireLight = new THREE.PointLight(TWIN_COLORS.flameOrange, 2.8, 14, 1.2);
  fireLight.position.set(0, 2.8, 3.2);
  group.add(fireLight);

  // Блок газовых горелок снизу
  const burnerPlenum = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 4.2), materials.steelLight);
  burnerPlenum.position.y = 1.0;
  group.add(burnerPlenum);

  const userData: InteractiveMeshUserData = {
    type: 'equipment',
    id: `fur-${name.toLowerCase()}`,
    equipmentId: name,
    name: `Трубчатая печь ${name === 'P_1' ? 'П-1 (нагрев мазута)' : 'П-3 (контур К-1)'}`,
  };
  body.userData = userData;

  return { group, fireLight, portMesh };
};

/** Создает горизонтальный электродегидратор ЭЛОУ с трансформатором и изоляторами */
export const createDesalter = (tag: string, x: number, z: number, materials: TwinMaterials) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Две седловые железобетонные опоры
  const saddle1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 2.8), materials.concrete);
  saddle1.position.set(-1.8, 0.6, 0);
  saddle1.receiveShadow = true;
  const saddle2 = saddle1.clone();
  saddle2.position.set(1.8, 0.6, 0);
  group.add(saddle1, saddle2);

  // Горизонтальный стальной цилиндрический корпус (длина 4.8м, радиус 1.25м)
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.6, 24), materials.steelLight);
  cyl.rotation.z = Math.PI / 2;
  cyl.position.y = 2.45;
  cyl.castShadow = true;
  const userData: InteractiveMeshUserData = {
    type: 'equipment',
    id: `ed-${tag.toLowerCase()}`,
    equipmentId: tag,
    name: `Электродегидратор ${tag}`,
  };
  cyl.userData = userData;
  group.add(cyl);

  // Эллиптические днища
  const cap1 = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelLight);
  cap1.rotation.z = -Math.PI / 2;
  cap1.position.set(-2.3, 2.45, 0);
  const cap2 = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.steelLight);
  cap2.rotation.z = Math.PI / 2;
  cap2.position.set(2.3, 2.45, 0);
  group.add(cap1, cap2);

  // Верхняя площадка обслуживания с высоковольтным трансформатором
  const transPlatform = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.4), materials.steelTruss);
  transPlatform.position.set(0, 4.2, 0);
  const transformerBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), materials.steelDark);
  transformerBox.position.set(0, 4.75, 0);
  group.add(transPlatform, transformerBox);

  // Высоковольтные изоляторы ввода на куполе
  const ins1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.0, 16), materials.insulatorCeramic);
  ins1.position.set(-0.9, 3.8, 0);
  const ins2 = ins1.clone();
  ins2.position.set(0.9, 3.8, 0);
  group.add(ins1, ins2);

  // Неоновые кольца электрического поля
  const haloGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 20);
  const halo1 = new THREE.Mesh(haloGeo, materials.electricGlow);
  halo1.rotation.x = Math.PI / 2;
  halo1.position.set(-0.9, 4.4, 0);
  const halo2 = halo1.clone();
  halo2.position.set(0.9, 4.4, 0);
  group.add(halo1, halo2);

  return { group, halo1, halo2 };
};

/** Создает центробежный насос с фундаментом, электромотором и манометром */
export const createPump3D = (
  id: 'N_20' | 'N_82' | 'N_2' | 'N_3' | 'N_4' | 'N_32',
  x: number,
  z: number,
  label: string,
  materials: TwinMaterials
) => {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Бетонный фундамент
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1.5), materials.concrete);
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  group.add(pad);

  // Металлическая рама-основание
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.3), materials.steelDark);
  frame.position.y = 0.5;
  group.add(frame);

  // Электродвигатель (цилиндр + ребра)
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 16), materials.steelDark);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(-0.5, 0.95, 0);
  motor.castShadow = true;
  group.add(motor);

  // Соединительная муфта с кожухом (оранжевый кожух безопасности)
  const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.35, 12), materials.hazardYellow);
  coupling.rotation.z = Math.PI / 2;
  coupling.position.set(0.2, 0.95, 0);
  group.add(coupling);

  // Улитка центробежного насоса
  const pumpVolute = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.45, 20), materials.steelBright);
  pumpVolute.rotation.x = Math.PI / 2;
  pumpVolute.position.set(0.65, 0.95, 0);
  pumpVolute.castShadow = true;
  group.add(pumpVolute);

  // Нагнетательный патрубок с манометром
  const discharge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 12), materials.steelDark);
  discharge.position.set(0.65, 1.45, 0);
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), materials.steelBright);
  gauge.rotation.z = Math.PI / 2;
  gauge.position.set(0.85, 1.6, 0);
  group.add(discharge, gauge);

  // Светодиодный индикатор работы насоса (зеленый/красный)
  const beaconGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const beacon = new THREE.Mesh(beaconGeo, materials.pumpStopped);
  beacon.position.set(-0.5, 1.55, 0);
  group.add(beacon);

  const userData: InteractiveMeshUserData = {
    type: 'pump',
    id: `pump-${id.toLowerCase()}`,
    pumpId: id,
    equipmentId: id,
    name: `Насосный агрегат ${label}`,
  };
  pumpVolute.userData = userData;
  motor.userData = userData;

  return { group, beacon };
};

/** Создает запорную арматуру (задвижку/клапан) с фланцами и штурвалом */
export const createValve3D = (
  id: 'V_1' | 'V_2' | 'V_3',
  pos: [number, number, number],
  materials: TwinMaterials,
  isOpen: boolean = true
) => {
  const group = new THREE.Group();
  group.position.set(...pos);

  // Корпус клапана
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12), materials.steelDark);
  body.rotation.z = Math.PI / 2;

  // Фланцы с болтами
  const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), materials.steelBright);
  f1.rotation.z = Math.PI / 2;
  f1.position.x = -0.25;
  const f2 = f1.clone();
  f2.position.x = 0.25;

  // Шток и бугель
  const bonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.45, 12), materials.steelLight);
  bonnet.position.y = 0.32;

  // Штурвал управления (Handwheel)
  const wheelMat = isOpen ? materials.valveOpen : materials.valveClosed;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 20), wheelMat);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.65;

  group.add(body, f1, f2, bonnet, wheel);

  // Опорная стойка под клапаном до уровня пола (Pipe Support Stanchion)
  if (pos[1] > 0.6 && pos[1] < 6.0) {
    const standH = pos[1];
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, standH, 8), materials.steelDark);
    stand.position.set(0, -standH / 2, 0);
    const footPad = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.35), materials.concrete);
    footPad.position.set(0, -standH + 0.04, 0);
    group.add(stand, footPad);
  }

  const userData: InteractiveMeshUserData = {
    type: 'valve',
    id: `valve-${id.toLowerCase()}`,
    valveId: id,
    equipmentId: id,
    name: `Клапан ${id} (${isOpen ? 'ОТКРЫТ' : 'ЗАКРЫТ'})`,
  };
  body.userData = userData;
  wheel.userData = userData;

  return { group, wheel };
};

export type { TwinMaterials } from './twinMaterials';
export { createTwinMaterials, applyThemeToMaterials, applyMediumHighlight } from './twinMaterials';
export { createIndustrialGround, createMainPipeRack } from './twinStructure';
