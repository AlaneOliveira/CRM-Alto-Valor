import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActivationCenter } from "@/components/activation-center";
import { ACTIVATION_STORAGE_KEY } from "@/lib/activations";
import type { ActivationCandidate, ActivationRecord } from "@/lib/types";

function candidate(overrides: Partial<ActivationCandidate> = {}): ActivationCandidate {
  return {
    customerId: "C000700",
    city: "Belo Horizonte",
    state: "MG",
    tier: "Diamante",
    consent: true,
    action: "Recuperacao premium",
    reason: "Alto valor com atrito operacional recente.",
    recommendedChannel: "WhatsApp",
    actionCost: 280,
    expectedUplift: 12,
    spend: 5_000,
    valueScore: 82,
    healthScore: 48,
    riskScore: 76,
    flights12m: 10,
    ...overrides,
  };
}

async function advanceToGuardrails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await screen.findByRole("heading", { name: "Prepare a comunicação" });
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Rascunho do agente" })).not.toHaveValue(""));
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await screen.findByRole("heading", { name: "Valide os guardrails" });
}

describe("central de ativação", () => {
  it("abre o histórico por padrão e mantém nova ativação como segunda aba", () => {
    render(<ActivationCenter candidates={[candidate()]} initialMode="individual" />);

    expect(screen.getByText("Histórico e auditoria")).toBeInTheDocument();
    const tabs = screen.getAllByRole("button").slice(0, 2);
    expect(tabs[0]).toHaveTextContent("Histórico");
    expect(tabs[1]).toHaveTextContent("Nova ativação");
  });

  it("executa aprovação, envio simulado e ciclo de conversão", async () => {
    const user = userEvent.setup();
    render(<ActivationCenter candidates={[candidate()]} initialMode="individual" initialCustomerId="C000700" />);

    await advanceToGuardrails(user);
    expect(screen.getByText("Obrigatória por valor ou sensibilidade da jornada.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Registrar aprovação" }));
    expect(screen.getByRole("button", { name: "Aprovado" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByRole("heading", { name: "Revise e simule o envio" })).toBeInTheDocument();
    expect(screen.getByText("R$ 280,00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /simular envio/i }));
    expect(await screen.findByText("Histórico e auditoria")).toBeInTheDocument();
    expect(screen.getByText("Envio simulado")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(ACTIVATION_STORAGE_KEY) ?? "[]") as ActivationRecord[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ status: "sent", approved: true, audienceCount: 1 });

    await user.click(screen.getByRole("button", { name: "Simular entrega" }));
    expect(screen.getByText("Entregue")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simular abertura" }));
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simular conversão" }));
    expect(screen.getByText("Convertido")).toBeInTheDocument();
    expect(screen.getByText("Ciclo concluído")).toBeInTheDocument();
  });

  it("bloqueia o avanço quando o cliente não possui consentimento", async () => {
    const user = userEvent.setup();
    render(<ActivationCenter candidates={[candidate({ consent: false, valueScore: 55, action: "Oferta Clube Azul" })]} initialMode="individual" initialCustomerId="C000700" />);

    await advanceToGuardrails(user);

    expect(screen.getByText("Cliente bloqueado: nenhuma mensagem pode ser enviada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  });

  it("impede seguir quando a mensagem viola os guardrails", async () => {
    const user = userEvent.setup();
    render(<ActivationCenter candidates={[candidate({ valueScore: 55, action: "Oferta Clube Azul" })]} initialMode="individual" initialCustomerId="C000700" />);

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    const editor = await screen.findByRole("textbox", { name: "Rascunho do agente" });
    await user.clear(editor);
    await user.type(editor, "Você receberá desconto de vinte reais na próxima viagem.");

    expect(screen.getByText("O texto promete valor, percentual ou desconto não autorizado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  });
});
