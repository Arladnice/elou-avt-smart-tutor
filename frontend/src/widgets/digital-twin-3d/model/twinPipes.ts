import * as THREE from 'three';
import type { TwinMaterials } from './twinGeometry';

export interface PipeStream {
  curve: THREE.CatmullRomCurve3;
  material: THREE.Material;
  radius: number;
  isActive: () => boolean;
  color: number;
}

export const createRefineryPipes = (materials: TwinMaterials, isStreamActive: (type: string) => boolean) => {
  const group = new THREE.Group();

  const streams: PipeStream[] = [
    // 1. Подача промывочной воды от Н-82 (-30, 1.4, -8) в гребенку ЭЛОУ
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-30, 1.4, -8),
        new THREE.Vector3(-28, 1.4, -8),
        new THREE.Vector3(-28, 4.5, -8),
        new THREE.Vector3(-20, 4.5, -6),
        new THREE.Vector3(-14, 4.5, 0),
      ]),
      material: materials.waterPipe,
      radius: 0.14,
      color: 0x0ea5e9,
      isActive: () => isStreamActive('washWater'),
    },
    // 2. Линия обессоленной нефти из ЭЛОУ через Е-15 в сырьевой насос Н-20 (-6, 1.4, 0)
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-14, 2.5, 0),
        new THREE.Vector3(-10, 2.5, 0),
        new THREE.Vector3(-8, 2.8, 2),
        new THREE.Vector3(-6, 1.4, 0),
      ]),
      material: materials.crudePipe,
      radius: 0.18,
      color: 0x10b981,
      isActive: () => isStreamActive('elouFeed'),
    },
    // 3. Сырьевая линия от Н-20 через клапан V-1 (-2, 1.4, 0) в колонну К-1 (13, 5.5, 0)
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6, 1.4, 0),
        new THREE.Vector3(-2, 1.4, 0),
        new THREE.Vector3(0, 1.4, 0),
        new THREE.Vector3(7, 1.4, 0),
        new THREE.Vector3(11, 5.5, 0),
      ]),
      material: materials.crudePipe,
      radius: 0.22,
      color: 0x10b981,
      isActive: () => isStreamActive('k1Feed'),
    },
    // 4. Контур печи П-1 (горячая струя в К-2): от низа К-1 через Н-2, печь П-1 в К-2
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 1.2, 0),
        new THREE.Vector3(10, 1.2, -3),
        new THREE.Vector3(7, 1.2, -3),
        new THREE.Vector3(3, 2.5, -6),
        new THREE.Vector3(8, 2.5, -6),
        new THREE.Vector3(18, 2.0, -2),
        new THREE.Vector3(26, 4.5, 0),
      ]),
      material: materials.gasPipe,
      radius: 0.2,
      color: 0xf59e0b,
      isActive: () => isStreamActive('k2Feed'),
    },
    // 5. Контур рециркуляции П-3: от К-1 через Н-3, печь П-3 обратно в К-1
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 1.2, 0),
        new THREE.Vector3(10, 1.2, 3),
        new THREE.Vector3(7, 1.2, 3),
        new THREE.Vector3(3, 2.5, 6),
        new THREE.Vector3(8, 2.5, 6),
        new THREE.Vector3(13, 7.5, 1.9),
      ]),
      material: materials.crudePipe,
      radius: 0.18,
      color: 0x10b981,
      isActive: () => isStreamActive('k1Loop'),
    },
    // 6. Сброс газа с верха К-1 (13, 19.5, 0) через клапан V-2
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 19.5, 0),
        new THREE.Vector3(13, 21.0, 0),
        new THREE.Vector3(17, 21.0, -5),
      ]),
      material: materials.gasPipe,
      radius: 0.16,
      color: 0xf59e0b,
      isActive: () => isStreamActive('k1Relief'),
    },
    // 7. Откачка гудрона с низа вакуумной колонны К-2 в насосы Н-4 / Н-32
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(26, 1.2, 0),
        new THREE.Vector3(28, 1.2, 0),
        new THREE.Vector3(30, 1.2, -3),
        new THREE.Vector3(35, 1.2, -3),
      ]),
      material: materials.drainPipe,
      radius: 0.2,
      color: 0x64748b,
      isActive: () => isStreamActive('k2Outflow'),
    },
  ];

  // Создаем трубы по кривым
  streams.forEach((stream) => {
    const geom = new THREE.TubeGeometry(stream.curve, 48, stream.radius, 12, false);
    const mesh = new THREE.Mesh(geom, stream.material);
    group.add(mesh);
  });

  // Эстакады (подпорки трубопроводов)
  const rackMat = materials.steelDark;
  const rackPositions = [-24, -18, -12, -4, 5, 17, 22, 32];
  rackPositions.forEach((x) => {
    const rack = new THREE.Group();
    rack.position.set(x, 0, 0);

    const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), rackMat);
    col1.position.set(0, 2, -1.8);
    const col2 = col1.clone();
    col2.position.set(0, 2, 1.8);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 3.8), rackMat);
    beam.position.set(0, 3.8, 0);

    rack.add(col1, col2, beam);
    group.add(rack);
  });

  // Создаем систему анимированных частиц потока
  const particleCountPerStream = 20;
  const particleGeometry = new THREE.SphereGeometry(0.22, 8, 8);
  const particleMeshes: Array<{ mesh: THREE.Mesh; stream: PipeStream; progress: number }> = [];

  streams.forEach((stream) => {
    const pMat = new THREE.MeshBasicMaterial({ color: stream.color });
    for (let i = 0; i < particleCountPerStream; i++) {
      const pMesh = new THREE.Mesh(particleGeometry, pMat);
      group.add(pMesh);
      particleMeshes.push({
        mesh: pMesh,
        stream,
        progress: i / particleCountPerStream,
      });
    }
  });

  const updateParticles = (delta: number) => {
    particleMeshes.forEach((item) => {
      if (!item.stream.isActive()) {
        item.mesh.visible = false;
        return;
      }
      item.mesh.visible = true;
      item.progress = (item.progress + delta * 0.4) % 1.0;
      const point = item.stream.curve.getPointAt(item.progress);
      item.mesh.position.copy(point);
    });
  };

  return { group, updateParticles };
};
