import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { PageHeader } from "@/components/ui";
import { getDatasetPage } from "@/lib/data";
import { humanize, number } from "@/lib/format";
import type { DatasetId } from "@/lib/types";

function href(dataset: string, page: number, query: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/dados/${dataset}${suffix ? `?${suffix}` : ""}`;
}

export default async function DatasetPage({ params, searchParams }: { params: Promise<{ dataset: string }>; searchParams: Promise<{ page?: string; q?: string }> }) {
  const [{ dataset }, queryParams] = await Promise.all([params, searchParams]);
  const query = queryParams.q ?? "";
  const page = Number(queryParams.page ?? 1);
  const data = getDatasetPage(dataset as DatasetId, Number.isFinite(page) ? page : 1, query);
  if (!data) notFound();
  return <>
    <Link className="button ghost back-link" href="/dados"><ArrowLeft size={15} /> Voltar ao catálogo</Link>
    <PageHeader eyebrow="Tabela processada" title={data.definition.label} description={`${data.definition.description} Grão: ${data.definition.grain}.`} />
    <form className="toolbar" method="get"><label className="search-field"><Search size={16} /><input name="q" defaultValue={query} placeholder="Buscar em qualquer coluna" /></label><button className="button" type="submit">Pesquisar</button>{query && <Link className="button secondary" href={`/dados/${dataset}`}>Limpar</Link>}</form>
    <article className="card table-card wide-table"><div className="table-wrap"><table className="data-table"><thead><tr>{data.columns.map((column) => <th key={column} title={column}>{humanize(column)}</th>)}</tr></thead><tbody>{data.rows.map((row, rowIndex) => <tr key={`${data.page}-${rowIndex}`}>{data.columns.map((column) => <td key={column} title={row[column]}>{row[column] || <span style={{ color: "#a1aebb" }}>-</span>}</td>)}</tr>)}</tbody></table></div><div className="pagination"><span>Exibindo {number((data.page - 1) * data.pageSize + 1)}–{number(Math.min(data.page * data.pageSize, data.total))} de {number(data.total)}</span><div className="pagination-actions"><Link className={data.page === 1 ? "disabled" : ""} aria-disabled={data.page === 1} href={href(dataset, Math.max(1, data.page - 1), query)}><ChevronLeft size={14} /> Anterior</Link><span style={{ padding: "8px 6px" }}>Página {data.page} de {data.pages}</span><Link className={data.page === data.pages ? "disabled" : ""} aria-disabled={data.page === data.pages} href={href(dataset, Math.min(data.pages, data.page + 1), query)}>Próxima <ChevronRight size={14} /></Link></div></div></article>
  </>;
}
