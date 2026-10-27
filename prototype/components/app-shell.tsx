"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bot,
  Database,
  LayoutDashboard,
  Menu,
  PlaneTakeoff,
  Route,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Visão executiva", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/experiencias", label: "Experiências", icon: Sparkles },
  { href: "/ativacoes", label: "Central de ativação", icon: Send },
  { href: "/rotas", label: "Rotas e operação", icon: Route },
  { href: "/dados", label: "Base de dados", icon: Database },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><PlaneTakeoff size={22} /></div>
          <div><strong>CRM Alto Valor</strong></div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>
        <div className="workspace-label">Workspace</div>
        <nav className="main-nav">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="agent-card">
          <div className="agent-icon"><Bot size={18} /></div>
          <div><strong>Agente de mensagens</strong><span>Modo de regras ativo</span></div>
        </div>
      </aside>
      {open && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <div className="app-main">
        <header className="topbar-app">
          <button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Azul Fidelidade</span><b>/</b><strong>MVP de retenção</strong></div>
          <div className="topbar-actions"><div className="avatar">HB</div></div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
