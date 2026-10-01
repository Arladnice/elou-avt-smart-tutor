import React, { useState } from 'react';
import { Tabs, Form, Input, InputNumber, Switch, Button, Select, App, Upload, Popconfirm } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  FileTextOutlined,
  CodeOutlined,
  DownloadOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  createScenario,
  updateScenario,
  importScenario,
  deleteScenario,
  type ScenarioItem,
} from '@/entities/scenario';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import {
  type ScenarioFormValues,
  presetToCondition,
  conditionToPreset,
  CONDITION_OPTIONS,
  GOLDEN_SEQUENCE_OPTIONS,
  FORM_INITIAL_VALUES,
} from './ScenarioBuilderModal.config';
import * as S from './ScenarioBuilderModal.styles';

interface ScenarioBuilderModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Текст ошибки из отказа API или JSON.parse */
const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const ScenarioBuilderModal: React.FC<ScenarioBuilderModalProps> = ({ visible, onClose }) => {
  const { message } = App.useApp();
  const { scenarios } = useSession();
  const { reloadScenarios } = useSimulatorActions();
  const [activeTab, setActiveTab] = useState('1');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const resetToCreateMode = () => {
    setEditingScenarioId(null);
    form.resetFields();
  };

  const handleVisualSubmit = async (values: ScenarioFormValues) => {
    try {
      setLoading(true);
      const newScenario: ScenarioItem = {
        id: (editingScenarioId || values.id).trim(),
        title: values.title.trim(),
        short_name: values.short_name.trim(),
        description: values.description || '',
        initial_state: {
          T_1: values.T_1 ?? 280.0,
          P_1: values.P_1 ?? 0.35,
          L_1: values.L_1 ?? 50.0,
          L_2: values.L_2 ?? 50.0,
          T_1_Sp: values.T_1_Sp ?? 280.0,
          V_1: Boolean(values.V_1),
          V_2: Boolean(values.V_2),
          V_3: Boolean(values.V_3),
        },
        checklist: (values.checklist || []).map((row, index) => ({
          id: row.id || `step_${index + 1}`,
          title: row.title,
          hint_training: row.hint_training ?? '',
          hint_exam: row.hint_exam ?? '',
          condition: presetToCondition(row),
        })),
        golden_sequence: values.golden_sequence || [],
      };

      if (editingScenarioId) {
        await updateScenario(editingScenarioId, newScenario);
        message.success(`Сценарий '${newScenario.title}' успешно обновлен в реестре КТК!`);
      } else {
        await createScenario(newScenario);
        message.success(`Сценарий '${newScenario.title}' успешно создан и добавлен в реестр КТК!`);
      }
      await reloadScenarios();
      resetToCreateMode();
      onClose();
    } catch (e) {
      message.error(`Ошибка сохранения сценария: ${errorText(e)}`);
    } finally {
      setLoading(false);
    }
  };


  const handleJsonSubmit = async () => {
    try {
      setLoading(true);
      const parsed = JSON.parse(jsonText);
      await importScenario(parsed);
      message.success('Сценарий успешно импортирован из JSON!');
      await reloadScenarios();
      setJsonText('');
      onClose();
    } catch (e) {
      message.error(`Ошибка при импорте JSON: ${errorText(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setJsonText(text);
        setActiveTab('2');
        message.success(`Файл ${file.name} прочитан! Проверьте JSON и нажмите Сохранить.`);
      } catch {
        message.error('Не удалось прочитать файл JSON');
      }
    };
    reader.readAsText(file);
    return false;
  };

  /** Выгружает сценарий из реестра в JSON-файл (парный импорту формат) */
  const handleExportScenario = (scenario: ScenarioItem) => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scenario_${scenario.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`Сценарий '${scenario.id}' выгружен в JSON-файл.`);
  };

  /** Открывает сценарий в JSON-редакторе для правки и повторного импорта */
  const handleEditAsJson = (scenario: ScenarioItem) => {
    setJsonText(JSON.stringify(scenario, null, 2));
    setActiveTab('2');
    message.info(`Сценарий '${scenario.id}' загружен в JSON-редактор.`);
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      await deleteScenario(id);
      message.success(`Сценарий '${id}' удален.`);
      await reloadScenarios();
    } catch (e) {
      message.error(errorText(e));
    }
  };

  const handleEditVisual = (scenario: ScenarioItem) => {
    setEditingScenarioId(scenario.id);
    form.setFieldsValue({
      id: scenario.id,
      title: scenario.title,
      short_name: scenario.short_name,
      description: scenario.description || '',
      T_1: scenario.initial_state?.T_1 ?? 280,
      P_1: scenario.initial_state?.P_1 ?? 0.35,
      L_1: scenario.initial_state?.L_1 ?? 50,
      L_2: scenario.initial_state?.L_2 ?? 50,
      T_1_Sp: scenario.initial_state?.T_1_Sp ?? 280,
      V_1: scenario.initial_state?.V_1 ?? true,
      V_2: scenario.initial_state?.V_2 ?? false,
      V_3: scenario.initial_state?.V_3 ?? true,
      checklist: (scenario.checklist || []).map((row, index) => {
        const { conditionType, targetVal } = conditionToPreset(row.condition);
        return {
          id: row.id || `step_${index + 1}`,
          title: row.title,
          hint_training: row.hint_training ?? '',
          hint_exam: row.hint_exam ?? '',
          conditionType,
          targetVal,
        };
      }),
      golden_sequence: scenario.golden_sequence || [],
    });
    setActiveTab('1');
    message.info(`Сценарий '${scenario.title}' загружен для редактирования.`);
  };

  return (
    <S.StyledModal
      title={
        <S.ModalTitleWrapper>
          <FileTextOutlined className="title-icon" />
          <span>Конструктор Учебных Сценариев АРМ Инструктора</span>
        </S.ModalTitleWrapper>
      }
      open={visible}
      onCancel={() => {
        resetToCreateMode();
        onClose();
      }}
      footer={null}
      width={820}
      destroyOnHidden
      centered
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: '1',
            label: (
              <span>
                <FileTextOutlined /> Визуальный конструктор {editingScenarioId ? '(Редактирование)' : ''}
              </span>
            ),
            children: (
              <Form
                form={form}
                layout="vertical"
                initialValues={FORM_INITIAL_VALUES}
                onFinish={handleVisualSubmit}
              >
                <S.TopInputsGrid>
                  <Form.Item name="id" label="ID Сценария (англ.)" rules={[{ required: true, message: 'Введите ID' }]}>
                    <Input placeholder="например: desalter_flush" disabled={Boolean(editingScenarioId)} />
                  </Form.Item>

                  <Form.Item name="title" label="Название Сценария" rules={[{ required: true, message: 'Введите название' }]}>
                    <Input placeholder="например: Промывка ЭЛОУ" />
                  </Form.Item>
                  <Form.Item name="short_name" label="Короткое имя (в меню)" rules={[{ required: true, message: 'Введите имя' }]}>
                    <Input placeholder="например: Промывка" />
                  </Form.Item>
                </S.TopInputsGrid>

                <Form.Item name="description" label="Описание учебно-тренировочной задачи">
                  <Input.TextArea rows={2} placeholder="Опишите цель сценария для оператора..." />
                </Form.Item>

                <S.SectionCard size="small" title="Начальные физические параметры симулятора">
                  <S.ParametersGrid>
                    <Form.Item name="T_1" label="Т-1 Печь (°C)">
                      <InputNumber min={20} max={500} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="P_1" label="P-1 Колонна (МПа)">
                      <InputNumber min={0.01} max={1.2} step={0.05} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="L_1" label="L-1 Уровень (%)">
                      <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="L_2" label="L-2 Уровень К-2 (%)">
                      <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </S.ParametersGrid>
                  <div style={{ maxWidth: 220 }}>
                    <Form.Item name="T_1_Sp" label="Уставка T_Sp (°C)">
                      <InputNumber min={20} max={400} style={{ width: '100%' }} />
                    </Form.Item>
                  </div>
                  <S.SwitchesRow>
                    <Form.Item name="V_1" label="Задвижка V-1 (Сырьё)" valuePropName="checked">
                      <Switch checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
                    </Form.Item>
                    <Form.Item name="V_2" label="Сброс V-2 (Факел)" valuePropName="checked">
                      <Switch checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
                    </Form.Item>
                    <Form.Item name="V_3" label="Дренаж V-3 (Куб)" valuePropName="checked">
                      <Switch checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
                    </Form.Item>
                  </S.SwitchesRow>
                </S.SectionCard>

                <S.SectionCard size="small" title="Задачи и шаги Чек-листа">
                  <Form.List name="checklist">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <S.ChecklistItem key={key}>
                            <S.ChecklistGridTop>
                              <Form.Item
                                {...restField}
                                name={[name, 'title']}
                                label="Название шага"
                                rules={[{ required: true, message: 'Введите название шага' }]}
                              >
                                <Input placeholder="1. Перекрытие подачи V-1" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'conditionType']}
                                label="Тип условия завершения"
                                rules={[{ required: true }]}
                              >
                                <Select options={CONDITION_OPTIONS} />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'targetVal']}
                                label="Значение X"
                              >
                                <InputNumber placeholder="Число" style={{ width: '100%' }} />
                              </Form.Item>
                            </S.ChecklistGridTop>
                            <S.ChecklistGridBottom>
                              <Form.Item {...restField} name={[name, 'hint_training']} label="Подсказка (Режим Обучения)">
                                <Input placeholder="Подсказка с текущими датчиками..." />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'hint_exam']} label="Подсказка (Режим Экзамена ГОСТ)">
                                <Input placeholder="Технологическая формулировка техрегламента..." />
                              </Form.Item>
                              <S.DeleteButtonWrapper>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(name)}
                                  title="Удалить шаг"
                                />
                              </S.DeleteButtonWrapper>
                            </S.ChecklistGridBottom>
                          </S.ChecklistItem>
                        ))}
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          Добавить шаг в чек-лист
                        </Button>
                      </>
                    )}
                  </Form.List>
                </S.SectionCard>

                <Form.Item name="golden_sequence" label="Эталонная последовательность действий (Golden Sequence для LCS)">
                  <Select
                    mode="tags"
                    placeholder="Выберите действия в порядке их выполнения..."
                    options={GOLDEN_SEQUENCE_OPTIONS}
                  />
                </Form.Item>

                <S.ModalFooterActions>
                  {editingScenarioId && (
                    <Button onClick={resetToCreateMode}>
                      Отменить редактирование
                    </Button>
                  )}
                  <Button onClick={() => { resetToCreateMode(); onClose(); }}>Отмена</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={editingScenarioId ? <SaveOutlined /> : <PlusOutlined />}
                  >
                    {editingScenarioId ? 'Сохранить изменения в сценарии' : 'Сохранить сценарий в реестр КТК'}
                  </Button>
                </S.ModalFooterActions>

              </Form>
            ),
          },
          {
            key: '2',
            label: (
              <span>
                <CodeOutlined /> JSON Импорт / Экспорт
              </span>
            ),
            children: (
              <div>
                <S.JsonControlsRow>
                  <Upload beforeUpload={handleFileUpload} showUploadList={false} accept=".json">
                    <Button icon={<UploadOutlined />}>Загрузить JSON-файл сценария</Button>
                  </Upload>
                  <Button
                    onClick={() => {
                      const sample = {
                        scenario: {
                          id: 'sample_scenario',
                          title: 'Пример учебного сценария',
                          short_name: 'Пример',
                          description: 'Описание учебной задачи',
                          initial_state: FORM_INITIAL_VALUES,
                          checklist: FORM_INITIAL_VALUES.checklist,
                          golden_sequence: FORM_INITIAL_VALUES.golden_sequence,
                        },
                      };
                      setJsonText(JSON.stringify(sample, null, 2));
                    }}
                  >
                    Вставить шаблон JSON
                  </Button>
                </S.JsonControlsRow>
                <S.JsonTextArea
                  rows={14}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Вставьте JSON-конфигурацию сценария..."
                />
                <S.ModalFooterActions>
                  <Button onClick={onClose}>Отмена</Button>
                  <Button type="primary" onClick={handleJsonSubmit} loading={loading} icon={<UploadOutlined />}>
                    Импортировать JSON
                  </Button>
                </S.ModalFooterActions>
              </div>
            ),
          },
          {
            key: '3',
            label: <span>Управление реестром ({scenarios.length})</span>,
            children: (
              <S.RegistryContainer>
                {scenarios.map((s) => (
                  <S.RegistryCard
                    key={s.id}
                    size="small"
                    extra={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleExportScenario(s)}
                          title="Выгрузить сценарий в JSON-файл"
                        >
                          Экспорт
                        </Button>
                        <Button
                          size="small"
                          type="text"
                          icon={<CodeOutlined />}
                          onClick={() => handleEditAsJson(s)}
                          title="Открыть в JSON-редакторе (для копии или правки)"
                        />
                        {s.is_custom ? (
                          <>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditVisual(s)}
                              title="Редактировать сценарий в визуальном конструкторе"
                            >
                              Редактировать
                            </Button>
                            <Popconfirm
                              title="Удалить пользовательский сценарий?"
                              onConfirm={() => handleDeleteScenario(s.id)}
                              okText="Да"
                              cancelText="Отмена"
                            >
                              <Button danger size="small" icon={<DeleteOutlined />}>
                                Удалить
                              </Button>
                            </Popconfirm>
                          </>
                        ) : (
                          <S.BuiltinTag>Встроенный техрегламент</S.BuiltinTag>
                        )}

                      </div>
                    }
                  >
                    <S.ScenarioTitle>
                      <span>{s.title}</span>
                      <S.ScenarioIdBadge>[{s.id}]</S.ScenarioIdBadge>
                    </S.ScenarioTitle>
                    <S.ScenarioDescription>{s.description}</S.ScenarioDescription>
                  </S.RegistryCard>
                ))}
              </S.RegistryContainer>
            ),
          },
        ]}
      />
    </S.StyledModal>
  );
};
