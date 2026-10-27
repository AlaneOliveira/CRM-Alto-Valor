import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CustomerExplorer } from "@/components/customer-explorer";
import type { CustomerListItem } from "@/lib/types";

function customer(index: number): CustomerListItem {
  return {
    customer_id: `C${String(index).padStart(6, "0")}`,
    home_city: index === 24 ? "Recife" : "São Paulo",
    home_state: index === 24 ? "PE" : "SP",
    tier_current: index % 2 ? "Topazio" : "Basico",
    synthetic_segment: index % 2 ? "alto_valor" : "recorrente",
    relationship_band: index % 3 === 0 ? "saudavel" : "atencao",
    customer_value_score: String(50 + index),
    relationship_health_score: String(60 + index / 2),
    churn_risk_score: String(30 + index),
    spend_12m_brl: String(1_000 + index * 100),
    next_best_experience: index % 2 ? "Protecao de jornada" : "Oferta Clube Azul",
  };
}

describe("explorador de clientes", () => {
  it("pagina a carteira e mantém o total junto aos controles", async () => {
    const user = userEvent.setup();
    render(<CustomerExplorer customers={Array.from({ length: 25 }, (_, index) => customer(index + 1))} />);

    expect(screen.getByText("25 clientes encontrados")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Abrir 360" })).toHaveLength(20);
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Abrir 360" })).toHaveLength(5);
  });

  it("filtra por busca, volta à primeira página e preserva o link do perfil", async () => {
    const user = userEvent.setup();
    render(<CustomerExplorer customers={Array.from({ length: 25 }, (_, index) => customer(index + 1))} />);

    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await user.type(screen.getByPlaceholderText("Buscar cliente, cidade ou recomendação"), "Recife");

    expect(screen.getByText("1 clientes encontrados")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByText("Recife - PE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir 360" })).toHaveAttribute("href", "/clientes/C000024");
  });

  it("combina filtros de tier e saúde", async () => {
    const user = userEvent.setup();
    render(<CustomerExplorer customers={Array.from({ length: 12 }, (_, index) => customer(index + 1))} />);
    const filters = screen.getAllByRole("combobox");

    await user.selectOptions(filters[0], "Topazio");
    await user.selectOptions(filters[2], "saudavel");

    expect(screen.getByText("2 clientes encontrados")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByText("Topázio")).toHaveLength(2);
  });
});
