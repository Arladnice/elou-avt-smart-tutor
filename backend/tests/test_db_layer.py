"""Слой db: запросы и аудит доступны из пакета, цепочка блоков цела."""


def test_db_modules_importable():
    from elou_tutor.db.database import get_db_connection, init_db
    from elou_tutor.db.queries import get_all_sessions

    init_db()
    assert callable(get_db_connection)
    assert isinstance(get_all_sessions(), list)


def test_audit_chain_valid_after_writes():
    from elou_tutor.db.audit import log_audit_event, verify_audit_chain

    log_audit_event("tester", "MIGRATION_PROBE", "проверка цепочки аудита")
    is_valid, broken_id = verify_audit_chain()

    assert is_valid is True
    assert broken_id is None
