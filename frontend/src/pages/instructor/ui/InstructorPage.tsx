import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useTheme, type DefaultTheme } from 'styled-components';
import { Switch, Alert, Modal, Button, App } from 'antd';
import { ShieldCheck, Users, Play, AlertTriangle, LogOut, Trash2, Info, AlertOctagon } from 'lucide-react';
import { fetchSystemMetrics, type SystemMetrics } from '@/shared/api';
import { useTelemetry, sendAlarmFeedback, type DefectId } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { ThemeToggle } from '@/shared/ui';
import { K2_LEVEL_HIGH, K2_LEVEL_LOW } from '@/shared/config';
import {
  fetchTrainingRecords,
  fetchActiveSessions as fetchActiveSessionsApi,
  clearTrainingRecords,
  type TrainingRecord,
  type ActiveSession,
} from '@/entities/training-record';

import { getTableColumns, SCENARIO_NAMES, SCENARIO_SHORT_NAMES } from '../model/tableColumns';

/**
 * Конструктор сценариев тянет за собой формы, загрузку файлов и вкладки antd,
 * а открывается по кнопке и далеко не в каждой сессии — грузим по требованию.
 */
const ScenarioBuilderModal = lazy(() =>
  import('@/widgets/scenario-builder').then(m => ({ default: m.ScenarioBuilderModal })),
);
import * as S from './InstructorPage.styles';

const getStatusBadge = (s: string, colors: DefaultTheme['colors']) => {
  if (s === 'running') return <S.StatusBadge status="processing" text="Работа" $color={colors.success} />;
  if (s === 'esd') return <S.StatusBadge status="warning" text="Аварийный останов" $color={colors.warning} />;
  if (s === 'accident') return <S.StatusBadge status="error" text="Авария" $color={colors.danger} />;
  return <S.StatusBadge status="default" text="Пауза" $color={colors.offline} />;
};

