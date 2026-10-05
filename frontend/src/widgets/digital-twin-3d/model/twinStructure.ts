import * as THREE from 'three';
import { TWIN_THEMES } from './PlantDigitalTwin3D.config';
import type { TwinMaterials } from './twinMaterials';

/** Создает индустриальную площадку с координатной сеткой и фундаментами */
export const createIndustrialGround = (materials: TwinMaterials, themeMode: 'light' | 'dark' = 'dark'): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'industrial_ground';
  const theme = TWIN_THEMES[themeMode];

  // Основная бесконечная бетонная плита площадки (260x260м без обрывов)
  const groundGeo = new THREE.PlaneGeometry(260, 260);
  const groundMat = new THREE.MeshStandardMaterial({
    color: theme.ground,
    roughness: 0.96,
    metalness: 0.04,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  ground.name = 'ground_plane';
  group.add(ground);

  // Инженерная координатная CAD-сетка
  const grid = new THREE.GridHelper(160, 80, theme.groundGridPrimary, theme.groundGridSecondary);
  grid.position.y = 0.01;
  grid.name = 'ground_grid';
  group.add(grid);

  // Обособленные бетонные технологические фундаменты (плиты) под блоки оборудования
  const plinthMat = new THREE.MeshStandardMaterial({
    color: theme.concrete,
    roughness: 0.88,
    metalness: 0.12,
  });

  const foundations: Array<{ x: number; z: number; w: number; d: number }> = [
    { x: -20, z: 0, w: 22, d: 16 }, // Фундамент батареи ЭЛОУ
    { x: 3, z: 0, w: 12, d: 18 },   // Фундамент печного блока П-1 и П-3
    { x: 19.5, z: 0, w: 22, d: 12 },// Фундамент ректификации К-1 и К-2
    { x: -6, z: 0, w: 6, d: 6 },     // Насосная площадка Н-20
  ];

  foundations.forEach(f => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(f.w, 0.12, f.d), plinthMat);
    plinth.position.set(f.x, 0.06, f.z);
    plinth.receiveShadow = true;
    plinth.name = 'ground_plinth';
    group.add(plinth);

    // Желтая сигнальная полоса по периметру фундамента
    const borderGeom = new THREE.BoxGeometry(f.w + 0.2, 0.04, 0.18);
    const borderSideGeom = new THREE.BoxGeometry(0.18, 0.04, f.d + 0.2);

    const bTop = new THREE.Mesh(borderGeom, materials.hazardYellow);
    bTop.position.set(f.x, 0.13, f.z - f.d / 2);
    const bBot = new THREE.Mesh(borderGeom, materials.hazardYellow);
    bBot.position.set(f.x, 0.13, f.z + f.d / 2);

    const bLeft = new THREE.Mesh(borderSideGeom, materials.hazardYellow);
    bLeft.position.set(f.x - f.w / 2, 0.13, f.z);
    const bRight = new THREE.Mesh(borderSideGeom, materials.hazardYellow);
    bRight.position.set(f.x + f.w / 2, 0.13, f.z);

    group.add(bTop, bBot, bLeft, bRight);
  });

  return group;
};

