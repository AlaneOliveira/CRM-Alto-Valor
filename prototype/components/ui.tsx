import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action && <div className="page-action">{action}</div>}</div>;
}

export function StatCard({ label, value, detail, tone = "blue", trend }: { label: string; value: string; detail: string; tone?: "blue" | "cyan" | "green" | "amber"; trend?: { value: string; positive: boolean } }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-top"><span>{label}</span><i /></div><strong>{value}</strong><div className="stat-detail">{trend && <b className={trend.positive ? "trend-up" : "trend-down"}>{trend.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend.value}</b>}<span>{detail}</span></div></article>;
}

export function SectionHeader({ title, description, href, linkLabel = "Ver todos" }: { title: string; description?: string; href?: string; linkLabel?: string }) {
  return <div className="section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{href && <Link href={href}>{linkLabel}<ChevronRight size={16} /></Link>}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ScoreRing({ value, label, color = "#0a70d6" }: { value: number; label: string; color?: string }) {
  return <div className="score-ring" style={{ "--score": `${Math.max(0, Math.min(100, value)) * 3.6}deg`, "--ring": color } as React.CSSProperties}><div><strong>{value.toFixed(1)}</strong><span>{label}</span></div></div>;
}

export function ProgressBar({ label, value, total, color = "blue", suffix }: { label: string; value: number; total: number; color?: string; suffix?: string }) {
  const share = total ? (value / total) * 100 : 0;
  return <div className="progress-row"><div><span>{label}</span><strong>{suffix ?? value.toLocaleString("pt-BR")}</strong></div><div className="progress-track"><i className={`bar-${color}`} style={{ width: `${Math.max(2, share)}%` }} /></div></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><strong>{title}</strong><p>{description}</p></div>;
}
