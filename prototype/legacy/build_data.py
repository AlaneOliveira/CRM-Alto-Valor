"""Atualiza o snapshot de dados embutido no painel HTML.

Execute na raiz do repositório:
    python prototype/build_data.py
"""

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_ROOT / "docs" / "anac-data" / "processed"
INDEX_PATH = Path(__file__).resolve().parent / "index.html"


def percentile(series):
    return series.rank(pct=True, method="max") * 100


def build_payload():
    customers = pd.read_csv(
        PROCESSED_DIR / "crm_customer_360_mvp.csv",
        sep=";",
        encoding="utf-8-sig",
    )
    flights = pd.read_csv(
        PROCESSED_DIR / "crm_flights_mvp.csv",
        sep=";",
        encoding="utf-8-sig",
    )

    if customers.empty or flights.empty:
        raise RuntimeError("As tabelas processadas estão vazias.")

    flights["route"] = flights.origin_icao + "-" + flights.destination_icao
    top_route = (
        flights.groupby("customer_id").route
        .agg(lambda values: values.value_counts().index[0])
        .to_dict()
    )

    spend_percentile = percentile(customers.spend_12m_brl)
    frequency_percentile = percentile(customers.flights_12m)
    recency_score = (100 - customers.recency_days / 365 * 100).clip(0, 100)
    tier_score = {"Basico": 20, "Topazio": 45, "Safira": 72, "Diamante": 100}
    loyalty_score = (
        customers.clube_azul_subscriber * 35
        + customers.azul_itau_card * 35
        + np.minimum(customers.points_balance / 30000 * 30, 30)
    ).clip(0, 100)
    growth = (customers.flights_3m - customers.flights_previous_3m) / np.maximum(
        1, customers.flights_previous_3m
    )
    growth_score = (50 + growth * 35).clip(0, 100)

    rows = []
    for index, customer in customers.iterrows():
        value_components = [
            ["Gasto 12m", 30, spend_percentile[index]],
            ["Frequência 12m", 25, frequency_percentile[index]],
            ["Recência", 15, recency_score[index]],
            ["Tier", 15, tier_score[customer.tier_current]],
            ["Ativos de fidelidade", 10, loyalty_score[index]],
            ["Tendência", 5, growth_score[index]],
        ]
        health_components = [
            ["NPS", 25, customer.latest_nps * 10],
            ["Pontualidade", 25, customer.on_time_rate_12m * 100],
            ["Sem cancelamento", 15, (1 - customer.cancellation_rate_12m) * 100],
            ["Engajamento", 15, customer.campaign_engagement_rate * 100],
            [
                "Resolução de reclamações",
                10,
                customer.complaint_resolution_rate * 100
                if customer.complaints_12m
                else 100,
            ],
            ["Tendência", 10, growth_score[index]],
        ]
        rows.append(
            {
                "id": customer.customer_id,
                "seg": customer.synthetic_segment,
                "tier": customer.tier_current,
                "city": customer.home_city,
                "uf": customer.home_state,
                "icao": customer.home_airport_icao,
                "club": int(customer.clube_azul_subscriber),
                "card": int(customer.azul_itau_card),
                "pts": int(customer.points_balance),
                "f3": int(customer.flights_3m),
                "f12": int(customer.flights_12m),
                "fp": int(customer.flights_previous_3m),
                "sp": round(customer.spend_12m_brl),
                "rec": int(customer.recency_days),
                "ot": customer.on_time_rate_12m,
                "cx": int(customer.cancelled_flights_12m),
                "dl": customer.average_departure_delay_minutes,
                "eng": customer.campaign_engagement_rate,
                "nps": int(customer.latest_nps),
                "V": customer.customer_value_score,
                "H": customer.relationship_health_score,
                "C": customer.churn_risk_score,
                "nbe": customer.next_best_experience,
                "why": customer.next_best_experience_reason,
                "ch": customer.recommended_channel,
                "cost": customer.estimated_action_cost_brl,
                "up": customer.expected_retention_uplift_pct,
                "route": top_route.get(customer.customer_id, ""),
                "vc": [[name, weight, round(value)] for name, weight, value in value_components],
                "hc": [[name, weight, round(value)] for name, weight, value in health_components],
            }
        )

    route_summary = (
        flights.groupby("route")
        .agg(
            n=("route", "size"),
            canc=("cancelled", "mean"),
            dl=("departure_delay_minutes", "mean"),
            biz=("trip_purpose", lambda values: (values == "business").mean()),
            paid=("fare_paid_brl", "mean"),
            ref=("fare_reference_brl", "mean"),
        )
        .sort_values("n", ascending=False)
        .head(12)
        .reset_index()
    )
    routes = [
        {
            "r": route.route,
            "n": int(route.n),
            "canc": round(route.canc, 4),
            "dl": round(route.dl, 1),
            "biz": round(route.biz, 3),
            "paid": round(route.paid),
            "ref": round(route.ref),
        }
        for route in route_summary.itertuples()
    ]
    return {"c": rows, "routes": routes, "ref": "2026-09-30"}


def update_index(payload):
    html = INDEX_PATH.read_text(encoding="utf-8")
    compact_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    marker = re.compile(r"(?m)^(\s*)const D = .*?;\s*const C = D\.c;\s*$")

    def replacement(match):
        indentation = match.group(1)
        return f"{indentation}const D = {compact_json}; const C = D.c;"

    updated, count = marker.subn(replacement, html, count=1)
    if count != 1:
        raise RuntimeError("Não foi possível localizar o snapshot 'const D' em index.html.")

    temporary_path = INDEX_PATH.with_suffix(".html.tmp")
    temporary_path.write_text(updated, encoding="utf-8", newline="\n")
    temporary_path.replace(INDEX_PATH)
    return len(compact_json.encode("utf-8"))


def main():
    payload = build_payload()
    payload_size = update_index(payload)
    print(
        f"Painel atualizado: {len(payload['c'])} clientes, "
        f"{len(payload['routes'])} rotas e {payload_size} bytes de dados embutidos."
    )


if __name__ == "__main__":
    main()
