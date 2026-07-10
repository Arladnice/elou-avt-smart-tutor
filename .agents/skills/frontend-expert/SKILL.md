---
name: frontend-expert
description: |
  Use when creating or editing React/TypeScript components, pages, or features in the ЭЛОУ-АВТ Smart Tutor frontend.
  Tech stack: React 18, TypeScript, Ant Design, styled-components, WebSocket.
  Covers: component structure, styled patterns, API service layer, state management via Context, real-time data flow.
---

# Frontend Expert — ЭЛОУ-АВТ Smart Tutor

Specialized skill for working with the project's frontend (`frontend/` directory).

## 🎯 Tech Stack

| Technology | Version | Usage |
|---|---|---|
| React | 18.x | UI framework |
| TypeScript | strict mode | Type safety |
| Ant Design | 5.x | UI component library (Card, Table, Button, Modal, Progress, Switch, Slider, List) |
| styled-components | 6.x | CSS-in-JS styling (all styles extracted to `*.styles.ts`) |
| Vite | 6.x | Build tool and dev server |
| WebSocket | native | Real-time bidirectional communication with backend |

---

## 📋 Component Checklist

Before creating or editing any component, verify:

```markdown
- [ ] All styled components in a separate `ComponentName.styles.ts` file
- [ ] Import styles as `import * as S from './ComponentName.styles'`
- [ ] Zero inline `style={{ ... }}` attributes (exception: dynamic runtime values like progress bar width)
- [ ] API calls via `src/services/api.ts`, NOT direct `fetch()` in components
- [ ] Table columns and complex configs in `ComponentName.config.tsx`
- [ ] Use `React.FC<Props>` pattern with explicit TypeScript interfaces
- [ ] Use `useSimulator()` hook from `context/SimulatorContext` for simulator state
- [ ] Default export at bottom of file
- [ ] All user-facing text in Russian
```

---

## 📂 File Organization

```
frontend/src/
├── App.tsx                    # Root component with routing (Login vs Dashboard)
├── main.tsx                   # Entry point
├── components/
│   ├── ComponentName.tsx      # Component logic + JSX
│   ├── ComponentName.styles.ts    # All styled-component declarations
│   ├── ComponentName.config.tsx   # Table columns, option sets, mappings
│   └── ...
├── context/
│   └── SimulatorContext.tsx   # WebSocket connection + global state
├── services/
│   └── api.ts                # Centralized REST API client (fetch wrappers)
├── styles/
│   └── theme.ts              # Theme definition (colors, fonts)
└── styled.d.ts               # TypeScript augmentation for styled-components theme
```

### File Naming Conventions
- Component files: `PascalCase.tsx`
- Style files: `PascalCase.styles.ts`
- Config files: `PascalCase.config.tsx`
- Service files: `camelCase.ts`

---

## 🎨 Styling Rules

### Rule 1: All Styled Components in Separate Files
```typescript
// ❌ WRONG — styled declaration inside component file
const MyCard = styled(Card)`...`;
const MyComponent: React.FC = () => <MyCard />;

// ✅ CORRECT — styles in ComponentName.styles.ts
// ComponentName.styles.ts
export const MyCard = styled(Card)`...`;

// ComponentName.tsx
import * as S from './ComponentName.styles';
const MyComponent: React.FC = () => <S.MyCard />;
```

### Rule 2: Theme Usage
Always reference theme tokens via `props.theme.colors.*` in styled-components:
```typescript
// ✅ CORRECT
color: ${props => props.theme.colors.text};
background: ${props => props.theme.colors.surface};
border: 1px solid ${props => props.theme.colors.border};
font-family: ${props => props.theme.fonts.mono};

// ❌ WRONG — hardcoded colors without theme
color: #e1e7f0;
```