/** Создает главную двухъярусную трубную эстакаду (Pipe Rack) */
export const createMainPipeRack = (materials: TwinMaterials): THREE.Group => {
  const rack = new THREE.Group();
  rack.name = 'main_pipe_rack';

  const startX = -36;
  const endX = 34;
  const stepX = 7;
  const rackZ = -3.8;          // Эстакада расположена вдоль сервисного коридора перед аппаратами
  const rackWidth = 2.4;
  const lowerDeckY = 4.2;
  const upperDeckY = 6.8;

  // 1. Портальные рамы эстакады
  const colGeo = new THREE.BoxGeometry(0.22, upperDeckY + 0.5, 0.22);
  const beamGeo = new THREE.BoxGeometry(0.18, 0.22, rackWidth);
  const braceLen = Math.sqrt(stepX * stepX + (upperDeckY - lowerDeckY) * (upperDeckY - lowerDeckY));
  const braceGeo = new THREE.CylinderGeometry(0.05, 0.05, braceLen, 8);
  const braceAngle = Math.atan2(stepX, upperDeckY - lowerDeckY);

  for (let x = startX; x <= endX; x += stepX) {
    // Две вертикальные колонны портала (слева и справа от оси эстакады)
    const col1 = new THREE.Mesh(colGeo, materials.steelTruss);
    col1.position.set(x, (upperDeckY + 0.5) / 2, rackZ - rackWidth / 2);
    col1.castShadow = true;

    const col2 = new THREE.Mesh(colGeo, materials.steelTruss);
    col2.position.set(x, (upperDeckY + 0.5) / 2, rackZ + rackWidth / 2);
    col2.castShadow = true;

    // Нижний ригель (балка первого яруса)
    const beam1 = new THREE.Mesh(beamGeo, materials.steelTruss);
    beam1.position.set(x, lowerDeckY, rackZ);

    // Верхний ригель (балка второго яруса)
    const beam2 = new THREE.Mesh(beamGeo, materials.steelTruss);
    beam2.position.set(x, upperDeckY, rackZ);

    rack.add(col1, col2, beam1, beam2);

    // Продольные балки и диагональные связи
    if (x + stepX <= endX) {
      const longBeamGeo = new THREE.BoxGeometry(stepX, 0.16, 0.16);
      const long1 = new THREE.Mesh(longBeamGeo, materials.steelTruss);
      long1.position.set(x + stepX / 2, lowerDeckY, rackZ - rackWidth / 2);

      const long2 = new THREE.Mesh(longBeamGeo, materials.steelTruss);
      long2.position.set(x + stepX / 2, lowerDeckY, rackZ + rackWidth / 2);

      const long3 = new THREE.Mesh(longBeamGeo, materials.steelTruss);
      long3.position.set(x + stepX / 2, upperDeckY, rackZ - rackWidth / 2);

      const long4 = new THREE.Mesh(longBeamGeo, materials.steelTruss);
      long4.position.set(x + stepX / 2, upperDeckY, rackZ + rackWidth / 2);

      rack.add(long1, long2, long3, long4);

      // Диагональные X-образные раскосы на каждом втором пролете (аккуратно внутри яруса!)
      if (Math.round((x - startX) / stepX) % 2 === 0) {
        // Ближняя сторона
        const b1 = new THREE.Mesh(braceGeo, materials.steelTruss);
        b1.position.set(x + stepX / 2, (lowerDeckY + upperDeckY) / 2, rackZ - rackWidth / 2);
        b1.rotation.z = -braceAngle;

        const b2 = new THREE.Mesh(braceGeo, materials.steelTruss);
        b2.position.set(x + stepX / 2, (lowerDeckY + upperDeckY) / 2, rackZ - rackWidth / 2);
        b2.rotation.z = braceAngle;

        // Дальняя сторона
        const b3 = new THREE.Mesh(braceGeo, materials.steelTruss);
        b3.position.set(x + stepX / 2, (lowerDeckY + upperDeckY) / 2, rackZ + rackWidth / 2);
        b3.rotation.z = -braceAngle;

        const b4 = new THREE.Mesh(braceGeo, materials.steelTruss);
        b4.position.set(x + stepX / 2, (lowerDeckY + upperDeckY) / 2, rackZ + rackWidth / 2);
        b4.rotation.z = braceAngle;

        rack.add(b1, b2, b3, b4);
      }
    }
  }

  // 2. Многониточные технологические трубопроводы на ярусах эстакады
  const totalLength = endX - startX + 4;
  const centerX = (startX + endX) / 2;

  const rackPipelines: Array<{ y: number; offsetZ: number; radius: number; mat: THREE.Material }> = [
    // Нижний ярус: тяжелые среды (сырье, промывочная вода, мазут, дизель)
    { y: lowerDeckY + 0.22, offsetZ: -0.8, radius: 0.16, mat: materials.crudePipe },
    { y: lowerDeckY + 0.18, offsetZ: -0.3, radius: 0.13, mat: materials.waterPipe },
    { y: lowerDeckY + 0.16, offsetZ: 0.2, radius: 0.11, mat: materials.steamPipe },
    { y: lowerDeckY + 0.22, offsetZ: 0.7, radius: 0.15, mat: materials.drainPipe },

    // Верхний ярус: газы, пары, светлые фракции
    { y: upperDeckY + 0.20, offsetZ: -0.7, radius: 0.15, mat: materials.gasPipe },
    { y: upperDeckY + 0.16, offsetZ: -0.1, radius: 0.12, mat: materials.gasPipe },
    { y: upperDeckY + 0.22, offsetZ: 0.4, radius: 0.16, mat: materials.gasPipe },
    { y: upperDeckY + 0.14, offsetZ: 0.8, radius: 0.11, mat: materials.steamPipe },
  ];

  rackPipelines.forEach(p => {
    const pipeGeo = new THREE.CylinderGeometry(p.radius, p.radius, totalLength, 16);
    const pipeMesh = new THREE.Mesh(pipeGeo, p.mat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set(centerX, p.y, rackZ + p.offsetZ);
    rack.add(pipeMesh);
  });

  // 3. Факельный сбросной ствол / свеча в конце эстакады (x = endX, z = rackZ)
  const flareStackGeo = new THREE.CylinderGeometry(0.24, 0.32, 14, 16);
  const flareStackMesh = new THREE.Mesh(flareStackGeo, materials.steelDark);
  flareStackMesh.position.set(endX, 7, rackZ);
  flareStackMesh.castShadow = true;

  // Оголовок факела (Flare tip) с ветрозащитным диффузором
  const flareTipGeo = new THREE.CylinderGeometry(0.5, 0.28, 1.2, 16);
  const flareTipMesh = new THREE.Mesh(flareTipGeo, materials.steelBright);
  flareTipMesh.position.set(endX, 14.6, rackZ);

  // Дежурная горелка / сигнальный огонек
  const pilotLightGeo = new THREE.SphereGeometry(0.18, 12, 12);
  const pilotLightMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const pilotLightMesh = new THREE.Mesh(pilotLightGeo, pilotLightMat);
  pilotLightMesh.position.set(endX, 15.3, rackZ);

  rack.add(flareStackMesh, flareTipMesh, pilotLightMesh);

  return rack;
};

/** Создает кольцевую площадку обслуживания (Catwalk) для вертикальных колонн */
export const createColumnCatwalk = (radius: number, height: number, materials: TwinMaterials): THREE.Group => {
  const catwalk = new THREE.Group();
  catwalk.position.y = height;

  const floorOuterR = radius + 0.95;
  const floorInnerR = radius + 0.05;

  // Решетчатый настил пола площадки (Ring)
  const floorGeo = new THREE.RingGeometry(floorInnerR, floorOuterR, 32);
  const floor = new THREE.Mesh(floorGeo, materials.grating);
  floor.rotation.x = -Math.PI / 2;
  catwalk.add(floor);

  // Наружный поручень перил (Handrail)
  const railH = 1.05;
  const topRailGeo = new THREE.TorusGeometry(floorOuterR, 0.035, 8, 32);
  const topRail = new THREE.Mesh(topRailGeo, materials.handrail);
  topRail.rotation.x = Math.PI / 2;
  topRail.position.y = railH;

  const midRailGeo = new THREE.TorusGeometry(floorOuterR, 0.025, 8, 32);
  const midRail = new THREE.Mesh(midRailGeo, materials.handrail);
  midRail.rotation.x = Math.PI / 2;
  midRail.position.y = railH / 2;
  catwalk.add(topRail, midRail);

  // Радиальные кронштейны-опоры и стойки перил
  const postCount = 12;
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, railH, 8);
  const bracketGeo = new THREE.BoxGeometry(floorOuterR - floorInnerR, 0.08, 0.08);

  for (let i = 0; i < postCount; i++) {
    const angle = (i / postCount) * Math.PI * 2;
    const px = Math.cos(angle) * floorOuterR;
    const pz = Math.sin(angle) * floorOuterR;

    const post = new THREE.Mesh(postGeo, materials.handrail);
    post.position.set(px, railH / 2, pz);
    catwalk.add(post);

    const bx = Math.cos(angle) * ((floorInnerR + floorOuterR) / 2);
    const bz = Math.sin(angle) * ((floorInnerR + floorOuterR) / 2);
    const bracket = new THREE.Mesh(bracketGeo, materials.steelTruss);
    bracket.position.set(bx, -0.05, bz);
    bracket.rotation.y = -angle;
    catwalk.add(bracket);
  }

  return catwalk;
};

