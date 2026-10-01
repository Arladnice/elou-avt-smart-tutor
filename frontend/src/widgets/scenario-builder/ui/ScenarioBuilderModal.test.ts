import { describe, it, expect } from 'vitest';
import {
  presetToCondition,
  conditionToPreset,
  CONDITION_OPTIONS,
  GOLDEN_SEQUENCE_OPTIONS,
  FORM_INITIAL_VALUES,
  type ChecklistFormRow,
} from './ScenarioBuilderModal.config';

describe('Конструктор Учебных Сценариев АРМ Инструктора (ScenarioBuilder)', () => {
  describe('Конфигурация и начальные значения', () => {
    it('содержит корректные начальные физические параметры симулятора', () => {
      expect(FORM_INITIAL_VALUES.T_1).toBe(280);
      expect(FORM_INITIAL_VALUES.P_1).toBe(0.35);
      expect(FORM_INITIAL_VALUES.L_1).toBe(50);
      expect(FORM_INITIAL_VALUES.L_2).toBe(50);
      expect(FORM_INITIAL_VALUES.V_1).toBe(true);
      expect(FORM_INITIAL_VALUES.V_2).toBe(false);
      expect(FORM_INITIAL_VALUES.V_3).toBe(true);
      expect(FORM_INITIAL_VALUES.checklist?.length).toBeGreaterThan(0);
    });

    it('содержит уникальные опции условий завершения шага', () => {
      const values = CONDITION_OPTIONS.map(opt => opt.value);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
      expect(values).toContain('V_1_CLOSE');
      expect(values).toContain('V_2_OPEN');
      expect(values).toContain('T_1_LTE');
      expect(values).toContain('L_2_LTE');
    });

    it('содержит корректные эталонные действия для LCS Golden Sequence', () => {
      const values = GOLDEN_SEQUENCE_OPTIONS.map(opt => opt.value);
      expect(values).toContain('V1_OPEN');
      expect(values).toContain('V1_CLOSE');
      expect(values).toContain('V2_OPEN');
      expect(values).toContain('V3_CLOSE');
      expect(values).toContain('SP_UP');
      expect(values).toContain('ESD');
    });
  });

  describe('Трансформация пресетов в условия техрегламента (presetToCondition)', () => {
    it('корректно разворачивает условия по клапанам V-1, V-2, V-3', () => {
      const rowCloseV1: ChecklistFormRow = {
        title: 'Закрыть сырье',
        conditionType: 'V_1_CLOSE',
      };
      expect(presetToCondition(rowCloseV1)).toEqual({
        type: 'valve_is',
        target: 'V_1',
        expected: false,
      });

      const rowOpenV2: ChecklistFormRow = {
        title: 'Сброс на факел',
        conditionType: 'V_2_OPEN',
      };
      expect(presetToCondition(rowOpenV2)).toEqual({
        type: 'valve_is',
        target: 'V_2',
        expected: true,
      });

      const rowCloseV3: ChecklistFormRow = {
        title: 'Прекратить дренаж куба',
        conditionType: 'V_3_CLOSE',
      };
      expect(presetToCondition(rowCloseV3)).toEqual({
        type: 'valve_is',
        target: 'V_3',
        expected: false,
      });
    });

    it('корректно разворачивает условия по датчикам температуры и уровней с кастомным порогом', () => {
      const rowT1: ChecklistFormRow = {
        title: 'Охлаждение печи',
        conditionType: 'T_1_LTE',
        targetVal: 200,
      };
      expect(presetToCondition(rowT1)).toEqual({
        type: 'sensor_lte',
        target: 'T_1',
        expected: 200,
      });

      const rowL2: ChecklistFormRow = {
        title: 'Набор уровня в кубе К-2',
        conditionType: 'L_2_GTE',
        targetVal: 45,
      };
      expect(presetToCondition(rowL2)).toEqual({
        type: 'sensor_gte',
        target: 'L_2',
        expected: 45,
      });
    });

    it('использует fallback порог, если targetVal не указан', () => {
      const rowFallback: ChecklistFormRow = {
        title: 'Порог по умолчанию',
        conditionType: 'T_1_LTE',
      };
      expect(presetToCondition(rowFallback)).toEqual({
        type: 'sensor_lte',
        target: 'T_1',
        expected: 245.0,
      });
    });

    it('корректно разворачивает условия по насосам (Н-20, Н-82, Н-4)', () => {
      const rowN20: ChecklistFormRow = {
        title: 'Пуск сырьевого насоса',
        conditionType: 'N_20_START',
      };
      expect(presetToCondition(rowN20)).toEqual({
        type: 'pump_is',
        target: 'N_20',
        expected: true,
      });

      const rowN82Stop: ChecklistFormRow = {
        title: 'Останов промывочной воды',
        conditionType: 'N_82_STOP',
      };
      expect(presetToCondition(rowN82Stop)).toEqual({
        type: 'pump_is',
        target: 'N_82',
        expected: false,
      });
    });

    it('корректно разворачивает условия по качеству обессоливания ЭЛОУ (Sal_1, W_1)', () => {
      const rowSal: ChecklistFormRow = {
        title: 'Достижение нормы по солям',
        conditionType: 'Sal_1_LTE',
        targetVal: 5.0,
      };
      expect(presetToCondition(rowSal)).toEqual({
        type: 'sensor_lte',
        target: 'Sal_1',
        expected: 5.0,
      });

      const rowWater: ChecklistFormRow = {
        title: 'Обезвоживание нефти',
        conditionType: 'W_1_LTE',
      };
      expect(presetToCondition(rowWater)).toEqual({
        type: 'sensor_lte',
        target: 'W_1',
        expected: 0.5,
      });
    });
  });

  describe('Обратная трансформация условий в пресеты (conditionToPreset)', () => {
    it('корректно восстанавливает пресеты для клапанов, насосов и датчиков', () => {
      expect(conditionToPreset({ type: 'valve_is', target: 'V_1', expected: false })).toEqual({
        conditionType: 'V_1_CLOSE',
      });
      expect(conditionToPreset({ type: 'pump_is', target: 'N_82', expected: true })).toEqual({
        conditionType: 'N_82_START',
      });
      expect(conditionToPreset({ type: 'sensor_lte', target: 'Sal_1', expected: 8.5 })).toEqual({
        conditionType: 'Sal_1_LTE',
        targetVal: 8.5,
      });
    });
  });
});

