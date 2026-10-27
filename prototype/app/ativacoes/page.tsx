import { Suspense } from "react";

import { ActivationCenter } from "@/components/activation-center";
import { PageHeader } from "@/components/ui";
import { getCustomers } from "@/lib/data";
import type { ActivationCandidate, ActivationMode } from "@/lib/types";

export default async function ActivationsPage({ searchParams }: { searchParams: Promise<{ customer?: string; action?: string; mode?: string }> }) {
  const query = await searchParams;
  const candidates: ActivationCandidate[] = getCustomers().map((customer) => ({
    customerId: customer.customer_id,
    city: customer.home_city,
    state: customer.home_state,
    tier: customer.tier_current,
    consent: customer.consent_marketing === "1",
    action: customer.next_best_experience,
    reason: customer.next_best_experience_reason,
    recommendedChannel: customer.recommended_channel,
    actionCost: Number(customer.estimated_action_cost_brl || 0),
    expectedUplift: Number(customer.expected_retention_uplift_pct || 0),
    spend: Number(customer.spend_12m_brl || 0),
    valueScore: Number(customer.customer_value_score || 0),
    healthScore: Number(customer.relationship_health_score || 0),
    riskScore: Number(customer.churn_risk_score || 0),
    flights12m: Number(customer.flights_12m || 0),
  }));
  const initialMode: ActivationMode = query.mode === "batch" ? "batch" : "individual";
  return <>
    <PageHeader eyebrow="Execução de CRM" title="Central de ativação" description="Transforme uma recomendação em comunicação revisada, aplique guardrails e simule o ciclo completo de envio e resposta." />
    <Suspense fallback={<div className="card">Preparando a central de ativação...</div>}>
      <ActivationCenter candidates={candidates} initialMode={initialMode} initialCustomerId={query.customer} initialAction={query.action} />
    </Suspense>
  </>;
}
