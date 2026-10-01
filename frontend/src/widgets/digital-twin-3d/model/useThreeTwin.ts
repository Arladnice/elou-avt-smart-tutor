import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Pumps, Sensors, Setpoints, Valves } from '@/entities/telemetry';
import type { EquipmentId } from '@/entities/mnemoscheme/model/types';
import type { PumpId, ValveId } from '@/entities/telemetry';
import {
  CAMERA_PRESETS,
  TWIN_COLORS,
  TWIN_HOTSPOTS,
} from './PlantDigitalTwin3D.config';
import type { CameraPreset, Hotspot3D, InteractiveMeshUserData } from './types';
import {
  createColumnK1,
  createColumnK2,
  createDesalter,
  createFurnace,
  createIndustrialGround,
  createPump3D,
  createTwinMaterials,
  createValve3D,
  type TwinMaterials,
} from './twinGeometry';
import { createRefineryPipes } from './twinPipes';

interface UseThreeTwinProps {
  sensors: Sensors;
  valves: Valves;
  pumps: Pumps;
  setpoints: Setpoints;
  status: string;
  activePreset: CameraPreset;
  showXRay: boolean;
  showFlows: boolean;
  onTogglePump: (pumpId: PumpId) => void;
  onToggleValve: (valveId: ValveId) => void;
  onOpenEquipment: (equipmentId: EquipmentId) => void;
}

export interface ProjectedHotspot extends Hotspot3D {
  screenX: number;
  screenY: number;
  visible: boolean;
  liveValue?: string;
}

