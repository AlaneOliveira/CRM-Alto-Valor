import Link from "next/link";
import { BookOpen, Database, FileSpreadsheet, Layers3, ShieldCheck } from "lucide-react";

import { PageHeader, StatCard } from "@/components/ui";
import { getDatasetCounts } from "@/lib/data";
import { number } from "@/lib/format";

const icons = { customers: Database, "customer-360": Layers3, flights: FileSpreadsheet, interactions: FileSpreadsheet, dictionary: BookOpen } as const;

export default function DataCatalogPage() {
  const datasets = getDatasetCounts();
  const total = datasets.reduce((sum, dataset) => sum + dataset.count, 0);
  return <>
    <PageHeader eyebrow="Data lake do MVP" title="Catálogo navegável da base" description="Explore todas as tabelas processadas, seus campos e registros. A interface lê os CSVs diretamente no servidor Next.js." />
    <section className="stats-grid">
      <StatCard label="Conjuntos processados" value={number(datasets.length)} detail="tabelas disponíveis" tone="blue" />
      <StatCard label="Registros navegáveis" value={number(total)} detail="somatório das tabelas" tone="cyan" />
      <StatCard label="Natureza dos clientes" value="Sintética" detail="nenhum passageiro real" tone="green" />
      <StatCard label="Formato analítico" value="CSV" detail="aberto e substituível" tone="amber" />
    </section>
    <div className="callout" style={{ marginBottom: 17 }}><ShieldCheck size={19} /><div><strong>Fonte de verdade única</strong><p>As páginas, KPIs e tabelas usam os arquivos de <code>docs/anac-data/processed</code>. Alterar a base e recarregar a aplicação atualiza as análises.</p></div></div>
    <section className="dataset-grid">{datasets.map((dataset) => { const Icon = icons[dataset.id]; return <Link key={dataset.id} className="dataset-card" href={`/dados/${dataset.id}`}><span className="dataset-icon"><Icon size={19} /></span><span className="dataset-arrow">↗</span><h2>{dataset.label}</h2><p>{dataset.description}</p><div className="dataset-stats"><div><strong>{number(dataset.count)}</strong><span> registros</span></div><span>{dataset.grain}</span></div></Link>; })}</section>
    <div className="footer-note"><Database size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> Paginação e busca permitem percorrer todos os registros sem carregar a base inteira no navegador.</div>
  </>;
}
