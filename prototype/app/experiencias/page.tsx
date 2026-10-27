import Link from "next/link";
import { Bot, CheckCircle2, CircleDollarSign, Send, Sparkles, Target } from "lucide-react";

import { Badge, PageHeader, ProgressBar, SectionHeader, StatCard } from "@/components/ui";
import { getCustomers } from "@/lib/data";
import { actionLabel, money, number, percent } from "@/lib/format";

const numeric = (value: string) => Number(value || 0);

export default function ExperiencesPage() {
  const customers = getCustomers();
  const grouped = new Map<string, { count: number; cost: number; spend: number; risk: number; return: number; channels: Map<string, number> }>();
  customers.forEach((customer) => {
    const key = customer.next_best_experience;
    const current = grouped.get(key) ?? { count: 0, cost: 0, spend: 0, risk: 0, return: 0, channels: new Map<string, number>() };
    current.count += 1;
    current.cost += numeric(customer.estimated_action_cost_brl);
    current.spend += numeric(customer.spend_12m_brl);
    current.risk += numeric(customer.churn_risk_score);
    current.return += numeric(customer.spend_12m_brl) * numeric(customer.expected_retention_uplift_pct) / 100 - numeric(customer.estimated_action_cost_brl);
    current.channels.set(customer.recommended_channel, (current.channels.get(customer.recommended_channel) ?? 0) + 1);
    grouped.set(key, current);
  });
  const actions = [...grouped.entries()].map(([name, values]) => ({ name, ...values, averageRisk: values.risk / values.count, channel: [...values.channels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-" })).sort((a, b) => b.count - a.count);
  const totalCost = actions.reduce((sum, action) => sum + action.cost, 0);
  const totalReturn = actions.reduce((sum, action) => sum + action.return, 0);
  return <>
    <PageHeader eyebrow="Orquestração de CRM" title="Next Best Experience" description="Da análise à ação: cada cliente recebe uma experiência permitida, explicável, com canal, custo hipotético e uplift estimado." />
    <section className="stats-grid">
      <StatCard label="Jornadas disponíveis" value={number(actions.length)} detail="regras de decisão no MVP" tone="blue" />
      <StatCard label="Clientes priorizados" value={number(customers.length)} detail="uma decisão por perfil" tone="cyan" />
      <StatCard label="Investimento hipotético" value={money(totalCost, true)} detail="soma dos custos estimados" tone="amber" />
      <StatCard label="Retorno potencial" value={money(totalReturn, true)} detail="hipótese antes de experimentos" tone="green" />
    </section>
    <section className="dashboard-grid">
      <article className="card"><SectionHeader title="Distribuição das recomendações" description="Cobertura atual da carteira por jornada." /><div className="progress-list">{actions.map((action, index) => <ProgressBar key={action.name} label={actionLabel(action.name)} value={action.count} total={customers.length} color={["blue","cyan","green","amber"][index % 4]} suffix={`${number(action.count)} · ${percent(action.count / customers.length * 100)}`} />)}</div></article>
      <article className="card"><SectionHeader title="Como a decisão acontece" description="Separação de responsabilidade no MVP." /><div className="insight-list">
        <div className="insight"><span className="insight-icon"><Target size={16} /></span><div><strong>1. Motor de regras escolhe</strong><p>Valor, saúde, risco, operação e ativos de fidelidade definem a ação permitida.</p></div></div>
        <div className="insight"><span className="insight-icon"><Bot size={16} /></span><div><strong>2. Agente redige</strong><p>O agente transforma a decisão em rascunho e aplica os guardrails.</p></div></div>
        <div className="insight"><span className="insight-icon"><CheckCircle2 size={16} /></span><div><strong>3. Humano aprova</strong><p>Clientes de alto valor e ações sensíveis nunca devem ser enviados automaticamente.</p></div></div>
        <div className="insight"><span className="insight-icon"><CircleDollarSign size={16} /></span><div><strong>4. Experimento aprende</strong><p>Uplift hipotético deve ser substituído por efeito incremental observado.</p></div></div>
      </div></article>
    </section>
    <article className="card table-card"><SectionHeader title="Portfólio de jornadas" description="Impacto estimado e canal dominante por recomendação." /><div className="table-wrap"><table className="data-table"><thead><tr><th>Experiência</th><th>Clientes</th><th>Canal dominante</th><th>Risco médio</th><th>Custo estimado</th><th>Retorno potencial</th><th>Status</th><th /></tr></thead><tbody>{actions.map((action) => { const requiresApproval = action.name.includes("premium") || action.name.includes("Protecao"); return <tr key={action.name}><td><strong>{actionLabel(action.name)}</strong></td><td>{number(action.count)}</td><td>{action.channel}</td><td>{action.averageRisk.toFixed(1)}</td><td>{money(action.cost)}</td><td>{money(action.return)}</td><td><Badge tone={requiresApproval ? "warning" : "success"}>{requiresApproval ? "Aprovação humana" : "Pronto para teste"}</Badge></td><td><Link className="table-link activate" href={`/ativacoes?mode=batch&action=${encodeURIComponent(action.name)}`}>Ativar público <Send size={13} /></Link></td></tr>; })}</tbody></table></div></article>
    <div className="footer-note"><Sparkles size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> Valores de custo e uplift são premissas sintéticas, não resultados comerciais observados.</div>
  </>;
}
