export function money(value: number, compact = false) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value || 0);
}

export function number(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value || 0);
}

export function percent(value: number, maximumFractionDigits = 1) {
  return `${number(value, maximumFractionDigits)}%`;
}

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const ACTION_LABELS: Record<string, string> = {
  "Oferta Cartao Azul Itau": "Oferta Cartão Azul Itaú",
  "Protecao de jornada": "Proteção de jornada",
  "Reativacao personalizada": "Reativação personalizada",
  "Recuperacao premium": "Recuperação premium",
};

export function actionLabel(value: string) {
  return ACTION_LABELS[value] ?? value;
}

export function tierLabel(value: string) {
  return ({ Basico: "Básico", Topazio: "Topázio" } as Record<string, string>)[value] ?? value;
}

export function isoToBr(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
