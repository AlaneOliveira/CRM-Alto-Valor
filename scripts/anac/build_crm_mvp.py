from __future__ import annotations

import csv
import json
import math
import random
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path


SEED = 20261024
CUSTOMER_COUNT = 1500
AS_OF_DATE = date(2026, 9, 30)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = PROJECT_ROOT / "data"
RAW_ROOT = DATA_ROOT / "raw"
PROCESSED_ROOT = DATA_ROOT / "processed"
QUALITY_ROOT = DATA_ROOT / "quality"


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", value.casefold()).strip("_")


def parse_datetime(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    for format_string in ("%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, format_string)
        except ValueError:
            continue
    return None


def parse_number(value: str) -> float | None:
    value = (value or "").strip().replace(" ", "")
    if not value:
        return None
    if "," in value and "." in value:
        value = value.replace(".", "").replace(",", ".")
    else:
        value = value.replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return None


def read_dict_rows(path: Path, encoding: str = "utf-8-sig", header_row: int = 1, delimiter: str = ";"):
    with path.open("r", encoding=encoding, errors="replace", newline="") as handle:
        for _ in range(header_row - 1):
            next(handle, None)
        reader = csv.DictReader(handle, delimiter=delimiter)
        headers = reader.fieldnames or []
        lookup = {normalized(header): header for header in headers}
        for row in reader:
            if row and any((value or "").strip() for value in row.values()):
                yield lookup, row


def write_csv(path: Path, rows: list[dict], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, delimiter=";", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def load_aerodromes() -> dict[str, dict]:
    path = RAW_ROOT / "dimensions" / "aerodromes" / "AerodromosPublicos.csv"
    result: dict[str, dict] = {}
    if not path.exists():
        return result
    for lookup, row in read_dict_rows(path, encoding="cp1252", header_row=2):
        code = (row.get(lookup.get("codigo_oaci", ""), "") or "").strip().upper()
        if code:
            result[code] = {
                "city": (row.get(lookup.get("municipio_servido", ""), "") or row.get(lookup.get("municipio", ""), "") or "").strip(),
                "state": (row.get(lookup.get("uf_servido", ""), "") or row.get(lookup.get("uf", ""), "") or "").strip(),
                "latitude": parse_number(row.get(lookup.get("latgeopoint", ""), "")),
                "longitude": parse_number(row.get(lookup.get("longeopoint", ""), "")),
            }
    return result


def load_fare_reference() -> tuple[dict, dict, float, list[str]]:
    route_month: dict[tuple[str, int, int, str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
    route: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
    global_weighted = [0.0, 0.0]
    sources: list[str] = []

    for path in sorted(RAW_ROOT.rglob("*.CSV")):
        if not re.fullmatch(r"20\d{4}(?: \(\d+\))?\.CSV", path.name, flags=re.IGNORECASE):
            continue
        with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=";")
            headers = reader.fieldnames or []
            lookup = {normalized(header): header for header in headers}
            if not ({"nr_tarifa", "tarifa"} & set(lookup)):
                continue
            sources.append(path.relative_to(PROJECT_ROOT).as_posix())
            for row in reader:
                airline = (row.get(lookup.get("sg_empresa_icao", lookup.get("empresa", "")), "") or "").strip().upper()
                if airline != "AZU":
                    continue
                year_value = row.get(lookup.get("nr_ano_referencia", lookup.get("ano", "")), "")
                month_value = row.get(lookup.get("nr_mes_referencia", lookup.get("mes", "")), "")
                origin = (row.get(lookup.get("sg_icao_origem", lookup.get("origem", "")), "") or "").strip().upper()
                destination = (row.get(lookup.get("sg_icao_destino", lookup.get("destino", "")), "") or "").strip().upper()
                fare = parse_number(row.get(lookup.get("nr_tarifa", lookup.get("tarifa", "")), ""))
                seats = parse_number(row.get(lookup.get("nr_assentos", lookup.get("assentos", "")), ""))
                try:
                    year = int(float(year_value))
                    month = int(float(month_value))
                except (TypeError, ValueError):
                    continue
                if not origin or not destination or fare is None or seats is None or seats <= 0 or fare <= 0:
                    continue
                key = ("AZU", year, month, origin, destination)
                route_month[key][0] += fare * seats
                route_month[key][1] += seats
                route[(origin, destination)][0] += fare * seats
                route[(origin, destination)][1] += seats
                global_weighted[0] += fare * seats
                global_weighted[1] += seats

    route_month_avg = {key: total / seats for key, (total, seats) in route_month.items() if seats}
    route_avg = {key: total / seats for key, (total, seats) in route.items() if seats}
    global_avg = global_weighted[0] / global_weighted[1] if global_weighted[1] else 650.0
    return route_month_avg, route_avg, global_avg, sources


def load_vra_sample(rng: random.Random, sample_per_month: int = 4000) -> tuple[list[dict], list[str]]:
    samples: dict[str, list[dict]] = defaultdict(list)
    seen: Counter[str] = Counter()
    sources: list[str] = []

    for path in sorted(RAW_ROOT.rglob("VRA_*.csv")):
        sources.append(path.relative_to(PROJECT_ROOT).as_posix())
        for lookup, row in read_dict_rows(path):
            airline = (row.get(lookup.get("sigla_icao_empresa_aerea", ""), "") or "").strip().upper()
            if airline != "AZU":
                continue
            scheduled_departure = parse_datetime(row.get(lookup.get("partida_prevista", ""), ""))
            if not scheduled_departure:
                continue
            actual_departure = parse_datetime(row.get(lookup.get("partida_real", ""), ""))
            scheduled_arrival = parse_datetime(row.get(lookup.get("chegada_prevista", ""), ""))
            actual_arrival = parse_datetime(row.get(lookup.get("chegada_real", ""), ""))
            month_key = scheduled_departure.strftime("%Y-%m")
            status = (row.get(lookup.get("situacao_voo", ""), "") or "").strip().upper()
            flight = {
                "flight_number": (row.get(lookup.get("numero_voo", ""), "") or "").strip(),
                "equipment_model": (row.get(lookup.get("modelo_equipamento", ""), "") or "").strip(),
                "seat_capacity": int(parse_number(row.get(lookup.get("numero_de_assentos", ""), "")) or 0),
                "origin_icao": (row.get(lookup.get("sigla_icao_aeroporto_origem", ""), "") or "").strip().upper(),
                "destination_icao": (row.get(lookup.get("sigla_icao_aeroporto_destino", ""), "") or "").strip().upper(),
                "scheduled_departure": scheduled_departure,
                "actual_departure": actual_departure,
                "scheduled_arrival": scheduled_arrival,
                "actual_arrival": actual_arrival,
                "flight_status": status or "NAO_INFORMADO",
                "cancelled": int("CANCEL" in status),
            }
            if not flight["origin_icao"] or not flight["destination_icao"]:
                continue
            seen[month_key] += 1
            bucket = samples[month_key]
            if len(bucket) < sample_per_month:
                bucket.append(flight)
            else:
                position = rng.randrange(seen[month_key])
                if position < sample_per_month:
                    bucket[position] = flight

    return [flight for month in sorted(samples) for flight in samples[month]], sources


def delay_minutes(actual: datetime | None, scheduled: datetime | None) -> int | None:
    if not actual or not scheduled:
        return None
    return round((actual - scheduled).total_seconds() / 60)


def clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, value))


def percentile_score(value: float, values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    lower_or_equal = sum(1 for item in ordered if item <= value)
    return 100.0 * lower_or_equal / len(ordered)


def build_data() -> tuple[list[dict], list[dict], list[dict], list[dict], list[dict], dict]:
    rng = random.Random(SEED)
    aerodromes = load_aerodromes()
    fare_month, fare_route, fallback_fare, fare_sources = load_fare_reference()
    flight_pool, vra_sources = load_vra_sample(rng)
    if not flight_pool:
        raise RuntimeError("Nenhum voo AZU foi encontrado nos arquivos VRA.")

    by_airport: dict[str, list[dict]] = defaultdict(list)
    airport_frequency: Counter[str] = Counter()
    for flight in flight_pool:
        by_airport[flight["origin_icao"]].append(flight)
        by_airport[flight["destination_icao"]].append(flight)
        airport_frequency[flight["origin_icao"]] += 1
        airport_frequency[flight["destination_icao"]] += 1
    home_airports = [airport for airport, _ in airport_frequency.most_common(25)]
    home_weights = [airport_frequency[airport] for airport in home_airports]

    segment_options = ["premium", "alto_valor", "crescimento", "ocasional", "em_risco"]
    segment_weights = [0.06, 0.17, 0.27, 0.38, 0.12]
    tier_options = {
        "premium": ["Diamante", "Diamante", "Safira"],
        "alto_valor": ["Safira", "Diamante", "Topazio"],
        "crescimento": ["Topazio", "Safira", "Basico"],
        "ocasional": ["Basico", "Basico", "Topazio"],
        "em_risco": ["Topazio", "Safira", "Basico"],
    }
    flight_ranges = {
        "premium": (20, 36),
        "alto_valor": (11, 22),
        "crescimento": (5, 14),
        "ocasional": (1, 6),
        "em_risco": (5, 15),
    }
    age_bands = ["18-25", "26-35", "36-45", "46-55", "56-65", "66+"]
    channels = ["App", "WhatsApp", "Email", "SMS"]

    customers: list[dict] = []
    customer_flights: list[dict] = []
    interactions: list[dict] = []

    recent_cutoff = datetime.combine(AS_OF_DATE - timedelta(days=365), datetime.min.time())
    risk_cutoff = datetime.combine(AS_OF_DATE - timedelta(days=180), datetime.min.time())
    recent_pool = [flight for flight in flight_pool if flight["scheduled_departure"] >= recent_cutoff]
    older_pool = [flight for flight in flight_pool if flight["scheduled_departure"] < risk_cutoff]
    if not recent_pool:
        recent_pool = flight_pool
    if not older_pool:
        older_pool = flight_pool

    for index in range(1, CUSTOMER_COUNT + 1):
        customer_id = f"C{index:06d}"
        segment = rng.choices(segment_options, weights=segment_weights, k=1)[0]
        home_airport = rng.choices(home_airports, weights=home_weights, k=1)[0]
        location = aerodromes.get(home_airport, {})
        tier = rng.choice(tier_options[segment])
        clube_probability = {"premium": 0.88, "alto_valor": 0.72, "crescimento": 0.46, "ocasional": 0.18, "em_risco": 0.40}[segment]
        card_probability = {"premium": 0.78, "alto_valor": 0.62, "crescimento": 0.35, "ocasional": 0.12, "em_risco": 0.32}[segment]
        clube = int(rng.random() < clube_probability)
        card = int(rng.random() < card_probability)
        tier_points = {"Basico": 1, "Topazio": 2, "Safira": 3, "Diamante": 4}[tier]
        points_balance = max(0, round(rng.lognormvariate(math.log(2500 * tier_points), 0.9)))
        join_days = rng.randint(365, 365 * 8)
        customers.append(
            {
                "customer_id": customer_id,
                "synthetic_segment": segment,
                "age_band": rng.choices(age_bands, weights=[0.08, 0.24, 0.28, 0.21, 0.13, 0.06], k=1)[0],
                "home_airport_icao": home_airport,
                "home_city": location.get("city", ""),
                "home_state": location.get("state", ""),
                "join_date": (AS_OF_DATE - timedelta(days=join_days)).isoformat(),
                "tier_current": tier,
                "azul_fidelidade_member": 1,
                "clube_azul_subscriber": clube,
                "azul_itau_card": card,
                "points_balance": points_balance,
                "preferred_channel": rng.choices(channels, weights=[0.48, 0.27, 0.20, 0.05], k=1)[0],
                "consent_marketing": int(rng.random() < 0.91),
                "record_nature": "synthetic",
            }
        )

        minimum, maximum = flight_ranges[segment]
        target_flights = rng.randint(minimum, maximum)
        available_home = by_airport.get(home_airport, recent_pool)
        selected_signatures: set[tuple] = set()
        for trip_index in range(1, target_flights + 1):
            if segment == "em_risco" and rng.random() < 0.82:
                source_pool = older_pool
            elif rng.random() < 0.68 and available_home:
                source_pool = available_home
            else:
                source_pool = recent_pool
            flight = rng.choice(source_pool)
            signature = (
                flight["flight_number"],
                flight["scheduled_departure"],
                flight["origin_icao"],
                flight["destination_icao"],
            )
            if signature in selected_signatures:
                continue
            selected_signatures.add(signature)
            scheduled_departure = flight["scheduled_departure"]
            route_key = (flight["origin_icao"], flight["destination_icao"])
            month_key = ("AZU", scheduled_departure.year, scheduled_departure.month, *route_key)
            reference_fare = fare_month.get(month_key, fare_route.get(route_key, fallback_fare))
            fare_paid = round(clamp(reference_fare * rng.lognormvariate(0, 0.22), 90, 5000), 2)
            booking_lead_days = max(1, round(rng.lognormvariate(math.log(18), 0.75)))
            dep_delay = delay_minutes(flight["actual_departure"], scheduled_departure)
            arr_delay = delay_minutes(flight["actual_arrival"], flight["scheduled_arrival"])
            points_earned = round(fare_paid * (1.2 + tier_points * 0.25))
            points_redeemed = round(rng.uniform(1000, 18000)) if rng.random() < 0.10 + 0.04 * tier_points else 0
            customer_flights.append(
                {
                    "customer_flight_id": f"CF{index:06d}{trip_index:03d}",
                    "customer_id": customer_id,
                    "flight_date": scheduled_departure.date().isoformat(),
                    "flight_number": flight["flight_number"],
                    "origin_icao": flight["origin_icao"],
                    "destination_icao": flight["destination_icao"],
                    "scheduled_departure": scheduled_departure.isoformat(sep=" ", timespec="minutes"),
                    "actual_departure": flight["actual_departure"].isoformat(sep=" ", timespec="minutes") if flight["actual_departure"] else "",
                    "scheduled_arrival": flight["scheduled_arrival"].isoformat(sep=" ", timespec="minutes") if flight["scheduled_arrival"] else "",
                    "actual_arrival": flight["actual_arrival"].isoformat(sep=" ", timespec="minutes") if flight["actual_arrival"] else "",
                    "flight_status": flight["flight_status"],
                    "departure_delay_minutes": dep_delay if dep_delay is not None else "",
                    "arrival_delay_minutes": arr_delay if arr_delay is not None else "",
                    "cancelled": flight["cancelled"],
                    "equipment_model": flight["equipment_model"],
                    "seat_capacity": flight["seat_capacity"],
                    "booking_date": (scheduled_departure.date() - timedelta(days=booking_lead_days)).isoformat(),
                    "booking_lead_days": booking_lead_days,
                    "fare_reference_brl": round(reference_fare, 2),
                    "fare_paid_brl": fare_paid,
                    "points_earned": points_earned,
                    "points_redeemed": points_redeemed,
                    "trip_purpose": rng.choices(["business", "leisure", "family"], weights=[0.42, 0.38, 0.20] if segment in {"premium", "alto_valor"} else [0.22, 0.52, 0.26], k=1)[0],
                    "customer_data_nature": "synthetic",
                    "operational_data_source": "ANAC_VRA",
                    "fare_data_source": "ANAC_TARIFAS",
                }
            )

    flights_by_customer: dict[str, list[dict]] = defaultdict(list)
    for row in customer_flights:
        flights_by_customer[row["customer_id"]].append(row)

    for customer in customers:
        customer_id = customer["customer_id"]
        flights = flights_by_customer[customer_id]
        cancellation_count = sum(int(row["cancelled"]) for row in flights)
        severe_delay_count = sum(
            1 for row in flights
            if isinstance(row["departure_delay_minutes"], int) and row["departure_delay_minutes"] >= 60
        )
        engagement_base = {"premium": 0.72, "alto_valor": 0.64, "crescimento": 0.52, "ocasional": 0.34, "em_risco": 0.22}[customer["synthetic_segment"]]
        interaction_count = rng.randint(3, 8)
        for sequence in range(1, interaction_count + 1):
            interaction_date = AS_OF_DATE - timedelta(days=rng.randint(1, 365))
            opened = int(rng.random() < engagement_base)
            clicked = int(opened and rng.random() < engagement_base * 0.65)
            converted = int(clicked and rng.random() < engagement_base * 0.45)
            interactions.append(
                {
                    "interaction_id": f"I{customer_id[1:]}{sequence:02d}",
                    "customer_id": customer_id,
                    "interaction_date": interaction_date.isoformat(),
                    "interaction_type": "campaign",
                    "campaign_name": rng.choice(["Clube Azul", "Cartao Azul Itau", "Acelerador de Tier", "Oferta de Rota", "Resgate de Pontos"]),
                    "channel": customer["preferred_channel"],
                    "sent": 1,
                    "opened": opened,
                    "clicked": clicked,
                    "converted": converted,
                    "complaint": 0,
                    "resolved": "",
                    "response_hours": "",
                    "nps_score": "",
                    "record_nature": "synthetic",
                }
            )
        nps_penalty = min(6, cancellation_count * 2 + severe_delay_count * 0.45)
        nps = round(clamp(rng.gauss(8.2, 1.4) - nps_penalty, 0, 10))
        interactions.append(
            {
                "interaction_id": f"I{customer_id[1:]}N1",
                "customer_id": customer_id,
                "interaction_date": (AS_OF_DATE - timedelta(days=rng.randint(1, 120))).isoformat(),
                "interaction_type": "nps_survey",
                "campaign_name": "Pesquisa pos-voo",
                "channel": "App",
                "sent": 1,
                "opened": 1,
                "clicked": 1,
                "converted": "",
                "complaint": 0,
                "resolved": "",
                "response_hours": "",
                "nps_score": nps,
                "record_nature": "synthetic",
            }
        )
        complaint_probability = min(0.80, 0.05 + cancellation_count * 0.18 + severe_delay_count * 0.06)
        if rng.random() < complaint_probability:
            resolved = int(rng.random() < 0.76)
            interactions.append(
                {
                    "interaction_id": f"I{customer_id[1:]}R1",
                    "customer_id": customer_id,
                    "interaction_date": (AS_OF_DATE - timedelta(days=rng.randint(1, 180))).isoformat(),
                    "interaction_type": "service_case",
                    "campaign_name": "Tratativa de irregularidade",
                    "channel": rng.choice(["WhatsApp", "App", "Email"]),
                    "sent": "",
                    "opened": "",
                    "clicked": "",
                    "converted": "",
                    "complaint": 1,
                    "resolved": resolved,
                    "response_hours": round(rng.uniform(2, 72), 1),
                    "nps_score": "",
                    "record_nature": "synthetic",
                }
            )

    interactions_by_customer: dict[str, list[dict]] = defaultdict(list)
    for row in interactions:
        interactions_by_customer[row["customer_id"]].append(row)

    metrics: list[dict] = []
    spend_values: list[float] = []
    frequency_values: list[float] = []
    for customer in customers:
        customer_id = customer["customer_id"]
        flights = flights_by_customer[customer_id]
        last_12 = [row for row in flights if date.fromisoformat(row["flight_date"]) >= AS_OF_DATE - timedelta(days=365)]
        last_3 = [row for row in flights if date.fromisoformat(row["flight_date"]) >= AS_OF_DATE - timedelta(days=90)]
        previous_3 = [row for row in flights if AS_OF_DATE - timedelta(days=180) <= date.fromisoformat(row["flight_date"]) < AS_OF_DATE - timedelta(days=90)]
        completed_12 = [row for row in last_12 if not row["cancelled"]]
        last_flight_date = max((date.fromisoformat(row["flight_date"]) for row in flights), default=None)
        recency_days = (AS_OF_DATE - last_flight_date).days if last_flight_date else 999
        spend_12 = round(sum(float(row["fare_paid_brl"]) for row in completed_12), 2)
        dep_delays = [int(row["departure_delay_minutes"]) for row in completed_12 if isinstance(row["departure_delay_minutes"], int)]
        on_time = sum(1 for delay in dep_delays if delay <= 15)
        campaigns = [row for row in interactions_by_customer[customer_id] if row["interaction_type"] == "campaign"]
        complaints = [row for row in interactions_by_customer[customer_id] if row["complaint"] == 1]
        nps_values = [int(row["nps_score"]) for row in interactions_by_customer[customer_id] if row["nps_score"] != ""]
        sent = sum(int(row["sent"]) for row in campaigns)
        clicked = sum(int(row["clicked"]) for row in campaigns)
        metrics.append(
            {
                **customer,
                "flights_3m": len(last_3),
                "flights_12m": len(last_12),
                "flights_previous_3m": len(previous_3),
                "spend_12m_brl": spend_12,
                "average_ticket_brl": round(spend_12 / len(completed_12), 2) if completed_12 else 0.0,
                "recency_days": recency_days,
                "on_time_rate_12m": round(on_time / len(dep_delays), 4) if dep_delays else 0.0,
                "average_departure_delay_minutes": round(sum(dep_delays) / len(dep_delays), 1) if dep_delays else 0.0,
                "cancelled_flights_12m": sum(int(row["cancelled"]) for row in last_12),
                "cancellation_rate_12m": round(sum(int(row["cancelled"]) for row in last_12) / len(last_12), 4) if last_12 else 0.0,
                "campaign_engagement_rate": round(clicked / sent, 4) if sent else 0.0,
                "campaign_conversions_12m": sum(int(row["converted"]) for row in campaigns),
                "complaints_12m": len(complaints),
                "complaint_resolution_rate": round(sum(int(row["resolved"]) for row in complaints) / len(complaints), 4) if complaints else 1.0,
                "latest_nps": nps_values[-1] if nps_values else 5,
            }
        )
        spend_values.append(spend_12)
        frequency_values.append(len(last_12))

    tier_score = {"Basico": 20, "Topazio": 45, "Safira": 72, "Diamante": 100}
    customer_360: list[dict] = []
    for item in metrics:
        spend_score = percentile_score(item["spend_12m_brl"], spend_values)
        frequency_score = percentile_score(item["flights_12m"], frequency_values)
        recency_score = clamp(100 - item["recency_days"] / 365 * 100)
        loyalty_assets = clamp(
            item["clube_azul_subscriber"] * 35
            + item["azul_itau_card"] * 35
            + min(item["points_balance"] / 30000 * 30, 30)
        )
        growth_rate = (item["flights_3m"] - item["flights_previous_3m"]) / max(1, item["flights_previous_3m"])
        growth_score = clamp(50 + growth_rate * 35)
        value_score = round(
            0.30 * spend_score
            + 0.25 * frequency_score
            + 0.15 * recency_score
            + 0.15 * tier_score[item["tier_current"]]
            + 0.10 * loyalty_assets
            + 0.05 * growth_score,
            1,
        )
        nps_score = item["latest_nps"] * 10
        operation_score = item["on_time_rate_12m"] * 100
        cancellation_score = (1 - item["cancellation_rate_12m"]) * 100
        engagement_score = item["campaign_engagement_rate"] * 100
        complaint_score = item["complaint_resolution_rate"] * 100 if item["complaints_12m"] else 100
        health_score = round(
            0.25 * nps_score
            + 0.25 * operation_score
            + 0.15 * cancellation_score
            + 0.15 * engagement_score
            + 0.10 * complaint_score
            + 0.10 * growth_score,
            1,
        )
        churn_risk = round(clamp(100 - (0.60 * health_score + 0.25 * recency_score + 0.15 * engagement_score)), 1)

        if value_score >= 70 and health_score < 55:
            action = "Recuperacao premium"
            reason = "Cliente valioso com relacionamento fragilizado"
            action_cost = 280.0
            uplift = 18.0
        elif item["cancelled_flights_12m"] > 0 or item["average_departure_delay_minutes"] >= 45:
            action = "Protecao de jornada"
            reason = "Exposicao recente a cancelamento ou atraso relevante"
            action_cost = 160.0
            uplift = 14.0
        elif value_score >= 75 and health_score >= 70:
            action = "Reconhecimento exclusivo"
            reason = "Alto valor e relacionamento saudavel"
            action_cost = 120.0
            uplift = 8.0
        elif not item["azul_itau_card"] and value_score >= 48:
            action = "Oferta Cartao Azul Itau"
            reason = "Valor potencial sem cartao co-branded"
            action_cost = 35.0
            uplift = 9.0
        elif not item["clube_azul_subscriber"] and item["flights_12m"] >= 4:
            action = "Oferta Clube Azul"
            reason = "Frequencia relevante sem assinatura"
            action_cost = 30.0
            uplift = 10.0
        elif item["recency_days"] > 210:
            action = "Reativacao personalizada"
            reason = "Longo periodo desde o ultimo voo"
            action_cost = 55.0
            uplift = 12.0
        else:
            action = "Acelerador de tier"
            reason = "Potencial de crescimento por frequencia e engajamento"
            action_cost = 45.0
            uplift = 7.0

        customer_360.append(
            {
                **item,
                "customer_value_score": value_score,
                "relationship_health_score": health_score,
                "churn_risk_score": churn_risk,
                "value_band": "alto" if value_score >= 70 else "medio" if value_score >= 40 else "baixo",
                "relationship_band": "saudavel" if health_score >= 70 else "atencao" if health_score >= 45 else "critico",
                "next_best_experience": action,
                "next_best_experience_reason": reason,
                "recommended_channel": item["preferred_channel"],
                "estimated_action_cost_brl": action_cost,
                "expected_retention_uplift_pct": uplift,
                "score_reference_date": AS_OF_DATE.isoformat(),
            }
        )

    dictionary = data_dictionary(
        {
            "crm_customers_mvp.csv": customers[0],
            "crm_flights_mvp.csv": customer_flights[0],
            "crm_interactions_mvp.csv": interactions[0],
            "crm_customer_360_mvp.csv": customer_360[0],
        }
    )
    manifest = {
        "version": "1.0.0",
        "generated_on": date.today().isoformat(),
        "random_seed": SEED,
        "reference_date": AS_OF_DATE.isoformat(),
        "customer_data_policy": "Todos os clientes, perfis, valores pagos, pontos e interacoes sao sinteticos.",
        "anac_usage": "Rotas e contexto operacional sao amostrados do VRA; referencias de tarifa sao agregadas dos microdados de tarifas.",
        "source_files": {
            "vra": vra_sources,
            "tarifas": fare_sources,
            "aerodromos": ["docs/anac-data/raw/dimensions/aerodromes/AerodromosPublicos.csv"],
        },
    }
    return customers, customer_flights, interactions, customer_360, dictionary, manifest


def data_dictionary(table_samples: dict[str, dict]) -> list[dict]:
    definitions = {
        "crm_customers_mvp.csv": [
            ("customer_id", "string", "synthetic", "Identificador anonimo do cliente."),
            ("synthetic_segment", "category", "synthetic", "Segmento latente usado somente para gerar o cenario do MVP."),
            ("age_band", "category", "synthetic", "Faixa etaria sem dado pessoal identificavel."),
            ("home_airport_icao", "string", "mixed", "Aeroporto-base associado ao cliente sintetico."),
            ("tier_current", "category", "synthetic", "Nivel atual no programa de fidelidade."),
            ("clube_azul_subscriber", "boolean", "synthetic", "Indica assinatura do Clube Azul."),
            ("azul_itau_card", "boolean", "synthetic", "Indica posse do cartao Azul Itau."),
            ("points_balance", "integer", "synthetic", "Saldo simulado de pontos."),
        ],
        "crm_flights_mvp.csv": [
            ("customer_flight_id", "string", "synthetic", "Chave da associacao cliente-voo."),
            ("customer_id", "string", "synthetic", "Chave estrangeira do cliente."),
            ("flight_date", "date", "ANAC+synthetic", "Data operacional do VRA associada a um cliente sintetico."),
            ("origin_icao", "string", "ANAC", "Aeroporto de origem."),
            ("destination_icao", "string", "ANAC", "Aeroporto de destino."),
            ("departure_delay_minutes", "integer", "ANAC", "Diferenca entre partida real e prevista."),
            ("cancelled", "boolean", "ANAC", "Indica cancelamento do voo."),
            ("fare_reference_brl", "decimal", "ANAC aggregate", "Tarifa media ponderada por assentos na rota e no mes."),
            ("fare_paid_brl", "decimal", "synthetic", "Valor simulado pago pelo cliente."),
        ],
        "crm_interactions_mvp.csv": [
            ("interaction_id", "string", "synthetic", "Identificador da interacao."),
            ("interaction_type", "category", "synthetic", "Campanha, pesquisa NPS ou atendimento."),
            ("opened", "boolean", "synthetic", "Abertura da comunicacao."),
            ("clicked", "boolean", "synthetic", "Clique na comunicacao."),
            ("converted", "boolean", "synthetic", "Conversao atribuida a campanha."),
            ("complaint", "boolean", "synthetic", "Indica contato de reclamacao."),
            ("resolved", "boolean", "synthetic", "Indica resolucao da reclamacao."),
            ("nps_score", "integer", "synthetic", "Nota simulada de 0 a 10."),
        ],
        "crm_customer_360_mvp.csv": [
            ("flights_3m", "integer", "calculated", "Quantidade de voos nos ultimos 90 dias."),
            ("flights_12m", "integer", "calculated", "Quantidade de voos nos ultimos 365 dias."),
            ("spend_12m_brl", "decimal", "calculated", "Valor total simulado em voos realizados nos ultimos 12 meses."),
            ("recency_days", "integer", "calculated", "Dias desde o ultimo voo."),
            ("on_time_rate_12m", "decimal", "calculated", "Percentual de partidas com atraso de ate 15 minutos."),
            ("cancellation_rate_12m", "decimal", "calculated", "Percentual de voos cancelados."),
            ("campaign_engagement_rate", "decimal", "calculated", "Cliques divididos por campanhas enviadas."),
            ("customer_value_score", "decimal", "calculated", "Valor atual e potencial, de 0 a 100."),
            ("relationship_health_score", "decimal", "calculated", "Saude do relacionamento, de 0 a 100."),
            ("churn_risk_score", "decimal", "calculated", "Risco de enfraquecimento, de 0 a 100."),
            ("next_best_experience", "category", "calculated", "Experiencia ou acao recomendada."),
            ("next_best_experience_reason", "string", "calculated", "Motivo explicavel da recomendacao."),
        ],
    }
    rows = []
    for table, columns in definitions.items():
        for column, data_type, nature, description in columns:
            rows.append({"table": table, "column": column, "data_type": data_type, "data_nature": nature, "description": description})

    existing = {(row["table"], row["column"]) for row in rows}
    descriptions = {
        "home_city": "Cidade associada ao aeroporto-base.",
        "home_state": "UF ou estado associado ao aeroporto-base.",
        "join_date": "Data simulada de entrada no relacionamento.",
        "azul_fidelidade_member": "Indica participacao no programa Azul Fidelidade.",
        "preferred_channel": "Canal preferido para relacionamento.",
        "consent_marketing": "Indica consentimento para comunicacoes de marketing.",
        "record_nature": "Classifica a natureza sintetica do registro.",
        "flight_number": "Numero do voo informado no VRA.",
        "scheduled_departure": "Data e hora previstas para partida.",
        "actual_departure": "Data e hora realizadas para partida.",
        "scheduled_arrival": "Data e hora previstas para chegada.",
        "actual_arrival": "Data e hora realizadas para chegada.",
        "flight_status": "Situacao operacional do voo.",
        "arrival_delay_minutes": "Diferenca entre chegada real e prevista.",
        "equipment_model": "Modelo do equipamento informado no VRA.",
        "seat_capacity": "Capacidade de assentos informada no VRA.",
        "booking_date": "Data simulada da reserva.",
        "booking_lead_days": "Dias entre reserva e voo.",
        "points_earned": "Pontos simulados acumulados na viagem.",
        "points_redeemed": "Pontos simulados usados na viagem.",
        "trip_purpose": "Motivo sintetico da viagem.",
        "customer_data_nature": "Classifica a natureza sintetica dos dados do cliente.",
        "operational_data_source": "Origem do contexto operacional.",
        "fare_data_source": "Origem da referencia tarifaria.",
        "customer_id": "Identificador anonimo do cliente.",
        "interaction_date": "Data simulada da interacao.",
        "campaign_name": "Campanha ou jornada associada a interacao.",
        "channel": "Canal usado na interacao.",
        "sent": "Indica envio de comunicacao.",
        "response_hours": "Tempo simulado de resposta do atendimento.",
        "flights_previous_3m": "Voos entre 91 e 180 dias antes da referencia.",
        "average_ticket_brl": "Valor medio simulado por voo realizado.",
        "average_departure_delay_minutes": "Atraso medio de partida nos ultimos 12 meses.",
        "cancelled_flights_12m": "Quantidade de voos cancelados nos ultimos 12 meses.",
        "campaign_conversions_12m": "Conversoes de campanha nos ultimos 12 meses.",
        "complaints_12m": "Reclamacoes simuladas nos ultimos 12 meses.",
        "complaint_resolution_rate": "Percentual de reclamacoes resolvidas.",
        "latest_nps": "Nota NPS mais recente na escala de 0 a 10.",
        "value_band": "Faixa baixa, media ou alta do Customer Value Score.",
        "relationship_band": "Faixa saudavel, atencao ou critica do relacionamento.",
        "recommended_channel": "Canal recomendado para executar a proxima acao.",
        "estimated_action_cost_brl": "Custo sintetico estimado da acao.",
        "expected_retention_uplift_pct": "Ganho sintetico esperado de retencao em pontos percentuais.",
        "score_reference_date": "Data de referencia dos indicadores e scores.",
    }
    boolean_fields = {
        "azul_fidelidade_member", "clube_azul_subscriber", "azul_itau_card", "consent_marketing",
        "cancelled", "sent", "opened", "clicked", "converted", "complaint", "resolved",
    }
    integer_fields = {
        "points_balance", "seat_capacity", "booking_lead_days", "points_earned", "points_redeemed",
        "flights_3m", "flights_12m", "flights_previous_3m", "recency_days", "cancelled_flights_12m",
        "campaign_conversions_12m", "complaints_12m", "latest_nps", "nps_score",
    }
    decimal_fields = {
        "departure_delay_minutes", "arrival_delay_minutes", "fare_reference_brl", "fare_paid_brl",
        "response_hours", "spend_12m_brl", "average_ticket_brl", "on_time_rate_12m",
        "average_departure_delay_minutes", "cancellation_rate_12m", "campaign_engagement_rate",
        "complaint_resolution_rate", "customer_value_score", "relationship_health_score", "churn_risk_score",
        "estimated_action_cost_brl", "expected_retention_uplift_pct",
    }
    date_fields = {"join_date", "flight_date", "booking_date", "interaction_date", "score_reference_date"}
    datetime_fields = {"scheduled_departure", "actual_departure", "scheduled_arrival", "actual_arrival"}
    anac_fields = {
        "flight_number", "origin_icao", "destination_icao", "scheduled_departure", "actual_departure",
        "scheduled_arrival", "actual_arrival", "flight_status", "departure_delay_minutes",
        "arrival_delay_minutes", "cancelled", "equipment_model", "seat_capacity", "operational_data_source",
    }
    calculated_fields = {
        "flights_3m", "flights_12m", "flights_previous_3m", "spend_12m_brl", "average_ticket_brl",
        "recency_days", "on_time_rate_12m", "average_departure_delay_minutes", "cancelled_flights_12m",
        "cancellation_rate_12m", "campaign_engagement_rate", "campaign_conversions_12m", "complaints_12m",
        "complaint_resolution_rate", "latest_nps", "customer_value_score", "relationship_health_score",
        "churn_risk_score", "value_band", "relationship_band", "next_best_experience",
        "next_best_experience_reason", "recommended_channel", "estimated_action_cost_brl",
        "expected_retention_uplift_pct", "score_reference_date",
    }

    for table, sample in table_samples.items():
        for column in sample:
            if (table, column) in existing:
                continue
            if column in boolean_fields:
                data_type = "boolean"
            elif column in integer_fields:
                data_type = "integer"
            elif column in decimal_fields:
                data_type = "decimal"
            elif column in date_fields:
                data_type = "date"
            elif column in datetime_fields:
                data_type = "datetime"
            elif column.endswith("_id") or "icao" in column or column == "flight_number":
                data_type = "string"
            else:
                data_type = "category" if column in {"synthetic_segment", "age_band", "tier_current", "preferred_channel", "trip_purpose", "interaction_type", "channel", "value_band", "relationship_band"} else "string"

            if column == "fare_reference_brl":
                nature = "ANAC aggregate"
            elif column in {"home_airport_icao", "home_city", "home_state", "flight_date"}:
                nature = "ANAC+synthetic"
            elif column in anac_fields:
                nature = "ANAC"
            elif column in calculated_fields:
                nature = "calculated"
            else:
                nature = "synthetic"
            rows.append(
                {
                    "table": table,
                    "column": column,
                    "data_type": data_type,
                    "data_nature": nature,
                    "description": descriptions.get(column, column.replace("_", " ").capitalize() + "."),
                }
            )
    return rows


def main() -> None:
    PROCESSED_ROOT.mkdir(parents=True, exist_ok=True)
    QUALITY_ROOT.mkdir(parents=True, exist_ok=True)
    customers, flights, interactions, customer_360, dictionary, manifest = build_data()

    outputs = {
        "crm_customers_mvp.csv": customers,
        "crm_flights_mvp.csv": flights,
        "crm_interactions_mvp.csv": interactions,
        "crm_customer_360_mvp.csv": customer_360,
        "crm_data_dictionary.csv": dictionary,
    }
    for name, rows in outputs.items():
        if not rows:
            raise RuntimeError(f"Saida vazia: {name}")
        write_csv(PROCESSED_ROOT / name, rows, list(rows[0]))

    customer_ids = {row["customer_id"] for row in customers}
    flight_ids = [row["customer_flight_id"] for row in flights]
    interaction_ids = [row["interaction_id"] for row in interactions]
    checks = {
        "customers_unique": len(customer_ids) == len(customers),
        "customer_flights_unique": len(set(flight_ids)) == len(flight_ids),
        "interactions_unique": len(set(interaction_ids)) == len(interaction_ids),
        "flight_foreign_keys_valid": all(row["customer_id"] in customer_ids for row in flights),
        "interaction_foreign_keys_valid": all(row["customer_id"] in customer_ids for row in interactions),
        "scores_in_range": all(
            0 <= row["customer_value_score"] <= 100
            and 0 <= row["relationship_health_score"] <= 100
            and 0 <= row["churn_risk_score"] <= 100
            for row in customer_360
        ),
    }
    quality = {
        **manifest,
        "row_counts": {name: len(rows) for name, rows in outputs.items()},
        "checks": checks,
        "status": "pass" if all(checks.values()) else "fail",
        "score_ranges": {
            "customer_value_score": [min(row["customer_value_score"] for row in customer_360), max(row["customer_value_score"] for row in customer_360)],
            "relationship_health_score": [min(row["relationship_health_score"] for row in customer_360), max(row["relationship_health_score"] for row in customer_360)],
            "churn_risk_score": [min(row["churn_risk_score"] for row in customer_360), max(row["churn_risk_score"] for row in customer_360)],
        },
        "next_best_experience_distribution": dict(Counter(row["next_best_experience"] for row in customer_360)),
    }
    (PROCESSED_ROOT / "crm_mvp_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (QUALITY_ROOT / "crm_mvp_quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": quality["status"], "row_counts": quality["row_counts"], "score_ranges": quality["score_ranges"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
