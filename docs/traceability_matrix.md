# Матрица трассировки конкурсных критериев

| Критерий | Реализация | Проверка / доказательство | Статус |
|---|---|---|---|
| К1. Техническая реализация | роли, симулятор, журнал, ScoreCard | backend tests, REST/WS smoke, live demo | Частично подтверждено: нужен frontend/browser smoke |
| К2. Демонстрация | `elou_salt_breakthrough` | `docs/demo_scenario.md`, три прогона, MP4 | Открыто |
| К3. Архитектура | backend layers, FSD frontend, API/WS contracts | 6 import-contracts, `architecture.md` | Подтверждено для MVP |
| К4. Конкурентоспособность | web-MVP, экономика и roadmap | первичные источники, пилотные KPI | Гипотеза |
| К5. AI | ONNX LSTM, hybrid risk, LCS, retrieval | ONNX smoke, evaluation report | Работает на синтетике; не валидировано на реальных данных |
| К6. Презентация и требования | PPTX, README, требования | render/overflow, claim review | Требует обновления PPTX |
| К7. Инфраструктура | Docker, Caddy, CI | clean compose, restart, load/restore logs | Открыто |
| К8. ИБ | JWT, RBAC, rate limit, HMAC, audit, SSRF | automated tests и WS RBAC smoke | Подтверждено для demo-контура |

## Правило доказательства

Статус «Подтверждено» означает, что есть воспроизводимый тест, лог, снимок экрана или первичный источник. Наличие пункта в плане или target-архитектуре не считается реализацией.
