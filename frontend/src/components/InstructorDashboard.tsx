import React, { useEffect, useState, useRef } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Switch, Badge, Alert, Modal, message, Button } from 'antd';
import { ShieldCheck, Users, Play, AlertTriangle, LogOut, Trash2, Info, AlertOctagon } from 'lucide-react';
import { apiService, type Session } from '../services/api';
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
    resetSession,
    speedMultiplier,
    isPaused,
    hasSnapshot,
    changeSpeed,
    togglePause,
    saveState,
    loadState
  } = useSimulator();

  const [history, setHistory] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState(8);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const stretchCardRef = useRef<HTMLDivElement>(null);

  // Динамический расчет пагинации точно под высоту контейнера карточки (реагирует на зум и ресайз окна)
  useEffect(() => {
    const calculatePageSize = () => {
      const wrapper = tableContainerRef.current;
      if (!wrapper) return;
      
      const wrapperHeight = wrapper.clientHeight;
      if (wrapperHeight > 50) {
        const tableHeader = wrapper.querySelector('.ant-table-thead') as HTMLElement;
        const pagination = wrapper.querySelector('.ant-pagination') as HTMLElement;
        const firstRow = wrapper.querySelector('.ant-table-row') as HTMLElement;

        const headerHeight = tableHeader ? tableHeader.offsetHeight : 39;
        // Зарезервируем под пагинацию минимум 48px, даже если она сейчас скрыта
        const paginationHeight = pagination && pagination.offsetHeight > 0 ? pagination.offsetHeight : 48;
        const rowHeight = firstRow ? firstRow.offsetHeight : 37;

        const safetyMargin = 16;
        const availableRowHeight = wrapperHeight - headerHeight - paginationHeight - safetyMargin;
        const calculated = Math.max(1, Math.floor(availableRowHeight / rowHeight));
        
        console.log('Dynamic pagination calculation:', {
          wrapperHeight,
          headerHeight,
          paginationHeight,
          rowHeight,
          availableRowHeight,
          calculated
        });

        setPageSize((prev) => (prev !== calculated ? calculated : prev));
      }
    };

    calculatePageSize();
    const timer = setTimeout(calculatePageSize, 150);

    const observer = new ResizeObserver(() => {
      calculatePageSize();
    });
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current);
    }
    if (stretchCardRef.current) {
      observer.observe(stretchCardRef.current);
    }

    window.addEventListener('resize', calculatePageSize);
    window.visualViewport?.addEventListener('resize', calculatePageSize);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', calculatePageSize);
      window.visualViewport?.removeEventListener('resize', calculatePageSize);
    };
  }, []);

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

              <S.ControlRow style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <S.ScenarioLabel style={{ marginBottom: 0 }}>
                  Управление временем симуляции:
                </S.ScenarioLabel>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button 
                    type={isPaused ? "primary" : "default"} 
                    danger={isPaused}
                    onClick={() => togglePause(!isPaused)}
                    style={{ flex: 1, height: '32px', fontSize: '12px' }}
                  >
                    {isPaused ? "Продолжить" : "Пауза"}
                  </Button>
                  <Button 
                    type={speedMultiplier === 1 ? "primary" : "default"}
                    onClick={() => changeSpeed(1.0)}
                    style={{ width: '45px', height: '32px', padding: 0 }}
                  >
                    1x
                  </Button>
                  <Button 
                    type={speedMultiplier === 2 ? "primary" : "default"}
                    onClick={() => changeSpeed(2.0)}
                    style={{ width: '45px', height: '32px', padding: 0 }}
                  >
                    2x
                  </Button>
                </div>
              </S.ControlRow>

              <S.ControlRow style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <S.ScenarioLabel style={{ marginBottom: 0 }}>
                  Контрольные точки (Снапшоты):
                </S.ScenarioLabel>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button 
                    onClick={saveState}
                    style={{ flex: 1, height: '32px', fontSize: '12px' }}
                  >
                    Сделать снимок
                  </Button>
                  <Button 
                    disabled={!hasSnapshot}
                    onClick={loadState}
                    type="dashed"
                    style={{ flex: 1, height: '32px', fontSize: '12px' }}
                  >
                    Откатиться
                  </Button>
                </div>
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
              <Switch size="small" checked={defects.pump_fail} onChange={v => handleDefectChange('pump_fail', v)} />
            </S.DefectRow>

            <S.DefectRow>
              <S.DefectInfo>
                <span className="title">Прогар змеевика печи П-1</span>
                <span className="desc">Неконтролируемый перегрев труб печи П-1, угроза пожара (п. 7.9.7).</span>
              </S.DefectInfo>
              <Switch size="small" checked={defects.coil_overheat} onChange={v => handleDefectChange('coil_overheat', v)} />
            </S.DefectRow>

            <S.DefectRow>
              <S.DefectInfo>
                <span className="title">Зависание клапана сброса V-2</span>
                <span className="desc">Клапан V-2 блокируется в закрытом состоянии. Угроза взрыва К-1.</span>
              </S.DefectInfo>
              <Switch size="small" checked={defects.valve_jam} onChange={v => handleDefectChange('valve_jam', v)} />
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
                <S.SensorValue isAlert={sensors.T_1 > 310}>
                  {sensors.T_1} °C
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">P-1 (Колонна)</span>
                <S.SensorValue isAlert={sensors.P_1 > 0.4}>
                  {sensors.P_1} МПа
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">L-1 (Уровень)</span>
                <S.SensorValue isAlert={false} isWarning={sensors.L_1 > 80 || sensors.L_1 < 20}>
                  {sensors.L_1} %
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
                <S.ColoredValue color={valves.V_1 ? '#00ff66' : '#ff3333'}>
                  {valves.V_1 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
              <div>
                Клапан V-2 (Сброс):{' '}
                <S.ColoredValue color={valves.V_2 ? '#00ff66' : '#ff3333'}>
                  {valves.V_2 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
              <div>
                Клапан V-3 (Дренаж):{' '}
                <S.ColoredValue color={valves.V_3 ? '#00ff66' : '#ff3333'}>
                  {valves.V_3 ? 'ОТКР' : 'ЗАКР'}
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
            ref={stretchCardRef}
            title={
              <S.TableCardTitle>
                <span className="main-title">Защищенная база результатов обучения (К8: ИБ)</span>
                <span className="sub-hint">(нажмите на строку для просмотра детального отчета)</span>
              </S.TableCardTitle>
            }
            extra={
              <Button size="small" type="primary" danger icon={<Trash2 size={12} />} onClick={handleClearHistory}>
                Очистить
              </Button>
            }
          >
            <S.TableWrapper ref={tableContainerRef}>
              <S.StyledTable
                dataSource={history}
                columns={columns as any}
                rowKey="id"
                pagination={{ pageSize, showSizeChanger: false, hideOnSinglePage: true }}
                size="small"
                onRow={(record) => {
                  return {
                    onClick: () => {
                      setSelectedSession(record as Session);
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
