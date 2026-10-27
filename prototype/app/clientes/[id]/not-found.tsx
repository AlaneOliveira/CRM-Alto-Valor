import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return <div className="card"><EmptyState title="Cliente não encontrado" description="O identificador informado não existe no snapshot atual." /><div style={{ textAlign: "center" }}><Link className="button" href="/clientes">Voltar ao explorador</Link></div></div>;
}
