import React, { useState, useEffect, useCallback } from 'react';
import { Modal, message } from 'antd';
import type { MnemoschemeConfig } from '@/entities/mnemoscheme';
import { DEFAULT_MNEMOSCHEME_PRESET, translateSvgPath, useMnemoscheme } from '@/entities/mnemoscheme';
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

  // Стек истории для Undo/Redo
  const [history, setHistory] = useState<MnemoschemeConfig[]>(() => [
    JSON.parse(JSON.stringify(activeScheme)),
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [selectedElement, setSelectedElement] = useState<SelectedElementRef | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [gridSnap, setGridSnap] = useState<number>(10);

  // Состояния зума и панорамирования
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Синхронизация при смене активной схемы извне или через селектор пресетов
  useEffect(() => {
    const clone = JSON.parse(JSON.stringify(activeScheme));
    setWorkingScheme(clone);
    setHistory([clone]);
    setHistoryIndex(0);
    setSelectedElement(null);
  }, [activeScheme]);

  // Запись действия в историю
  const pushHistory = useCallback(
    (newScheme: MnemoschemeConfig) => {
      setHistory(prev => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(JSON.parse(JSON.stringify(newScheme)));
        if (next.length > 40) {
          next.shift();
        }
        return next;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 39));
      setWorkingScheme(newScheme);
    },
    [historyIndex]
  );

  const handleCommitHistory = useCallback(() => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(JSON.parse(JSON.stringify(workingScheme)));
      if (next.length > 40) {
        next.shift();
      }
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 39));
  }, [historyIndex, workingScheme]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setWorkingScheme(JSON.parse(JSON.stringify(history[nextIndex])));
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setWorkingScheme(JSON.parse(JSON.stringify(history[nextIndex])));
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  // Горячие клавиши Ctrl+Z / Ctrl+Y
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') ||
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleUndo, handleRedo]);

  const handleZoomIn = () => setZoom(prev => Math.min(3, Math.round((prev + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom(prev => Math.max(0.4, Math.round((prev - 0.15) * 100) / 100));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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
    const list = (workingScheme[category] as any[]) || [];
    const updatedList = list.filter(item => item.id !== id);
    const nextScheme = { ...workingScheme, [category]: updatedList };
    pushHistory(nextScheme);
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
    // Центрирование относительно текущего вида с учетом зума и панорамирования (кратно 10)
    const viewW = workingScheme.width / zoom;
    const viewH = workingScheme.height / zoom;
    const centerX = Math.round((pan.x + viewW / 2) / 10) * 10;
    const centerY = Math.round((pan.y + viewH / 2) / 10) * 10;

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
      if (itemDef.defaultData.d) {
        // Смещаем SVG-путь к центру экрана
        const dx = centerX - 160;
        const dy = centerY - 100;
        newItem = {
          id: newId,
          ...itemDef.defaultData,
          d: translateSvgPath(itemDef.defaultData.d, dx, dy),
        };
      } else if (itemDef.defaultData.x1 !== undefined) {
        const lenX = itemDef.defaultData.x2 - itemDef.defaultData.x1;
        const lenY = itemDef.defaultData.y2 - itemDef.defaultData.y1;
        const x1 = centerX - Math.round(lenX / 20) * 10;
        const y1 = centerY - Math.round(lenY / 20) * 10;
        newItem = {
          id: newId,
          ...itemDef.defaultData,
          x1,
          y1,
          x2: x1 + lenX,
          y2: y1 + lenY,
        };
      } else {
        newItem = { id: newId, ...itemDef.defaultData };
      }
    } else if (itemDef.type === 'label') category = 'labels';

    const list = (workingScheme[category] as any[]) || [];
    const updated = { ...workingScheme, [category]: [...list, newItem] };
    pushHistory(updated);

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
      const defaultCopy = JSON.parse(JSON.stringify(DEFAULT_MNEMOSCHEME_PRESET));
      setWorkingScheme(defaultCopy);
      setHistory([defaultCopy]);
      setHistoryIndex(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setSelectedElement(null);
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
          zoom={zoom}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onSetMode={setMode}
          onSetGridSnap={setGridSnap}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onUndo={handleUndo}
          onRedo={handleRedo}
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
            zoom={zoom}
            pan={pan}
            onSetZoom={setZoom}
            onSetPan={setPan}
            onSelectElement={setSelectedElement}
            onUpdateElementPosition={handleUpdateElementPosition}
            onUpdateItem={handleUpdateItem}
            onCommitHistory={handleCommitHistory}
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
