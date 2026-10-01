import * as THREE from 'three';
import { TWIN_THEMES } from './PlantDigitalTwin3D.config';
import type { TwinMaterials } from './twinMaterials';

/** Создает индустриальную площадку с координатной сеткой и фундаментами */
export const createIndustrialGround = (materials: TwinMaterials, themeMode: 'light' | 'dark' = 'dark'): THREE.Group => {
  const group = new THREE.Group();
  const theme = TWIN_THEMES[themeMode];

  // Основная бетонная плита площадки
  const groundGeo = new THREE.PlaneGeometry(94, 46);
  const groundMat = new THREE.MeshStandardMaterial({
    color: theme.ground,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // Инженерная координатная сетка (CAD-сетка)
  const grid = new THREE.GridHelper(94, 47, theme.groundGridPrimary, theme.groundGridSecondary);
  grid.position.y = 0.01;
  grid.name = 'ground_grid';
  group.add(grid);

  // Желтые сигнальные линии границ производственной зоны
  const borderGeo = new THREE.BoxGeometry(92, 0.08, 0.35);
  const topBorder = new THREE.Mesh(borderGeo, materials.hazardYellow);
  topBorder.position.set(0, 0.04, -21);
  const botBorder = new THREE.Mesh(borderGeo, materials.hazardYellow);
  botBorder.position.set(0, 0.04, 21);
  group.add(topBorder, botBorder);

  // Асфальтовые проезды между технологическими блоками (дорожки обслуживания)
  const roadMat = new THREE.MeshStandardMaterial({ color: theme.concrete, roughness: 0.95 });
  const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(6, 42), roadMat);
  roadZ.rotation.x = -Math.PI / 2;
  roadZ.position.set(-8, 0.005, 0);
  roadZ.receiveShadow = true;
  group.add(roadZ);

  return group;
};

/** Создает главную двухъярусную трубную эстакаду (Pipe Rack) */
export const createMainPipeRack = (materials: TwinMaterials): THREE.Group => {
  const rack = new THREE.Group();
  rack.name = 'main_pipe_rack';

  const startX = -36;
  const endX = 34;
  const stepX = 7;
  const rackZ = -1.2;
  const rackWidth = 3.2;
  const lowerDeckY = 4.2;
  const upperDeckY = 6.8;

  // 1. Портальные рамы эстакады
  const colGeo = new THREE.BoxGeometry(0.24, upperDeckY + 0.5, 0.24);
  const beamGeo = new THREE.BoxGeometry(0.2, 0.25, rackWidth);
  const braceGeo = new THREE.CylinderGeometry(0.06, 0.06, Math.sqrt(stepX * stepX + (upperDeckY - lowerDeckY) * (upperDeckY - lowerDeckY)), 8);

  for (let x = startX; x <= endX; x += stepX) {
    // Две вертикальные колонны портала (слева и справа от оси Z)
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

      // Диагональные X-образные раскосы на каждом втором пролете
      if (Math.round((x - startX) / stepX) % 2 === 0) {
        const brace1 = new THREE.Mesh(braceGeo, materials.steelTruss);
        brace1.position.set(x + stepX / 2, (lowerDeckY + upperDeckY) / 2, rackZ - rackWidth / 2);
        brace1.rotation.z = Math.atan2(upperDeckY - lowerDeckY, stepX);

        const brace2 = new THREE.Mesh(braceGeo, materials.steelTruss);
        brace2.position.set(x + stepX / 2, (lowerDeckY + upperDeckY) / 2, rackZ - rackWidth / 2);
        brace2.rotation.z = -Math.atan2(upperDeckY - lowerDeckY, stepX);

        rack.add(brace1, brace2);
      }
    }
  }

  // 2. Многониточные технологические трубопроводы на ярусах эстакады
  const totalLength = endX - startX + 4;
  const centerX = (startX + endX) / 2;

  const rackPipelines: Array<{ y: number; offsetZ: number; radius: number; mat: THREE.Material }> = [
    // Нижний ярус: тяжелые среды (сырье, промывочная вода, мазут, дизель)
    { y: lowerDeckY + 0.22, offsetZ: -1.1, radius: 0.18, mat: materials.crudePipe },
    { y: lowerDeckY + 0.18, offsetZ: -0.6, radius: 0.14, mat: materials.waterPipe },
    { y: lowerDeckY + 0.16, offsetZ: -0.1, radius: 0.12, mat: materials.steamPipe },
    { y: lowerDeckY + 0.24, offsetZ: 0.5, radius: 0.20, mat: materials.crudePipe },
    { y: lowerDeckY + 0.16, offsetZ: 1.1, radius: 0.12, mat: materials.drainPipe },

    // Верхний ярус: газы, пары, легкие углеводороды
    { y: upperDeckY + 0.20, offsetZ: -0.9, radius: 0.16, mat: materials.gasPipe },
    { y: upperDeckY + 0.16, offsetZ: -0.3, radius: 0.13, mat: materials.gasPipe },
    { y: upperDeckY + 0.24, offsetZ: 0.3, radius: 0.20, mat: materials.gasPipe },
    { y: upperDeckY + 0.14, offsetZ: 0.9, radius: 0.11, mat: materials.steamPipe },
  ];

  rackPipelines.forEach(p => {
    const pipeGeo = new THREE.CylinderGeometry(p.radius, p.radius, totalLength, 16);
    const pipeMesh = new THREE.Mesh(pipeGeo, p.mat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set(centerX, p.y, rackZ + p.offsetZ);
    rack.add(pipeMesh);
  });

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

    // Кронштейн снизу
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
