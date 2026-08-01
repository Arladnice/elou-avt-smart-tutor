import React, { useState } from 'react';
import { Modal, Tabs, Form, Input, InputNumber, Switch, Button, Select, App, Upload, Card, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, FileTextOutlined, CodeOutlined, DownloadOutlined } from '@ant-design/icons';
import { createScenario, importScenario, deleteScenario, type ScenarioItem } from '@/entities/scenario';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';

interface ScenarioBuilderModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ScenarioBuilderModal: React.FC<ScenarioBuilderModalProps> = ({ visible, onClose }) => {
  const { message } = App.useApp();
  const { scenarios } = useSession();
  const { reloadScenarios } = useSimulatorActions();
  const [activeTab, setActiveTab] = useState('1');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Начальный пустой шаблон для визуального конструктора
  const initialValues: Partial<ScenarioItem> = {
    id: '',
    title: '',
    short_name: '',
    description: '',
    initial_state: {
      T_1: 280.0,
      P_1: 0.35,
      L_1: 50.0,
      T_1_Sp: 280.0,
      V_1: true,
      V_2: false,
      V_3: true,
    },
    checklist: [
      {
        id: 'step_1',
        title: '1. Перекрытие подачи сырья V-1',
        hint_training: 'Переведите клапан V-1 в положение ЗАКРЫТО',
        hint_exam: 'Отсечь подачу сырья в печь П-1.',
        condition: { type: 'valve_is', target: 'V_1', expected: false },
      },
    ],
    golden_sequence: ['V1_CLOSE'],
  };

