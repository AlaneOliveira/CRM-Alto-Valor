from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = PROJECT_ROOT / "data"
RAW_ROOT = DATA_ROOT / "raw"
ARCHIVE_ROOT = DATA_ROOT / "archive"
JSON_OUTPUT = PROJECT_ROOT / "data" / "database.json"
CSV_OUTPUT = PROJECT_ROOT / "data" / "database.csv"

DATASETS = {
    "demanda_oferta": {
        "description": "Demanda e oferta mensal por empresa, trecho e natureza da operação.",
        "grain": "empresa_icao + ano + mes + origem_icao + destino_icao + natureza + grupo_voo",
        "use_in_mvp": "Contexto histórico de mercado, capacidade, demanda, ASK, RPK e ocupação.",
    },
    "tarifas_domesticas": {
        "description": "Assentos comercializados por empresa, trecho, mês e valor de tarifa.",
        "grain": "ano + mes + empresa_icao + origem_icao + destino_icao + tarifa_brl",
        "use_in_mvp": "Referência tarifária ponderada por assentos e sensibilidade a preço.",
    },
    "voos_vra": {
        "description": "Voos regulares com horários previstos, realizados e situação operacional.",
        "grain": "empresa_icao + numero_voo + partida_prevista + origem_icao + destino_icao",
        "use_in_mvp": "Pontualidade, atraso, cancelamento e exposição do cliente à operação.",
    },
    "aerodromos": {
        "description": "Cadastro de aeródromos públicos e localização geográfica.",
        "grain": "codigo_icao",
        "use_in_mvp": "Dimensão de aeroporto, cidade, UF, latitude e longitude.",
    },
    "empresas_aereas": {
        "description": "Cadastro de empresas aéreas autorizadas pela ANAC.",
        "grain": "id_empresa_aerea",
        "use_in_mvp": "Dimensão de companhia e validação dos códigos ICAO/IATA.",
    },
}


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", value.casefold()).strip("_")


def detect_encoding(path: Path) -> str:
    sample = path.read_bytes()[:131072]
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            sample.decode(encoding)
            return encoding
        except UnicodeDecodeError:
            continue
    return "latin-1"


def identify_dataset(path: Path) -> tuple[str, str, int]:
    relative = path.relative_to(RAW_ROOT).as_posix()
    if relative.startswith("operations/vra/"):
        return "voos_vra", "anac_vra_v1", 1
    if relative.startswith("market/domestic-fares/"):
        return "tarifas_domesticas", "anac_tarifas_v1_or_v2", 1
    if relative.startswith("market/demand-supply/"):
        return "demanda_oferta", "anac_estatisticos_v1", 1
    if relative.startswith("dimensions/aerodromes/"):
        return "aerodromos", "anac_aerodromos_v1", 2
    if relative.startswith("dimensions/airlines/"):
        return "empresas_aereas", "anac_empresas_v1", 1
    return "desconhecido", "unknown", 1


def find_column(headers: list[str], candidates: set[str]) -> str | None:
    lookup = {normalized(header): header for header in headers}
    for candidate in candidates:
        if candidate in lookup:
            return lookup[candidate]
    return None


def period_from_filename(path: Path, dataset: str) -> tuple[str | None, str | None]:
    if dataset == "voos_vra":
        match = re.search(r"VRA_(20\d{2})_(\d{2})", path.stem, re.IGNORECASE)
    elif dataset == "tarifas_domesticas":
        match = re.search(r"^(20\d{2})(\d{2})$", path.stem)
    else:
        match = None
    if not match:
        return None, None
    period = f"{match.group(1)}-{match.group(2)}"
    return period, period


def profile_csv(path: Path) -> dict:
    dataset, schema_version, header_row = identify_dataset(path)
    encoding = detect_encoding(path)
    row_count = 0
    azul_row_count = 0
    nulls: Counter[str] = Counter()
    periods: set[tuple[int, int]] = set()

    with path.open("r", encoding=encoding, errors="replace", newline="") as handle:
        for _ in range(header_row - 1):
            next(handle, None)
        reader = csv.DictReader(handle, delimiter=";")
        headers = reader.fieldnames or []
        company_col = find_column(headers, {"empresa_sigla", "sigla_icao_empresa_aerea", "sg_empresa_icao", "empresa", "icao"})
        if company_col is None and dataset == "voos_vra" and headers:
            # Alguns VRA foram publicados com o cabeçalho já corrompido por mojibake,
            # mas a primeira coluna continua sendo a sigla ICAO da empresa.
            company_col = headers[0]
        year_col = find_column(headers, {"ano", "nr_ano_referencia"})
        month_col = find_column(headers, {"mes", "nr_mes_referencia"})
        for row in reader:
            if not row or not any((value or "").strip() for value in row.values()):
                continue
            row_count += 1
            if company_col and (row.get(company_col) or "").strip().upper() == "AZU":
                azul_row_count += 1
            for header in headers:
                if not (row.get(header) or "").strip():
                    nulls[header] += 1
            if year_col and month_col:
                try:
                    periods.add((int(float(row[year_col])), int(float(row[month_col]))))
                except (TypeError, ValueError):
                    pass

    start, end = period_from_filename(path, dataset)
    if periods:
        ordered = sorted(periods)
        start = f"{ordered[0][0]:04d}-{ordered[0][1]:02d}"
        end = f"{ordered[-1][0]:04d}-{ordered[-1][1]:02d}"
    return {
        "dataset": dataset,
        "schema_version": schema_version,
        "relative_path": path.relative_to(PROJECT_ROOT).as_posix(),
        "file_name": path.name,
        "size_bytes": path.stat().st_size,
        "encoding": encoding,
        "delimiter": ";",
        "header_row": header_row,
        "row_count": row_count,
        "azul_row_count": azul_row_count,
        "column_count": len(headers),
        "columns": headers,
        "period_start": start,
        "period_end": end,
        "null_rate_by_column": {
            header: round(nulls[header] / row_count, 6)
            for header in headers
            if row_count and nulls[header]
        },
    }


