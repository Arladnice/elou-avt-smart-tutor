import random

def random_id() -> int:
    """Генерирует случайный целочисленный идентификатор в диапазоне [1, 999]."""
    return random.randint(1, 999)
