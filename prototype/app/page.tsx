import Link from "next/link";
import { AlertTriangle, ArrowRight, Plane, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { PriorityTable } from "@/components/priority-table";
import { PageHeader, ProgressBar, ScoreRing, SectionHeader, StatCard } from "@/components/ui";
import { getOverview } from "@/lib/data";
import { actionLabel, isoToBr, money, number } from "@/lib/format";

export default function OverviewPage() {
  const data = getOverview();
  return <>
    <PageHeader eyebrow="Centro de decisão" title="Visão executiva de retenção" description={`Leitura integrada de valor, saúde e risco com referência em ${isoToBr(data.referenceDate)}. Cada indicador é calculado diretamente sobre a base sintética processada.`} action={<Link className="button" href="/clientes">Explorar clientes <ArrowRight size={15} /></Link>} />
    <section className="stats-grid">
      <StatCard label="Clientes monitorados" value={number(data.customers)} detail="visão Customer 360" tone="blue" />
      <StatCard label="Alto valor em atenção" value={number(data.highValueAttention)} detail={`${number(data.highValue)} clientes de alto valor`} tone="amber" />
      <StatCard label="Valor estimado em risco" value={money(data.valueAtRisk, true)} detail="gasto ponderado pelo risco" tone="cyan" />
      <StatCard label="Retorno potencial" value={money(data.expectedReturn, true)} detail="uplift estimado menos custo" tone="green" />
    </section>
    <section className="dashboard-grid">
      <article className="card hero-panel">
        <SectionHeader title="Pulso do relacionamento" description="Os três sinais que orientam a priorização do CRM." href="/clientes" linkLabel="Abrir análise" />
        <div className="score-cluster">
          <div><ScoreRing value={data.averageValue} label="Valor médio" color="#35c8f0" /><p className="score-caption">Potencial econômico</p></div>
          <div><ScoreRing value={data.averageHealth} label="Saúde média" color="#39d69d" /><p className="score-caption">Qualidade da relação</p></div>
          <div><ScoreRing value={data.averageRisk} label="Risco médio" color="#ffb34f" /><p className="score-caption">Probabilidade heurística</p></div>
        </div>
      </article>
      <article className="card">
        <SectionHeader title="Segmentos da carteira" description="Distribuição dos perfis sintéticos." href="/clientes" />
        <div className="progress-list">{data.segments.map((item, index) => <ProgressBar key={item.label} label={item.label.replaceAll("_", " ")} value={item.count} total={data.customers} color={["blue","cyan","green","amber"][index % 4]} suffix={`${number(item.count)} · ${item.share.toFixed(1)}%`} />)}</div>
      </article>
    </section>
    <section className="dashboard-grid">
      <article className="card table-card">
        <SectionHeader title="Fila prioritária" description="Clientes ordenados por gasto multiplicado pelo risco de evasão." href="/clientes" />
        <PriorityTable customers={data.priorityCustomers} />
      </article>
      <article className="card">
        <SectionHeader title="Sinais para agir agora" description="Leituras que merecem atenção do time de CRM." />
        <div className="insight-list">
          <div className="insight"><span className="insight-icon"><AlertTriangle size={16} /></span><div><strong>{number(data.operationalExposure)} clientes expostos a atrito</strong><p>Atraso médio elevado ou cancelamento registrado nos últimos 12 meses.</p></div></div>
          <div className="insight"><span className="insight-icon"><TrendingUp size={16} /></span><div><strong>{money(data.totalSpend, true)} em gasto observado</strong><p>Base econômica para dimensionar retenção e testar o uplift das ações.</p></div></div>
          <div className="insight"><span className="insight-icon"><Sparkles size={16} /></span><div><strong>{data.experiences.length} jornadas recomendadas</strong><p>O motor de regras transforma sinais em uma próxima melhor experiência explicável.</p></div></div>
          <div className="insight"><span className="insight-icon"><ShieldCheck size={16} /></span><div><strong>NPS médio de {data.averageNps.toFixed(1)}</strong><p>Consentimento e aprovação humana permanecem como guardrails obrigatórios.</p></div></div>
        </div>
      </article>
    </section>
    <section className="split-grid">
      <article className="card"><SectionHeader title="Próximas melhores experiências" description="Volume por decisão recomendada." href="/experiencias" />
        <div className="progress-list">{data.experiences.slice(0, 6).map((item) => <ProgressBar key={item.label} label={actionLabel(item.label)} value={item.count} total={data.customers} suffix={number(item.count)} />)}</div>
      </article>
      <article className="card"><SectionHeader title="Rotas com maior recorrência" description="Volume de jornadas sintéticas por par de aeroportos." href="/rotas" />
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Rota</th><th>Voos</th><th>Clientes</th><th>Atraso médio</th></tr></thead><tbody>{data.routes.slice(0, 6).map((route, index) => <tr key={route.route}><td><div className="route-name"><span className="rank">{index + 1}</span>{route.origin}<i />{route.destination}</div></td><td>{number(route.flights)}</td><td>{number(route.customers)}</td><td>{route.averageDelay.toFixed(1)} min</td></tr>)}</tbody></table></div>
      </article>
    </section>
    <div className="footer-note"><Plane size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> Dados públicos calibram o contexto. Nenhuma linha representa um passageiro real.</div>
  </>;
}
