import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return <div className="card"><EmptyState title="Tabela não encontrada" description="Escolha um dos conjuntos disponíveis no catálogo de dados." /><div style={{ textAlign: "center" }}><Link className="button" href="/dados">Abrir catálogo</Link></div></div>;
}
