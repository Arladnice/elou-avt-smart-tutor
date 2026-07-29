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

        # Таблица пользователей (ИБ)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1
        )
        """)

        # Таблица для блокировки Brute-force (Fail-to-Ban)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            lockout_until REAL DEFAULT 0
        )
        """)
        conn.commit()
        
    seed_users()

def seed_users():
    """Создает базовых пользователей, если БД пуста."""
    from backend.utils.security import get_password_hash
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            # Создаем тестовые УЗ без админских прав
            hashed_password = get_password_hash("Ktk_2026!")
            users = [
                ("operator_1", hashed_password, "operator"),
                ("operator_2", hashed_password, "operator"),
                ("operator_3", hashed_password, "operator"),
                ("instructor_1", hashed_password, "instructor")
            ]
            cursor.executemany(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                users
            )
            conn.commit()
