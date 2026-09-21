"""
Logika analityczna - dane wyliczane dynamicznie, których nie ma bezpośrednio
zapisanych w bazie (różnica od mediany dzielnicy, koszt startowy, outliery,
wskaźnik atrakcyjności cenowej oferty).
"""

from __future__ import annotations

from typing import Optional

from backend.config import MIN_DISTRICT_SAMPLE_SIZE, VALUE_SCORE_WEIGHTS
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.services import stats_math


def price_vs_district(repo: OfferRepository, filters: OfferFilters) -> list[dict]:
    rows = repo.rows_for_filters(filters, ["id", "title", "district", "price"])

    # Mediana ceny liczona per dzielnica na podstawie TEGO SAMEGO
    # przefiltrowanego zbioru (żeby np. filtr cenowy nie zniekształcał
    # porównania między ofertami, których i tak dotyczy).
    by_district: dict[str, list[float]] = {}
    for row in rows:
        if row["district"] and row["price"] is not None:
            by_district.setdefault(row["district"], []).append(row["price"])
    medians = {district: stats_math.safe_median(prices) for district, prices in by_district.items()}

    result = []
    for row in rows:
        district_median = medians.get(row["district"]) if row["district"] else None
        price = row["price"]
        difference = None
        difference_percent = None
        if price is not None and district_median:
            difference = round(price - district_median, 2)
            difference_percent = round((price - district_median) / district_median * 100, 2)

        result.append({
            "id": row["id"],
            "title": row["title"],
            "district": row["district"],
            "price": price,
            "district_median": district_median,
            "difference": difference,
            "difference_percent": difference_percent,
        })
    return result


def initial_cost(repo: OfferRepository, filters: OfferFilters) -> list[dict]:
    rows = repo.rows_for_filters(filters, ["id", "title", "total_monthly_cost", "deposit"])
    result = []
    for row in rows:
        total_cost = row["total_monthly_cost"]
        deposit = row["deposit"]
        is_estimate = total_cost is None or deposit is None
        # Jeśli brakuje total_monthly_cost lub deposit, nie zgadujemy -
        # zwracamy None i jawnie oznaczamy wynik jako estymację/niepełny.
        cost = (total_cost or 0) + (deposit or 0) if not is_estimate else None
        result.append({
            "id": row["id"],
            "title": row["title"],
            "total_monthly_cost": total_cost,
            "deposit": deposit,
            "initial_cost": cost,
            "initial_cost_is_estimate": is_estimate,
        })
    return result


def districts_comparison(repo: OfferRepository, filters: OfferFilters) -> list[dict]:
    result = []
    for district in repo.distinct_districts():
        district_filters = OfferFilters(**{**filters.__dict__, "district": district})
        rows = repo.rows_for_filters(
            district_filters,
            ["price", "total_monthly_cost", "deposit", "negotiable", "has_deposit", "has_additional_cost"],
        )
        if not rows:
            continue

        count = len(rows)
        negotiable_count = sum(1 for r in rows if r["negotiable"] == 1)
        no_deposit_count = sum(1 for r in rows if r["has_deposit"] == 0)
        has_additional_cost_count = sum(1 for r in rows if r["has_additional_cost"] == 1)

        result.append({
            "district": district,
            "count": count,
            "median_price": stats_math.safe_median([r["price"] for r in rows]),
            "median_total_monthly_cost": stats_math.safe_median([r["total_monthly_cost"] for r in rows]),
            "median_deposit": stats_math.safe_median([r["deposit"] for r in rows]),
            "negotiable_percent": round(negotiable_count / count * 100, 2),
            "no_deposit_percent": round(no_deposit_count / count * 100, 2),
            "has_additional_cost_percent": round(has_additional_cost_count / count * 100, 2),
        })
    return result


METRIC_COLUMNS = ["price", "total_monthly_cost", "additional_cost", "deposit"]


def outliers(repo: OfferRepository, filters: OfferFilters, metric: str) -> dict:
    if metric not in METRIC_COLUMNS:
        raise ValueError(f"Nieobsługiwana metryka: {metric}. Dozwolone: {METRIC_COLUMNS}")

    rows = repo.rows_for_filters(filters, ["id", "title", metric])
    values = [row[metric] for row in rows]
    bounds = stats_math.iqr_bounds(values)

    if bounds is None:
        return {"metric": metric, "bounds": None, "outliers": []}

    outlier_rows = [
        {"id": row["id"], "title": row["title"], "metric": metric, "value": row[metric]}
        for row in rows
        if row[metric] is not None and (row[metric] < bounds["lowerBound"] or row[metric] > bounds["upperBound"])
    ]

    return {
        "metric": metric,
        "bounds": {
            "q1": bounds["q1"],
            "q3": bounds["q3"],
            "iqr": bounds["iqr"],
            "lower_bound": bounds["lowerBound"],
            "upper_bound": bounds["upperBound"],
        },
        "outliers": outlier_rows,
    }


