"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui";
import { actionLabel, money, number, tierLabel } from "@/lib/format";
import type { CustomerListItem } from "@/lib/types";

const PAGE_SIZE = 20;
const numeric = (value: string) => Number(value || 0);

function relationshipTone(value: string): "success" | "warning" | "danger" {
  return value === "saudavel" ? "success" : value === "atencao" ? "warning" : "danger";
}

export function CustomerExplorer({ customers }: { customers: CustomerListItem[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [segment, setSegment] = useState("");
  const [health, setHealth] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return customers
      .filter((customer) => !normalized || [customer.customer_id, customer.home_city, customer.home_state, customer.next_best_experience, actionLabel(customer.next_best_experience)].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized)))
      .filter((customer) => !tier || customer.tier_current === tier)
      .filter((customer) => !segment || customer.synthetic_segment === segment)
      .filter((customer) => !health || customer.relationship_band === health)
      .sort((a, b) => numeric(b.spend_12m_brl) * numeric(b.churn_risk_score) - numeric(a.spend_12m_brl) * numeric(a.churn_risk_score));
  }, [customers, health, query, segment, tier]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const update = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };

  return <>
    <div className="toolbar">
      <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => update(setQuery, event.target.value)} placeholder="Buscar cliente, cidade ou recomendação" /></label>
      <select className="filter-select" value={tier} onChange={(event) => update(setTier, event.target.value)}><option value="">Todos os tiers</option>{[...new Set(customers.map((customer) => customer.tier_current))].map((value) => <option key={value} value={value}>{tierLabel(value)}</option>)}</select>
      <select className="filter-select" value={segment} onChange={(event) => update(setSegment, event.target.value)}><option value="">Todos os segmentos</option>{[...new Set(customers.map((customer) => customer.synthetic_segment))].map((value) => <option key={value}>{value}</option>)}</select>
      <select className="filter-select" value={health} onChange={(event) => update(setHealth, event.target.value)}><option value="">Toda saúde</option><option value="saudavel">Saudável</option><option value="atencao">Atenção</option><option value="critico">Crítico</option></select>
    </div>
    <div className="table-card card">
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Cliente</th><th>Segmento</th><th>Tier</th><th>Valor</th><th>Saúde</th><th>Risco</th><th>Gasto 12m</th><th>Próxima experiência</th><th /></tr></thead><tbody>
        {rows.map((customer) => {
          const risk = numeric(customer.churn_risk_score);
          return <tr key={customer.customer_id}><td><div className="customer-cell"><span className="customer-avatar">{customer.customer_id.slice(-3)}</span><div><strong>{customer.customer_id}</strong><span>{customer.home_city} - {customer.home_state}</span></div></div></td><td>{customer.synthetic_segment.replaceAll("_", " ")}</td><td><Badge tone="info">{tierLabel(customer.tier_current)}</Badge></td><td><strong>{numeric(customer.customer_value_score).toFixed(1)}</strong></td><td><Badge tone={relationshipTone(customer.relationship_band)}>{customer.relationship_band}</Badge></td><td><div className="risk-cell"><span>{risk.toFixed(1)}</span><span className="mini-track"><i style={{ width: `${risk}%` }} /></span></div></td><td>{money(numeric(customer.spend_12m_brl))}</td><td>{actionLabel(customer.next_best_experience)}</td><td><Link className="table-link customer-open-button" href={`/clientes/${customer.customer_id}`}>Abrir 360</Link></td></tr>;
        })}
      </tbody></table></div>
      <div className="pagination"><span className="pagination-summary">{number(filtered.length)} clientes encontrados</span><div className="pagination-actions"><button className="button secondary" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button><span className="pagination-page">Página {safePage} de {pages}</span><button className="button secondary" disabled={safePage === pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Próxima</button></div></div>
    </div>
  </>;
}
