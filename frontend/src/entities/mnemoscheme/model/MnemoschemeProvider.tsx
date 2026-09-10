import React, { useMemo, useState } from 'react';
import { BUILTIN_PRESETS, DEFAULT_MNEMOSCHEME_ID, DEFAULT_MNEMOSCHEME_PRESET } from './defaultPreset';
import type { MnemoschemeConfig } from './types';
import { MnemoschemeContext, type MnemoschemeContextValue } from './mnemoschemeContext';

const STORAGE_KEY_CUSTOM_PRESETS = 'elou_tutor_mnemoschemes_custom';
const STORAGE_KEY_ACTIVE_PRESET = 'elou_tutor_mnemoschemes_active_id';

const loadCustomPresetsFromStorage = (): MnemoschemeConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item.id === 'string' && item.name);
    }
    return [];
  } catch (error) {
    console.warn('Не удалось загрузить пользовательские мнемосхемы из localStorage:', error);
    return [];
  }
};

const saveCustomPresetsToStorage = (presets: MnemoschemeConfig[]) => {
  try {
    const customOnly = presets.filter(p => !p.isBuiltin);
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(customOnly));
  } catch (error) {
    console.warn('Не удалось сохранить пользовательские мнемосхемы в localStorage:', error);
  }
};

export const MnemoschemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customPresets, setCustomPresets] = useState<MnemoschemeConfig[]>(loadCustomPresetsFromStorage);
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET) || DEFAULT_MNEMOSCHEME_ID;
  });
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const allPresets = useMemo(() => {
    return [...BUILTIN_PRESETS, ...customPresets];
  }, [customPresets]);

  const activeScheme = useMemo(() => {
    const found = allPresets.find(p => p.id === activePresetId);
    return found || DEFAULT_MNEMOSCHEME_PRESET;
  }, [allPresets, activePresetId]);

  const selectPreset = (id: string) => {
    const exists = allPresets.some(p => p.id === id);
    const targetId = exists ? id : DEFAULT_MNEMOSCHEME_ID;
    setActivePresetId(targetId);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, targetId);
  };

  const savePreset = (scheme: MnemoschemeConfig) => {
    if (scheme.isBuiltin) {
      console.warn('Заводской пресет защищен от перезаписи');
      return;
    }

    setCustomPresets(prev => {
      const index = prev.findIndex(p => p.id === scheme.id);
      let updated: MnemoschemeConfig[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = { ...scheme, isBuiltin: false };
      } else {
        updated = [...prev, { ...scheme, isBuiltin: false }];
      }
      saveCustomPresetsToStorage(updated);
      return updated;
    });

    setActivePresetId(scheme.id);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, scheme.id);
  };

  const clonePreset = (id: string, newName?: string): string => {
    const source = allPresets.find(p => p.id === id) || DEFAULT_MNEMOSCHEME_PRESET;
    const newId = `custom-scheme-${Date.now()}`;
    const cloned: MnemoschemeConfig = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: newName || `${source.name} (Копия)`,
      description: `Пользовательская мнемосхема на основе "${source.name}"`,
      isBuiltin: false,
    };

    setCustomPresets(prev => {
      const updated = [...prev, cloned];
      saveCustomPresetsToStorage(updated);
      return updated;
    });

    setActivePresetId(newId);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, newId);
    return newId;
  };

  const deletePreset = (id: string): boolean => {
    const target = allPresets.find(p => p.id === id);
    if (!target || target.isBuiltin) return false;

    setCustomPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveCustomPresetsToStorage(updated);
      return updated;
    });

    if (activePresetId === id) {
      setActivePresetId(DEFAULT_MNEMOSCHEME_ID);
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, DEFAULT_MNEMOSCHEME_ID);
    }
    return true;
  };

  const resetToDefault = () => {
    setActivePresetId(DEFAULT_MNEMOSCHEME_ID);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, DEFAULT_MNEMOSCHEME_ID);
  };

  const exportPresetJson = (id: string): string => {
    const target = allPresets.find(p => p.id === id) || activeScheme;
    return JSON.stringify(target, null, 2);
  };

  const importPresetJson = (jsonStr: string): MnemoschemeConfig | null => {
    try {
      const parsed = JSON.parse(jsonStr) as MnemoschemeConfig;
      if (!parsed || !parsed.name || !Array.isArray(parsed.columns)) {
        throw new Error('Некорректная структура файла мнемосхемы');
      }

      const importedId = `imported-${Date.now()}`;
      const validConfig: MnemoschemeConfig = {
        ...parsed,
        id: importedId,
        isBuiltin: false,
        name: parsed.name.includes('(Импорт)') ? parsed.name : `${parsed.name} (Импорт)`,
      };

      setCustomPresets(prev => {
        const updated = [...prev, validConfig];
        saveCustomPresetsToStorage(updated);
        return updated;
      });

      setActivePresetId(importedId);
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, importedId);
      return validConfig;
    } catch (error) {
      console.error('Ошибка импорта мнемосхемы:', error);
      return null;
    }
  };

  const value: MnemoschemeContextValue = {
    presets: allPresets,
    activePresetId,
    activeScheme,
    isBuilderOpen,
    openBuilder: () => setIsBuilderOpen(true),
    closeBuilder: () => setIsBuilderOpen(false),
    selectPreset,
    savePreset,
    clonePreset,
    deletePreset,
    resetToDefault,
    exportPresetJson,
    importPresetJson,
  };

  return <MnemoschemeContext.Provider value={value}>{children}</MnemoschemeContext.Provider>;
};
