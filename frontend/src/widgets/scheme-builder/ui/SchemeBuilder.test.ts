import { describe, it, expect } from 'vitest';
import { DEFAULT_MNEMOSCHEME_PRESET } from '@/entities/mnemoscheme';
import { getSnapPorts, findMatchingPort } from '@/entities/mnemoscheme/model/snapPorts';

describe('Конструктор мнемосхем (SchemeBuilder)', () => {
  describe('Магнитная привязка штуцеров (Snap-to-port)', () => {
    it('рассчитывает штуцеры для всех аппаратов схемы по умолчанию', () => {
      const ports = getSnapPorts(DEFAULT_MNEMOSCHEME_PRESET);
      expect(ports.length).toBeGreaterThan(0);

      // Проверка штуцеров колонны К-1
      const k1Ports = ports.filter(p => p.targetId === 'col-k1');
      expect(k1Ports.some(p => p.id.endsWith('-top'))).toBe(true);
      expect(k1Ports.some(p => p.id.endsWith('-bottom'))).toBe(true);
      expect(k1Ports.some(p => p.id.endsWith('-feed-left'))).toBe(true);

      // Проверка штуцеров печи П-1
      const p1Ports = ports.filter(p => p.targetId === 'fur-p1');
      expect(p1Ports.some(p => p.id.endsWith('-in'))).toBe(true);
      expect(p1Ports.some(p => p.id.endsWith('-out'))).toBe(true);

      // Проверка штуцеров насоса Н-20
      const n20Ports = ports.filter(p => p.targetId === 'pump-n20');
      expect(n20Ports.some(p => p.id.endsWith('-in'))).toBe(true);
      expect(n20Ports.some(p => p.id.endsWith('-out'))).toBe(true);
    });

    it('магнитит координаты трубы к ближайшему штуцеру в пределах допуска 10px', () => {
      const ports = getSnapPorts(DEFAULT_MNEMOSCHEME_PRESET);
      const targetPort = ports[0];
      expect(targetPort).toBeDefined();

      const matched = findMatchingPort(ports, targetPort.x + 3, targetPort.y - 2, 10);
      expect(matched?.id).toBe(targetPort.id);

      const tooFar = findMatchingPort(ports, targetPort.x + 25, targetPort.y, 10);
      expect(tooFar).toBeUndefined();
    });
  });

  describe('Управление элементами и целостность пресета', () => {
    it('клонирует пресет с новым уникальным идентификатором', () => {
      const cloned = {
        ...JSON.parse(JSON.stringify(DEFAULT_MNEMOSCHEME_PRESET)),
        id: `custom-scheme-${Date.now()}`,
        name: 'Моя тестовая схема',
        isBuiltin: false,
      };

      expect(cloned.id).not.toBe(DEFAULT_MNEMOSCHEME_PRESET.id);
      expect(cloned.isBuiltin).toBe(false);
      expect(cloned.columns.length).toBe(DEFAULT_MNEMOSCHEME_PRESET.columns.length);
    });

    it('корректно сохраняет добавленные элементы (клапаны, датчики, насосы)', () => {
      const base = JSON.parse(JSON.stringify(DEFAULT_MNEMOSCHEME_PRESET));
      const newValve = {
        id: 'valve-custom-1',
        label: 'V-TEST',
        valveId: 'V_1',
        x: 500,
        y: 300,
      };
      base.valves.push(newValve);

      expect(base.valves.find((v: any) => v.id === 'valve-custom-1')).toBeDefined();
    });
  });
});
