/** Секунды симуляции -> MM:SS для шапки и записей журнала */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

/** Секунды -> «Nм Nс» для таблицы истории обучения */
export const formatDuration = (seconds: number): string => `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
