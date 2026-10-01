import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Pumps, Sensors, Setpoints, Valves } from '@/entities/telemetry';
import type { EquipmentId } from '@/entities/mnemoscheme/model/types';
import type { PumpId, ValveId } from '@/entities/telemetry';
import {
  CAMERA_PRESETS,
  TWIN_THEMES,
  TWIN_HOTSPOTS,
} from './PlantDigitalTwin3D.config';
import type { CameraPreset, Hotspot3D, InteractiveMeshUserData } from './types';
import {
  createColumnK1,
  createColumnK2,
  createVacuumEjectorSystem3D,
  createDesalter,
  createFurnace,
  createIndustrialGround,
  createMainPipeRack,
  createPump3D,
  createTwinMaterials,
  applyThemeToMaterials,
  applyMediumHighlight,
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
  themeMode?: 'light' | 'dark';
  showXRay: boolean;
  showFlows: boolean;
  selectedMedium?: string | null;
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
  themeMode = 'dark',
  showXRay,
  showFlows,
  selectedMedium = null,
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

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const blueBacklightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundGridRef = useRef<THREE.GridHelper | null>(null);

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

  // Актуальные пропсы для цикла анимации
  const latestPropsRef = useRef({
    sensors,
    valves,
    pumps,
    setpoints,
    status,
    activePreset,
    showXRay,
    showFlows,
    selectedMedium,
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
    selectedMedium,
  };

  // 1. Инициализация сцены Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 600;
    const theme = TWIN_THEMES[themeMode];

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.background);
    scene.fog = new THREE.FogExp2(theme.fog, 0.007);
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
    const ambientLight = new THREE.AmbientLight(theme.ambientColor, theme.ambientIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    sunLight.position.set(30, 50, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -48;
    sunLight.shadow.camera.right = 48;
    sunLight.shadow.camera.top = 48;
    sunLight.shadow.camera.bottom = -48;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const blueBacklight = new THREE.DirectionalLight(theme.blueLightColor, theme.blueLightIntensity);
    blueBacklight.position.set(-40, 25, -30);
    scene.add(blueBacklight);
    blueBacklightRef.current = blueBacklight;

    // Материалы и геометрия
    const materials = createTwinMaterials(themeMode);
    materialsRef.current = materials;

    // Индустриальная площадка
    const groundGroup = createIndustrialGround(materials, themeMode);
    scene.add(groundGroup);
    groundGridRef.current = groundGroup.getObjectByName('ground_grid') as THREE.GridHelper | null;

    // Главная трубная эстакада (Pipe Rack)
    scene.add(createMainPipeRack(materials));

    // Колонны К-1 и К-2
    const { group: k1Group, liquidMesh: k1Liq } = createColumnK1(materials);
    scene.add(k1Group);
    k1LiquidRef.current = k1Liq;

    const { group: k2Group, liquidMesh: k2Liq } = createColumnK2(materials);
    scene.add(k2Group);
    k2LiquidRef.current = k2Liq;

    // Пароэжекторная вакуум-система (барометрический конденсатор и эжекторы)
    scene.add(createVacuumEjectorSystem3D(materials));

    // Трубчатые печи П-1 и П-3
    const { group: p1Group, fireLight: p1Light, portMesh: p1Port } = createFurnace('P_1', -6, materials);
    scene.add(p1Group);
    p1LightRef.current = p1Light;
    p1PortRef.current = p1Port;

    const { group: p3Group, fireLight: p3Light, portMesh: p3Port } = createFurnace('P_3', 6, materials);
    scene.add(p3Group);
    p3LightRef.current = p3Light;
    p3PortRef.current = p3Port;

    // Электродегидраторы ЭЛОУ 1 и 2 ступени (2 ряда по 3 аппарата)
    const desalterPositions = [
      { tag: 'Э-1', x: -26, z: -5 },
      { tag: 'Э-3', x: -20, z: -5 },
      { tag: 'Э-5', x: -14, z: -5 },
      { tag: 'Э-2', x: -26, z: 5 },
      { tag: 'Э-4', x: -20, z: 5 },
      { tag: 'Э-6', x: -14, z: 5 },
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

    // Задвижки и клапаны
    const valvesConfig: Array<{ id: 'V_1' | 'V_2' | 'V_3'; pos: [number, number, number] }> = [
      { id: 'V_1', pos: [-2, 1.4, 0] },
      { id: 'V_2', pos: [13, 20.6, 0] },
      { id: 'V_3', pos: [18, 1.6, -2.0] },
    ];
    valveWheelsRef.current.clear();
    valvesConfig.forEach(v => {
      const { group: valveGroup, wheel } = createValve3D(v.id, v.pos, materials, true);
      scene.add(valveGroup);
      valveWheelsRef.current.set(v.id, wheel);
    });

    // Технологические трубопроводы и потоки
    const isStreamActiveHelper = (type: string) => {
      const { valves: v, pumps: p, showFlows: sf } = latestPropsRef.current;
      if (!sf) return false;
      if (type === 'washWater') return Boolean(p.N_82);
      if (type === 'elouFeed') return Boolean(p.N_20);
      if (type === 'k1Feed') return Boolean(p.N_20 && v.V_1);
      if (type === 'k2Feed') return Boolean(p.N_2 && v.V_3);
      if (type === 'k1Loop') return Boolean(p.N_3);
      if (type === 'k1Relief') return Boolean(v.V_2);
      if (type === 'k2Outflow') return Boolean(p.N_4 || p.N_32);
      if (type === 'k2Overhead') return Boolean(p.N_4 || p.N_32);
      return true;
    };

    const { group: pipeGroup, updateParticles } = createRefineryPipes(materials, isStreamActiveHelper);
    scene.add(pipeGroup);
    updateParticlesRef.current = (delta: number) => updateParticles(delta, latestPropsRef.current.selectedMedium || null);

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

      // 2. Обновление пламени печей
      const isP1FlameOn = Boolean(curSens.Flame_P1 && curValves.FUEL_P1 && curSens.T_1 > 50);
      if (p1LightRef.current) {
        p1LightRef.current.intensity = isP1FlameOn ? 2.5 + Math.sin(now * 0.01) * 0.6 : 0;
      }
      if (p1PortRef.current) {
        p1PortRef.current.visible = isP1FlameOn;
      }

      const isP3FlameOn = Boolean(curSens.Flame_P3 && curValves.FUEL_P3 && curSens.T_3 > 50);
      if (p3LightRef.current) {
        p3LightRef.current.intensity = isP3FlameOn ? 2.5 + Math.cos(now * 0.012) * 0.6 : 0;
      }
      if (p3PortRef.current) {
        p3PortRef.current.visible = isP3FlameOn;
      }

      // 3. Обновление индикаторов насосов
      pumpBeaconsRef.current.forEach((beacon, pId) => {
        const isRunning = Boolean(curPumps[pId as PumpId]);
        beacon.material = isRunning ? materials.pumpRunning : materials.pumpStopped;
      });

      // 4. Обновление клапанов
      valveWheelsRef.current.forEach((wheel, vId) => {
        const isOpen = Boolean(curValves[vId as ValveId]);
        wheel.material = isOpen ? materials.valveOpen : materials.valveClosed;
      });

      // 5. Движение потоков частиц
      if (updateParticlesRef.current) {
        updateParticlesRef.current(delta);
      }

      // 6. Кинематографический 360° облёт
      if (curPreset === 'cinematic' && controlsRef.current && cameraRef.current) {
        cinematicAngleRef.current += delta * 0.12;
        const angle = cinematicAngleRef.current;
        const radius = 48;
        cameraRef.current.position.x = 2 + Math.cos(angle) * radius;
        cameraRef.current.position.z = Math.sin(angle) * radius;
        cameraRef.current.position.y = 22 + Math.sin(angle * 1.5) * 5;
        controlsRef.current.target.set(2, 5, 0);
      }

      controls.update();
      renderer.render(scene, camera);

      // 7. Проекция 3D меток КИПиА с умным алгоритмом разделения (anti-collision)
      if (container && cameraRef.current) {
        const rect = container.getBoundingClientRect();
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;

        const visibleBadges: ProjectedHotspot[] = [];

        TWIN_HOTSPOTS.forEach(hs => {
          const v = new THREE.Vector3(...hs.worldPos);
          v.project(cameraRef.current!);

          const isVisible = v.z < 1;
          const sx = v.x * halfW + halfW;
          const sy = -(v.y * halfH) + halfH;
          const liveVal = hs.valueGetter ? hs.valueGetter(curSens as any, curSp as any) : undefined;

          if (isVisible && sx >= 20 && sx <= rect.width - 20 && sy >= 30 && sy <= rect.height - 30) {
            visibleBadges.push({
              ...hs,
              screenX: sx,
              screenY: sy,
              visible: true,
              liveValue: liveVal,
            });
          }
        });

        // Сортируем по высоте на экране (screenY)
        visibleBadges.sort((a, b) => a.screenY - b.screenY);

        // Устраняем наложение: если две плашки слишком близко по X (< 140px) и по Y (< 42px),
        // смещаем нижнюю плашку вниз, чтобы плашки никогда не перекрывали друг друга
        for (let i = 0; i < visibleBadges.length; i++) {
          for (let j = i + 1; j < visibleBadges.length; j++) {
            const dx = Math.abs(visibleBadges[i].screenX - visibleBadges[j].screenX);
            const dy = visibleBadges[j].screenY - visibleBadges[i].screenY;
            if (dx < 140 && dy < 42) {
              visibleBadges[j].screenY += (42 - dy);
            }
          }
        }

        setProjectedHotspots(visibleBadges);
      }

    };

    animationFrameId = requestAnimationFrame(animate);

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

  // 2. Реактивное обновление темы (Светлая / Тёмная)
  useEffect(() => {
    if (!sceneRef.current || !materialsRef.current) return;
    const theme = TWIN_THEMES[themeMode];

    // Обновляем фон и туман
    sceneRef.current.background = new THREE.Color(theme.background);
    sceneRef.current.fog = new THREE.FogExp2(theme.fog, 0.007);

    // Обновляем материалы
    applyThemeToMaterials(materialsRef.current, themeMode);
    if (latestPropsRef.current.selectedMedium) {
      applyMediumHighlight(materialsRef.current, latestPropsRef.current.selectedMedium);
    }

    // Обновляем освещение
    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(theme.ambientColor);
      ambientLightRef.current.intensity = theme.ambientIntensity;
    }
    if (sunLightRef.current) {
      sunLightRef.current.color.setHex(theme.sunColor);
      sunLightRef.current.intensity = theme.sunIntensity;
    }
    if (blueBacklightRef.current) {
      blueBacklightRef.current.color.setHex(theme.blueLightColor);
      blueBacklightRef.current.intensity = theme.blueLightIntensity;
    }
  }, [themeMode]);

  // 2.1. Реактивная подсветка и фильтрация выбранной технологической среды
  useEffect(() => {
    if (!materialsRef.current) return;
    applyMediumHighlight(materialsRef.current, selectedMedium || null);
  }, [selectedMedium]);

  // 3. Плавный переход к выбранному пресету камеры
  useEffect(() => {
    if (activePreset === 'cinematic') return;
    const targetPreset = CAMERA_PRESETS.find(p => p.id === activePreset);
    if (!targetPreset || !cameraRef.current || !controlsRef.current) return;

    focusOnCoordinates(targetPreset.position, targetPreset.target);
  }, [activePreset]);

  // Плавная фокусировка камеры на заданных координатах
  const focusOnCoordinates = useCallback((position: [number, number, number], target: [number, number, number]) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...position);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(...target);

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
  }, []);

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
          return;
        }
        if (u.type === 'valve' && u.valveId) {
          onToggleValve(u.valveId);
          return;
        }
        if (u.equipmentId) {
          onOpenEquipment(u.equipmentId);
          return;
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
    focusOnCoordinates,
  };
};
