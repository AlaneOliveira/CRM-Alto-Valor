import { describe, expect, it } from "vitest";

import { actionLabel, humanize, isoToBr, money, number, percent, tierLabel } from "@/lib/format";

describe("formatação para pt-BR", () => {
  it("formata moeda, números e percentuais", () => {
    expect(money(1234.56).replace(/\s/g, " ")).toMatch(/R\$ ?1\.234,56/);
    expect(number(1234.56, 1)).toBe("1.234,6");
    expect(percent(12.34)).toBe("12,3%");
  });

  it("humaniza nomes técnicos e datas ISO", () => {
    expect(humanize("relationship_health_score")).toBe("Relationship Health Score");
    expect(isoToBr("2026-10-26")).toBe("26/10/2026");
    expect(isoToBr("inválida")).toBe("inválida");
  });

  it("traduz ações e tiers conhecidos sem alterar valores desconhecidos", () => {
    expect(actionLabel("Oferta Cartao Azul Itau")).toBe("Oferta Cartão Azul Itaú");
    expect(tierLabel("Topazio")).toBe("Topázio");
    expect(actionLabel("Ação customizada")).toBe("Ação customizada");
  });
});
