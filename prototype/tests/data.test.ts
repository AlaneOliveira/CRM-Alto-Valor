import { describe, expect, it } from "vitest";

import {
  getCustomerDetail,
  getCustomers,
  getDatasetPage,
  getOverview,
  getRouteSummaries,
} from "@/lib/data";

const numeric = (value: string) => Number(value || 0);

describe("camada de dados processados", () => {
  it("carrega clientes sintéticos com IDs únicos", () => {
    const customers = getCustomers();
    expect(customers.length).toBeGreaterThan(0);
    expect(new Set(customers.map((customer) => customer.customer_id)).size).toBe(customers.length);
    expect(customers[0]).toHaveProperty("next_best_experience");
  });

  it("calcula uma visão executiva consistente", () => {
    const customers = getCustomers();
    const overview = getOverview();
    const segmentShare = overview.segments.reduce((sum, item) => sum + item.share, 0);

    expect(overview.customers).toBe(customers.length);
    expect(segmentShare).toBeCloseTo(100, 6);
    expect(Number.isFinite(overview.valueAtRisk)).toBe(true);
    expect(Number.isFinite(overview.expectedReturn)).toBe(true);

    const priorities = overview.priorityCustomers.map(
      (customer) => numeric(customer.spend_12m_brl) * numeric(customer.churn_risk_score),
    );
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
  });

  it("retorna o perfil 360 e apenas eventos do cliente solicitado", () => {
    const customer = getCustomers()[0];
    const detail = getCustomerDetail(customer.customer_id);

    expect(detail?.customer.customer_id).toBe(customer.customer_id);
    expect(detail?.flights.every((flight) => flight.customer_id === customer.customer_id)).toBe(true);
    expect(detail?.interactions.every((interaction) => interaction.customer_id === customer.customer_id)).toBe(true);
    expect(getCustomerDetail("CLIENTE-INEXISTENTE")).toBeNull();
  });

  it("filtra e limita páginas do catálogo", () => {
    const customerId = getCustomers()[0].customer_id;
    const filtered = getDatasetPage("customer-360", 999, customerId, 10);

    expect(filtered).not.toBeNull();
    expect(filtered?.total).toBeGreaterThan(0);
    expect(filtered?.page).toBe(filtered?.pages);
    expect(filtered?.rows.every((row) => Object.values(row).some((value) => value.includes(customerId)))).toBe(true);
    expect(getDatasetPage("dataset-inexistente" as never, 1, "")).toBeNull();
  });

  it("agrega rotas em ordem decrescente de recorrência", () => {
    const routes = getRouteSummaries();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((route) => route.flights > 0 && route.customers > 0)).toBe(true);
    expect(routes.map((route) => route.flights)).toEqual(
      [...routes.map((route) => route.flights)].sort((a, b) => b - a),
    );
  });
});
