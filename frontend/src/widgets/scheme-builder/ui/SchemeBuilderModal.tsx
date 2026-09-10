import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import type { MnemoschemeConfig } from '@/entities/mnemoscheme';
import { useMnemoscheme } from '@/entities/mnemoscheme';
import { ComponentPalette, type PaletteItemDef } from './ComponentPalette';
import { PropertyInspector, type SelectedElementRef } from './PropertyInspector';
import { BuilderCanvas } from './BuilderCanvas';
import { SchemeToolbar } from './SchemeToolbar';
import * as S from './SchemeBuilder.styles';

export interface SchemeBuilderModalProps {
  open: boolean;
  onClose: () => void;
}

export const SchemeBuilderModal: React.FC<SchemeBuilderModalProps> = ({ open, onClose }) => {
  const {
    activeScheme,
    savePreset,
    clonePreset,
    deletePreset,
    resetToDefault,
  } = useMnemoscheme();

  const [workingScheme, setWorkingScheme] = useState<MnemoschemeConfig>(() =>
    JSON.parse(JSON.stringify(activeScheme))
  );

  const [selectedElement, setSelectedElement] = useState<SelectedElementRef | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [gridSnap, setGridSnap] = useState<number>(10);

  // Синхронизация при смене активной схемы извне или через селектор пресетов
  useEffect(() => {
    setWorkingScheme(JSON.parse(JSON.stringify(activeScheme)));
    setSelectedElement(null);
  }, [activeScheme]);

  // Поиск данных выделенного элемента
  const getSelectedItemData = () => {
    if (!selectedElement) return null;
    const { category, id } = selectedElement;
    const list = workingScheme[category] as any[];
    return list?.find(item => item.id === id) || null;
  };

  const handleUpdateItem = (
    category: SelectedElementRef['category'],
    id: string,
    patch: Record<string, any>,
  ) => {
    setWorkingScheme(prev => {
      const list = prev[category] as any[];
      const updatedList = list.map(item => (item.id === id ? { ...item, ...patch } : item));
      return { ...prev, [category]: updatedList };
    });
  };

  const handleDeleteItem = (category: SelectedElementRef['category'], id: string) => {
    setWorkingScheme(prev => {
      const list = prev[category] as any[];
      const updatedList = list.filter(item => item.id !== id);
      return { ...prev, [category]: updatedList };
    });
    setSelectedElement(null);
    message.info('Элемент удален со схемы');
  };

  const handleUpdateElementPosition = (
    category: SelectedElementRef['category'],
    id: string,
    x: number,
    y: number,
  ) => {
    handleUpdateItem(category, id, { x, y });
  };

  const handleAddItem = (itemDef: PaletteItemDef) => {
    const newId = `${itemDef.type}-${Date.now().toString().slice(-6)}`;
    const centerX = 540 + Math.floor(Math.random() * 80) - 40;
    const centerY = 280 + Math.floor(Math.random() * 80) - 40;

    let category: SelectedElementRef['category'] = 'equipment' as any;
    let newItem: any = { id: newId, x: centerX, y: centerY, ...itemDef.defaultData };

    if (itemDef.type === 'column') category = 'columns';
    else if (itemDef.type === 'furnace') category = 'furnaces';
    else if (itemDef.type === 'vessel') category = 'vessels';
    else if (itemDef.type === 'pump') category = 'pumps';
    else if (itemDef.type === 'valve') category = 'valves';
    else if (itemDef.type === 'sensor') category = 'sensors';
    else if (itemDef.type === 'pipe') {
      category = 'pipes';
      newItem = { id: newId, ...itemDef.defaultData };
    } else if (itemDef.type === 'label') category = 'labels';

    setWorkingScheme(prev => {
      const list = prev[category] as any[];
      return { ...prev, [category]: [...list, newItem] };
    });

    setSelectedElement({ category, id: newId });
    message.success(`Добавлен элемент "${itemDef.name}"`);
  };

  const handleSave = () => {
    if (workingScheme.isBuiltin) {
      message.warning('Заводской пресет защищен от перезаписи. Создайте копию через «Клонировать».');
      return;
    }
    savePreset(workingScheme);
    message.success(`Мнемосхема "${workingScheme.name}" сохранена`);
  };

  const handleClone = () => {
    const newName = prompt('Введите название для новой схемы:', `${workingScheme.name} (Копия)`);
    if (!newName) return;
    clonePreset(workingScheme.id, newName);
    message.success(`Создана пользовательская мнемосхема "${newName}"`);
  };

  const handleNew = () => {
    const name = prompt('Введите название новой мнемосхемы:', 'Новая схема ЭЛОУ-АВТ');
    if (!name) return;
    const emptyScheme: MnemoschemeConfig = {
      id: `custom-empty-${Date.now()}`,
      name,
      description: 'Пользовательская технологическая схема',
      isBuiltin: false,
      width: 1260,
      height: 620,
      zones: [
        { id: 'zone-1', x: 12, y: 8, width: 384, height: 596, label: 'СЕКЦИЯ 1' },
        { id: 'zone-2', x: 400, y: 8, width: 386, height: 596, label: 'СЕКЦИЯ 2' },
        { id: 'zone-3', x: 790, y: 8, width: 458, height: 596, label: 'СЕКЦИЯ 3' },
      ],
      columns: [],
      furnaces: [],
      vessels: [],
      pumps: [],
      valves: [],
      sensors: [],
      pipes: [],
      labels: [],
    };
    savePreset(emptyScheme);
    message.success(`Создана пустая мнемосхема "${name}"`);
  };

  const handleDeleteCurrent = () => {
    if (workingScheme.isBuiltin) {
      message.error('Нельзя удалить заводской пресет');
      return;
    }
    if (confirm(`Вы уверены, что хотите удалить мнемосхему "${workingScheme.name}"?`)) {
      deletePreset(workingScheme.id);
      message.success('Мнемосхема удалена');
    }
  };

  const handleReset = () => {
    if (confirm('Сбросить активную мнемосхему к штатному заводскому регламенту ЭЛОУ-АВТ-6?')) {
      resetToDefault();
      message.info('Восстановлен эталонный регламент ЭЛОУ-АВТ-6');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="96vw"
      styles={{ body: { padding: 0 } }}
      centered
      destroyOnClose
      title={null}
    >
      <S.BuilderModalContent>
        <SchemeToolbar
          currentScheme={workingScheme}
          mode={mode}
          gridSnap={gridSnap}
          onSetMode={setMode}
          onSetGridSnap={setGridSnap}
          onSave={handleSave}
          onClone={handleClone}
          onNew={handleNew}
          onDelete={handleDeleteCurrent}
          onReset={handleReset}
        />

        <S.BuilderWorkspace>
          {mode === 'edit' && <ComponentPalette onAddItem={handleAddItem} />}

          <BuilderCanvas
            scheme={workingScheme}
            selectedElement={selectedElement}
            mode={mode}
            gridSnap={gridSnap}
            onSelectElement={setSelectedElement}
            onUpdateElementPosition={handleUpdateElementPosition}
          />

          {mode === 'edit' && (
            <PropertyInspector
              selectedElement={selectedElement}
              itemData={getSelectedItemData()}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </S.BuilderWorkspace>
      </S.BuilderModalContent>
    </Modal>
  );
};