/** Создает вертикальную переходную лестницу с защитными кольцами безопасности (Caged Ladder) */
export const createCagedLadder = (
  bottomY: number,
  topY: number,
  columnRadius: number,
  angleRad: number,
  materials: TwinMaterials
): THREE.Group => {
  const ladderGroup = new THREE.Group();
  const ladderDist = columnRadius + 0.25;
  const lx = Math.cos(angleRad) * ladderDist;
  const lz = Math.sin(angleRad) * ladderDist;
  ladderGroup.position.set(lx, 0, lz);
  ladderGroup.rotation.y = -angleRad + Math.PI / 2;

  const ladderHeight = topY - bottomY;
  const railWidth = 0.5;

  // Боковые тетивы лестницы
  const stringerGeo = new THREE.CylinderGeometry(0.03, 0.03, ladderHeight, 8);
  const str1 = new THREE.Mesh(stringerGeo, materials.steelBright);
  str1.position.set(-railWidth / 2, bottomY + ladderHeight / 2, 0);

  const str2 = new THREE.Mesh(stringerGeo, materials.steelBright);
  str2.position.set(railWidth / 2, bottomY + ladderHeight / 2, 0);
  ladderGroup.add(str1, str2);

  // Ступени каждые 30 см
  const rungGeo = new THREE.CylinderGeometry(0.018, 0.018, railWidth, 8);
  for (let y = bottomY + 0.3; y < topY; y += 0.35) {
    const rung = new THREE.Mesh(rungGeo, materials.steelBright);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, y, 0);
    ladderGroup.add(rung);
  }

  // Защитные дуги безопасности (Cage hoops)
  const hoopGeo = new THREE.TorusGeometry(0.42, 0.02, 6, 16, Math.PI);
  for (let y = bottomY + 2.5; y < topY; y += 1.4) {
    const hoop = new THREE.Mesh(hoopGeo, materials.hazardYellow);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(0, y, 0.3);
    ladderGroup.add(hoop);
  }

  return ladderGroup;
};

