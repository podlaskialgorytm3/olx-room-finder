"""
Czyste funkcje statystyczne używane przez statistics_service i
analysis_service. Nie zależą od bazy danych ani frameworka - działają na
zwykłych listach liczb, więc są łatwe do przetestowania i do ponownego użycia
niezależnie od dialektu SQL (mediany/MAD nie są dostępne natywnie w SQLite).
"""

from __future__ import annotations

import statistics
from typing import Optional, Sequence


def clean_numbers(values: Sequence[Optional[float]]) -> list[float]:
    """Usuwa None z listy i konwertuje do float."""
    return [float(v) for v in values if v is not None]


def safe_median(values: Sequence[Optional[float]]) -> Optional[float]:
    nums = clean_numbers(values)
    if not nums:
        return None
    return statistics.median(nums)


def safe_mean(values: Sequence[Optional[float]]) -> Optional[float]:
    nums = clean_numbers(values)
    if not nums:
        return None
    return round(statistics.fmean(nums), 2)


def safe_min(values: Sequence[Optional[float]]) -> Optional[float]:
    nums = clean_numbers(values)
    return min(nums) if nums else None


def safe_max(values: Sequence[Optional[float]]) -> Optional[float]:
    nums = clean_numbers(values)
    return max(nums) if nums else None


def exclude_extreme_outliers(values: Sequence[Optional[float]]) -> list[float]:
    """
    Odrzuca skrajnie odstające maksima: jeśli największa wartość w zbiorze
    przekracza 10-krotność średniej, usuwamy ją i sprawdzamy ponownie (nowe
    maksimum może nadal być skrajnym odstającym). Chroni to średnią/medianę
    przed pojedynczymi błędnymi wpisami (np. literówka o rząd wielkości za
    duża) bez arbitralnego obcinania normalnego rozkładu cen.
    """
    nums = clean_numbers(values)
    while len(nums) > 1:
        mean = statistics.fmean(nums)
        if mean <= 0:
            break
        current_max = max(nums)
        if current_max > mean * 10:
            nums.remove(current_max)
        else:
            break
    return nums


def percentile(values: Sequence[float], pct: float) -> float:
    """Percentyl metodą liniowej interpolacji (zgodny z numpy 'linear')."""
    if not values:
        raise ValueError("empty sequence")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    k = (len(ordered) - 1) * (pct / 100)
    f = int(k)
    c = min(f + 1, len(ordered) - 1)
    if f == c:
        return ordered[f]
    return ordered[f] + (ordered[c] - ordered[f]) * (k - f)


def iqr_bounds(values: Sequence[Optional[float]]) -> Optional[dict[str, float]]:
    """
    Granice odstających wartości metodą Tukeya (IQR / 1.5 fences) -
    standardowa, nie-arbitralna metoda wykrywania outlierów.
    Zwraca None, jeśli za mało danych (< 4 wartości).
    """
    nums = clean_numbers(values)
    if len(nums) < 4:
        return None
    q1 = percentile(nums, 25)
    q3 = percentile(nums, 75)
    iqr = q3 - q1
    return {
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "lowerBound": q1 - 1.5 * iqr,
        "upperBound": q3 + 1.5 * iqr,
    }


def median_absolute_deviation(values: Sequence[Optional[float]], center: Optional[float] = None) -> Optional[float]:
    """MAD - odporniejszy niż odchylenie standardowe odpowiednik do median."""
    nums = clean_numbers(values)
    if not nums:
        return None
    med = center if center is not None else statistics.median(nums)
    deviations = [abs(x - med) for x in nums]
    return statistics.median(deviations)


def robust_z_score(value: Optional[float], median: Optional[float], mad: Optional[float]) -> Optional[float]:
    """
    Robust z-score = (x - mediana) / (1.4826 * MAD).
    Stała 1.4826 sprawia, że MAD jest porównywalny z odchyleniem standardowym
    dla rozkładu normalnego. Zwraca None, gdy brakuje danych wejściowych albo
    MAD == 0 (brak zmienności w próbie - z-score nie ma sensu).
    """
    if value is None or median is None or mad is None or mad == 0:
        return None
    return round((value - median) / (1.4826 * mad), 4)


def make_histogram(values: Sequence[Optional[float]], bin_size: float) -> list[dict[str, float | int]]:
    """Buduje biny histogramu [from, to) o stałej szerokości `bin_size`."""
    nums = clean_numbers(values)
    if not nums or bin_size <= 0:
        return []

    min_value = min(nums)
    max_value = max(nums)
    start = (min_value // bin_size) * bin_size

    bins: dict[float, int] = {}
    edge = start
    while edge <= max_value:
        bins[edge] = 0
        edge += bin_size

    for value in nums:
        bin_start = start + ((value - start) // bin_size) * bin_size
        bins[bin_start] = bins.get(bin_start, 0) + 1

    return [
        {"from": edge, "to": round(edge + bin_size, 2), "count": count}
        for edge, count in sorted(bins.items())
    ]
