# Инфраструктура

## Что есть в репозитории

- Dockerfile для backend и frontend;
- Docker Compose для локального запуска;
- production compose и Caddy для HTTPS/WebSocket;
- GitHub Actions для backend, frontend и deploy;
- SQLite с WAL для данных MVP;
- структурированные application/audit logs.

Публичный стенд: [https://tutor.kluknulo.ru/login](https://tutor.kluknulo.ru/login).

## Что нужно подтвердить до защиты

1. Сборка полного стека из чистого checkout.
2. Healthcheck frontend/backend.
3. Одновременная работа оператора и инструктора.
4. Перезапуск backend и сохранность завершённой сессии.
5. WebSocket через Caddy/TLS.
6. Отсутствие ошибок в browser console и server logs.

## Не подтверждено

- SLA 99,9%;
- 50 параллельных активных сессий;
- автоматический backup/restore;
- централизованный мониторинг и alerting;
- горизонтальное масштабирование;
- disaster recovery.

Это цели пилота. До измерений их нельзя использовать как свойства MVP.

## Минимальный пилотный контур

- PostgreSQL вместо локальной SQLite;
- централизованное хранение сессий;
- метрики, алерты и журналирование;
- ежедневный backup и регулярный restore-test;
- корпоративный IAM;
- отдельные dev/test/prod конфигурации и секреты.

GPU не требуется для текущего ONNX-инференса. Он понадобится только при обоснованном росте модели или использовании локальной LLM.
