import { PlaneTakeoff, Route, Timer, Users } from "lucide-react";

import { Badge, PageHeader, SectionHeader, StatCard } from "@/components/ui";
import { getRouteSummaries } from "@/lib/data";
import { money, number, percent } from "@/lib/format";

export default function RoutesPage() {
  const routes = getRouteSummaries();
  const totalFlights = routes.reduce((sum, route) => sum + route.flights, 0);
  const averageDelay = routes.reduce((sum, route) => sum + route.averageDelay * route.flights, 0) / totalFlights;
  const cancellationRate = routes.reduce((sum, route) => sum + route.cancellationRate * route.flights, 0) / totalFlights;
  return <>
    <PageHeader eyebrow="Experiência operacional" title="Rotas e contexto de jornada" description="A operação pública da ANAC calibra os eventos sintéticos e ajuda a explicar atritos, frequência e valor por corredor." />
    <section className="stats-grid">
      <StatCard label="Rotas observadas" value={number(routes.length)} detail="pares origem-destino" tone="blue" />
      <StatCard label="Jornadas sintéticas" value={number(totalFlights)} detail="eventos ligados aos clientes" tone="cyan" />
      <StatCard label="Atraso médio" value={`${averageDelay.toFixed(1)} min`} detail="partida sobre toda a base" tone="amber" />
      <StatCard label="Cancelamentos" value={percent(cancellationRate)} detail="taxa média ponderada" tone="green" />
    </section>
    <section className="dashboard-grid">
      <article className="card hero-panel"><SectionHeader title="Rota com maior recorrência" description="Corredor com maior número de jornadas sintéticas." /><div className="hero-metrics"><div className="hero-metric"><span>Rota</span><strong>{routes[0]?.origin} → {routes[0]?.destination}</strong></div><div className="hero-metric"><span>Voos</span><strong>{number(routes[0]?.flights ?? 0)}</strong></div><div className="hero-metric"><span>Tarifa média</span><strong>{money(routes[0]?.averageFare ?? 0, true)}</strong></div></div></article>
      <article className="card"><SectionHeader title="Leitura operacional" /><div className="insight-list"><div className="insight"><span className="insight-icon"><Timer size={16} /></span><div><strong>Atraso impacta Relationship Health</strong><p>Pontualidade e cancelamentos compõem diretamente a saúde do relacionamento.</p></div></div><div className="insight"><span className="insight-icon"><Users size={16} /></span><div><strong>Recorrência revela preferência</strong><p>Rotas frequentes orientam mensagens e recuperação contextualizadas.</p></div></div><div className="insight"><span className="insight-icon"><PlaneTakeoff size={16} /></span><div><strong>ANAC é contexto, não cliente</strong><p>A associação de cada jornada a um perfil é exclusivamente sintética.</p></div></div></div></article>
    </section>
    <article className="card table-card"><SectionHeader title="Ranking de rotas" description="Os 100 corredores mais recorrentes; a base completa permanece disponível no catálogo." href="/dados/flights" linkLabel="Abrir todos os voos" /><div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Rota</th><th>Voos</th><th>Clientes</th><th>Atraso médio</th><th>Cancelamento</th><th>Tarifa média</th><th>Negócios</th><th>Experiência</th></tr></thead><tbody>{routes.slice(0, 100).map((route, index) => <tr key={route.route}><td><span className="rank">{index + 1}</span></td><td><div className="route-name">{route.origin}<i />{route.destination}</div></td><td>{number(route.flights)}</td><td>{number(route.customers)}</td><td>{route.averageDelay.toFixed(1)} min</td><td><Badge tone={route.cancellationRate >= 8 ? "danger" : route.cancellationRate >= 4 ? "warning" : "success"}>{percent(route.cancellationRate)}</Badge></td><td>{money(route.averageFare)}</td><td>{percent(route.businessShare)}</td><td><Badge tone={route.averageDelay >= 30 ? "warning" : "info"}>{route.averageDelay >= 30 ? "Atenção" : "Estável"}</Badge></td></tr>)}</tbody></table></div></article>
    <div className="footer-note"><Route size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> Métricas calculadas diretamente de <code>crm_flights_mvp.csv</code>.</div>
  </>;
}
