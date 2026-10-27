import Link from "next/link";

import { Badge } from "@/components/ui";
import { actionLabel, money, tierLabel } from "@/lib/format";
import type { Customer360 } from "@/lib/types";

export function PriorityTable({ customers }: { customers: Customer360[] }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Cliente</th><th>Valor</th><th>Saúde</th><th>Risco</th><th>Valor em risco</th><th>Recomendação</th><th /></tr></thead><tbody>{customers.map((customer) => {
    const risk = Number(customer.churn_risk_score);
    const health = Number(customer.relationship_health_score);
    const valueAtRisk = Number(customer.spend_12m_brl) * risk / 100;
    return <tr key={customer.customer_id}><td><div className="customer-cell"><span className="customer-avatar">{customer.customer_id.slice(-3)}</span><div><strong>{customer.customer_id}</strong><span>{customer.home_city} - {tierLabel(customer.tier_current)}</span></div></div></td><td><strong>{Number(customer.customer_value_score).toFixed(1)}</strong></td><td><Badge tone={health >= 70 ? "success" : health >= 45 ? "warning" : "danger"}>{health.toFixed(1)}</Badge></td><td><div className="risk-cell"><span>{risk.toFixed(1)}</span><span className="mini-track"><i style={{ width: `${risk}%` }} /></span></div></td><td>{money(valueAtRisk)}</td><td>{actionLabel(customer.next_best_experience)}</td><td><span className="table-actions"><Link className="table-link" href={`/clientes/${customer.customer_id}`}>Analisar</Link><Link className="table-link activate" href={`/ativacoes?customer=${customer.customer_id}`}>Ativar</Link></span></td></tr>;
  })}</tbody></table></div>;
}