  const handleVisualSubmit = async (values: any) => {
    try {
      setLoading(true);
      // Преобразуем формы в объект ScenarioItem
      const newScenario: ScenarioItem = {
        id: values.id.trim(),
        title: values.title.trim(),
        short_name: values.short_name.trim(),
        description: values.description || '',
        initial_state: {
          T_1: values.T_1 ?? 280.0,
          P_1: values.P_1 ?? 0.35,
          L_1: values.L_1 ?? 50.0,
          T_1_Sp: values.T_1_Sp ?? 280.0,
          V_1: !!values.V_1,
          V_2: !!values.V_2,
          V_3: !!values.V_3,
        },
        checklist: (values.checklist || []).map((c: any, index: number) => {
          let conditionObj: any = { type: 'valve_is', target: 'V_1', expected: false };
          if (c.conditionType === 'V_1_CLOSE') conditionObj = { type: 'valve_is', target: 'V_1', expected: false };
          if (c.conditionType === 'V_1_OPEN') conditionObj = { type: 'valve_is', target: 'V_1', expected: true };
          if (c.conditionType === 'V_2_OPEN') conditionObj = { type: 'valve_is', target: 'V_2', expected: true };
          if (c.conditionType === 'V_2_CLOSE') conditionObj = { type: 'valve_is', target: 'V_2', expected: false };
          if (c.conditionType === 'V_3_OPEN') conditionObj = { type: 'valve_is', target: 'V_3', expected: true };
          if (c.conditionType === 'V_3_CLOSE') conditionObj = { type: 'valve_is', target: 'V_3', expected: false };
          if (c.conditionType === 'T_1_LTE') conditionObj = { type: 'sensor_lte', target: 'T_1', expected: c.targetVal ?? 245.0 };
          if (c.conditionType === 'T_1_GTE') conditionObj = { type: 'sensor_gte', target: 'T_1', expected: c.targetVal ?? 285.0 };
          if (c.conditionType === 'L_1_LTE') conditionObj = { type: 'sensor_lte', target: 'L_1', expected: c.targetVal ?? 25.0 };
          if (c.conditionType === 'L_1_GTE') conditionObj = { type: 'sensor_gte', target: 'L_1', expected: c.targetVal ?? 20.0 };

          return {
            id: c.id || `step_${index + 1}`,
            title: c.title,
            hint_training: c.hint_training,
            hint_exam: c.hint_exam,
            condition: conditionObj,
          };
        }),
        golden_sequence: values.golden_sequence || [],
      };

      await createScenario(newScenario);
      message.success(`Сценарий '${newScenario.title}' успешно создан и добавлен в реестр КТК!`);
      await reloadScenarios();
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(`Ошибка создания сценария: ${e.message}`);
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
    } catch (e: any) {
      message.error(`Ошибка при импорте JSON: ${e.message}`);
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
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e6f7ff' }}>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span>Конструктор Учебных Сценариев АРМ Инструктора</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={780}
      destroyOnHidden
      style={{ top: 20 }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: '1',
            label: (
              <span>
                <FileTextOutlined /> Визуальный конструктор
              </span>
            ),
            children: (
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  T_1: 280,
                  P_1: 0.35,
                  L_1: 50,
                  T_1_Sp: 280,
                  V_1: true,
                  V_2: false,
                  V_3: true,
                  checklist: [
                    {
                      id: 'step_1',
                      title: '1. Перекрытие подачи сырья V-1',
                      hint_training: 'Переведите клапан V-1 в положение ЗАКРЫТО',
                      hint_exam: 'Отсечь подачу сырья в печь П-1.',
                      conditionType: 'V_1_CLOSE',
                    },
                  ],
                  golden_sequence: ['V1_CLOSE'],
                }}
                onFinish={handleVisualSubmit}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Form.Item name="id" label="ID Сценария (англ.)" rules={[{ required: true, message: 'Введите ID' }]}>
                    <Input placeholder="например: desalter_flush" />
                  </Form.Item>
                  <Form.Item name="title" label="Название Сценария" rules={[{ required: true, message: 'Введите название' }]}>
                    <Input placeholder="например: Промывка ЭЛОУ" />
                  </Form.Item>
                  <Form.Item name="short_name" label="Короткое имя (в меню)" rules={[{ required: true, message: 'Введите имя' }]}>
                    <Input placeholder="например: Промывка" />
                  </Form.Item>
                </div>

                <Form.Item name="description" label="Описание учебно-тренировочной задачи">
                  <Input.TextArea rows={2} placeholder="Опишите цель сценария для оператора..." />
                </Form.Item>

                <Card size="small" title="Начальные физические параметры симулятора" style={{ marginBottom: 16, background: '#141414' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <Form.Item name="T_1" label="Т-1 Печь (°C)">
                      <InputNumber min={20} max={500} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="P_1" label="P-1 Колонна (МПа)">
                      <InputNumber min={0.01} max={1.2} step={0.05} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="L_1" label="L-1 Уровень (%)">
                      <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="T_1_Sp" label="Уставка T_Sp (°C)">
                      <InputNumber min={20} max={400} style={{ width: '100%' }} />
                    </Form.Item>
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                    <Form.Item name="V_1" label="Задвижка V-1 (Сырьё)" valuePropName="checked">
                      <Switch checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
                    </Form.Item>
                    <Form.Item name="V_2" label="Сброс V-2 (Факел)" valuePropName="checked">
                      <Switch checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
                    </Form.Item>
                    <Form.Item name="V_3" label="Дренаж V-3 (Куб)" valuePropName="checked">
                      <Switch checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
                    </Form.Item>
                  </div>
                </Card>

                <Card size="small" title="Задачи и шаги Чек-листа" style={{ marginBottom: 16, background: '#141414' }}>
                  <Form.List name="checklist">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <div key={key} style={{ padding: 8, border: '1px solid #303030', borderRadius: 6, marginBottom: 8 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 8 }}>
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
                                <Select options={[
                                  { value: 'V_1_CLOSE', label: 'V-1 Закрыт' },
                                  { value: 'V_1_OPEN', label: 'V-1 Открыт' },
                                  { value: 'V_2_OPEN', label: 'V-2 Открыт' },
                                  { value: 'V_2_CLOSE', label: 'V-2 Закрыт' },
                                  { value: 'V_3_OPEN', label: 'V-3 Открыт' },
                                  { value: 'V_3_CLOSE', label: 'V-3 Закрыт' },
                                  { value: 'T_1_LTE', label: 'Температура Т-1 <= X °C' },
                                  { value: 'T_1_GTE', label: 'Температура Т-1 >= X °C' },
                                  { value: 'L_1_LTE', label: 'Уровень L-1 <= X %' },
                                  { value: 'L_1_GTE', label: 'Уровень L-1 >= X %' },
                                ]} />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'targetVal']}
                                label="Значение X"
                              >
                                <InputNumber placeholder="Число" style={{ width: '100%' }} />
                              </Form.Item>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 8 }}>
                              <Form.Item {...restField} name={[name, 'hint_training']} label="Подсказка (Режим Обучения)">
                                <Input placeholder="Подсказка с текущими датчиками..." />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'hint_exam']} label="Подсказка (Режим Экзамена ГОСТ)">
                                <Input placeholder="Технологическая формулировка техрегламента..." />
                              </Form.Item>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 16 }}>
                                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          Добавить шаг в чек-лист
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Card>

                <Form.Item name="golden_sequence" label="Эталонная последовательность действия (Golden Sequence для DTW)">
                  <Select
                    mode="tags"
                    placeholder="Выберите действия в порядке их выполнения..."
                    options={[
                      { value: 'V1_OPEN', label: 'V1_OPEN (Открыть сырье)' },
                      { value: 'V1_CLOSE', label: 'V1_CLOSE (Перекрыть сырье)' },
                      { value: 'V2_OPEN', label: 'V2_OPEN (Открыть сброс газа)' },
                      { value: 'V2_CLOSE', label: 'V2_CLOSE (Закрыть сброс газа)' },
                      { value: 'V3_OPEN', label: 'V3_OPEN (Открыть дренаж куба)' },
                      { value: 'V3_CLOSE', label: 'V3_CLOSE (Прекратить дренаж)' },
                      { value: 'SP_UP', label: 'SP_UP (Поднять температуру)' },
                      { value: 'SP_DOWN', label: 'SP_DOWN (Снизить температуру)' },
                      { value: 'ESD', label: 'ESD (Аварийный останов ПАЗ)' },
                    ]}
                  />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <Button onClick={onClose}>Отмена</Button>
                  <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
                    Сохранить сценарий в реестр КТК
                  </Button>
                </div>
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
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Upload beforeUpload={handleFileUpload} showUploadList={false} accept=".json">
                    <Button icon={<UploadOutlined />}>Загрузить JSON-файл сценария</Button>
                  </Upload>
                  <Button
                    onClick={() => {
                      const sample = {
                        scenario: initialValues,
                      };
                      setJsonText(JSON.stringify(sample, null, 2));
                    }}
                  >
                    Вставить шаблон JSON
                  </Button>
                </div>
                <Input.TextArea
                  rows={14}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Вставьте JSON-конфигурацию сценария..."
                  style={{ fontFamily: 'monospace', fontSize: 12, background: '#0a0a0a', color: '#52c41a' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <Button onClick={onClose}>Отмена</Button>
                  <Button type="primary" onClick={handleJsonSubmit} loading={loading} icon={<UploadOutlined />}>
                    Импортировать JSON
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: '3',
            label: <span>Управление реестром ({scenarios.length})</span>,
            children: (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {scenarios.map((s) => (
                  <Card
                    key={s.id}
                    size="small"
                    style={{ marginBottom: 8, background: '#141414' }}
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
                        ) : (
                          <span style={{ color: '#8c8c8c', fontSize: 12 }}>Встроенный техрегламент</span>
                        )}
                      </div>
                    }
                  >
                    <div style={{ fontWeight: 600, color: '#e6f7ff' }}>
                      {s.title} <span style={{ color: '#8c8c8c', fontWeight: 400 }}>[{s.id}]</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{s.description}</div>
                  </Card>
                ))}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};
