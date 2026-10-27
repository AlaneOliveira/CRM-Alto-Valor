"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  History,
  MailCheck,
  MessageSquareText,
  MousePointerClick,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Badge, EmptyState, StatCard } from "@/components/ui";
import {
  ACTIVATION_STORAGE_KEY,
  buildDraft,
  messageViolation,
  nextStatus,
  requiresHumanApproval,
  STATUS_LABELS,
} from "@/lib/activations";
import { actionLabel, money, number, tierLabel } from "@/lib/format";
import type { ActivationCandidate, ActivationMode, ActivationRecord, ActivationStatus } from "@/lib/types";

type Tab = "new" | "history";
const CHANNELS = ["App", "WhatsApp", "Email", "SMS"];
const STEPS = ["Público", "Mensagem", "Guardrails", "Revisão"];

function statusTone(status: ActivationStatus): "info" | "warning" | "success" {
  return status === "converted" ? "success" : status === "opened" ? "warning" : "info";
}

export function ActivationCenter({ candidates, initialMode, initialCustomerId, initialAction }: { candidates: ActivationCandidate[]; initialMode: ActivationMode; initialCustomerId?: string; initialAction?: string }) {
  const [tab, setTab] = useState<Tab>(initialCustomerId || initialAction || initialMode === "batch" ? "new" : "history");
  const [mode, setMode] = useState<ActivationMode>(initialMode);
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState(initialCustomerId ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId && candidates.some((candidate) => candidate.customerId === initialCustomerId) ? initialCustomerId : candidates[0]?.customerId ?? "");
  const actions = useMemo(() => [...new Set(candidates.map((candidate) => candidate.action))], [candidates]);
  const [selectedAction, setSelectedAction] = useState(initialAction && actions.includes(initialAction) ? initialAction : actions[0] ?? "");
  const [channel, setChannel] = useState("App");
  const [message, setMessage] = useState("");
  const [approved, setApproved] = useState(false);
  const [records, setRecords] = useState<ActivationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const selectedCandidate = candidates.find((candidate) => candidate.customerId === selectedCustomerId);
  const targetAudience = useMemo(() => mode === "individual" ? (selectedCandidate ? [selectedCandidate] : []) : candidates.filter((candidate) => candidate.action === selectedAction), [candidates, mode, selectedAction, selectedCandidate]);
  const eligibleAudience = targetAudience.filter((candidate) => candidate.consent);
  const blockedCount = targetAudience.length - eligibleAudience.length;
  const representative = eligibleAudience[0] ?? targetAudience[0];
  const needsApproval = eligibleAudience.some(requiresHumanApproval);
  const violation = messageViolation(message);
  const estimatedCost = eligibleAudience.reduce((sum, candidate) => sum + candidate.actionCost, 0);
  const expectedReturn = eligibleAudience.reduce((sum, candidate) => sum + candidate.spend * candidate.expectedUplift / 100 - candidate.actionCost, 0);

  const actionStats = useMemo(() => actions.map((action) => {
    const audience = candidates.filter((candidate) => candidate.action === action);
    return { action, total: audience.length, eligible: audience.filter((candidate) => candidate.consent).length };
  }).sort((a, b) => b.total - a.total), [actions, candidates]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return candidates.filter((candidate) => !normalized || [candidate.customerId, candidate.city, candidate.state, actionLabel(candidate.action)].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized))).slice(0, 12);
  }, [candidates, query]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVATION_STORAGE_KEY);
      if (stored) setRecords(JSON.parse(stored) as ActivationRecord[]);
    } catch {
      localStorage.removeItem(ACTIVATION_STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!representative) return;
    setChannel(representative.recommendedChannel || "App");
    setMessage(buildDraft(representative));
    setApproved(false);
  }, [representative?.customerId, mode, selectedAction]);

  function persist(next: ActivationRecord[]) {
    setRecords(next);
    localStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify(next));
  }

  function selectMode(nextMode: ActivationMode) {
    setMode(nextMode);
    setStep(1);
    setApproved(false);
  }

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    setQuery(customerId);
  }

  function sendSimulation() {
    if (!representative || !eligibleAudience.length || violation || (needsApproval && !approved)) return;
    const now = new Date().toISOString();
    const record: ActivationRecord = {
      id: `ACT-${Date.now().toString(36).toUpperCase()}`,
      createdAt: now,
      mode,
      customerId: mode === "individual" ? representative.customerId : undefined,
      sampleCustomerIds: eligibleAudience.slice(0, 10).map((candidate) => candidate.customerId),
      action: representative.action,
      channel,
      message,
      audienceCount: eligibleAudience.length,
      blockedCount,
      requiresHumanApproval: needsApproval,
      approved: !needsApproval || approved,
      estimatedCost,
      expectedReturn,
      status: "sent",
      events: [
        { status: "created", at: now },
        ...(needsApproval ? [{ status: "approved" as const, at: now }] : []),
        { status: "sent", at: now },
      ],
    };
    persist([record, ...records]);
    setTab("history");
    setStep(1);
  }

  function advance(record: ActivationRecord) {
    if (record.status === "converted") return;
    const status = nextStatus(record.status);
    const next = records.map((item) => item.id === record.id ? { ...item, status, events: [...item.events, { status, at: new Date().toISOString() }] } : item);
    persist(next);
  }

  function exportAudit() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "crm-ativacoes-auditoria.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const canAdvance = step === 1 ? targetAudience.length > 0 : step === 2 ? !violation : step === 3 ? eligibleAudience.length > 0 && (!needsApproval || approved) : true;
  const conversionCount = records.filter((record) => record.status === "converted").reduce((sum, record) => sum + record.audienceCount, 0);

  return <div className="activation-center">
    <div className="activation-tabs">
      <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={16} /> Histórico <span>{records.length}</span></button>
      <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}><Sparkles size={16} /> Nova ativação</button>
    </div>

    {tab === "new" ? <>
      <div className="activation-layout">
        <aside className="activation-rail card">
          <span className="eyebrow">Fluxo assistido</span>
          <h2>Da recomendação ao envio</h2>
          <p>Cada etapa registra uma decisão verificável antes da simulação.</p>
          <div className="step-list">{STEPS.map((label, index) => { const value = index + 1; return <button key={label} className={`${step === value ? "active" : ""} ${step > value ? "done" : ""}`} onClick={() => value <= step && setStep(value)}><i>{step > value ? <Check size={13} /> : value}</i><span>{label}<small>{["Quem será ativado", "O que será comunicado", "O que permite o envio", "Conferência final"][index]}</small></span></button>; })}</div>
          <div className="simulation-note"><ShieldCheck size={17} /><div><strong>Ambiente de demonstração</strong><span>Nenhuma mensagem sai para um canal real.</span></div></div>
        </aside>

        <section className="activation-workspace card">
          {step === 1 && <div className="activation-step">
            <div className="step-heading"><span>Etapa 1</span><h2>Defina o público da ativação</h2><p>Escolha um cliente específico ou use a recomendação para criar uma campanha em lote.</p></div>
            <div className="mode-switch"><button className={mode === "individual" ? "active" : ""} onClick={() => selectMode("individual")}><UserRound size={17} /><span>Individual<small>Um cliente e uma mensagem</small></span></button><button className={mode === "batch" ? "active" : ""} onClick={() => selectMode("batch")}><UsersRound size={17} /><span>Em lote<small>Público de uma NBE</small></span></button></div>
            {mode === "individual" ? <>
              <label className="search-field activation-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ID, cidade ou recomendação" /></label>
              <div className="candidate-list">{filteredCandidates.map((candidate) => <button key={candidate.customerId} className={candidate.customerId === selectedCustomerId ? "selected" : ""} onClick={() => selectCustomer(candidate.customerId)}><span className="customer-avatar">{candidate.customerId.slice(-3)}</span><span><strong>{candidate.customerId}</strong><small>{candidate.city} · {tierLabel(candidate.tier)}</small></span><span className="candidate-action">{actionLabel(candidate.action)}<small>{candidate.consent ? "Consentimento ativo" : "Sem consentimento"}</small></span><i>{candidate.customerId === selectedCustomerId && <Check size={14} />}</i></button>)}</div>
            </> : <div className="action-picker">{actionStats.map((item) => <button key={item.action} className={item.action === selectedAction ? "selected" : ""} onClick={() => setSelectedAction(item.action)}><span>{actionLabel(item.action)}</span><strong>{number(item.eligible)} elegíveis</strong><small>{number(item.total - item.eligible)} bloqueados por consentimento</small></button>)}</div>}
          </div>}

          {step === 2 && representative && <div className="activation-step">
            <div className="step-heading"><span>Etapa 2</span><h2>Prepare a comunicação</h2><p>O agente usa apenas a ação permitida. O texto pode ser revisado antes de seguir.</p></div>
            <div className="message-builder">
              <div className="message-editor"><label>Canal recomendado</label><div className="channel-picker">{CHANNELS.map((item) => <button key={item} className={channel === item ? "active" : ""} onClick={() => setChannel(item)}>{item}</button>)}</div><label htmlFor="activation-message">Rascunho do agente</label><textarea id="activation-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} /><div className="editor-meta"><span className={violation ? "text-danger" : "text-success"}>{violation ?? "Conteúdo dentro dos guardrails"}</span><span>{message.length}/500</span></div><button className="button secondary" onClick={() => setMessage(buildDraft(representative))}><Bot size={15} /> Regenerar por regras</button></div>
              <div className="message-preview"><div className="phone-top"><span>{channel}</span><i /></div><div className="message-bubble">{message}</div><small>Prévia para {mode === "individual" ? representative.customerId : `${number(eligibleAudience.length)} clientes elegíveis`}</small></div>
            </div>
          </div>}

          {step === 3 && representative && <div className="activation-step">
            <div className="step-heading"><span>Etapa 3</span><h2>Valide os guardrails</h2><p>O sistema separa decisão, redação e autorização antes de qualquer envio.</p></div>
            <div className="guardrail-grid">
              <div className={`guardrail-card ${eligibleAudience.length ? "passed" : "blocked"}`}><span>{eligibleAudience.length ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}</span><div><strong>Consentimento de marketing</strong><p>{mode === "individual" ? (representative.consent ? "Cliente autorizado para comunicação." : "Cliente bloqueado: nenhuma mensagem pode ser enviada.") : `${number(eligibleAudience.length)} elegíveis e ${number(blockedCount)} removidos automaticamente.`}</p></div><Badge tone={eligibleAudience.length ? "success" : "danger"}>{eligibleAudience.length ? "Aprovado" : "Bloqueado"}</Badge></div>
              <div className={`guardrail-card ${!violation ? "passed" : "blocked"}`}><span>{!violation ? <ShieldCheck size={19} /> : <AlertTriangle size={19} />}</span><div><strong>Conteúdo seguro</strong><p>{violation ?? "Sem promessa de preço, desconto, percentual ou prazo não autorizado."}</p></div><Badge tone={!violation ? "success" : "danger"}>{!violation ? "Aprovado" : "Revisar"}</Badge></div>
              <div className={`guardrail-card ${!needsApproval || approved ? "passed" : "pending"}`}><span><UserRound size={19} /></span><div><strong>Aprovação humana</strong><p>{needsApproval ? "Obrigatória por valor ou sensibilidade da jornada." : "Revisão simples é suficiente para este público."}</p></div>{needsApproval ? <button className={`approval-button ${approved ? "approved" : ""}`} onClick={() => setApproved((value) => !value)} style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>{approved ? <><Check size={13} /><span>Aprovado</span></> : "Registrar aprovação"}</button> : <Badge tone="success">Dispensada</Badge>}</div>
              <div className="guardrail-card passed"><span><Bot size={19} /></span><div><strong>Escopo do agente</strong><p>O agente redigiu o texto, mas não alterou ação, público, canal ou custo.</p></div><Badge tone="info">Auditado</Badge></div>
            </div>
            {needsApproval && !approved && <div className="callout warning"><AlertTriangle size={18} /><div><strong>Aguardando aprovação</strong><p>Registre a aprovação humana para liberar a revisão final.</p></div></div>}
          </div>}

          {step === 4 && representative && <div className="activation-step">
            <div className="step-heading"><span>Etapa 4</span><h2>Revise e simule o envio</h2><p>Confira o alcance, o investimento e a trilha de decisão que será registrada.</p></div>
            <div className="review-grid">
              <div className="review-summary"><div><span>Modo</span><strong>{mode === "individual" ? "Ativação individual" : "Campanha em lote"}</strong></div><div><span>Público elegível</span><strong>{number(eligibleAudience.length)} cliente{eligibleAudience.length === 1 ? "" : "s"}</strong></div><div><span>Ação</span><strong>{actionLabel(representative.action)}</strong></div><div><span>Canal</span><strong>{channel}</strong></div><div><span>Custo estimado</span><strong>{money(estimatedCost)}</strong></div><div><span>Retorno potencial</span><strong>{money(expectedReturn)}</strong></div></div>
              <div className="audit-preview"><span className="eyebrow">Trilha registrada</span><ul><li><Check size={13} /> Público derivado da base processada</li><li><Check size={13} /> NBE definida pelo motor de regras</li><li><Check size={13} /> Mensagem revisada e validada</li><li><Check size={13} /> Consentimento aplicado</li><li><Check size={13} /> Aprovação humana {needsApproval ? "registrada" : "dispensada"}</li></ul><div className="message-bubble">{message}</div></div>
            </div>
            <div className="send-disclaimer"><Send size={18} /><div><strong>Simulação pronta</strong><p>O botão abaixo cria um evento auditável local. Nenhuma API externa será chamada.</p></div><button className="button send-button" onClick={sendSimulation}>Simular envio <Send size={15} /></button></div>
          </div>}

          <div className="activation-controls"><button className="button secondary" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /> Voltar</button>{step < 4 && <button className="button" disabled={!canAdvance} onClick={() => setStep((value) => Math.min(4, value + 1))}>Continuar <ChevronRight size={15} /></button>}</div>
        </section>
      </div>
    </> : <>
      <section className="stats-grid activation-stats">
        <StatCard label="Ativações simuladas" value={number(records.length)} detail="campanhas e ações individuais" tone="blue" />
        <StatCard label="Público alcançado" value={number(records.reduce((sum, record) => sum + record.audienceCount, 0))} detail="envios simulados" tone="cyan" />
        <StatCard label="Conversões simuladas" value={number(conversionCount)} detail="resultado demonstrativo" tone="green" />
        <StatCard label="Investimento estimado" value={money(records.reduce((sum, record) => sum + record.estimatedCost, 0), true)} detail="custo hipotético acumulado" tone="amber" />
      </section>
      <article className="card table-card activation-history">
        <div className="section-header"><div><h2>Histórico e auditoria</h2><p>Eventos mantidos no navegador para demonstrar o ciclo de CRM.</p></div><button className="button secondary" disabled={!records.length} onClick={exportAudit}><Download size={15} /> Exportar JSON</button></div>
        {!loaded ? <div className="empty-state">Carregando histórico...</div> : !records.length ? <><EmptyState title="Nenhuma ativação simulada" description="Crie uma ativação para visualizar envio, entrega, abertura e conversão." /><div style={{ textAlign: "center", paddingBottom: 30 }}><button className="button" onClick={() => setTab("new")}>Criar primeira ativação</button></div></> : <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Data</th><th>Público</th><th>Experiência</th><th>Canal</th><th>Custo</th><th>Status</th><th>Próximo evento</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.id}</strong><br /><small>{record.mode === "individual" ? record.customerId : "Campanha em lote"}</small></td><td>{new Date(record.createdAt).toLocaleString("pt-BR")}</td><td>{number(record.audienceCount)}</td><td>{actionLabel(record.action)}</td><td>{record.channel}</td><td>{money(record.estimatedCost)}</td><td><Badge tone={statusTone(record.status)}>{STATUS_LABELS[record.status]}</Badge></td><td>{record.status === "converted" ? <span className="text-success"><CheckCircle2 size={14} /> Ciclo concluído</span> : <button className="event-button" onClick={() => advance(record)}>{record.status === "sent" ? <MailCheck size={14} /> : record.status === "delivered" ? <Eye size={14} /> : <MousePointerClick size={14} />}{record.status === "sent" ? "Simular entrega" : record.status === "delivered" ? "Simular abertura" : "Simular conversão"}</button>}</td></tr>)}</tbody></table></div>}
      </article>
      <div className="simulation-note-wide"><CircleDollarSign size={17} /><span>Conversões e retornos são simulações para demonstrar o aprendizado do CRM; não representam resultados reais.</span></div>
    </>}
  </div>;
}
