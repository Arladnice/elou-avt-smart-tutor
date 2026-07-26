"""
Модуль выравнивания последовательностей действий оператора (LCS / DTW).

Сравнивает последовательность действий оператора с эталонной для данного сценария.
Используется алгоритм Longest Common Subsequence (LCS), чтобы не штрафовать оператора
за дополнительные парирующие или регулирующие операции, а оценивать лишь покрытие
обязательных шагов и соблюдение их очередности.

Источник: Консультация Е. Вылегжанина (IT Camp) — «Baseline = сравнение с эталоном».
"""

import numpy as np
from typing import List


def calculate_lcs_alignment(operator_actions: List[str], golden_actions: List[str]) -> float:
    """
    Вычисляет сходство последовательности действий оператора и эталона.

    Использует Longest Common Subsequence (LCS) для оценки правильности порядка действий,
    чтобы не штрафовать за дополнительные парирующие или регулирующие операции.

    Параметры:
        operator_actions: список действий оператора, например ['V1_OPEN', 'SP_UP', 'V3_OPEN'].
        golden_actions: эталонная последовательность для данного сценария.

    Возвращает:
        float: процент сходства [0.0, 100.0]. 100.0 = полное покрытие эталона.
    """
    n, m = len(operator_actions), len(golden_actions)
    if n == 0 or m == 0:
        return 0.0 if n != m else 100.0

    # Динамическое программирование: длина LCS
    dp = np.zeros((n + 1, m + 1))
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if operator_actions[i - 1] == golden_actions[j - 1]:
                dp[i, j] = dp[i - 1, j - 1] + 1
            else:
                dp[i, j] = max(dp[i - 1, j], dp[i, j - 1])

    lcs_len = dp[n, m]
    # Процент сходства = отношение длины LCS к длине эталона
    similarity = (lcs_len / m) * 100
    return round(similarity, 1)
