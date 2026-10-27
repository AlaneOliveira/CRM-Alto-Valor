import type { ActivationCandidate, ActivationStatus } from "@/lib/types";

export const ACTIVATION_STORAGE_KEY = "crm-alto-valor.activations.v1";

export function requiresHumanApproval(candidate: ActivationCandidate) {
  return candidate.valueScore >= 70 || ["Recuperacao premium", "Protecao de jornada"].includes(candidate.action);
}

export function buildDraft(candidate: ActivationCandidate) {
  const messages: Record<string, string> = {
    "Recuperacao premium": "Olá! Sua experiência recente ficou abaixo do que você merece. Um especialista vai acompanhar sua próxima jornada e oferecer atendimento prioritário.",
    "Protecao de jornada": "Olá! Sabemos que sua jornada recente teve uma irregularidade. Priorizamos seu atendimento e estamos preparados para apoiar sua próxima viagem.",
    "Reconhecimento exclusivo": "Olá! Obrigado por escolher a Azul. Preparamos um reconhecimento especial para valorizar sua próxima experiência conosco.",
    "Oferta Cartao Azul Itau": "Olá! Sua frequência de viagens pode gerar ainda mais benefícios. Conheça as possibilidades do Cartão Azul Itaú para acumular pontos.",
    "Oferta Clube Azul": "Olá! Sua recorrência pode render benefícios todos os meses. Conheça as vantagens do Clube Azul para suas próximas viagens.",
    "Reativacao personalizada": "Olá! Faz um tempo que não viajamos juntos. Preparamos uma experiência alinhada ao seu histórico para receber você novamente.",
    "Acelerador de tier": "Olá! Você está avançando no Azul Fidelidade. Continue sua jornada para chegar ao próximo nível e desbloquear novos benefícios.",
  };
  return messages[candidate.action] ?? "Olá! Preparamos uma experiência personalizada para sua próxima jornada com a Azul.";
}

export function messageViolation(message: string) {
  if (message.trim().length < 20) return "A mensagem está curta demais para contextualizar a ação.";
  if (message.length > 500) return "A mensagem ultrapassa o limite de 500 caracteres.";
  if (/R\$|\d+%|desconto de|grátis/i.test(message)) return "O texto promete valor, percentual ou desconto não autorizado.";
  return null;
}

export const STATUS_LABELS: Record<ActivationStatus, string> = {
  sent: "Envio simulado",
  delivered: "Entregue",
  opened: "Aberto",
  converted: "Convertido",
};

export const STATUS_ORDER: ActivationStatus[] = ["sent", "delivered", "opened", "converted"];

export function nextStatus(status: ActivationStatus) {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[Math.min(index + 1, STATUS_ORDER.length - 1)];
}
