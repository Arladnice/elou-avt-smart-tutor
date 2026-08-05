import os
import sqlite3
from contextlib import contextmanager

from elou_tutor.domain.credentials import get_password_hash

# Каталог backend/ лежит на четыре уровня выше файла (db → elou_tutor → src → backend).
# Путь по умолчанию тот же, что и до переезда пакета в src-layout: backend/tutor.db.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(_BACKEND_DIR, "tutor.db"))

# Сколько ждать освобождения блокировки БД, прежде чем вернуть ошибку
DB_TIMEOUT_SEC = 5.0

DEFAULT_USERS = (
    ("operator_1", "operator"),
    ("operator_2", "operator"),
    ("operator_3", "operator"),
    ("operator_4", "operator"),
    ("operator_5", "operator"),
    ("operator_6", "operator"),
    ("operator_7", "operator"),
    ("instructor_1", "instructor"),
)


@contextmanager
def get_db_connection():
    """Контекстный менеджер для безопасного подключения к БД."""
    conn = sqlite3.connect(DB_PATH, timeout=DB_TIMEOUT_SEC)
    try:
        # WAL позволяет читать во время записи: цикл симуляции пишет журнал
        # параллельно с запросами истории от инструктора.
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
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

        # Сцепление записей журнала в цепочку: хэш предыдущей записи.
        # У строк, созданных до этой миграции, колонка остаётся NULL.
        try:
            cursor.execute("ALTER TABLE audit_logs ADD COLUMN prev_hash TEXT DEFAULT NULL")
        except sqlite3.OperationalError:
            pass

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
    """Добавляет недостающие демо-учётные записи, не изменяя существующие."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users")
        existing_usernames = {row[0] for row in cursor.fetchall()}
        missing_users = [user for user in DEFAULT_USERS if user[0] not in existing_usernames]

        if missing_users:
            hashed_password = get_password_hash("Ktk_2026!")
            cursor.executemany(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                [(username, hashed_password, role) for username, role in missing_users],
            )
            conn.commit()
