import { Download, Users } from "lucide-react";

import { CustomerExplorer } from "@/components/customer-explorer";
import { PageHeader } from "@/components/ui";
import { getCustomers } from "@/lib/data";

export default function CustomersPage() {
  const customers = getCustomers().map((customer) => ({
    customer_id: customer.customer_id,
    home_city: customer.home_city,
    home_state: customer.home_state,
    tier_current: customer.tier_current,
    synthetic_segment: customer.synthetic_segment,
    relationship_band: customer.relationship_band,
    customer_value_score: customer.customer_value_score,
    relationship_health_score: customer.relationship_health_score,
    churn_risk_score: customer.churn_risk_score,
    spend_12m_brl: customer.spend_12m_brl,
    next_best_experience: customer.next_best_experience,
  }));
  return <>
    <PageHeader eyebrow="Customer 360" title="Explorador de clientes" description="Pesquise, filtre e priorize toda a carteira sintética. A ordenação padrão destaca o maior valor em risco." action={<a className="button secondary" href="/dados/customer-360"><Download size={15} /> Ver dados completos</a>} />
    <CustomerExplorer customers={customers} />
  </>;
}
