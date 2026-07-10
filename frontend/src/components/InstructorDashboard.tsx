import React, { useEffect, useState, useRef } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Switch, Badge, Alert, Radio, Modal, message } from 'antd';
import { ShieldCheck, Users, Play, AlertTriangle, LogOut, Trash2, Info, AlertOctagon } from 'lucide-react';
import { apiService, Session } from '../services/api';
import { getTableColumns, SCENARIO_NAMES } from './InstructorDashboard.config';
import * as S from './InstructorDashboard.styles';

const InstructorDashboard: React.FC = () => {
  const { 
    isOnline, 
    wsLatency, 
    username, 
    operatorName, 
    scenarioId, 
    selectScenario, 
    sensors, 
    valves, 
    status, 
    defects, 
    triggerDefect, 
    logs, 
    riskLevel, 
    accidentReason,
    logoutUser, 
    resetSession 
  } = useSimulator();

  const [history, setHistory] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState(4);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Загружаем историю тренировок через API сервис
  const fetchHistory = async () => {
    try {
      const data = await apiService.fetchSessions();
      setHistory(data);
    } catch {
      console.warn('Не удалось загрузить историю с бэкенда.');
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000); // Раз в 30 секунд
    return () => clearInterval(interval);
  }, []);

  // Моментально обновляем историю при завершении сессии
  useEffect(() => {
    if (status === 'success' || status === 'accident' || status === 'esd') {
      fetchHistory();
    }
  }, [status]);

  // ResizeObserver для автоматического расчета количества строк в таблице
  useEffect(() => {
    if (!tableContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = entry.contentRect.height;
        // Высота шапки таблицы ~39px, пагинация ~56px, небольшие отступы ~10px
        const availableHeight = height - 39 - 56 - 10;
        const calculatedPageSize = Math.max(2, Math.floor(availableHeight / 37));
        setPageSize(calculatedPageSize);
      }
    });
    resizeObserver.observe(tableContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleDefectChange = (defectId: 'pump_fail' | 'coil_overheat' | 'valve_jam', checked: boolean) => {
    triggerDefect(defectId, checked);
    message.info(`Неисправность "${defectId}" -> ${checked ? 'АКТИВИРОВАНА' : 'ОТКЛЮЧЕНА'}`);
  };

  const handleClearHistory = () => {
    Modal.confirm({
      title: 'Вы уверены, что хотите очистить всю историю обучения?',
      content: 'Это действие необратимо и приведет к удалению всех записей из базы данных.',
      okText: 'Да, очистить',
      okType: 'danger',
      cancelText: 'Отмена',
      centered: true,
      onOk: async () => {
        try {
          await apiService.clearSessions();
          message.success('История учебных сессий успешно очищена.');
          fetchHistory();
        } catch {
          message.error('Ошибка при очистке истории.');
        }
      }
    });
  };

  const getStatusBadge = (s: string) => {
    if (s === 'running') return <Badge status="processing" text="Работа" style={{ color: '#00ff66' }} />;
    if (s === 'esd') return <Badge status="warning" text="Аварийный Останов" style={{ color: '#ffcc00' }} />;
    if (s === 'accident') return <Badge status="error" text="АВАРИЯ" style={{ color: '#ff3333' }} />;
    return <Badge status="default" text="Пауза" style={{ color: '#7c8ba1' }} />;
  };

  const columns = getTableColumns();

  return (
    <S.Container>
      <S.Header>
        <S.Title>Панель Инструктора // Контроль КТК</S.Title>
        <S.HeaderRight>
          <S.ConnectedBadge>
            <Users size={14} color="#ffcc00" />
            Инструктор: <strong>{username}</strong>
            <S.ConnectedBadgeStatus active={isOnline}>
              ({isOnline ? `Online, ping ${wsLatency}ms` : 'Offline'})
            </S.ConnectedBadgeStatus>
          </S.ConnectedBadge>
          <S.ConnectedBadge>
            <Users size={14} color="#00e5ff" />
            Оператор: <S.ConnectedOperatorName connected={!!operatorName}>{operatorName || 'Не подключен'}</S.ConnectedOperatorName>
          </S.ConnectedBadge>
          <S.LogoutButton 
            onClick={logoutUser} 
            icon={<LogOut size={12} />} 
            type="primary" 
            danger
          >
            Выход
          </S.LogoutButton>
        </S.HeaderRight>
      </S.Header>

      <S.Content>
        {/* Левая колонка: Управление сценариями и неисправностями */}
        <S.PanelColumn>
          {/* Контроль сессии */}
          <S.StyledCard title="Управление Учебным Процессом">
            <S.ProcessControlLayout>
              <div>
                <S.ScenarioLabel>
                  Выбор учебного сценария:
                </S.ScenarioLabel>
                <S.ScenarioRadioGroup 
                  value={scenarioId} 
                  onChange={e => selectScenario(e.target.value)}
                >
                  <S.ScenarioRadioButton value="startup">Пуск установки ЭЛОУ-АВТ</S.ScenarioRadioButton>
                  <S.ScenarioRadioButton value="shutdown">Аварийный останов печи П-1</S.ScenarioRadioButton>
                  <S.ScenarioRadioButton value="column_shutdown">Останов колонны К-1</S.ScenarioRadioButton>
                  <S.ScenarioRadioButton value="overpressure_relief">Ликвидация роста давления</S.ScenarioRadioButton>
                  <S.ScenarioRadioButton value="recirculation" fullWidth>Перевод на рециркуляцию</S.ScenarioRadioButton>
                </S.ScenarioRadioGroup>
              </div>
              <S.ControlRow>
                <S.FullWidthButton onClick={resetSession} type="primary" icon={<Play size={14} />}>
                  Перезапустить сессию
                </S.FullWidthButton>
              </S.ControlRow>
            </S.ProcessControlLayout>
          </S.StyledCard>

          {/* Инъекция неисправностей */}
          <S.StyledCard title="Внедрение нештатных ситуаций (Слайд 11 КТК)">
            <S.DefectRow>
              <S.DefectInfo>
                <span className="title">Отказ сырьевого насоса Н-1</span>
                <span className="desc">Прекращает подачу сырья. Угроза коксования печи П-1 (п. 7.9.1 техрегламента).</span>
              </S.DefectInfo>
              <Switch checked={defects.pump_fail} onChange={v => handleDefectChange('pump_fail', v)} />
            </S.DefectRow>

            <S.DefectRow>
              <S.DefectInfo>
                <span className="title">Прогар змеевика печи П-1</span>
                <span className="desc">Неконтролируемый перегрев труб печи П-1, угроза пожара (п. 7.9.7).</span>
              </S.DefectInfo>
              <Switch checked={defects.coil_overheat} onChange={v => handleDefectChange('coil_overheat', v)} />
            </S.DefectRow>

            <S.DefectRow>
              <S.DefectInfo>
                <span className="title">Зависание клапана сброса V-2</span>
                <span className="desc">Клапан V-2 блокируется в закрытом состоянии. Угроза взрыва К-1.</span>
              </S.DefectInfo>
              <Switch checked={defects.valve_jam} onChange={v => handleDefectChange('valve_jam', v)} />
            </S.DefectRow>
          </S.StyledCard>

          {/* Журнал аудита действий оператора */}
          <S.StretchCard title="Мониторинг журнала событий">
            <S.LogArea>
              {logs.map(log => {
                const Icon = log.type === 'error' ? AlertOctagon : log.type === 'warning' ? AlertTriangle : Info;
                const iconColor = log.type === 'error' ? '#ff3333' : log.type === 'warning' ? '#ffcc00' : '#00e5ff';
                return (
                  <S.LogRow key={log.id} type={log.type}>
                    <S.LogTime>[{log.time}]</S.LogTime>
                    <S.LogIconWrapper>
                      <Icon size={12} color={iconColor} />
                    </S.LogIconWrapper>
                    <span>{log.message}</span>
                  </S.LogRow>
                );
              })}
            </S.LogArea>
          </S.StretchCard>
        </S.PanelColumn>

        {/* Правая колонка: Мониторинг в реальном времени и история сессий */}
        <S.PanelColumn>
          {/* Панель живого мониторинга */}
          <S.StyledCard title="Текущие показатели оператора (Live telemetry)">
            <S.MonitorRow>
              <S.MonitorItem>
                <span className="lbl">Т-1 (Печь)</span>
                <S.SensorValue isAlert={sensors.furnaceTemp > 310}>
                  {sensors.furnaceTemp} °C
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">P-1 (Колонна)</span>
                <S.SensorValue isAlert={sensors.columnPres > 0.4}>
                  {sensors.columnPres} МПа
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">L-1 (Уровень)</span>
                <S.SensorValue isAlert={false} isWarning={sensors.columnLevel > 80 || sensors.columnLevel < 20}>
                  {sensors.columnLevel} %
                </S.SensorValue>
              </S.MonitorItem>
            </S.MonitorRow>

            <S.LiveTelemetryGrid>
              <S.LiveTelemetrySpan span={1}>Статус: {getStatusBadge(status)}</S.LiveTelemetrySpan>
              <S.LiveTelemetrySpan span={2}>
                Риск аварии (ИИ):{' '}
                <S.ColoredValue color={riskLevel > 70 ? '#ff3333' : '#00ff66'}>
                  {riskLevel}%
                </S.ColoredValue>
              </S.LiveTelemetrySpan>
              <div>
                Клапан V-1 (Сырье):{' '}
                <S.ColoredValue color={valves.V1 ? '#00ff66' : '#ff3333'}>
                  {valves.V1 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
              <div>
                Клапан V-2 (Сброс):{' '}
                <S.ColoredValue color={valves.V2 ? '#00ff66' : '#ff3333'}>
                  {valves.V2 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
              <div>
                Клапан V-3 (Дренаж):{' '}
                <S.ColoredValue color={valves.V3 ? '#00ff66' : '#ff3333'}>
                  {valves.V3 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
            </S.LiveTelemetryGrid>

            {status === 'accident' && (
              <S.AlertContainer>
                <Alert 
                  type="error" 
                  showIcon 
                  icon={<AlertTriangle size={14} />} 
                  message="АВАРИЯ НА УСТАНОВКЕ!" 
                  description={accidentReason}
                />
              </S.AlertContainer>
            )}
          </S.StyledCard>

          {/* База данных оценок с контролем целостности */}
          <S.StretchCard 
            title="Защищенная база результатов обучения (К8: ИБ)" 
            extra={
              <Button size="small" type="primary" danger icon={<Trash2 size={12} />} onClick={handleClearHistory}>
                Очистить
              </Button>
            }
          >
            <S.TableWrapper ref={tableContainerRef}>
              <S.StyledTable
                dataSource={history}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize, showSizeChanger: false }}
                size="small"
                onRow={(record) => {
                  return {
                    onClick: () => {
                      setSelectedSession(record);
                      setIsModalVisible(true);
                    }
                  };
                }}
              />
            </S.TableWrapper>
          </S.StretchCard>
        </S.PanelColumn>
      </S.Content>

      <Modal
        title={
          <S.ModalTitle>
            <ShieldCheck size={18} color="#00ff66" />
            Детальный отчет по сессии №{selectedSession?.id}
          </S.ModalTitle>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        centered={true}
        footer={[
          <S.CloseButton key="close" type="primary" onClick={() => setIsModalVisible(false)}>
            Закрыть
          </S.CloseButton>
        ]}
        width={750}
        styles={S.modalStyles}
      >
        {selectedSession && (
          <div>
            <S.ModalBodyContainer>
              <div>Оператор: <strong>{selectedSession.operator_name}</strong></div>
              <div>Сценарий: <strong>{SCENARIO_NAMES[selectedSession.scenario_id] || selectedSession.scenario_id}</strong></div>
              <div>Время сессии: <strong>{Math.floor(selectedSession.duration_sec / 60)}м {selectedSession.duration_sec % 60}с</strong></div>
              <div>
                Итоговая оценка:{' '}
                <S.ColoredValue color={selectedSession.score >= 85 ? '#00ff66' : selectedSession.score >= 70 ? '#0070f3' : selectedSession.score >= 50 ? '#ffcc00' : '#ff3333'}>
                  {selectedSession.score}%
                </S.ColoredValue>
              </div>
              <div>Статус: <strong>{selectedSession.status === 'accident' ? 'Авария' : selectedSession.status === 'esd' ? 'Аварийный Останов' : 'Успешно сдано'}</strong></div>
              <div>
                ИБ Целостность:{' '}
                <S.ColoredValue color={selectedSession.integrity_valid ? '#00ff66' : '#ff3333'}>
                  {selectedSession.integrity_valid ? 'Валидна' : 'Нарушена!'}
                </S.ColoredValue>
              </div>
            </S.ModalBodyContainer>
            
            <S.ModalSection>
              <S.SectionTitle>Зафиксированные нарушения регламента:</S.SectionTitle>
              {selectedSession.violations && selectedSession.violations.length > 0 ? (
                selectedSession.violations.map((v: any) => (
                  <S.ViolationCard key={v.title}>
                    <S.ViolationHeader>{v.title} ({v.clause})</S.ViolationHeader>
                    <S.ViolationText>{v.text}</S.ViolationText>
                  </S.ViolationCard>
                ))
              ) : (
                <S.NoViolationsText>Нарушений требований ТБ/ИБ не обнаружено.</S.NoViolationsText>
              )}
            </S.ModalSection>

            <div>
              <S.SectionTitle>Журнал действий оператора:</S.SectionTitle>
              <S.SessionLogBox>
                {selectedSession.session_logs && selectedSession.session_logs.length > 0 ? (
                  selectedSession.session_logs.map((log: any) => (
                    <S.SessionLogRow key={log.id} type={log.type}>
                      [{log.time}] {log.message}
                    </S.SessionLogRow>
                  ))
                ) : (
                  <S.ArchiveMessage>
                    {selectedSession.id <= 13 ? "Логи отсутствуют (архивная сессия до миграции БД)" : "Журнал логов пуст."}
                  </S.ArchiveMessage>
                )}
              </S.SessionLogBox>
            </div>
          </div>
        )}
      </Modal>
    </S.Container>
  );
};

export default InstructorDashboard;
