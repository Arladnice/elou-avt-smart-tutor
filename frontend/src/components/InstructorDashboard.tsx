import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Card, Switch, Button, Table, Badge, Alert, Radio, App } from 'antd';
import { ShieldCheck, ShieldAlert, Users, Play, AlertTriangle, LogOut, Trash2 } from 'lucide-react';

const Container = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 0 20px;
`;

const Title = styled.h1`
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 16px;
    background-color: ${props => props.theme.colors.warning};
  }
`;

const Content = styled.main`
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
`;

const PanelColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
`;

const StyledCard = styled(Card)`
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 6px;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding: 0 16px;
    min-height: 40px;
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .ant-card-body {
    padding: 16px;
  }
`;

const MonitorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const MonitorItem = styled.div`
  background-color: #0b0f17;
  border: 1px solid ${props => props.theme.colors.border};
  padding: 12px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  span.lbl {
    font-size: 9px;
    font-weight: 700;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
  }
  span.val {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 16px;
    font-weight: 700;
    color: ${props => props.theme.colors.accent};
  }
`;

const DefectRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #0b0f17;
  padding: 10px 14px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 8px;
`;

const DefectInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span.title {
    font-size: 12px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
  }
  span.desc {
    font-size: 10px;
    color: ${props => props.theme.colors.textMuted};
  }
`;

const ConnectedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #141b27;
  border: 1px solid ${props => props.theme.colors.border};
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
`;

const LogArea = styled.div`
  background-color: #080b10;
  border: 1px solid ${props => props.theme.colors.border};
  font-family: ${props => props.theme.fonts.mono};
  font-size: 11px;
  padding: 10px;
  height: 180px;
  overflow-y: auto;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LogRow = styled.div<{ type: string }>`
  color: ${props => {
    if (props.type === 'error') return props.theme.colors.danger;
    if (props.type === 'warning') return props.theme.colors.warning;
    return props.theme.colors.text;
  }};
`;

