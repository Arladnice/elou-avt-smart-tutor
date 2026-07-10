import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tutor.db")))

@contextmanager
def get_db_connection():
    """Контекстный менеджер для безопасного подключения к БД."""
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Инициализирует структуру БД (таблицы сессий и аудит-логов)."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Таблица сессий обучения
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operator_name TEXT NOT NULL,
            role TEXT NOT NULL,
            scenario_id TEXT NOT NULL,
            start_time TEXT NOT NULL,
            duration_sec INTEGER NOT NULL,
            score INTEGER NOT NULL,
            status TEXT NOT NULL,
            violations_json TEXT NOT NULL,
            integrity_hash TEXT NOT NULL
        )
        """)
        
        # Добавляем колонку для сохранения логов действий в сессии
        try:
            cursor.execute("ALTER TABLE training_sessions ADD COLUMN session_logs_json TEXT DEFAULT '[]'")
        except sqlite3.OperationalError:
            pass
        
        # Таблица системных ИБ-логов
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            actor TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            integrity_hash TEXT NOT NULL
        )
        """)
        conn.commit()
