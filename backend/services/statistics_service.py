"""
Logika liczenia statystyk (overview, dzielnice, rozkłady, kaucje, dodatkowe
koszty, negocjowalność). Cała matematyka (mediana, IQR) jest w
`stats_math.py`, bo SQLite nie ma wbudowanej funkcji mediany - liczymy ją
w Pythonie na pobranej liście wartości.
"""

from __future__ import annotations

from typing import Optional

from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.services import stats_math


def _metric_summary(values: list[Optional[float]]) -> dict[str, Optional[float]]:
    filtered = stats_math.exclude_extreme_outliers(values)
    return {
        "avg": stats_math.safe_mean(filtered),
        "median": stats_math.safe_median(filtered),
        "min": stats_math.safe_min(filtered),
        "max": stats_math.safe_max(filtered),
    }


def _prices_with_additional_cost(repo: OfferRepository, filters: OfferFilters) -> list[float]:
    """
    Statystyki "ceny" (średnia/mediana) mają uwzględniać zarówno czynsz
    (price), jak i dodatkowe opłaty (additional_cost) - same tylko koszty
    najmu zaniżałyby realny koszt mieszkania. Gdy additional_cost jest
    nieznane, traktujemy je jako 0 (nie odrzucamy oferty tylko dlatego, że
    kwota dopłat nie jest podana).
    """
    rows = repo.rows_for_filters(filters, ["price", "additional_cost"])
    return [
        row["price"] + (row["additional_cost"] or 0)
        for row in rows
        if row["price"] is not None
    ]


def overview(repo: OfferRepository, filters: OfferFilters) -> dict:
    prices = _prices_with_additional_cost(repo, filters)
    costs = repo.values_for_filters(filters, "total_monthly_cost")
    return {
        "count": repo.count_for_filters(filters),
        "price": _metric_summary(prices),
        "total_monthly_cost": _metric_summary(costs),
    }


def districts_overview(repo: OfferRepository, filters: OfferFilters) -> list[dict]:
    result = []
    for district in repo.distinct_districts():
        district_filters = OfferFilters(**{**filters.__dict__, "district": district})
        result.append(_district_stats(repo, district_filters, district))
    return result


def district_detail(repo: OfferRepository, filters: OfferFilters, district: str) -> Optional[dict]:
    district_filters = OfferFilters(**{**filters.__dict__, "district": district})
    if repo.count_for_filters(district_filters) == 0:
        return None
    return _district_stats(repo, district_filters, district)


def _district_stats(repo: OfferRepository, filters: OfferFilters, district: str) -> dict:
    prices = _prices_with_additional_cost(repo, filters)
    costs = repo.values_for_filters(filters, "total_monthly_cost")
    return {
        "district": district,
        "count": repo.count_for_filters(filters),
        "price": _metric_summary(prices),
        "total_monthly_cost": _metric_summary(costs),
    }


def price_distribution(repo: OfferRepository, filters: OfferFilters, bin_size: float) -> list[dict]:
    prices = repo.values_for_filters(filters, "price")
    return stats_math.make_histogram(prices, bin_size)


def deposits_stats(repo: OfferRepository, filters: OfferFilters) -> dict:
    rows = repo.rows_for_filters(filters, ["has_deposit", "deposit"])
    with_deposit = [r["deposit"] for r in rows if r["has_deposit"] == 1]
    without_deposit_count = sum(1 for r in rows if r["has_deposit"] == 0)
    unknown_count = sum(1 for r in rows if r["has_deposit"] is None)
    total = len(rows)
    with_deposit_clean = stats_math.exclude_extreme_outliers(with_deposit)

    return {
        "with_deposit": len(with_deposit),
        "without_deposit": without_deposit_count,
        "unknown": unknown_count,
        "with_deposit_percent": round(len(with_deposit) / total * 100, 2) if total else None,
        "avg_deposit": stats_math.safe_mean(with_deposit_clean),
        "median_deposit": stats_math.safe_median(with_deposit_clean),
    }


def additional_costs_stats(repo: OfferRepository, filters: OfferFilters) -> dict:
    rows = repo.rows_for_filters(filters, ["has_additional_cost", "additional_cost"])
    with_cost = [r["additional_cost"] for r in rows if r["has_additional_cost"] == 1]
    without_cost_count = sum(1 for r in rows if r["has_additional_cost"] == 0)
    unknown_count = sum(1 for r in rows if r["has_additional_cost"] is None)
    total = len(rows)
    with_cost_clean = stats_math.exclude_extreme_outliers(with_cost)

    return {
        "with_additional_cost": len(with_cost),
        "without_additional_cost": without_cost_count,
        "unknown": unknown_count,
        "with_additional_cost_percent": round(len(with_cost) / total * 100, 2) if total else None,
        "avg_additional_cost": stats_math.safe_mean(with_cost_clean),
        "median_additional_cost": stats_math.safe_median(with_cost_clean),
    }


def negotiation_stats(repo: OfferRepository, filters: OfferFilters) -> dict:
    values = repo.values_for_filters(filters, "negotiable")
    negotiable_count = sum(1 for v in values if v == 1)
    non_negotiable_count = sum(1 for v in values if v == 0)
    total = negotiable_count + non_negotiable_count

    return {
        "negotiable": negotiable_count,
        "non_negotiable": non_negotiable_count,
        "negotiable_percent": round(negotiable_count / total * 100, 2) if total else None,
    }