export const useThreeTwin = ({
  sensors,
  valves,
  pumps,
  setpoints,
  status,
  activePreset,
  showXRay,
  showFlows,
  onTogglePump,
  onToggleValve,
  onOpenEquipment,
}: UseThreeTwinProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projectedHotspots, setProjectedHotspots] = useState<ProjectedHotspot[]>([]);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Ссылки на живые изменяемые объекты Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const materialsRef = useRef<TwinMaterials | null>(null);

  const k1LiquidRef = useRef<THREE.Mesh | null>(null);
  const k2LiquidRef = useRef<THREE.Mesh | null>(null);
  const p1LightRef = useRef<THREE.PointLight | null>(null);
  const p3LightRef = useRef<THREE.PointLight | null>(null);
  const p1PortRef = useRef<THREE.Mesh | null>(null);
  const p3PortRef = useRef<THREE.Mesh | null>(null);

  const pumpBeaconsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const valveWheelsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const updateParticlesRef = useRef<((delta: number) => void) | null>(null);

  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const cinematicAngleRef = useRef(0);

  // Ссылки на актуальные пропсы для цикла анимации
  const latestPropsRef = useRef({
    sensors,
    valves,
    pumps,
    setpoints,
    status,
    activePreset,
    showXRay,
    showFlows,
  });
  latestPropsRef.current = {
    sensors,
    valves,
    pumps,
    setpoints,
    status,
    activePreset,
    showXRay,
    showFlows,
  };

  // 1. Инициализация сцены Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 600;

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(TWIN_COLORS.background);
    scene.fog = new THREE.FogExp2(TWIN_COLORS.background, 0.008);
    sceneRef.current = scene;

    // Камера
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.5, 350);
    const initialPreset = CAMERA_PRESETS.find(p => p.id === activePreset) || CAMERA_PRESETS[0];
    camera.position.set(...initialPreset.position);
    camera.lookAt(...initialPreset.target);
    cameraRef.current = camera;

    // Рендерер
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 6;
    controls.maxDistance = 140;
    controls.target.set(...initialPreset.target);
    controlsRef.current = controls;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0x64748b, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(30, 50, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    scene.add(sunLight);

    const blueBacklight = new THREE.DirectionalLight(0x0284c7, 1.2);
    blueBacklight.position.set(-40, 25, -30);
    scene.add(blueBacklight);

    // Материалы и геометрия
    const materials = createTwinMaterials();
    materialsRef.current = materials;

    // Индустриальная площадка
    scene.add(createIndustrialGround(materials));

    // Колонны К-1 и К-2
    const { group: k1Group, liquidMesh: k1Liq } = createColumnK1(materials);
    scene.add(k1Group);
    k1LiquidRef.current = k1Liq;

    const { group: k2Group, liquidMesh: k2Liq } = createColumnK2(materials);
    scene.add(k2Group);
    k2LiquidRef.current = k2Liq;

    // Трубчатые печи П-1 и П-3
    const { group: p1Group, fireLight: p1Light, portMesh: p1Port } = createFurnace('P_1', -6, materials);
    scene.add(p1Group);
    p1LightRef.current = p1Light;
    p1PortRef.current = p1Port;

    const { group: p3Group, fireLight: p3Light, portMesh: p3Port } = createFurnace('P_3', 6, materials);
    scene.add(p3Group);
    p3LightRef.current = p3Light;
    p3PortRef.current = p3Port;

    // Электродегидраторы ЭЛОУ 1 и 2 ступени
    const desalterPositions = [
      { tag: 'Э-1', x: -26, z: -4 },
      { tag: 'Э-3', x: -20, z: -4 },
      { tag: 'Э-5', x: -14, z: -4 },
      { tag: 'Э-2', x: -26, z: 4 },
      { tag: 'Э-4', x: -20, z: 4 },
      { tag: 'Э-6', x: -14, z: 4 },
    ];
    desalterPositions.forEach(d => {
      const { group: desGroup } = createDesalter(d.tag, d.x, d.z, materials);
      scene.add(desGroup);
    });

    // Насосы
    const pumpsConfig: Array<{ id: 'N_20' | 'N_82' | 'N_2' | 'N_3' | 'N_4' | 'N_32'; x: number; z: number; label: string }> = [
      { id: 'N_82', x: -30, z: -8, label: 'Н-82 (вода)' },
      { id: 'N_20', x: -6, z: 0, label: 'Н-20 (сырьё)' },
      { id: 'N_2', x: 7, z: -3, label: 'Н-2' },
      { id: 'N_3', x: 7, z: 3, label: 'Н-3' },
      { id: 'N_4', x: 30, z: -3, label: 'Н-4' },
      { id: 'N_32', x: 30, z: 3, label: 'Н-32' },
    ];
    pumpBeaconsRef.current.clear();
    pumpsConfig.forEach(p => {
      const { group: pumpGroup, beacon } = createPump3D(p.id, p.x, p.z, p.label, materials);
      scene.add(pumpGroup);
      pumpBeaconsRef.current.set(p.id, beacon);
    });

    // Клапаны
    const valvesConfig: Array<{ id: 'V_1' | 'V_2' | 'V_3' | 'V_WATER_MAIN'; x: number; y: number; z: number; label: string }> = [
      { id: 'V_1', x: -2, y: 1.4, z: 0, label: 'V-1' },
      { id: 'V_2', x: 13, y: 20.0, z: 0, label: 'V-2' },
      { id: 'V_3', x: 17, y: 1.2, z: 0, label: 'V-3' },
      { id: 'V_WATER_MAIN', x: -28, y: 2.2, z: -8, label: 'Вода напор' },
    ];
    valveWheelsRef.current.clear();
    valvesConfig.forEach(v => {
      const { group: valveGroup, wheel } = createValve3D(v.id, v.x, v.y, v.z, v.label, materials);
      scene.add(valveGroup);
      valveWheelsRef.current.set(v.id, wheel);
    });

    // Трубопроводная сеть и частицы
    const isStreamActiveHelper = (type: string) => {
      const { valves: v, pumps: p, showFlows: sf } = latestPropsRef.current;
      if (!sf) return false;
      if (type === 'washWater') return Boolean(p.N_82 && v.V_WATER_MAIN);
      if (type === 'elouFeed') return Boolean(p.N_20);
      if (type === 'k1Feed') return Boolean(p.N_20 && v.V_1);
      if (type === 'k2Feed') return Boolean(p.N_2 && v.V_3);
      if (type === 'k1Loop') return Boolean(p.N_3);
      if (type === 'k1Relief') return Boolean(v.V_2);
      if (type === 'k2Outflow') return Boolean(p.N_4 || p.N_32);
      return true;
    };

    const { group: pipeGroup, updateParticles } = createRefineryPipes(materials, isStreamActiveHelper);
    scene.add(pipeGroup);
    updateParticlesRef.current = updateParticles;

    // Интерактивные объекты для raycasting
    const interactives: THREE.Object3D[] = [];
    scene.traverse(obj => {
      if (obj.userData && obj.userData.type) {
        interactives.push(obj);
      }
    });
    interactiveObjectsRef.current = interactives;

    // Ресайз
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Главный цикл анимации
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const { sensors: curSens, valves: curValves, pumps: curPumps, setpoints: curSp, activePreset: curPreset, showXRay: curXRay } = latestPropsRef.current;

      // 1. Обновление уровней жидкостей в К-1 и К-2
      if (k1LiquidRef.current) {
        const levelNorm = Math.max(0.05, Math.min(1.0, (curSens.L_1 ?? 50) / 100));
        k1LiquidRef.current.scale.set(1, levelNorm * 4.2, 1);
        k1LiquidRef.current.visible = curXRay;
      }
      if (k2LiquidRef.current) {
        const levelNorm = Math.max(0.05, Math.min(1.0, (curSens.L_2 ?? 50) / 100));
        k2LiquidRef.current.scale.set(1, levelNorm * 4.0, 1);
        k2LiquidRef.current.visible = curXRay;
      }

      // 2. Обновление пламени печей (мерцание и отключение)
      const isP1FlameOn = Boolean(curSens.Flame_P1 && curValves.FUEL_P1 && curSens.T_1 > 50);
      if (p1LightRef.current) {
        p1LightRef.current.intensity = isP1FlameOn ? 2.0 + Math.sin(now * 0.01) * 0.5 : 0;
      }
      if (p1PortRef.current) {
        p1PortRef.current.visible = isP1FlameOn;
      }

      const isP3FlameOn = Boolean(curSens.Flame_P3 && curValves.FUEL_P3 && curSens.T_3 > 50);
      if (p3LightRef.current) {
        p3LightRef.current.intensity = isP3FlameOn ? 2.0 + Math.cos(now * 0.012) * 0.5 : 0;
      }
      if (p3PortRef.current) {
        p3PortRef.current.visible = isP3FlameOn;
      }

      // 3. Обновление статусов насосов
      pumpBeaconsRef.current.forEach((beacon, pId) => {
        const isRunning = Boolean(curPumps[pId as PumpId]);
        beacon.material = isRunning ? materials.pumpRunning : materials.pumpStopped;
      });

      // 4. Обновление статусов клапанов
      valveWheelsRef.current.forEach((wheel, vId) => {
        const isOpen = Boolean(curValves[vId as ValveId]);
        wheel.material = isOpen ? materials.valveOpen : materials.valveClosed;
      });

      // 5. Анимация движения частиц в трубах
      if (updateParticlesRef.current) {
        updateParticlesRef.current(delta);
      }

      // 6. Кинематографический облёт
      if (curPreset === 'cinematic' && controlsRef.current && cameraRef.current) {
        cinematicAngleRef.current += delta * 0.12;
        const angle = cinematicAngleRef.current;
        const radius = 48;
        cameraRef.current.position.x = 2 + Math.cos(angle) * radius;
        cameraRef.current.position.z = Math.sin(angle) * radius;
        cameraRef.current.position.y = 20 + Math.sin(angle * 1.5) * 5;
        controlsRef.current.target.set(2, 5, 0);
      }

      controls.update();
      renderer.render(scene, camera);

      // 7. Проекция 3D точек хотспотов в 2D координаты экрана
      if (container && cameraRef.current) {
        const rect = container.getBoundingClientRect();
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;

        const projected: ProjectedHotspot[] = TWIN_HOTSPOTS.map(hs => {
          const v = new THREE.Vector3(...hs.worldPos);
          v.project(cameraRef.current!);

          // Виден ли объект перед камерой
          const isVisible = v.z < 1;
          const sx = v.x * halfW + halfW;
          const sy = -(v.y * halfH) + halfH;
          const liveVal = hs.valueGetter ? hs.valueGetter(curSens as any, curSp as any) : undefined;

          return {
            ...hs,
            screenX: sx,
            screenY: sy,
            visible: isVisible && sx >= 0 && sx <= rect.width && sy >= 0 && sy <= rect.height,
            liveValue: liveVal,
          };
        });
        setProjectedHotspots(projected);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Очистка при размонтировании
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Плавный переход к выбранному пресету камеры
  useEffect(() => {
    if (activePreset === 'cinematic') return;
    const targetPreset = CAMERA_PRESETS.find(p => p.id === activePreset);
    if (!targetPreset || !cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Быстрый анимированный переход к целевой позиции
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...targetPreset.position);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(...targetPreset.target);

    let progress = 0;
    const animateTransition = () => {
      progress += 0.05;
      camera.position.lerpVectors(startPos, endPos, progress);
      controls.target.lerpVectors(startTarget, endTarget, progress);
      controls.update();
      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      }
    };
    animateTransition();
  }, [activePreset]);

  // Обработка клика и наведения через Raycaster
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && (!current.userData || !current.userData.name)) {
        current = current.parent;
      }
      if (current && current.userData && current.userData.name) {
        setHoveredName(current.userData.name);
        container.style.cursor = 'pointer';
        return;
      }
    }
    setHoveredName(null);
    container.style.cursor = 'grab';
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && (!current.userData || !current.userData.type)) {
        current = current.parent;
      }
      if (current && current.userData) {
        const u = current.userData as InteractiveMeshUserData;
        if (u.type === 'pump' && u.pumpId) {
          onTogglePump(u.pumpId);
        } else if (u.type === 'valve' && u.valveId) {
          onToggleValve(u.valveId);
        } else if (u.type === 'equipment' && u.equipmentId) {
          onOpenEquipment(u.equipmentId);
        }
      }
    }
  }, [onTogglePump, onToggleValve, onOpenEquipment]);

  return {
    containerRef,
    projectedHotspots,
    hoveredName,
    handlePointerMove,
    handleClick,
  };
};
