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
  applyXRayToMaterials,
  applyFlowsToMaterials,
  applyThemeToGround,
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
  showHUD?: boolean;
  selectedMedium?: string | null;
  onTogglePump: (pumpId: PumpId) => void;
  onToggleValve: (valveId: ValveId) => void;
  onOpenEquipment: (equipmentId: EquipmentId) => void;
  onFpsUpdate?: (fps: number) => void;
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
  showHUD = true,
  selectedMedium = null,
  onTogglePump,
  onToggleValve,
  onOpenEquipment,
  onFpsUpdate,
}: UseThreeTwinProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Ссылки на DOM элементы плашек телеметрии для прямого аппаратного позиционирования без ререндеров
  const badgeElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const containerSizeRef = useRef({ width: 800, height: 600 });
  const cameraForwardRef = useRef(new THREE.Vector3());
  const tempTargetRef = useRef(new THREE.Vector3());
  const toTargetRef = useRef(new THREE.Vector3());
  const tempVecRef = useRef(new THREE.Vector3());

  const registerBadgeRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      badgeElementsRef.current.set(id, el);
    } else {
      badgeElementsRef.current.delete(id);
    }
  }, []);

  // Ссылки на живые изменяемые объекты Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const materialsRef = useRef<TwinMaterials | null>(null);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const blueBacklightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundGroupRef = useRef<THREE.Group | null>(null);
  const groundGridRef = useRef<THREE.GridHelper | null>(null);

  const fpsCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const onFpsUpdateRef = useRef(onFpsUpdate);
  onFpsUpdateRef.current = onFpsUpdate;

  const k1LiquidRef = useRef<THREE.Mesh | null>(null);
  const k1LevelRingRef = useRef<THREE.Mesh | null>(null);
  const k1LevelCapRef = useRef<THREE.Mesh | null>(null);
  const k1GaugePipRef = useRef<THREE.Mesh | null>(null);
  const k2LiquidRef = useRef<THREE.Mesh | null>(null);
  const k2LevelRingRef = useRef<THREE.Mesh | null>(null);
  const k2LevelCapRef = useRef<THREE.Mesh | null>(null);
  const k2GaugePipRef = useRef<THREE.Mesh | null>(null);
  const desalterWaterLayersRef = useRef<THREE.Mesh[]>([]);
  const desalterGridsRef = useRef<THREE.Mesh[]>([]);
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
    showHUD,
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
    showHUD,
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
    containerSizeRef.current = { width, height };
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

    // Мягкий рассеянный полусферический свет для устранения провалов в глубокую черноту
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.7);
    scene.add(hemiLight);

    // Материалы и геометрия
    const materials = createTwinMaterials(themeMode);
    materialsRef.current = materials;
    applyXRayToMaterials(materials, showXRay, themeMode);
    applyFlowsToMaterials(materials, showFlows, selectedMedium);

    // Индустриальная площадка
    const groundGroup = createIndustrialGround(materials, themeMode);
    scene.add(groundGroup);
    groundGroupRef.current = groundGroup;
    groundGridRef.current = groundGroup.getObjectByName('ground_grid') as THREE.GridHelper | null;

    // Главная трубная эстакада (Pipe Rack)
    scene.add(createMainPipeRack(materials));

    // Колонны К-1 и К-2 со светящимися индикаторами зеркала уровня и рейками КИПиА
    const { group: k1Group, liquidMesh: k1Liq, levelRing: k1Ring, levelCap: k1Cap, gaugePip: k1Pip } = createColumnK1(materials);
    scene.add(k1Group);
    k1LiquidRef.current = k1Liq;
    k1LevelRingRef.current = k1Ring;
    k1LevelCapRef.current = k1Cap;
    k1GaugePipRef.current = k1Pip;

    const { group: k2Group, liquidMesh: k2Liq, levelRing: k2Ring, levelCap: k2Cap, gaugePip: k2Pip } = createColumnK2(materials);
    scene.add(k2Group);
    k2LiquidRef.current = k2Liq;
    k2LevelRingRef.current = k2Ring;
    k2LevelCapRef.current = k2Cap;
    k2GaugePipRef.current = k2Pip;

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
    desalterWaterLayersRef.current = [];
    desalterGridsRef.current = [];
    desalterPositions.forEach(d => {
      const { group: desGroup, waterLayer, grid1, grid2 } = createDesalter(d.tag, d.x, d.z, materials);
      scene.add(desGroup);
      desalterWaterLayersRef.current.push(waterLayer);
      desalterGridsRef.current.push(grid1, grid2);
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
    updateParticlesRef.current = (delta: number) => {
      const { selectedMedium: sm, showFlows: sf } = latestPropsRef.current;
      updateParticles(delta, sm || null, sf);
    };

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
      containerSizeRef.current = { width: w, height: h };
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

      const {
        sensors: curSens,
        valves: curValves,
        pumps: curPumps,
        activePreset: curPreset,
        showXRay: curXRay,
        showHUD: curShowHUD = true,
      } = latestPropsRef.current;

      // 1. Обновление уровней жидкостей в К-1 и К-2
      if (k1LiquidRef.current) {
        const levelNorm = Math.max(0.05, Math.min(1.0, (curSens.L_1 ?? 50) / 100));
        const h1 = levelNorm * 4.2;
        k1LiquidRef.current.scale.set(1, h1, 1);
        k1LiquidRef.current.visible = curXRay;
        const topY1 = 3.6 + h1;
        if (k1LevelRingRef.current) {
          k1LevelRingRef.current.position.y = topY1;
          k1LevelRingRef.current.visible = curXRay;
        }
        if (k1LevelCapRef.current) {
          k1LevelCapRef.current.position.y = topY1;
          k1LevelCapRef.current.visible = curXRay;
        }
        if (k1GaugePipRef.current) {
          k1GaugePipRef.current.position.y = topY1;
        }
      }
      if (k2LiquidRef.current) {
        const levelNorm = Math.max(0.05, Math.min(1.0, (curSens.L_2 ?? 50) / 100));
        const h2 = levelNorm * 4.0;
        k2LiquidRef.current.scale.set(1, h2, 1);
        k2LiquidRef.current.visible = curXRay;
        const topY2 = 1.4 + h2;
        if (k2LevelRingRef.current) {
          k2LevelRingRef.current.position.y = topY2;
          k2LevelRingRef.current.visible = curXRay;
        }
        if (k2LevelCapRef.current) {
          k2LevelCapRef.current.position.y = topY2;
          k2LevelCapRef.current.visible = curXRay;
        }
        if (k2GaugePipRef.current) {
          k2GaugePipRef.current.position.y = topY2;
        }
      }

      // Внутренние элементы дегидраторов видны только в режиме X-Ray
      desalterWaterLayersRef.current.forEach(w => {
        w.visible = curXRay;
      });
      desalterGridsRef.current.forEach(g => {
        g.visible = curXRay;
      });

      // 2. Обновление пламени печей с живым эффектом мерцания огня
      const isP1FlameOn = Boolean(curSens.Flame_P1 && curValves.FUEL_P1 && curSens.T_1 > 50);
      if (p1LightRef.current) {
        p1LightRef.current.intensity = isP1FlameOn ? 3.0 + Math.sin(now * 0.01) * 0.8 : 0;
      }
      if (p1PortRef.current) {
        p1PortRef.current.visible = isP1FlameOn;
        if (isP1FlameOn) {
          const fl1 = 0.9 + Math.sin(now * 0.014) * 0.1;
          p1PortRef.current.scale.set(1, fl1, 1);
        }
      }

      const isP3FlameOn = Boolean(curSens.Flame_P3 && curValves.FUEL_P3 && curSens.T_3 > 50);
      if (p3LightRef.current) {
        p3LightRef.current.intensity = isP3FlameOn ? 3.0 + Math.cos(now * 0.012) * 0.8 : 0;
      }
      if (p3PortRef.current) {
        p3PortRef.current.visible = isP3FlameOn;
        if (isP3FlameOn) {
          const fl3 = 0.9 + Math.cos(now * 0.016) * 0.1;
          p3PortRef.current.scale.set(1, fl3, 1);
        }
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

      // 7. Проекция 3D меток КИПиА с прямым аппаратным позиционированием (Zero-React-Rerender)
      if (curShowHUD && cameraRef.current) {
        const { width: wWidth, height: wHeight } = containerSizeRef.current;
        const halfW = wWidth / 2;
        const halfH = wHeight / 2;
        const cam = cameraRef.current;
        cam.getWorldDirection(cameraForwardRef.current);

        const visibleBadges: Array<{ id: string; sx: number; sy: number }> = [];

        for (let k = 0; k < TWIN_HOTSPOTS.length; k++) {
          const hs = TWIN_HOTSPOTS[k];
          const el = badgeElementsRef.current.get(hs.id);
          if (!el) continue;

          // Проверка: находится ли точка строго перед плоскостью камеры (отсечение объектов сзади при 360 облёте)
          tempTargetRef.current.set(hs.worldPos[0], hs.worldPos[1], hs.worldPos[2]);
          toTargetRef.current.subVectors(tempTargetRef.current, cam.position);
          const dot = toTargetRef.current.dot(cameraForwardRef.current);
          if (dot <= 0) {
            if (el.style.display !== 'none') el.style.display = 'none';
            continue;
          }

          // Проецируем в NDC координаты
          tempVecRef.current.copy(tempTargetRef.current).project(cam);
          if (tempVecRef.current.z < -1 || tempVecRef.current.z > 1) {
            if (el.style.display !== 'none') el.style.display = 'none';
            continue;
          }

          const sx = tempVecRef.current.x * halfW + halfW;
          const sy = -(tempVecRef.current.y * halfH) + halfH;

          // Отсекаем выход за границы экрана
          if (sx >= 40 && sx <= wWidth - 40 && sy >= 30 && sy <= wHeight - 30) {
            visibleBadges.push({ id: hs.id, sx: Math.round(sx), sy: Math.round(sy) });
          } else {
            if (el.style.display !== 'none') el.style.display = 'none';
          }
        }

        // Сортировка по высоте на экране (screenY) и анти-коллизия
        visibleBadges.sort((a, b) => a.sy - b.sy);
        for (let i = 0; i < visibleBadges.length; i++) {
          for (let j = i + 1; j < visibleBadges.length; j++) {
            const dx = Math.abs(visibleBadges[i].sx - visibleBadges[j].sx);
            const dy = visibleBadges[j].sy - visibleBadges[i].sy;
            if (dx < 190 && dy < 44) {
              visibleBadges[j].sy += (44 - dy);
            }
          }
        }

        // Аппаратное позиционирование через GPU compositor (transform: translate3d)
        for (let i = 0; i < visibleBadges.length; i++) {
          const b = visibleBadges[i];
          const el = badgeElementsRef.current.get(b.id);
          if (el) {
            el.style.transform = `translate3d(${b.sx}px, ${b.sy}px, 0) translate(-50%, -100%)`;
            if (el.style.display !== 'block') {
              el.style.display = 'block';
            }
          }
        }
      } else if (!curShowHUD) {
        // Если тумблер выключен, скрываем все плашки
        badgeElementsRef.current.forEach(el => {
          if (el.style.display !== 'none') el.style.display = 'none';
        });
      }

      // 8. Подсчет реального FPS для индикатора статуса
      fpsCountRef.current++;
      if (now - lastFpsTimeRef.current >= 600) {
        const measuredFps = Math.round((fpsCountRef.current * 1000) / (now - lastFpsTimeRef.current));
        fpsCountRef.current = 0;
        lastFpsTimeRef.current = now;
        if (onFpsUpdateRef.current) {
          onFpsUpdateRef.current(measuredFps);
        }
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

    // Реактивно обновляем цвета пола, плит фундаментов и координатной сетки
    if (groundGroupRef.current) {
      applyThemeToGround(groundGroupRef.current, themeMode);
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

  // 2.2. Реактивное переключение режима X-Ray (прозрачность корпусов аппаратов и уровни)
  useEffect(() => {
    if (!materialsRef.current) return;
    applyXRayToMaterials(materialsRef.current, showXRay, themeMode);
  }, [showXRay, themeMode]);

  // 2.3. Реактивное переключение режима визуализации потоков в трубопроводах
  useEffect(() => {
    if (!materialsRef.current) return;
    applyFlowsToMaterials(materialsRef.current, showFlows, selectedMedium);
  }, [showFlows, selectedMedium]);

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

  // 3. Плавный переход к выбранному пресету камеры
  useEffect(() => {
    if (activePreset === 'cinematic') return;
    const targetPreset = CAMERA_PRESETS.find(p => p.id === activePreset);
    if (!targetPreset || !cameraRef.current || !controlsRef.current) return;

    focusOnCoordinates(targetPreset.position, targetPreset.target);
  }, [activePreset, focusOnCoordinates]);

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
    projectedHotspots: [] as ProjectedHotspot[],
    registerBadgeRef,
    hoveredName,
    handlePointerMove,
    handleClick,
    focusOnCoordinates,
  };
};
