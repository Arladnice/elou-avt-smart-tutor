import React, { useRef } from 'react';
import { Select, Space, Tooltip, message } from 'antd';
import {
  Save,
  Copy,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Eye,
  Edit3,
  Grid,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type { MnemoschemeConfig } from '@/entities/mnemoscheme';
import { useMnemoscheme } from '@/entities/mnemoscheme';
import * as S from './SchemeBuilder.styles';

export interface SchemeToolbarProps {
  currentScheme: MnemoschemeConfig;
  mode: 'edit' | 'preview';
  gridSnap: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onSetMode: (mode: 'edit' | 'preview') => void;
  onSetGridSnap: (snap: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onClone: () => void;
  onNew: () => void;
  onDelete: () => void;
  onReset: () => void;
}

export const SchemeToolbar: React.FC<SchemeToolbarProps> = ({
  currentScheme,
  mode,
  gridSnap,
  zoom,
  canUndo,
  canRedo,
  onSetMode,
  onSetGridSnap,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  onSave,
  onClone,
  onNew,
  onDelete,
  onReset,
}) => {
  const { presets, activePresetId, selectPreset, exportPresetJson, importPresetJson } = useMnemoscheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const jsonStr = exportPresetJson(currentScheme.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mnemoscheme-${currentScheme.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Конфигурация мнемосхемы экспортирована');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const imported = importPresetJson(content);
      if (imported) {
        message.success(`Мнемосхема "${imported.name}" успешно импортирована`);
      } else {
        message.error('Ошибка импорта мнемосхемы: некорректный JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <S.Toolbar>
      <S.ToolbarGroup>
        <S.SchemeTitleBadge>
          <span>Пресет:</span>
        </S.SchemeTitleBadge>
        <Select
          value={activePresetId}
          style={{ width: 260 }}
          onChange={selectPreset}
          options={presets.map(p => ({
            value: p.id,
            label: p.isBuiltin ? `🔒 ${p.name}` : `✏️ ${p.name}`,
          }))}
        />

        <Tooltip title="Создать копию текущей схемы для редактирования">
          <S.ActionButton onClick={onClone}>
            <Copy size={13} /> Клонировать
          </S.ActionButton>
        </Tooltip>

        <Tooltip title="Создать новую пустую мнемосхему">
          <S.ActionButton onClick={onNew}>
            <Plus size={13} /> Новая
          </S.ActionButton>
        </Tooltip>

        {!currentScheme.isBuiltin && (
          <Tooltip title="Сохранить изменения в текущей схеме">
            <S.ActionButton $variant="primary" onClick={onSave}>
              <Save size={13} /> Сохранить
            </S.ActionButton>
          </Tooltip>
        )}

        {!currentScheme.isBuiltin && (
          <Tooltip title="Удалить пользовательскую мнемосхему">
            <S.ActionButton $variant="danger" onClick={onDelete}>
              <Trash2 size={13} /> Удалить
            </S.ActionButton>
          </Tooltip>
        )}

        <Tooltip title="Сбросить мнемосхему к эталонному регламенту ЭЛОУ-АВТ-6">
          <S.ActionButton onClick={onReset}>
            <RotateCcw size={13} /> Сброс
          </S.ActionButton>
        </Tooltip>

        <Tooltip title="Отменить последнее действие (Ctrl+Z)">
          <S.ActionButton disabled={!canUndo} onClick={onUndo}>
            <Undo2 size={13} />
          </S.ActionButton>
        </Tooltip>

        <Tooltip title="Повторить отмененное действие (Ctrl+Y)">
          <S.ActionButton disabled={!canRedo} onClick={onRedo}>
            <Redo2 size={13} />
          </S.ActionButton>
        </Tooltip>
      </S.ToolbarGroup>

      <S.ToolbarGroup>
        <Space orientation="horizontal" size={6}>
          <Tooltip title="Уменьшить масштаб мнемосхемы">
            <S.ActionButton onClick={onZoomOut} disabled={zoom <= 0.5}>
              <ZoomOut size={13} />
            </S.ActionButton>
          </Tooltip>

          <Tooltip title="Текущий масштаб">
            <S.ZoomBadge>{Math.round(zoom * 100)}%</S.ZoomBadge>
          </Tooltip>

          <Tooltip title="Увеличить масштаб мнемосхемы">
            <S.ActionButton onClick={onZoomIn} disabled={zoom >= 2.5}>
              <ZoomIn size={13} />
            </S.ActionButton>
          </Tooltip>

          <Tooltip title="Сбросить масштаб (100%)">
            <S.ActionButton onClick={onZoomReset}>
              <Maximize2 size={13} />
            </S.ActionButton>
          </Tooltip>

          <Tooltip title="Привязка к инженерной сетке">
            <Select
              value={gridSnap}
              style={{ width: 110 }}
              onChange={onSetGridSnap}
              prefix={<Grid size={13} />}
              options={[
                { value: 10, label: 'Сетка 10px' },
                { value: 20, label: 'Сетка 20px' },
                { value: 1, label: 'Без сетки' },
              ]}
            />
          </Tooltip>

          <S.ActionButton onClick={handleExport} title="Экспортировать схему в JSON файл">
            <Download size={13} /> Экспорт
          </S.ActionButton>

          <S.ActionButton onClick={() => fileInputRef.current?.click()} title="Загрузить схему из JSON файла">
            <Upload size={13} /> Импорт
          </S.ActionButton>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileChange}
          />

          <S.ModeButton
            $active={mode === 'edit'}
            onClick={() => onSetMode('edit')}
            title="Режим добавления и расстановки оборудования"
          >
            <Edit3 size={13} /> Конструктор
          </S.ModeButton>

          <S.ModeButton
            $active={mode === 'preview'}
            onClick={() => onSetMode('preview')}
            title="Режим живой проверки с реальной физикой и телеметрией симулятора"
          >
            <Eye size={13} /> Тест (Live)
          </S.ModeButton>
        </Space>
      </S.ToolbarGroup>
    </S.Toolbar>
  );
};
