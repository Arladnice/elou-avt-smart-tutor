import { createContext, useContext } from 'react';
import type { MnemoschemeConfig } from './types';

export interface MnemoschemeContextValue {
  presets: MnemoschemeConfig[];
  activePresetId: string;
  activeScheme: MnemoschemeConfig;
  isBuilderOpen: boolean;
  openBuilder: () => void;
  closeBuilder: () => void;
  selectPreset: (id: string) => void;
  savePreset: (scheme: MnemoschemeConfig) => void;
  clonePreset: (id: string, newName?: string) => string;
  deletePreset: (id: string) => boolean;
  resetToDefault: () => void;
  exportPresetJson: (id: string) => string;
  importPresetJson: (jsonStr: string) => MnemoschemeConfig | null;
}

export const MnemoschemeContext = createContext<MnemoschemeContextValue | null>(null);

export const useMnemoscheme = (): MnemoschemeContextValue => {
  const ctx = useContext(MnemoschemeContext);
  if (!ctx) {
    throw new Error('useMnemoscheme должен использоваться внутри MnemoschemeProvider');
  }
  return ctx;
};
