/**
 * Смена сценария не должна пересоздавать WebSocket-соединение.
 *
 * scenarioId стоял в зависимостях эффекта подключения, а selectScenario его
 * меняет. Эффект пересоздавал сокет, сервер на подключении оператора вызывал
 * reset_session(scenario) и вычищал defects_triggered — то есть неисправность,
 * только что вброшенная командой trigger_defect, тут же терялась.
 */

import { act, render, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { SimulatorActionsContext, type SimulatorActions } from '@/entities/simulator';
import { TelemetryContext, type TelemetryState } from '@/entities/telemetry';
import { SessionContext, type SessionState } from '@/entities/session';
import { SimulatorProvider } from './SimulatorProvider';

/** Учёт созданных сокетов и отправленных в них команд. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  closed = false;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  url: string;

  constructor(url: string) {
    // Поле объявлено отдельно, а не параметром конструктора: в проекте
    // включён erasableSyntaxOnly, он запрещает параметр-свойства
    this.url = url;
    FakeWebSocket.instances.push(this);
    // onopen назначается синхронно после конструктора, поэтому откладываем вызов
    queueMicrotask(() => this.onopen?.());
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }

  /** Команды, отправленные в этот сокет, в разобранном виде. */
  commands(): Array<Record<string, unknown>> {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

let actions: SimulatorActions;
let telemetry: TelemetryState;
let session: SessionState;

const CaptureActions = () => {
  actions = useContext(SimulatorActionsContext)!;
  telemetry = useContext(TelemetryContext)!;
  session = useContext(SessionContext)!;
  return null;
};

const renderProvider = () =>
  render(
    <SimulatorProvider>
      <CaptureActions />
    </SimulatorProvider>,
  );

beforeEach(() => {
  FakeWebSocket.instances = [];
  sessionStorage.clear();
  // Провайдер поднимает соединение только для вошедшего пользователя с токеном
  sessionStorage.setItem('ktk_username', 'operator_1');
  sessionStorage.setItem('ktk_role', 'operator');
  sessionStorage.setItem('ktk_token', 'test-token');
  vi.stubGlobal('WebSocket', FakeWebSocket);
  // Реестр сценариев подгружается после входа — сеть в тесте не нужна
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const openSockets = () => FakeWebSocket.instances.filter((ws) => !ws.closed);

/**
 * Монтирует провайдер и дожидается ФАКТИЧЕСКОГО подключения.
 *
 * Ждать одного лишь появления сокета недостаточно: команды уходят через
 * sendWsAction только когда провайдер уже выставил isOnline, а это происходит
 * позже — в обработчике onopen. Между конструктором сокета и onopen есть
 * зазор, и тест, стартовавший в нём, видел пустой список отправленных команд.
 */
const connect = async () => {
  renderProvider();
  await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
  await waitFor(() => expect(session.isOnline).toBe(true));
};

test('соединение поднимается один раз при входе оператора', async () => {
  renderProvider();

  await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
  expect(FakeWebSocket.instances[0].url).toContain('role=operator');
});

test('смена сценария не пересоздаёт сокет', async () => {
  await connect();

  await act(async () => {
    actions.selectScenario('column_shutdown');
  });

  expect(FakeWebSocket.instances).toHaveLength(1);
  expect(openSockets()).toHaveLength(1);
});

test('смена сценария уходит командой в живой сокет', async () => {
  await connect();

  await act(async () => {
    actions.selectScenario('column_shutdown');
  });

  const commands = FakeWebSocket.instances[0].commands();
  expect(commands).toContainEqual({ type: 'change_scenario', scenario_id: 'column_shutdown' });
});

test('вброс неисправности не теряется из-за переподключения', async () => {
  await connect();

  // Сначала уводим базовый сценарий в сторону: дефект-сценарий вернёт его
  // к startup, и именно это изменение пересоздавало сокет
  await act(async () => {
    actions.selectScenario('column_shutdown');
  });
  await act(async () => {
    actions.selectScenario('pump_fail');
  });

  expect(FakeWebSocket.instances).toHaveLength(1);

  const commands = FakeWebSocket.instances[0].commands();
  const defectIndex = commands.findIndex((cmd) => cmd.type === 'trigger_defect');
  const scenarioIndex = commands.findIndex(
    (cmd) => cmd.type === 'change_scenario' && cmd.scenario_id === 'startup',
  );

  expect(scenarioIndex).toBeGreaterThanOrEqual(0);
  expect(defectIndex).toBeGreaterThan(scenarioIndex);
  expect(commands[defectIndex]).toEqual({
    type: 'trigger_defect',
    defect_id: 'pump_fail',
    state: true,
  });
});

test('смена сессии по-прежнему переподключает сокет', async () => {
  await connect();

  await act(async () => {
    actions.switchSession('session-42');
  });

  // Сессия — это другой поток телеметрии на сервере, здесь переподключение обязано остаться
  await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
  expect(FakeWebSocket.instances[1].url).toContain('session_id=session-42');
});

// ---------------------------------------------------------------
// Протокол рассылки: отсутствие ключа означает «не изменилось»
// ---------------------------------------------------------------

/** Минимальный пакет телеметрии без журнала и карточки оценки. */
const telemetryPacket = (overrides: Record<string, unknown> = {}) => ({
  status: 'running',
  timeElapsed: 10,
  valves: { V_1: true, V_2: false, V_3: true, V_VT: true },
  sensors: { T_1: 280, P_1: 0.25, L_1: 50, L_2: 50, P_vac: 0.04, T_2: 350 },
  setpoints: { T_1_Sp: 280 },
  defects: {},
  accidentReason: '',
  riskLevel: 5,
  predictions: [280, 0.25, 50],
  ...overrides,
});

const deliver = async (payload: Record<string, unknown>) => {
  await act(async () => {
    FakeWebSocket.instances[0].onmessage?.({ data: JSON.stringify(payload) });
  });
};

test('журнал из пакета попадает в контекст телеметрии', async () => {
  await connect();

  await deliver(telemetryPacket({
    logs: [{ id: '1', time: '00:05', type: 'warning', message: 'Давление растёт' }],
  }));

  expect(telemetry.logs).toHaveLength(1);
  expect(telemetry.logs[0].message).toBe('Давление растёт');
});

test('пакет без журнала сохраняет уже показанный журнал', async () => {
  await connect();
  await deliver(telemetryPacket({
    logs: [{ id: '1', time: '00:05', type: 'warning', message: 'Давление растёт' }],
  }));

  // Такт покоя: сервер не повторяет неизменившийся журнал
  await deliver(telemetryPacket({ timeElapsed: 11 }));

  expect(telemetry.logs).toHaveLength(1);
  expect(telemetry.logs[0].message).toBe('Давление растёт');
});

test('пакет без карточки оценки не стирает показанную карточку', async () => {
  await connect();
  await deliver(telemetryPacket({
    status: 'success',
    scoreCard: { score: 90, grade: 'A', duration: 120, errors: [], recommendations: [] },
  }));
  expect(session.scoreCard?.score).toBe(90);

  await deliver(telemetryPacket({ status: 'success', timeElapsed: 11 }));

  expect(session.scoreCard?.score).toBe(90);
});

test('сброс сессии приходит новым журналом и очищает старый', async () => {
  await connect();
  await deliver(telemetryPacket({
    logs: [{ id: '1', time: '00:05', type: 'warning', message: 'Давление растёт' }],
  }));

  await deliver(telemetryPacket({
    timeElapsed: 0,
    logs: [{ id: '9', time: '00:00', type: 'info', message: 'Система перезапущена' }],
  }));

  expect(telemetry.logs).toHaveLength(1);
  expect(telemetry.logs[0].message).toBe('Система перезапущена');
});