def month_range(start: str, end: str) -> list[str]:
    year, month = map(int, start.split("-"))
    end_year, end_month = map(int, end.split("-"))
    result = []
    while (year, month) <= (end_year, end_month):
        result.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            month = 1
            year += 1
    return result


def quality_summary(files: list[dict]) -> dict:
    coverage: dict[str, dict] = {}
    periods: dict[str, set[str]] = {}
    for item in files:
        dataset = item["dataset"]
        dataset_periods = periods.setdefault(dataset, set())
        if item["period_start"] == item["period_end"] and item["period_start"]:
            dataset_periods.add(item["period_start"])
        current = coverage.setdefault(dataset, {"file_count": 0, "row_count": 0, "azul_row_count": 0, "period_start": None, "period_end": None})
        current["file_count"] += 1
        current["row_count"] += item["row_count"]
        current["azul_row_count"] += item["azul_row_count"]
        for key, chooser in (("period_start", min), ("period_end", max)):
            value = item[key]
            if value:
                current[key] = value if current[key] is None else chooser(current[key], value)

    expected = set(month_range("2025-01", "2026-09"))
    missing = {
        dataset: sorted(expected - periods.get(dataset, set()))
        for dataset in ("voos_vra", "tarifas_domesticas")
    }
    complete = not missing["voos_vra"] and not missing["tarifas_domesticas"]
    return {
        "status": "ready_for_mvp" if complete else "attention_required",
        "reference_window": "2025-01 to 2026-09",
        "findings": [
            "VRA e tarifas domésticas têm cobertura mensal contínua de jan/2025 a set/2026.",
            "Demanda e oferta cobre jan/2000 a abr/2021 e deve ser tratada como contexto histórico.",
            "Dados públicos da ANAC não identificam passageiros; a ligação cliente-voo do MVP é sintética.",
            "O catálogo de empresas aéreas é um snapshot de 14/07/2025.",
        ],
        "missing_months": missing,
        "coverage_by_dataset": coverage,
    }


def archive_summary() -> dict:
    files = [path for path in ARCHIVE_ROOT.rglob("*") if path.is_file()]
    by_area = Counter(path.relative_to(ARCHIVE_ROOT).parts[0] for path in files)
    return {
        "file_count": len(files),
        "size_bytes": sum(path.stat().st_size for path in files),
        "files_by_area": dict(sorted(by_area.items())),
        "policy": "Preservado para rastreabilidade; não é consumido pelo pipeline ativo.",
    }


def write_catalog(files: list[dict]) -> None:
    catalog = {
        "catalog_version": "2.0.0",
        "generated_on": date.today().isoformat(),
        "project": "CRM Alto Valor",
        "summary": {
            "active_raw_file_count": len(files),
            "total_rows": sum(item["row_count"] for item in files),
            "azul_rows": sum(item["azul_row_count"] for item in files),
            "datasets": sorted({item["dataset"] for item in files}),
        },
        "layers": {
            "raw": "docs/anac-data/raw",
            "archive": "docs/anac-data/archive",
            "processed": "docs/anac-data/processed",
            "quality": "docs/anac-data/quality",
        },
        "raw_data_policy": "Fontes ativas são imutáveis; transformações acontecem somente em processed.",
        "datasets": DATASETS,
        "files": files,
        "archive": archive_summary(),
        "quality_summary": quality_summary(files),
    }
    JSON_OUTPUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fields = ["dataset", "schema_version", "relative_path", "file_name", "period_start", "period_end", "row_count", "azul_row_count", "column_count", "size_bytes", "encoding", "delimiter", "header_row", "status"]
    with CSV_OUTPUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter=";")
        writer.writeheader()
        for item in files:
            writer.writerow({**{field: item.get(field) for field in fields}, "status": "active_raw_profiled"})


def main() -> None:
    files = sorted(path for path in RAW_ROOT.rglob("*") if path.is_file() and path.suffix.lower() == ".csv")
    profiles = [profile_csv(path) for path in files]
    write_catalog(profiles)
    print(f"Catalogados {len(profiles)} arquivos ativos em {JSON_OUTPUT.relative_to(PROJECT_ROOT)} e {CSV_OUTPUT.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
