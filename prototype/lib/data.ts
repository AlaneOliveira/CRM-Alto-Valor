import "server-only";

import { cache } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  BreakdownItem,
  CsvRow,
  Customer360,
  DatasetDefinition,
  DatasetId,
  OverviewData,
  RouteSummary,
} from "@/lib/types";

export const DATASETS: DatasetDefinition[] = [
  { id: "customers", label: "Clientes", file: "crm_customers_mvp.csv", description: "Cadastro e atributos sintéticos de relacionamento.", grain: "1 linha por cliente" },
  { id: "customer-360", label: "Customer 360", file: "crm_customer_360_mvp.csv", description: "Features, scores, segmentos e próxima melhor experiência.", grain: "1 linha por cliente" },
  { id: "flights", label: "Voos", file: "crm_flights_mvp.csv", description: "Jornadas sintéticas calibradas por operação e tarifas públicas.", grain: "1 linha por voo" },
  { id: "interactions", label: "Interações", file: "crm_interactions_mvp.csv", description: "Campanhas, respostas, reclamações e NPS sintéticos.", grain: "1 linha por interação" },
  { id: "dictionary", label: "Dicionário", file: "crm_data_dictionary.csv", description: "Definições, tipos e natureza de cada campo.", grain: "1 linha por campo" },
];

function processedDirectory() {
  const current = process.cwd();
  return current.endsWith(`${path.sep}prototype`)
    ? path.resolve(current, "..", "docs", "anac-data", "processed")
    : path.resolve(current, "docs", "anac-data", "processed");
}

function parseDelimited(content: string, delimiter = ";") {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = content.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const readDatasetFile = cache((file: string): CsvRow[] => {
  const content = readFileSync(path.join(processedDirectory(), file), "utf8");
  const [headers, ...records] = parseDelimited(content);
  return records.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
});

const numeric = (value: string | undefined) => Number(value || 0);

export const getCustomers = cache(() =>
  readDatasetFile("crm_customer_360_mvp.csv") as Customer360[],
);

function breakdown(rows: Customer360[], field: keyof Customer360): BreakdownItem[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row[field], (counts.get(row[field]) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: (count / rows.length) * 100 }))
    .sort((a, b) => b.count - a.count);
}

export const getRouteSummaries = cache((): RouteSummary[] => {
  const flights = readDatasetFile("crm_flights_mvp.csv");
  const routes = new Map<string, { origin: string; destination: string; flights: number; cancelled: number; delay: number; fare: number; business: number; customers: Set<string> }>();
  flights.forEach((flight) => {
    const route = `${flight.origin_icao}-${flight.destination_icao}`;
    const current = routes.get(route) ?? { origin: flight.origin_icao, destination: flight.destination_icao, flights: 0, cancelled: 0, delay: 0, fare: 0, business: 0, customers: new Set<string>() };
    current.flights += 1;
    current.cancelled += numeric(flight.cancelled);
    current.delay += numeric(flight.departure_delay_minutes);
    current.fare += numeric(flight.fare_paid_brl);
    current.business += flight.trip_purpose === "business" ? 1 : 0;
    current.customers.add(flight.customer_id);
    routes.set(route, current);
  });
  return [...routes.entries()]
    .map(([route, values]) => ({
      route,
      origin: values.origin,
      destination: values.destination,
      flights: values.flights,
      customers: values.customers.size,
      cancellationRate: (values.cancelled / values.flights) * 100,
      averageDelay: values.delay / values.flights,
      averageFare: values.fare / values.flights,
      businessShare: (values.business / values.flights) * 100,
    }))
    .sort((a, b) => b.flights - a.flights);
});

export const getOverview = cache((): OverviewData => {
  const customers = getCustomers();
  const highValue = customers.filter((customer) => numeric(customer.customer_value_score) >= 70);
  const highValueAttention = highValue.filter((customer) => numeric(customer.relationship_health_score) < 70);
  const valueAtRisk = customers.reduce((sum, customer) => sum + numeric(customer.spend_12m_brl) * numeric(customer.churn_risk_score) / 100, 0);
  const expectedReturn = customers.reduce((sum, customer) => sum + numeric(customer.spend_12m_brl) * numeric(customer.expected_retention_uplift_pct) / 100 - numeric(customer.estimated_action_cost_brl), 0);
  const totalSpend = customers.reduce((sum, customer) => sum + numeric(customer.spend_12m_brl), 0);
  const average = (field: keyof Customer360) => customers.reduce((sum, customer) => sum + numeric(customer[field]), 0) / customers.length;
  const priorityCustomers = [...customers]
    .sort((a, b) => numeric(b.spend_12m_brl) * numeric(b.churn_risk_score) - numeric(a.spend_12m_brl) * numeric(a.churn_risk_score))
    .slice(0, 8);
  return {
    referenceDate: customers[0]?.score_reference_date ?? "",
    customers: customers.length,
    highValue: highValue.length,
    highValueAttention: highValueAttention.length,
    valueAtRisk,
    expectedReturn,
    operationalExposure: customers.filter((customer) => numeric(customer.cancelled_flights_12m) > 0 || numeric(customer.average_departure_delay_minutes) >= 45).length,
    totalSpend,
    averageNps: average("latest_nps"),
    averageHealth: average("relationship_health_score"),
    averageValue: average("customer_value_score"),
    averageRisk: average("churn_risk_score"),
    segments: breakdown(customers, "synthetic_segment"),
    experiences: breakdown(customers, "next_best_experience"),
    tiers: breakdown(customers, "tier_current"),
    priorityCustomers,
    routes: getRouteSummaries().slice(0, 10),
  };
});

export const getCustomerDetail = cache((customerId: string) => {
  const customer = getCustomers().find((row) => row.customer_id === customerId);
  if (!customer) return null;
  const flights = readDatasetFile("crm_flights_mvp.csv")
    .filter((row) => row.customer_id === customerId)
    .sort((a, b) => b.flight_date.localeCompare(a.flight_date));
  const interactions = readDatasetFile("crm_interactions_mvp.csv")
    .filter((row) => row.customer_id === customerId)
    .sort((a, b) => b.interaction_date.localeCompare(a.interaction_date));
  return { customer, flights, interactions };
});

export function getDatasetDefinition(datasetId: string) {
  return DATASETS.find((dataset) => dataset.id === datasetId);
}

export const getDatasetCounts = cache(() =>
  DATASETS.map((dataset) => ({ ...dataset, count: readDatasetFile(dataset.file).length })),
);

export function getDatasetPage(datasetId: DatasetId, page: number, query: string, pageSize = 50) {
  const definition = getDatasetDefinition(datasetId);
  if (!definition) return null;
  const allRows = readDatasetFile(definition.file);
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = normalizedQuery
    ? allRows.filter((row) => Object.values(row).some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery)))
    : allRows;
  const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize))));
  return {
    definition,
    columns: Object.keys(allRows[0] ?? {}),
    rows: filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    total: filtered.length,
    page: safePage,
    pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    pageSize,
  };
}
