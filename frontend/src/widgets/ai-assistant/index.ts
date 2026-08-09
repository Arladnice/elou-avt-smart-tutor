// PredictiveTrendChart намеренно НЕ реэкспортируется: он внутренняя деталь
// виджета и грузится отложенно. Статический реэкспорт из barrel делает его
// достижимым со страницы оператора и возвращает recharts в основной чанк.
export { default as AiAssistant } from './ui/AiAssistant';
export { default as RiskAssessment } from './ui/RiskAssessment';