const InstructorPage: React.FC = () => {
  const theme = useTheme();
  const { message, modal } = App.useApp();
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const { sensors, valves, status, defects, logs, riskLevel, accidentReason, wsLatency } = useTelemetry();
  const {
    isOnline,
    username,
    scenarioId,
    scenarios,
    activeSessionId,
    mode,
    speedMultiplier,
    isPaused,
    hasSnapshot,
  } = useSession();
  const {
    switchSession,
    selectMode,
    selectScenario,
    triggerDefect,
    logoutUser,
    resetSession,
    changeSpeed,
    togglePause,
    saveState,
    loadState,
  } = useSimulatorActions();

  const [history, setHistory] = useState<TrainingRecord[]>([]);
  // null = данные ещё не загружались (отличаем от подтверждённо пустого списка)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[] | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingRecord | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Оценка сработавших алармов инструктором (GAP-6: Closed Loop Feedback)
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, 'confirmed' | 'false_alarm'>>({});
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
      const data = await fetchTrainingRecords();
      setHistory(data);
    } catch {
      console.warn('Не удалось загрузить историю с бэкенда.');
    }
  };

  // Загружаем активные сессии операторов
  const fetchActiveSessions = async () => {
    try {
      const data = await fetchActiveSessionsApi();
      setActiveSessions(data);
    } catch {
      // Игнорируем в автономном режиме
    }
  };

  // Автоподключение инструктора к первому доступному оператору — по свежим данным
  useEffect(() => {
    if (activeSessions === null) return;
    if (activeSessions.length > 0) {
      const isCurrentValid = activeSessions.some(s => s.session_id === activeSessionId);
      if (!isCurrentValid || activeSessionId === 'default_session') {
        switchSession(activeSessions[0].session_id);
      }
    } else if (activeSessionId !== 'default_session') {
      switchSession('default_session');
    }
  }, [activeSessions, activeSessionId, switchSession]);

  // Метрики сервера (Критерий 1: производительность и наблюдаемость)
  const fetchMetrics = async () => {
    try {
      const data = await fetchSystemMetrics();
      setMetrics(data);
    } catch {
      setMetrics(null);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchActiveSessions();
    fetchMetrics();
    const interval = setInterval(() => {
      fetchHistory();
      fetchActiveSessions();
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Моментально обновляем историю при завершении сессии
  useEffect(() => {
    if (status === 'success' || status === 'accident' || status === 'esd') {
      fetchHistory();
    }
  }, [status]);

  const handleDefectChange = (defectId: DefectId, checked: boolean) => {
    triggerDefect(defectId, checked);
    message.info(`Неисправность "${defectId}" -> ${checked ? 'АКТИВИРОВАНА' : 'ОТКЛЮЧЕНА'}`);
  };

  // Разметка сработавшего аларма: обучающая обратная связь для ИИ-детектора
  const handleAlarmFeedback = async (logId: string, fbType: 'confirmed' | 'false_alarm') => {
    try {
      await sendAlarmFeedback(logId, fbType);
      setFeedbackStatus(prev => ({ ...prev, [logId]: fbType }));
    } catch {
      message.error('Не удалось отправить оценку аларма.');
    }
  };

  const handleClearHistory = () => {
    modal.confirm({
      title: 'Вы уверены, что хотите очистить всю историю обучения?',
      content: 'Это действие необратимо и приведет к удалению всех записей из базы данных.',
      okText: 'Да, очистить',
      okType: 'danger',
      cancelText: 'Отмена',
      centered: true,
      onOk: async () => {
        try {
          await clearTrainingRecords();
          message.success('История учебных сессий успешно очищена.');
          fetchHistory();
        } catch {
          message.error('Ошибка при очистке истории.');
        }
      }
    });
  };



  const columns = getTableColumns();
  const criticalAlarmCount = logs.filter(log => log.type === 'error').length;
  const warningAlarmCount = logs.filter(log => log.type === 'warning').length;

  const alarmLogContent = (
    <S.LogArea>
      {logs.map(log => {
        const Icon = log.type === 'error' ? AlertOctagon : log.type === 'warning' ? AlertTriangle : Info;
        const iconColor = log.type === 'error' ? theme.colors.danger : log.type === 'warning' ? theme.colors.warning : theme.colors.primary;
        const isAlarm = log.type === 'error' || log.type === 'warning';
        const fb = feedbackStatus[String(log.id)];
        return (
          <S.LogRow key={log.id} type={log.type}>
            <S.LogTime>[{log.time}]</S.LogTime>
            <S.LogIconWrapper>
              <Icon size={12} color={iconColor} />
            </S.LogIconWrapper>
            <span>
              {log.message}
              {isAlarm && (
                fb ? (
                  <S.FeedbackBadge $fbType={fb}>
                    {fb === 'confirmed' ? '✅ Подтверждён' : '❌ Ложная тревога'}
                  </S.FeedbackBadge>
                ) : (
                  <S.FeedbackWrapper>
                    <S.FeedbackActionBtn
                      $fbType="confirm"
                      title="Подтвердить корректность срабатывания"
                      onClick={() => handleAlarmFeedback(String(log.id), 'confirmed')}
                    >
                      ✅
                    </S.FeedbackActionBtn>
                    <S.FeedbackActionBtn
                      $fbType="reject"
                      title="Отметить как ложную тревогу"
                      onClick={() => handleAlarmFeedback(String(log.id), 'false_alarm')}
                    >
                      ❌
                    </S.FeedbackActionBtn>
                  </S.FeedbackWrapper>
                )
              )}
            </span>
          </S.LogRow>
        );
      })}
    </S.LogArea>
  );

  return (
    <S.Container>
      <S.Header>
        <S.Title>КТК ЭЛОУ-АВТ <span>Рабочее место инструктора</span></S.Title>
        <S.HeaderRight>
          <S.ConnectedBadge>
            <Users size={14} />
            Инструктор: <strong>{username}</strong>
            <S.ConnectedBadgeStatus $active={isOnline}>
              ({isOnline ? `Online, ping ${wsLatency}ms` : 'Offline'})
            </S.ConnectedBadgeStatus>
          </S.ConnectedBadge>
          <S.ConnectedBadge>
            <Users size={14} />
            Сессия оператора:
            <S.SessionSelect
              size="small"
              value={activeSessionId}
              onChange={(value: unknown) => switchSession(value as string)}
              popupMatchSelectWidth={false}
              options={
                activeSessions && activeSessions.length > 0
                  ? activeSessions.map(s => ({
                      value: s.session_id,
                      label: `${s.operator_name} [${SCENARIO_SHORT_NAMES[s.scenario_id] || s.scenario_id}]`
                    }))
                  : [{ value: 'default_session', label: 'Ожидание оператора...' }]
              }
            />
          </S.ConnectedBadge>
          <ThemeToggle />
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
          <S.TopCardsRow>
            {/* Контроль сессии */}
            <S.StyledCard title="Управление учебным процессом">
              <S.ProcessControlLayout>
                <div>
                  <S.ScenarioLabel>
                    Режим работы тренажёра:
                  </S.ScenarioLabel>
                  <S.ScenarioRadioGroupWithMargin 
                    value={mode} 
                    onChange={e => selectMode(e.target.value as 'training' | 'exam')}
                  >
                    <S.ScenarioRadioButton value="training">Обучение с подсказками</S.ScenarioRadioButton>
                    <S.ScenarioRadioButton value="exam">Экзамен по регламенту</S.ScenarioRadioButton>
                  </S.ScenarioRadioGroupWithMargin>
                </div>

                <div>
                  <S.ScenarioHeading>
                    <S.ScenarioLabel>
                      Выбор учебного сценария:
                    </S.ScenarioLabel>
                    <S.BuilderButton
                      type="dashed" 
                      size="small" 
                      onClick={() => setIsBuilderModalOpen(true)}
                    >
                      Конструктор сценария
                    </S.BuilderButton>
                  </S.ScenarioHeading>
                  <S.ScenarioRadioGroup 
                    value={scenarioId} 
                    onChange={e => selectScenario(e.target.value)}
                  >
                    {scenarios.length > 0 ? (
                      scenarios.map(s => (
                        <S.ScenarioRadioButton key={s.id} value={s.id}>
                          {s.title} {s.is_custom ? ' [Кастомный]' : ''}
                        </S.ScenarioRadioButton>
                      ))
                    ) : (
                      <>
                        <S.ScenarioRadioButton value="startup">Пуск установки ЭЛОУ-АВТ</S.ScenarioRadioButton>
                        <S.ScenarioRadioButton value="shutdown">Аварийный останов печи П-1</S.ScenarioRadioButton>
                        <S.ScenarioRadioButton value="column_shutdown">Останов колонны К-1</S.ScenarioRadioButton>
                        <S.ScenarioRadioButton value="overpressure_relief">Ликвидация роста давления</S.ScenarioRadioButton>
                        <S.ScenarioRadioButton value="recirculation" $fullWidth>Перевод на рециркуляцию</S.ScenarioRadioButton>
                      </>
                    )}
                  </S.ScenarioRadioGroup>
                </div>

                <S.ControlRow>
                  <S.FullWidthButton onClick={resetSession} type="primary" icon={<Play size={14} />}>
                    Перезапустить сессию
                  </S.FullWidthButton>
                </S.ControlRow>

                <S.TimeControlRow>
                  <S.CompactScenarioLabel>
                    Управление временем симуляции:
                  </S.CompactScenarioLabel>
                  <S.FlexRow>
                    <S.ActionButton 
                      type={isPaused ? "primary" : "default"} 
                      danger={isPaused}
                      onClick={() => togglePause(!isPaused)}
                    >
                      {isPaused ? "Продолжить" : "Пауза"}
                    </S.ActionButton>
                    <S.SpeedButton 
                      type={speedMultiplier === 1 ? "primary" : "default"}
                      onClick={() => changeSpeed(1.0)}
                    >
                      1x
                    </S.SpeedButton>
                    <S.SpeedButton 
                      type={speedMultiplier === 2 ? "primary" : "default"}
                      onClick={() => changeSpeed(2.0)}
                    >
                      2x
                    </S.SpeedButton>
                  </S.FlexRow>
                </S.TimeControlRow>

                <S.SnapshotControlRow>
                  <S.CompactScenarioLabel>
                    Контрольные точки (Снапшоты):
                  </S.CompactScenarioLabel>
                  <S.FlexRow>
                    <S.ActionButton 
                      onClick={saveState}
                    >
                      Сделать снимок
                    </S.ActionButton>
                    <S.ActionButton 
                      disabled={!hasSnapshot}
                      onClick={loadState}
                      type="dashed"
                    >
                      Откатиться
                    </S.ActionButton>
                  </S.FlexRow>
                </S.SnapshotControlRow>
              </S.ProcessControlLayout>
            </S.StyledCard>

            {/* Инъекция неисправностей */}
            <S.StyledCard title="Внедрение нештатных ситуаций">
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

              <S.DefectRow>
                <S.DefectInfo>
                  <span className="title">Отказ электроснабжения (power_fail)</span>
                  <span className="desc">Останов всех насосов и падение уставки горелок П-1 до 20°C.</span>
                </S.DefectInfo>
                <Switch size="small" checked={defects.power_fail} onChange={v => handleDefectChange('power_fail', v)} />
              </S.DefectRow>

              <S.DefectRow>
                <S.DefectInfo>
                  <span className="title">Отказ воздуха КИПиА (air_fail)</span>
                  <span className="desc">Клапаны V-1 и V-3 закрываются в безопасное положение, V-2 блокируется.</span>
                </S.DefectInfo>
                <Switch size="small" checked={defects.air_fail} onChange={v => handleDefectChange('air_fail', v)} />
              </S.DefectRow>

              <S.DefectRow>
                <S.DefectInfo>
                  <span className="title">Срыв подачи отпарного пара (steam_fail)</span>
                  <span className="desc">Нарушение отпарки в стриппинге, рост давления P-1 и уровня L-1.</span>
                </S.DefectInfo>
                <Switch size="small" checked={defects.steam_fail} onChange={v => handleDefectChange('steam_fail', v)} />
              </S.DefectRow>

              <S.DefectRow>
                <S.DefectInfo>
                  <span className="title">Нарушение обессоливания ЭЛОУ (elou_desalt_fail)</span>
                  <span className="desc">Проскок солей и воды из блока ЭЛОУ (п. 3.2 техрегламента). Рост Sal-1 и W-1, угроза коррозии колонны К-1.</span>
                </S.DefectInfo>
                <Switch size="small" checked={defects.elou_desalt_fail} onChange={v => handleDefectChange('elou_desalt_fail', v)} />
              </S.DefectRow>

              <S.DefectRow>
                <S.DefectInfo>
                  <span className="title">Срыв вакуума блока ВТ (vt_vacuum_loss)</span>
                  <span className="desc">Отказ пароэжекторной установки. Рост остаточного давления P-vac и перегрев куба К-2.</span>
                </S.DefectInfo>
                <Switch size="small" checked={defects.vt_vacuum_loss} onChange={v => handleDefectChange('vt_vacuum_loss', v)} />
              </S.DefectRow>
              <S.DefectRow>
                <S.DefectInfo>
                  <span className="title">Отказ насосов К-2 Н-4/Н-32 (k2_pump_fail)</span>
                  <span className="desc">Прекращение откачки мазута. Через 45 секунд уровень L-2 начинает расти с расчётной скоростью.</span>
                </S.DefectInfo>
                <Switch size="small" checked={defects.k2_pump_fail} onChange={v => handleDefectChange('k2_pump_fail', v)} />
              </S.DefectRow>
            </S.StyledCard>
          </S.TopCardsRow>

        </S.PanelColumn>

        {/* Правая колонка: Мониторинг в реальном времени и история сессий */}
        <S.PanelColumn>
          {/* Панель живого мониторинга */}
          <S.StyledCard title="Оперативные параметры оператора">
            <S.MonitorRow>
              <S.MonitorItem>
                <span className="lbl">Т-1 (Печь)</span>
                <S.SensorValue $isAlert={sensors.T_1 > 310}>
                  {sensors.T_1} °C
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">P-1 (Колонна)</span>
                <S.SensorValue $isAlert={sensors.P_1 > 0.4}>
                  {sensors.P_1} МПа
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">L-1 (Уровень)</span>
                <S.SensorValue $isAlert={false} $isWarning={sensors.L_1 > 80 || sensors.L_1 < 20}>
                  {sensors.L_1} %
                </S.SensorValue>
              </S.MonitorItem>
              <S.MonitorItem>
                <span className="lbl">L-2 (Куб К-2)</span>
                <S.SensorValue
                  $isAlert={false}
                  $isWarning={sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW}
                >
                  {sensors.L_2} %
                </S.SensorValue>
              </S.MonitorItem>
            </S.MonitorRow>


            <S.LiveTelemetryGrid>
              <S.LiveTelemetrySpan span={1}>Статус: {getStatusBadge(status, theme.colors)}</S.LiveTelemetrySpan>
              <S.LiveTelemetrySpan span={2}>
                Расчётный риск аварии:{' '}
                <S.ColoredValue color={riskLevel > 70 ? theme.colors.danger : theme.colors.success}>
                  {riskLevel}%
                </S.ColoredValue>
              </S.LiveTelemetrySpan>
              <div>
                Клапан V-1 (Сырье):{' '}
                <S.ColoredValue color={valves.V_1 ? theme.colors.success : theme.colors.textMuted}>
                  {valves.V_1 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
              <div>
                Клапан V-2 (Сброс):{' '}
                <S.ColoredValue color={valves.V_2 ? theme.colors.success : theme.colors.textMuted}>
                  {valves.V_2 ? 'ОТКР' : 'ЗАКР'}
                </S.ColoredValue>
              </div>
              <div>
                Клапан V-3 (Дренаж):{' '}
                <S.ColoredValue color={valves.V_3 ? theme.colors.success : theme.colors.textMuted}>
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
                  title="АВАРИЯ НА УСТАНОВКЕ!"
                  description={accidentReason}
                />
              </S.AlertContainer>
            )}
          </S.StyledCard>

          {/* Метрики сервера: наблюдаемость и производительность (К1) */}
          <S.StyledCard title="Состояние серверных служб">
            {metrics ? (
              <S.MetricsGrid>
                <S.MetricItem $isAlert={metrics.cpu_percent > 85}>
                  <span className="lbl">CPU</span>
                  <span className="val">{metrics.cpu_percent.toFixed(1)}%</span>
                </S.MetricItem>
                <S.MetricItem $isAlert={metrics.memory_percent > 85}>
                  <span className="lbl">Память</span>
                  <span className="val">{metrics.memory_percent.toFixed(1)}%</span>
                  <span className="sub">{metrics.memory_used_mb.toFixed(0)} МБ</span>
                </S.MetricItem>
                <S.MetricItem>
                  <span className="lbl">WS-соединения</span>
                  <span className="val">{metrics.active_ws_connections}</span>
                  <span className="sub">событий: {metrics.processed_events_total}</span>
                </S.MetricItem>
                <S.MetricItem $isAlert={metrics.avg_ping_latency_ms > 100}>
                  <span className="lbl">Отклик (ping)</span>
                  <span className="val">{metrics.avg_ping_latency_ms.toFixed(0)} мс</span>
                  <span className="sub">БД: {metrics.db_size_kb.toFixed(0)} КБ</span>
                </S.MetricItem>
              </S.MetricsGrid>
            ) : (
              <S.MetricsUnavailable>
                Метрики недоступны — нет связи с сервером КТК.
              </S.MetricsUnavailable>
            )}
          </S.StyledCard>

          {/* База данных оценок с контролем целостности */}
          <S.StretchCard
            ref={stretchCardRef}
            title={
              <S.TableCardTitle>
              <span className="main-title">База результатов обучения</span>
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
                columns={columns}
                rowKey="id"
                pagination={{ pageSize, showSizeChanger: false, hideOnSinglePage: true }}
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

        {/* Постоянно видимая зона тревог — не уходит ниже первого экрана. */}
        <S.InstructorLogCard
          title="Мониторинг журнала событий и тревог"
          extra={
            <S.AlarmSummary>
              <S.CriticalAlarmCount>Критические: {criticalAlarmCount}</S.CriticalAlarmCount>
              <S.WarningAlarmCount>Предупреждения: {warningAlarmCount}</S.WarningAlarmCount>
            </S.AlarmSummary>
          }
        >
          {alarmLogContent}
        </S.InstructorLogCard>
      </S.Content>

      <Modal
        title={
          <S.ModalTitle>
            <ShieldCheck size={18} color={theme.colors.success} />
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
      >
        {selectedSession && (
          <div>
            <S.ModalBodyContainer>
              <div>Оператор: <strong>{selectedSession.operator_name}</strong></div>
              <div>Сценарий: <strong>{SCENARIO_NAMES[selectedSession.scenario_id] || selectedSession.scenario_id}</strong></div>
              <div>Время сессии: <strong>{Math.floor(selectedSession.duration_sec / 60)}м {selectedSession.duration_sec % 60}с</strong></div>
              <div>
                Итоговая оценка:{' '}
                <S.ColoredValue color={selectedSession.score >= 85 ? theme.colors.success : selectedSession.score >= 70 ? theme.colors.primary : selectedSession.score >= 50 ? theme.colors.warning : theme.colors.danger}>
                  {selectedSession.score}%
                </S.ColoredValue>
              </div>
              <div>Статус: <strong>{selectedSession.status === 'accident' ? 'Авария' : selectedSession.status === 'esd' ? 'Аварийный Останов' : 'Успешно сдано'}</strong></div>
              <div>
                ИБ Целостность:{' '}
                <S.ColoredValue color={selectedSession.integrity_valid ? theme.colors.success : theme.colors.danger}>
                  {selectedSession.integrity_valid ? 'Валидна' : 'Нарушена!'}
                </S.ColoredValue>
              </div>
            </S.ModalBodyContainer>
            
            <S.ModalSection>
              <S.SectionTitle>Зафиксированные нарушения регламента:</S.SectionTitle>
              {selectedSession.violations && selectedSession.violations.length > 0 ? (
                selectedSession.violations.map((v: NonNullable<TrainingRecord['violations']>[number]) => (
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
                  selectedSession.session_logs.map((log: NonNullable<TrainingRecord['session_logs']>[number]) => (
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

      {/* Чанк подтягивается только при первом открытии конструктора */}
      {isBuilderModalOpen && (
        <Suspense fallback={null}>
          <ScenarioBuilderModal
            visible={isBuilderModalOpen}
            onClose={() => setIsBuilderModalOpen(false)}
          />
        </Suspense>
      )}
    </S.Container>
  );
};

export default InstructorPage;