def cost_distribution(repo: OfferRepository, filters: OfferFilters, metric: str, bin_size: float) -> list[dict]:
    if metric not in METRIC_COLUMNS:
        raise ValueError(f"Nieobsługiwana metryka: {metric}. Dozwolone: {METRIC_COLUMNS}")
    values = repo.values_for_filters(filters, metric)
    return stats_math.make_histogram(values, bin_size)


def value_score(repo: OfferRepository, filters: OfferFilters) -> list[dict]:
    """
    METODA (opisana użytkownikowi przed implementacją):

    Dla każdej dzielnicy liczymy medianę i MAD (median absolute deviation)
    ceny oraz total_monthly_cost. MAD jest odporniejszy na outliery niż
    odchylenie standardowe, co ma znaczenie przy niewielkich próbach ofert
    per dzielnica.

    Dla każdej oferty liczymy "robust z-score" względem jej dzielnicy:
        z = (wartość - mediana_dzielnicy) / (1.4826 * MAD_dzielnicy)
    Ujemne z oznacza "taniej niż typowo w tej dzielnicy" - czyli lepszą
    wartość dla najemcy.

    Łączony wskaźnik:
        value_score = -(w1 * z_price + w2 * z_total_cost)
                      + w3 * (1 jeśli negotiable else 0)
                      - w4 * (1 jeśli has_deposit else 0)

    Wagi (w1..w4) są jawnie skonfigurowane w backend/config.py
    (VALUE_SCORE_WEIGHTS), a nie zaszyte na sztywno - można je dostroić bez
    zmiany kodu. Wyższy value_score = relatywnie atrakcyjniejsza oferta.

    Jeśli dzielnica ma mniej niż MIN_DISTRICT_SAMPLE_SIZE ofert, MAD jest
    statystycznie niestabilny - zwracamy value_score=None z jawnym powodem
    zamiast fałszywej precyzji.
    """
    rows = repo.rows_for_filters(
        filters,
        ["id", "title", "district", "price", "total_monthly_cost", "negotiable", "has_deposit"],
    )

    by_district: dict[str, list[dict]] = {}
    for row in rows:
        if row["district"]:
            by_district.setdefault(row["district"], []).append(row)

    district_stats: dict[str, dict] = {}
    for district, district_rows in by_district.items():
        prices = [r["price"] for r in district_rows if r["price"] is not None]
        costs = [r["total_monthly_cost"] for r in district_rows if r["total_monthly_cost"] is not None]
        price_median = stats_math.safe_median(prices)
        cost_median = stats_math.safe_median(costs)
        district_stats[district] = {
            "sample_size": len(district_rows),
            "price_median": price_median,
            "price_mad": stats_math.median_absolute_deviation(prices, price_median),
            "cost_median": cost_median,
            "cost_mad": stats_math.median_absolute_deviation(costs, cost_median),
        }

    weights = VALUE_SCORE_WEIGHTS
    result = []
    for row in rows:
        district = row["district"]
        stats = district_stats.get(district) if district else None

        if not stats or stats["sample_size"] < MIN_DISTRICT_SAMPLE_SIZE:
            result.append({
                "id": row["id"],
                "title": row["title"],
                "district": district,
                "value_score": None,
                "reason": "insufficient_district_sample",
                "components": None,
            })
            continue

        price_z = stats_math.robust_z_score(row["price"], stats["price_median"], stats["price_mad"])
        cost_z = stats_math.robust_z_score(row["total_monthly_cost"], stats["cost_median"], stats["cost_mad"])

        if price_z is None and cost_z is None:
            result.append({
                "id": row["id"],
                "title": row["title"],
                "district": district,
                "value_score": None,
                "reason": "missing_price_data",
                "components": None,
            })
            continue

        negotiable_bonus = weights["negotiable_bonus"] if row["negotiable"] == 1 else 0.0
        deposit_penalty = weights["deposit_penalty"] if row["has_deposit"] == 1 else 0.0

        score = (
            -(weights["price"] * (price_z or 0) + weights["total_cost"] * (cost_z or 0))
            + negotiable_bonus
            - deposit_penalty
        )

        result.append({
            "id": row["id"],
            "title": row["title"],
            "district": district,
            "value_score": round(score, 4),
            "reason": None,
            "components": {
                "price_z_score": price_z,
                "total_cost_z_score": cost_z,
                "negotiable_bonus": negotiable_bonus,
                "deposit_penalty": deposit_penalty,
            },
        })
    return result
