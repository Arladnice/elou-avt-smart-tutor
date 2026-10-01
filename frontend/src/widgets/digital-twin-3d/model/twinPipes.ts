import * as THREE from 'three';
import type { TwinMaterials } from './twinMaterials';

export interface PipeStream {
  curve: THREE.CatmullRomCurve3;
  material: THREE.Material;
  radius: number;
  isActive: () => boolean;
  color: number;
}

export const createRefineryPipes = (materials: TwinMaterials, isStreamActive: (type: string) => boolean) => {
  const group = new THREE.Group();
  group.name = 'process_piping';

  const streams: PipeStream[] = [
    // 1. Подача промывочной воды от Н-82 (-30, 1.4, -8) в блок ЭЛОУ (-20, 3.8, 0)
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-30, 1.4, -8),
        new THREE.Vector3(-30, 4.4, -8),
        new THREE.Vector3(-28, 4.4, -4),
        new THREE.Vector3(-20, 4.4, -4),
        new THREE.Vector3(-20, 3.8, 0),
      ]),
      material: materials.waterPipe,
      radius: 0.16,
      color: 0x0ea5e9,
      isActive: () => isStreamActive('washWater'),
    },
    // 2. Линия обессоленной нефти из ЭЛОУ (-14, 2.5, 0) в сырьевой насос Н-20 (-6, 1.4, 0)
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-14, 2.45, 0),
        new THREE.Vector3(-10, 2.45, 0),
        new THREE.Vector3(-10, 1.4, 0),
        new THREE.Vector3(-6, 1.4, 0),
      ]),
      material: materials.crudePipe,
      radius: 0.2,
      color: 0x10b981,
      isActive: () => isStreamActive('elouFeed'),
    },
    // 3. Сырьевая магистраль от Н-20 через клапан V-1 (-2, 1.4, 0) в колонну К-1 (13, 5.5, 0)
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6, 1.4, 0),
        new THREE.Vector3(-2, 1.4, 0),
        new THREE.Vector3(0, 1.4, 0),
        new THREE.Vector3(0, 4.4, 0),
        new THREE.Vector3(9, 4.4, 0),
        new THREE.Vector3(11, 5.6, 0),
      ]),
      material: materials.crudePipe,
      radius: 0.22,
      color: 0x10b981,
      isActive: () => isStreamActive('k1Feed'),
    },
    // 4. Горячая струя: от низа К-1 через Н-2, печь П-1 в вакуумную колонну К-2
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 1.4, 0),
        new THREE.Vector3(10, 1.4, -3),
        new THREE.Vector3(7, 1.4, -3),
        new THREE.Vector3(3, 2.5, -6),
        new THREE.Vector3(8, 2.5, -6),
        new THREE.Vector3(18, 4.4, -2),
        new THREE.Vector3(26, 4.4, 0),
      ]),
      material: materials.gasPipe,
      radius: 0.2,
      color: 0xf59e0b,
      isActive: () => isStreamActive('k2Feed'),
    },
    // 5. Контур циркуляции П-3: от низа К-1 через Н-3, печь П-3 обратно в К-1
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 1.4, 0),
        new THREE.Vector3(10, 1.4, 3),
        new THREE.Vector3(7, 1.4, 3),
        new THREE.Vector3(3, 2.5, 6),
        new THREE.Vector3(8, 2.5, 6),
        new THREE.Vector3(13, 7.5, 1.9),
      ]),
      material: materials.crudePipe,
      radius: 0.18,
      color: 0x10b981,
      isActive: () => isStreamActive('k1Loop'),
    },
    // 6. Сброс паров/газа со шлема К-1 (13, 22.0, 0) через клапан сброса V-2 на факельный коллектор
    {
      curve: new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 22.0, 0),
        new THREE.Vector3(13, 23.5, 0),
        new THREE.Vector3(17, 23.5, -6),
        new THREE.Vector3(28, 23.5, -6),
      ]),
      material: materials.gasPipe,
      radius: 0.18,
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

  // Создаем физические трубы по кривым
  streams.forEach((stream) => {
    const geom = new THREE.TubeGeometry(stream.curve, 64, stream.radius, 12, false);
    const mesh = new THREE.Mesh(geom, stream.material);
    mesh.castShadow = true;
    group.add(mesh);
  });

  // Система светящихся анимированных частиц технологического потока
  const particleCountPerStream = 24;
  const particleGeometry = new THREE.SphereGeometry(0.24, 8, 8);
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
      item.progress = (item.progress + delta * 0.45) % 1.0;
      const point = item.stream.curve.getPointAt(item.progress);
      item.mesh.position.copy(point);
    });
  };

  return { group, updateParticles };
};