const InstructorDashboard: React.FC = () => {
  const { message } = App.useApp();
  const { 
    status, 
    sensors, 
    valves, 
    defects, 
    riskLevel, 
    logs, 
    accidentReason,
    username, 
    scenarioId, 
    isOnline,
    wsLatency,
    selectScenario, 
    triggerDefect, 
    logoutUser, 
    resetSession 
  } = useSimulator();

  const [history, setHistory] = useState<any[]>([]);

  // Загружаем историю тренировок
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      console.warn('Не удалось загрузить историю с бэкенда.');
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDefectChange = (defectId: 'pump_fail' | 'coil_overheat' | 'valve_jam', checked: boolean) => {
    triggerDefect(defectId, checked);
    message.info(`Неисправность "${defectId}" -> ${checked ? 'АКТИВИРОВАНА' : 'ОТКЛЮЧЕНА'}`);
  };

  const clearHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/sessions/clear', { method: 'POST' });
      if (res.ok) {
        message.success('История учебных сессий успешно очищена.');
        fetchHistory();
      }
    } catch {
      message.error('Ошибка при очистке истории.');
    }
  };

  const getStatusBadge = (s: string) => {
    if (s === 'running') return <Badge status="processing" text="Работа" style={{ color: '#00ff66' }} />;
    if (s === 'esd') return <Badge status="warning" text="Аварийный Останов" style={{ color: '#ffcc00' }} />;
    if (s === 'accident') return <Badge status="error" text="АВАРИЯ" style={{ color: '#ff3333' }} />;
    return <Badge status="default" text="Пауза" style={{ color: '#7c8ba1' }} />;
  };

  const columns = [
    {
      title: 'Оператор',
      dataIndex: 'operator_name',
      key: 'operator_name',
    },
    {
      title: 'Сценарий',
      dataIndex: 'scenario_id',
      key: 'scenario_id',
      render: (v: string) => v === 'startup' ? 'Пуск установки' : 'Останов установки'
    },
    {
      title: 'Время (с)',
      dataIndex: 'duration_sec',
      key: 'duration_sec',
      render: (v: number) => `${Math.floor(v / 60)}м ${v % 60}с`
    },
    {
      title: 'Оценка (DTW)',
      dataIndex: 'score',
      key: 'score',
      render: (v: number, record: any) => {
        let color = '#ff3333';
        let grade = 'F';
        if (v >= 85) { color = '#00ff66'; grade = 'A'; }
        else if (v >= 70) { color = '#0070f3'; grade = 'B'; }
        else if (v >= 50) { color = '#ffcc00'; grade = 'C'; }
        
        if (record.status === 'accident') {
          color = '#ff3333';
          grade = 'F';
        }
        
        return <strong style={{ color }}>{grade} ({v}%)</strong>;
      }
    },
    {
      title: 'ИБ Контроль (ГОСТ)',
      dataIndex: 'integrity_valid',
      key: 'integrity_valid',
      render: (valid: boolean) => valid ? (
        <span style={{ color: '#00ff66', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <ShieldCheck size={14} /> OK
        </span>
      ) : (
        <span style={{ color: '#ff3333', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <ShieldAlert size={14} /> Нарушена!
        </span>
      )
    }
  ];

  return (
    <Container>
      <Header>
        <Title>Панель Инструктора // Контроль КТК</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ConnectedBadge>
            <Users size={14} color="#ffcc00" />
            Инструктор: <strong>{username}</strong>
            <span style={{ fontSize: '10px', color: isOnline ? '#00ff66' : '#5c6470' }}>
              ({isOnline ? `Online, ping ${wsLatency}ms` : 'Offline'})
            </span>
          </ConnectedBadge>
          <Button 
            onClick={logoutUser} 
            icon={<LogOut size={12} />} 
            type="primary" 
            danger 
            style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold' }}
          >
            Выход
          </Button>
        </div>
      </Header>

      <Content>
        {/* Левая колонка: Управление сценариями и неисправностями */}
        <PanelColumn>
          {/* Контроль сессии */}
          <StyledCard title="Управление Учебным Процессом">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#7c8ba1', display: 'block', marginBottom: '6px' }}>
                  Выбор учебного сценария:
                </span>
                <Radio.Group value={scenarioId} onChange={e => selectScenario(e.target.value)}>
                  <Radio.Button value="startup">Пуск установки ЭЛОУ-АВТ</Radio.Button>
                  <Radio.Button value="shutdown">Аварийный останов печи П-1</Radio.Button>
                </Radio.Group>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button onClick={resetSession} style={{ flex: 1 }} icon={<Play size={14} />}>
                  Сбросить сессию
                </Button>
                <Button onClick={fetchHistory} style={{ flex: 1 }}>
                  Обновить историю
                </Button>
              </div>
            </div>
          </StyledCard>

          {/* Инъекция неисправностей */}
          <StyledCard title="Внедрение нештатных ситуаций (Слайд 11 КТК)">
            <DefectRow>
              <DefectInfo>
                <span className="title">Отказ сырьевого насоса Н-1</span>
                <span className="desc">Прекращает подачу сырья. Угроза коксования печи П-1 (п. 7.9.1 техрегламента).</span>
              </DefectInfo>
              <Switch checked={defects.pump_fail} onChange={v => handleDefectChange('pump_fail', v)} />
            </DefectRow>

            <DefectRow>
              <DefectInfo>
                <span className="title">Прогар змеевика печи П-1</span>
                <span className="desc">Неконтролируемый перегрев труб печи П-1, угроза пожара (п. 7.9.7).</span>
              </DefectInfo>
              <Switch checked={defects.coil_overheat} onChange={v => handleDefectChange('coil_overheat', v)} />
            </DefectRow>

            <DefectRow>
              <DefectInfo>
                <span className="title">Зависание клапана сброса V-2</span>
                <span className="desc">Клапан V-2 блокируется в закрытом состоянии. Угроза взрыва К-1.</span>
              </DefectInfo>
              <Switch checked={defects.valve_jam} onChange={v => handleDefectChange('valve_jam', v)} />
            </DefectRow>
          </StyledCard>

          {/* Журнал аудита действий оператора */}
          <StyledCard title="Мониторинг журнала событий">
            <LogArea>
              {logs.map(log => (
                <LogRow key={log.id} type={log.type}>
                  [{log.time}] {log.message}
                </LogRow>
              ))}
            </LogArea>
          </StyledCard>
        </PanelColumn>

        {/* Правая колонка: Мониторинг в реальном времени и история сессий */}
        <PanelColumn>
          {/* Панель живого мониторинга */}
          <StyledCard title="Текущие показатели оператора (Live telemetry)">
            <MonitorRow>
              <MonitorItem>
                <span className="lbl">Т-1 (Печь)</span>
                <span className="val" style={{ color: sensors.furnaceTemp > 310 ? '#ff3333' : '#00e5ff' }}>
                  {sensors.furnaceTemp} °C
                </span>
              </MonitorItem>
              <MonitorItem>
                <span className="lbl">P-1 (Колонна)</span>
                <span className="val" style={{ color: sensors.columnPres > 0.4 ? '#ff3333' : '#00e5ff' }}>
                  {sensors.columnPres} МПа
                </span>
              </MonitorItem>
              <MonitorItem>
                <span className="lbl">L-1 (Уровень)</span>
                <span className="val" style={{ color: (sensors.columnLevel > 80 || sensors.columnLevel < 20) ? '#ffcc00' : '#00e5ff' }}>
                  {sensors.columnLevel} %
                </span>
              </MonitorItem>
            </MonitorRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>Статус: {getStatusBadge(status)}</div>
              <div>Риск аварии (ИИ): <strong style={{ color: riskLevel > 70 ? '#ff3333' : '#00ff66' }}>{riskLevel}%</strong></div>
              <div>Клапан V-1 (Сырье): <strong style={{ color: valves.V1 ? '#00ff66' : '#ff3333' }}>{valves.V1 ? 'ОТКР' : 'ЗАКР'}</strong></div>
              <div>Клапан V-2 (Сброс): <strong style={{ color: valves.V2 ? '#00ff66' : '#ff3333' }}>{valves.V2 ? 'ОТКР' : 'ЗАКР'}</strong></div>
            </div>

            {status === 'accident' && (
              <Alert 
                type="error" 
                showIcon 
                icon={<AlertTriangle size={14} />} 
                message="АВАРИЯ НА УСТАНОВКЕ!" 
                description={accidentReason}
                style={{ marginTop: '12px' }}
              />
            )}
          </StyledCard>

          {/* База данных оценок с контролем целостности */}
          <StyledCard 
            title="Защищенная база результатов обучения (К8: ИБ)" 
            extra={
              <Button size="small" type="primary" danger icon={<Trash2 size={12} />} onClick={clearHistory}>
                Очистить
              </Button>
            }
          >
            <Table
              dataSource={history}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 4 }}
              size="small"
              style={{
                backgroundColor: '#111620',
                color: '#e1e7f0'
              }}
            />
          </StyledCard>
        </PanelColumn>
      </Content>
    </Container>
  );
};

export default InstructorDashboard;
