"""Хэш целостности и регламенты: переезд в domain не меняет поведение."""


def test_hash_is_deterministic_and_field_separated():
    from elou_tutor.domain.integrity import calculate_integrity_hash

    assert calculate_integrity_hash("ab", "c") == calculate_integrity_hash("ab", "c")
    # Разделитель полей: склейка не должна давать коллизию
    assert calculate_integrity_hash("ab", "c") != calculate_integrity_hash("a", "bc")


def test_verify_accepts_own_hash_and_rejects_tampering():
    from elou_tutor.domain.integrity import calculate_integrity_hash, verify_integrity_hash

    payload = ("operator_1", "operator", "startup", 87)
    stored = calculate_integrity_hash(*payload)

    assert verify_integrity_hash(stored, *payload) is True
    assert verify_integrity_hash(stored, "operator_1", "operator", "startup", 100) is False


def test_regulations_importable_from_domain():
    from elou_tutor.domain.regulations import TECH_REGULATIONS, get_max_severity

    assert isinstance(TECH_REGULATIONS, dict) and TECH_REGULATIONS
    assert isinstance(get_max_severity(["P1_DRY_HEAT"]), str)


def test_password_hashing_lives_in_domain():
    """Хэширование паролей — чистая криптография, доступная и слою db, и слою api."""
    from elou_tutor.domain.credentials import get_password_hash, verify_password

    hashed = get_password_hash("Ktk_2026!")

    assert hashed != "Ktk_2026!"
    assert verify_password("Ktk_2026!", hashed) is True
    assert verify_password("неверный", hashed) is False
