---
name: project-validator
description: |
  Use for final quality checks before demos, presentations, or competition submission.
  Validates the project against all 8 КТК evaluation criteria, technical documentation,
  manual testing checklists, security models, and lecture insights.
  Generates gap-analysis reports with specific action items.
---

# Project Validator — КТК ЭЛОУ-АВТ

Final validation skill that checks the entire project against the 8 official КТК evaluation criteria, all detailed documentation in `docs/`, and ensures the project is safe from critical risks before demonstration.

## 🎯 When to Use

- Before competition demos or presentations
- After completing major features
- For periodic health checks
- When the user asks "what's left to do" or "are we ready"

## 📋 Validation Protocol

When triggered, execute the following checks IN ORDER:

### Step 1: Run Automated Checks

```bash
1. Frontend TypeScript check:
   cd frontend && npx tsc --noEmit

2. Frontend build:
   cd frontend && npm run build

3. Backend tests:
   cd backend && python -m pytest tests/ -v

4. ONNX model smoke-test:
   cd ai_core && python -c "import onnxruntime as ort; s = ort.InferenceSession('model.onnx'); import numpy as np; r = s.run(None, {'input': np.zeros((1,30,7), dtype=np.float32)}); print('OK:', r[0].shape)"
```

### Step 2: Advanced Documentation & Requirements Validation

Check the codebase against the following detailed requirements extracted from `docs/`:

#### 2.1. Physical Model & Equipment (docs/equipment_specification.md)
- **Check P-1 Limits**: Furnace temperature threshold must be capped at 340°C / 365°C.
- **Check K-1 Limits**: Column pressure must operate between 1.0 - 4.5 кгс/см² and temp < 150°C.
- **Check ESD Limits**: Ensure the electric dehydrators (ИПМ) have an auto-cutoff when the level is below 3500 mm.

#### 2.2. Requirements Traceability (docs/requirements.md)
- **НФ-ПРО-01**: Validate UI responsiveness < 200 ms.
- **ФТ-СИМ-01**: Ensure the physical simulator step calculation is explicitly set to 1 second.
- **ФТ-ИИ-01**: Check if AI inference predicts 15 seconds ahead with < 50ms latency.

#### 2.3. Manual Testing Verification (docs/manual_testing_checklist.md)
- Ensure the 4 canonical test cases are achievable:
  1. RBAC (Operator vs Instructor roles working).
  2. Physics (P-1 setpoint manipulation and V-3 drain valve logic).
  3. AI (Predictive risk remains 0% in idle/stable mode).
  4. Defect Injection (Furnace coil burnout injection works).

#### 2.4. Information Security & KII (docs/security_threat_model.md, docs/legal_compliance.md)
- **SHA-256 with Salt**: Ensure `backend/utils/security.py` properly hashes logs and results.
- **Isolated Perimeter**: Ensure all API endpoints are protected and not publicly writable.

#### 2.5. Expert Q&A Preparedness (docs/audit/elou_avt_expert_questions.md)
- Evaluate if the current codebase and demo strategy mitigate the 4 (P0) critical questions from experts:
  - MVP boundary justification (P-1/K-1 vs Full plant).
  - Use of synthetic data for AI vs Real telemetry.
  - Local security IAM vs DCS integration.
  - Evaluation scorecard legal impact.

#### 2.6. Lecture Insights & Reference Checks (docs/reference/*)
- Recursively check `docs/reference/` and `docs/reference/lecture_insights/` for new constraints.
- Ensure the AI architecture (DTW, synthetic data) aligns precisely with speaker quotes and IT architecture constraints mentioned during the lectures.

#### 2.7. Raw Source Material Digestion (docs/presentations/* & Исходные данные/*)
- Check the existence of raw PDF/DOCX files in `docs/presentations/` and `Исходные данные/`.
- **CRITICAL**: Do NOT parse these PDFs directly. Ensure every binary file has a corresponding digitized `.md` digest in `docs/`. If a digest is missing, output `[FAIL]` and demand its digitization.

### Step 3: Check Each of the 8 КТК Criteria

Verify the requirements and report status.

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
| Экономика | `docs/economics.md` exists with NPV, PI, DPP |
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

### Advanced Documentation Checks
- ✅ Passed: [list]
- ❌ Failed: [list]
- ⚠️ Partial: [list]

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
7. Security integrity hash fails
8. Raw PDF without digitized `.md` equivalent found in references.
