---
name: project-validator
description: |
  Use for final quality checks before demos, presentations, or competition submission.
  Validates the project against all 8 КТК evaluation criteria: technical implementation,
  demonstration readiness, architecture, competitiveness, AI usage, presentation, infrastructure, security.
  Generates gap-analysis reports with specific action items.
---

# Project Validator — КТК ЭЛОУ-АВТ Smart Tutor

Final validation skill that checks the entire project against the 8 official КТК evaluation criteria.

## 🎯 When to Use

- Before competition demos or presentations
- After completing major features
- For periodic health checks
- When the user asks "what's left to do" or "are we ready"

## 📋 Validation Protocol

When triggered, execute the following checks IN ORDER:

### Step 1: Run Automated Checks

```markdown
1. Frontend TypeScript check:
   cd frontend && npx tsc --noEmit

2. Frontend build:
   cd frontend && npm run build

3. Backend tests:
   cd backend && python -m pytest tests/ -v

4. ONNX model smoke-test:
   cd ai_core && python -c "import onnxruntime as ort; s = ort.InferenceSession('model.onnx'); import numpy as np; r = s.run(None, {'input': np.zeros((1,30,7), dtype=np.float32)}); print('OK:', r[0].shape)"
```

### Step 2: Check Each Criterion

For each of the 8 criteria below, verify the requirements and report status.

---

## 📊 The 8 Evaluation Criteria

### К1: Техническая реализация (вес 0.25) — ГЛАВНЫЙ

| Requirement | How to Verify | Files |
|---|---|---|
| Интуитивный интерфейс | Visual check: SCADA layout, controls | `frontend/src/components/` |
| Журнал событий | `AlarmLog.tsx` exists and shows real-time logs | `AlarmLog.tsx` |
| Отслеживание времени | Timer in `Header.tsx` shows elapsed seconds | `Header.tsx` |
| Останов/пуск (ESD + Reset) | Buttons work in operator dashboard | `Header.tsx`, backend `ws.py` |
| **Разделение ролей и экранов** | Login → role selection → different dashboards | `Login.tsx`, `App.tsx` |
| Экран Оператора | SCADA panel with valve controls, mnemonic | `DashboardLayout.tsx` |
| Экран Инструктора | Session monitoring, defect injection, history | `InstructorDashboard.tsx` |
| Производительность | WebSocket latency < 100ms, no UI freezes | Backend `simulation_loop` |

### К2: Демонстрация решения (вес 0.15)

| Requirement | How to Verify |
|---|---|
| Демо в реальном времени | `npm run dev` + `uvicorn main:app` both work |
| Полный функционал | All 5 scenarios runnable end-to-end |
| Тренировка навыков | Operator can run scenario, see checklist, get score |
| Оценка квалификации | `ScoreCard.tsx` shows grade, violations, recommendations |
| Интерактивность | Instructor can inject defects during operator session |

### К3: Архитектура и технологии (вес 0.10)

| Requirement | How to Verify |
|---|---|
| Модульная архитектура | Check `backend/` structure matches target from AGENTS.md §4 |
| Разграничение по ролям | Separate WebSocket channels for operator/instructor |
| Определённые интерфейсы | Pydantic models, TypeScript interfaces, WebSocket protocol |
| Обоснование компонентов | `docs/ai_architecture.md` explains why each tech was chosen |
| Масштабируемость | Docker support, stateless backend possible |

### К4: Конкурентоспособность и внедрение (вес 0.10)

| Requirement | How to Verify |
|---|---|
| Анализ рынка | `docs/market_analysis.md` exists with competitors |
| Преимущества решения | Documented unique features (AI, real-time, DTW) |
| План внедрения | Deployment roadmap in documentation |

### К5: Использование ИИ (вес 0.10)

| Requirement | How to Verify |
|---|---|
| LSTM прогнозирование | `ai_core/predictive_engine.py` — risk prediction via ONNX |
| DTW сравнение | `ai_core/error_analyzer.py` — action sequence matching |
| Синтетика | `ai_core/data_generator.py` — telemetry dataset generation |
| ONNX модель | `ai_core/model.onnx` exists and passes smoke-test |
| Адаптивные рекомендации | ScoreCard shows AI-generated recommendations |

### К6: Презентация и оценка требований (вес 0.10)

| Requirement | How to Verify |
|---|---|
| Требования | `docs/requirements.md` with functional/non-functional requirements |
| Описание архитектуры | `docs/ai_architecture.md` with diagrams |
| Документация | `README.md` with quickstart guide |

### К7: Инфраструктура решения (вес 0.10)

| Requirement | How to Verify |
|---|---|
| Docker | `docker-compose.yml` + `Dockerfile` for backend |
| CI/CD | GitHub Actions or similar (optional for prototype) |
| Мониторинг | Logging infrastructure in backend |
| Описание инфраструктуры | `docs/infrastructure.md` with deployment diagram |

### К8: Информационная безопасность (вес 0.10)

| Requirement | How to Verify |
|---|---|
| Защита от подмены данных | SHA-256 integrity hashing in `calculate_integrity_hash()` |
| Аудит-журнал | `audit_logs` table in SQLite, `log_audit_event()` calls |
| Авторизация | Login endpoint, role-based access |
| Модель угроз | `docs/security_threat_model.md` exists |
| Запрет НСД | Instructor can't fake operator scores |

---

## 📝 Report Format

After validation, generate a report artifact with:

```markdown
# 🏆 КТК Validation Report — [date]

## Summary
| Criterion | Weight | Score (1-5) | Weighted |
|---|---|---|---|
| К1: Техническая реализация | 0.25 | X | X.XX |
| ... | ... | ... | ... |
| **TOTAL** | **1.00** | — | **X.XX / 5.00** |

## Detailed Findings

### К1: Техническая реализация
- ✅ Passed: [list]
- ❌ Failed: [list with specific fixes needed]
- ⚠️ Partial: [list]

[repeat for each criterion]

## Priority Action Items
1. [Highest impact fix]
2. [Second priority]
...
```

---

## 🚫 Validation Failures That Block Demo

These are HARD BLOCKERS — the project cannot be demonstrated if any of these fail:

1. `npx tsc --noEmit` fails → TypeScript errors in frontend
2. Backend won't start (`uvicorn main:app` crashes)
3. WebSocket connection fails (operator can't see simulator)
4. Login doesn't work (can't enter the app)
5. No scenario completes end-to-end (ScoreCard never shown)
6. ONNX model missing or fails to load
