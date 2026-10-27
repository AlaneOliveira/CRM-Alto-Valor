import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, Clock3, Mail, MapPin, Plane, Send, ShieldCheck } from "lucide-react";

import { Badge, ProgressBar, ScoreRing, SectionHeader } from "@/components/ui";
import { getCustomerDetail } from "@/lib/data";
import { actionLabel, isoToBr, money, number, percent, tierLabel } from "@/lib/format";

const numeric = (value: string | undefined) => Number(value || 0);

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getCustomerDetail(id);
  if (!detail) notFound();
  const { customer, flights, interactions } = detail;
  const valueAtRisk = numeric(customer.spend_12m_brl) * numeric(customer.churn_risk_score) / 100;
  const valueDrivers = [
    { label: "Gasto 12 meses", value: Math.min(100, numeric(customer.spend_12m_brl) / 100) },
    { label: "Frequência", value: Math.min(100, numeric(customer.flights_12m) * 7) },
    { label: "Recência", value: Math.max(0, 100 - numeric(customer.recency_days) / 3.65) },
    { label: "Ativos de fidelidade", value: numeric(customer.clube_azul_subscriber) * 40 + numeric(customer.azul_itau_card) * 40 + Math.min(20, numeric(customer.points_balance) / 1500) },
  ];
  const healthDrivers = [
    { label: "NPS", value: numeric(customer.latest_nps) * 10 },
    { label: "Pontualidade", value: numeric(customer.on_time_rate_12m) * 100 },
    { label: "Engajamento", value: numeric(customer.campaign_engagement_rate) * 100 },
    { label: "Sem cancelamento", value: (1 - numeric(customer.cancellation_rate_12m)) * 100 },
  ];
  return <>
    <Link className="button ghost" href="/clientes"><ArrowLeft size={15} /> Voltar para clientes</Link>
    <section className="detail-header" style={{ marginTop: 15 }}>
      <article className="card profile-card"><div className="profile-avatar">{customer.customer_id.slice(-3)}</div><div><h1>{customer.customer_id}</h1><p><MapPin size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />{customer.home_city} - {customer.home_state} · Base {customer.home_airport_icao}</p><div className="profile-tags"><Badge tone="info">{tierLabel(customer.tier_current)}</Badge><Badge tone={customer.relationship_band === "saudavel" ? "success" : customer.relationship_band === "atencao" ? "warning" : "danger"}>{customer.relationship_band}</Badge><Badge>{customer.synthetic_segment.replaceAll("_", " ")}</Badge></div></div></article>
      <article className="card nbe-card"><span>Next Best Experience</span><h2>{actionLabel(customer.next_best_experience)}</h2><p>{customer.next_best_experience_reason}</p><div className="nbe-meta"><div>Canal<strong>{customer.recommended_channel}</strong></div><div>Custo estimado<strong>{money(numeric(customer.estimated_action_cost_brl))}</strong></div><div>Uplift hipotético<strong>{percent(numeric(customer.expected_retention_uplift_pct))}</strong></div></div><Link className="button nbe-action" href={`/ativacoes?customer=${customer.customer_id}`}>Criar ativação <Send size={15} /></Link></article>
    </section>
    <section className="stats-grid">
      <article className="card"><ScoreRing value={numeric(customer.customer_value_score)} label="Customer Value" /><p className="score-caption">Valor atual e potencial</p></article>
      <article className="card"><ScoreRing value={numeric(customer.relationship_health_score)} label="Relationship Health" color="#16845b" /><p className="score-caption">Força do relacionamento</p></article>
      <article className="card"><ScoreRing value={numeric(customer.churn_risk_score)} label="Churn Risk" color="#d88514" /><p className="score-caption">Risco heurístico</p></article>
      <article className="stat-card tone-amber"><div className="stat-top"><span>Valor em risco</span><i /></div><strong>{money(valueAtRisk, true)}</strong><div className="stat-detail"><span>{money(numeric(customer.spend_12m_brl))} em gasto nos últimos 12 meses</span></div></article>
    </section>
    <section className="detail-grid">
      <article className="card"><SectionHeader title="Drivers de valor" description="Leitura normalizada dos principais componentes." /><div className="progress-list">{valueDrivers.map((driver) => <ProgressBar key={driver.label} label={driver.label} value={driver.value} total={100} suffix={driver.value.toFixed(0)} />)}</div></article>
      <article className="card"><SectionHeader title="Drivers de relacionamento" description="Experiência, percepção e resposta ao CRM." /><div className="progress-list">{healthDrivers.map((driver) => <ProgressBar key={driver.label} label={driver.label} value={driver.value} total={100} color="green" suffix={driver.value.toFixed(0)} />)}</div></article>
    </section>
    <section className="detail-grid">
      <article className="card"><SectionHeader title="Perfil de relacionamento" /><div className="attribute-grid">
        <div className="attribute"><span>Voos 3 meses</span><strong>{number(numeric(customer.flights_3m))}</strong></div><div className="attribute"><span>Voos 12 meses</span><strong>{number(numeric(customer.flights_12m))}</strong></div><div className="attribute"><span>Recência</span><strong>{number(numeric(customer.recency_days))} dias</strong></div>
        <div className="attribute"><span>Pontos</span><strong>{number(numeric(customer.points_balance))}</strong></div><div className="attribute"><span>Clube Azul</span><strong>{customer.clube_azul_subscriber === "1" ? "Assinante" : "Não assinante"}</strong></div><div className="attribute"><span>Cartão Azul Itaú</span><strong>{customer.azul_itau_card === "1" ? "Possui" : "Não possui"}</strong></div>
        <div className="attribute"><span>NPS recente</span><strong>{customer.latest_nps}/10</strong></div><div className="attribute"><span>Pontualidade</span><strong>{percent(numeric(customer.on_time_rate_12m) * 100)}</strong></div><div className="attribute"><span>Canal preferido</span><strong>{customer.preferred_channel}</strong></div>
      </div></article>
      <article className="card"><SectionHeader title="Guardrails da ativação" description="Regras que protegem cliente e operação." /><div className="insight-list">
        <div className="insight"><span className="insight-icon"><CheckCircle2 size={16} /></span><div><strong>Consentimento de marketing</strong><p>{customer.consent_marketing === "1" ? "Ativo: o rascunho pode ser preparado." : "Ausente: nenhuma mensagem deve ser gerada."}</p></div></div>
        <div className="insight"><span className="insight-icon"><ShieldCheck size={16} /></span><div><strong>Aprovação humana</strong><p>{numeric(customer.customer_value_score) >= 70 ? "Obrigatória por se tratar de um cliente de alto valor." : "Revisão recomendada antes de qualquer envio."}</p></div></div>
        <div className="insight"><span className="insight-icon"><Bot size={16} /></span><div><strong>Agente em modo de regras</strong><p>O agente redige, mas não escolhe a ação e não realiza o envio.</p></div></div>
      </div></article>
    </section>
    <section className="detail-grid">
      <article className="card table-card"><SectionHeader title="Voos recentes" description={`${flights.length} jornadas encontradas para este perfil.`} href="/dados/flights" linkLabel="Ver base" /><div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Voo</th><th>Rota</th><th>Status</th><th>Tarifa</th></tr></thead><tbody>{flights.slice(0, 8).map((flight) => <tr key={flight.customer_flight_id}><td>{isoToBr(flight.flight_date)}</td><td>{flight.flight_number}</td><td><span className="route-name">{flight.origin_icao}<i />{flight.destination_icao}</span></td><td><Badge tone={flight.cancelled === "1" ? "danger" : "success"}>{flight.flight_status}</Badge></td><td>{money(numeric(flight.fare_paid_brl))}</td></tr>)}</tbody></table></div></article>
      <article className="card"><SectionHeader title="Interações recentes" description={`${interactions.length} eventos de CRM e experiência.`} href="/dados/interactions" linkLabel="Ver base" /><div className="timeline">{interactions.slice(0, 8).map((interaction) => <div className="timeline-item" key={interaction.interaction_id}><span className="timeline-date">{isoToBr(interaction.interaction_date)}</span><i className="timeline-marker" /><div className="timeline-content"><strong>{interaction.interaction_type === "campaign" ? <><Mail size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />{interaction.campaign_name}</> : <><Clock3 size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />{interaction.interaction_type}</>}</strong><p>Canal {interaction.channel || "não informado"} · {interaction.converted === "1" ? "converteu" : interaction.opened === "1" ? "abriu" : "sem conversão"}</p></div></div>)}</div></article>
    </section>
    <div className="footer-note"><Plane size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> Perfil inteiramente sintético. Não utilizar para contato real.</div>
  </>;
}
