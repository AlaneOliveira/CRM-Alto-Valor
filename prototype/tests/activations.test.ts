import { describe, expect, it } from "vitest";

import {
  buildDraft,
  messageViolation,
  nextStatus,
  requiresHumanApproval,
  STATUS_LABELS,
} from "@/lib/activations";
import type { ActivationCandidate } from "@/lib/types";

function candidate(overrides: Partial<ActivationCandidate> = {}): ActivationCandidate {
  return {
    customerId: "C000001",
    city: "Campinas",
    state: "SP",
    tier: "Topazio",
    consent: true,
    action: "Oferta Clube Azul",
    reason: "Cliente recorrente sem assinatura.",
    recommendedChannel: "WhatsApp",
    actionCost: 20,
    expectedUplift: 8,
    spend: 2_000,
    valueScore: 60,
    healthScore: 65,
    riskScore: 45,
    flights12m: 7,
    ...overrides,
  };
}

describe("regras de ativação", () => {
  it("exige aprovação para cliente de alto valor", () => {
    expect(requiresHumanApproval(candidate({ valueScore: 70 }))).toBe(true);
    expect(requiresHumanApproval(candidate({ valueScore: 69.9 }))).toBe(false);
  });

  it.each(["Recuperacao premium", "Protecao de jornada"])(
    "exige aprovação para a jornada sensível %s",
    (action) => {
      expect(requiresHumanApproval(candidate({ action, valueScore: 30 }))).toBe(true);
    },
  );

  it("gera um rascunho específico e possui fallback seguro", () => {
    expect(buildDraft(candidate({ action: "Recuperacao premium" }))).toContain("atendimento prioritário");
    expect(buildDraft(candidate({ action: "Jornada ainda não catalogada" }))).toContain("experiência personalizada");
  });
});

describe("guardrails de mensagem", () => {
  it("rejeita mensagens curtas ou longas demais", () => {
    expect(messageViolation("Mensagem curta")).toContain("curta demais");
    expect(messageViolation("a".repeat(501))).toContain("500 caracteres");
  });

  it.each([
    "Ganhe R$ 100 na próxima viagem com a Azul.",
    "Receba 20% de benefício na sua próxima viagem.",
    "Você tem desconto de vinte reais na próxima jornada.",
    "Seu embarque será grátis na próxima viagem com a Azul.",
  ])("bloqueia promessa comercial não autorizada: %s", (message) => {
    expect(messageViolation(message)).toContain("não autorizado");
  });

  it("aceita uma comunicação contextual sem promessa indevida", () => {
    expect(messageViolation(buildDraft(candidate()))).toBeNull();
  });
});

describe("ciclo de status", () => {
  it("avança até conversão e mantém o estado terminal", () => {
    expect(nextStatus("sent")).toBe("delivered");
    expect(nextStatus("delivered")).toBe("opened");
    expect(nextStatus("opened")).toBe("converted");
    expect(nextStatus("converted")).toBe("converted");
    expect(STATUS_LABELS.converted).toBe("Convertido");
  });
});
