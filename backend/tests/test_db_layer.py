"""Слой db: запросы и аудит доступны из пакета, цепочка блоков цела."""


def test_db_modules_importable():
    from elou_tutor.db.database import get_db_connection, init_db
    from elou_tutor.db.queries import get_all_sessions

    init_db()
    assert callable(get_db_connection)
    assert isinstance(get_all_sessions(), list)


def test_seed_users_adds_seven_operators_to_existing_database():
    from elou_tutor.db.database import get_db_connection, init_db, seed_users
    from elou_tutor.domain.credentials import verify_password

    init_db()
    with get_db_connection() as conn:
        conn.execute("DELETE FROM users WHERE username IN ('operator_4', 'operator_5', 'operator_6', 'operator_7')")
        conn.execute(
            "INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            ("local_user", "custom_hash", "operator"),
        )
        conn.commit()

    seed_users()

    with get_db_connection() as conn:
        operators = conn.execute(
            "SELECT username, password_hash FROM users "
            "WHERE role = 'operator' AND username LIKE 'operator_%' ORDER BY username"
        ).fetchall()
        local_user = conn.execute(
            "SELECT password_hash FROM users WHERE username = 'local_user'"
        ).fetchone()

    assert [username for username, _ in operators] == [f"operator_{number}" for number in range(1, 8)]
    assert all(verify_password("Ktk_2026!", password_hash) for _, password_hash in operators)
    assert local_user == ("custom_hash",)


def test_audit_chain_valid_after_writes():
    from elou_tutor.db.audit import log_audit_event, verify_audit_chain
    from elou_tutor.db.database import get_db_connection, init_db

    # Тест обязан быть самодостаточным: другие модули набора намеренно рвут
    # цепочку, и без очистки результат зависел бы от порядка выполнения.
    init_db()
    with get_db_connection() as conn:
        conn.execute("DELETE FROM audit_logs")
        conn.commit()

    log_audit_event("tester", "MIGRATION_PROBE", "проверка цепочки аудита")
    is_valid, broken_id = verify_audit_chain()

    assert is_valid is True
    assert broken_id is None