/** Реактивно обновляет цвета плиты площадки, технологических фундаментов и сетки при смене темы */
export const applyThemeToGround = (groundGroup: THREE.Group, themeMode: 'light' | 'dark') => {
  const theme = TWIN_THEMES[themeMode];

  // 1. Основная бетонная плита
  const groundMesh = groundGroup.getObjectByName('ground_plane') as THREE.Mesh | null;
  if (groundMesh && groundMesh.material) {
    (groundMesh.material as THREE.MeshStandardMaterial).color.setHex(theme.ground);
    (groundMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }

  // 2. Бетонные технологические фундаменты оборудования
  groundGroup.traverse(child => {
    if (child.name === 'ground_plinth' && (child as THREE.Mesh).material) {
      ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(theme.concrete);
      ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  });

  // 3. Координатная CAD-сетка
  const oldGrid = groundGroup.getObjectByName('ground_grid');
  if (oldGrid) {
    groundGroup.remove(oldGrid);
    if ('dispose' in oldGrid) {
      (oldGrid as any).dispose();
    }
  }
  const newGrid = new THREE.GridHelper(160, 80, theme.groundGridPrimary, theme.groundGridSecondary);
  newGrid.position.y = 0.01;
  newGrid.name = 'ground_grid';
  groundGroup.add(newGrid);
};