### Rule 3: Dynamic Styled Props
For conditional styling, use typed props on styled-components:
```typescript
// ✅ CORRECT
export const TaskItem = styled.div<{ status: 'completed' | 'active' | 'pending' }>`
  border-color: ${props => {
    if (props.status === 'completed') return props.theme.colors.success;
    if (props.status === 'active') return props.theme.colors.accent;
    return props.theme.colors.border;
  }};
`;

// ❌ WRONG — inline style for conditional colors
<div style={{ borderColor: status === 'completed' ? '#00ff66' : '#222c3e' }}>
```

---

## 🔌 API & Data Flow

### REST API — via `src/services/api.ts`
```typescript
// ✅ CORRECT — all HTTP calls through the service
import { apiService } from '../services/api';
const sessions = await apiService.fetchSessions();

// ❌ WRONG — direct fetch in component
const res = await fetch('http://localhost:8000/api/sessions');
```

### WebSocket — via `SimulatorContext`
The WebSocket connection is managed centrally in `context/SimulatorContext.tsx`. Components consume state via the `useSimulator()` hook:
```typescript
const { sensors, valves, riskLevel, status, scoreCard } = useSimulator();
```

**WebSocket message types** (sent to backend):
| Type | Payload | Description |
|---|---|---|
| `toggle_valve` | `{ valve_id: "V1"/"V2"/"V3", state: boolean }` | Toggle a valve |
| `change_setpoint` | `{ value: number }` | Change furnace temperature setpoint |
| `trigger_esd` | `{}` | Emergency shutdown |
| `trigger_defect` | `{ defect_id: string, state: boolean }` | Instructor: trigger equipment fault |
| `complete` | `{}` | Operator completes session |
| `reset` | `{}` | Reset session |
| `ping` | `{ timestamp: number }` | Keepalive |

---

## 🧩 Ant Design Patterns

### Card with Custom Header
```typescript
<S.StyledCard
  title={
    <>
      <IconComponent size={14} color="#00e5ff" />
      Заголовок карточки
    </>
  }
  bordered={false}
>
  {/* content */}
</S.StyledCard>
```

### Table with External Columns Config
```typescript
// ComponentName.config.tsx
export const getColumns = (): ColumnsType<DataType> => [
  { title: 'Имя', dataIndex: 'name', key: 'name' },
  // ...
];

// ComponentName.tsx
import { getColumns } from './ComponentName.config';
<Table columns={getColumns()} dataSource={data} />
```

---

## 🚫 Critical Anti-Patterns

1. **No `any` types** — Use explicit interfaces for all props, state, and API responses.
2. **No `style={{ ... }}`** — Use styled-components.
3. **No `fetch()` in components** — Use `apiService` from `src/services/api.ts`.
4. **No `styled` in component files** — Move to `*.styles.ts`.
5. **No English UI text** — All user-facing labels, messages, and titles must be in Russian.
6. **No unused imports** — Clean up after refactoring.

---

## 📚 Available Components Reference

| Component | File | Purpose |
|---|---|---|
| `Login` | `Login.tsx` | Authentication form (operator/instructor role selection) |
| `DashboardLayout` | `DashboardLayout.tsx` | Main operator dashboard grid layout |
| `Header` | `Header.tsx` | Top bar with session timer, status, ESD button |
| `ControlPanel` | `ControlPanel.tsx` | Valve controls (V-1, V-2, V-3), temperature setpoint slider |
| `FlowScheme` | `FlowScheme.tsx` | Interactive SCADA mnemonic diagram (SVG) |
| `AlarmLog` | `AlarmLog.tsx` | Real-time event/alarm log console |
| `ScenarioChecklist` | `ScenarioChecklist.tsx` | Step-by-step operator task checklist |
| `AiAssistant` | `AiAssistant.tsx` | AI risk assessment widget with chat bubble |
| `ScoreCard` | `ScoreCard.tsx` | Session results modal (grade, violations, recommendations) |
| `InstructorDashboard` | `InstructorDashboard.tsx` | Instructor view: defect injection, session monitoring, history |
