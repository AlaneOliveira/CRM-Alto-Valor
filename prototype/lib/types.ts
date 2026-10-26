export type CsvRow = Record<string, string>;

export interface Customer360 extends CsvRow {
  customer_id: string;
  synthetic_segment: string;
  age_band: string;
  home_airport_icao: string;
  home_city: string;
  home_state: string;
  tier_current: string;
  clube_azul_subscriber: string;
  azul_itau_card: string;
  points_balance: string;
  preferred_channel: string;
  consent_marketing: string;
  flights_3m: string;
  flights_12m: string;
  flights_previous_3m: string;
  spend_12m_brl: string;
  recency_days: string;
  on_time_rate_12m: string;
  average_departure_delay_minutes: string;
  cancelled_flights_12m: string;
  cancellation_rate_12m: string;
  campaign_engagement_rate: string;
  complaints_12m: string;
  latest_nps: string;
  customer_value_score: string;
  relationship_health_score: string;
  churn_risk_score: string;
  value_band: string;
  relationship_band: string;
  next_best_experience: string;
  next_best_experience_reason: string;
  recommended_channel: string;
  estimated_action_cost_brl: string;
  expected_retention_uplift_pct: string;
  score_reference_date: string;
}

export type CustomerListItem = Pick<
  Customer360,
  | "customer_id"
  | "home_city"
  | "home_state"
  | "tier_current"
  | "synthetic_segment"
  | "relationship_band"
  | "customer_value_score"
  | "relationship_health_score"
  | "churn_risk_score"
  | "spend_12m_brl"
  | "next_best_experience"
>;

export interface RouteSummary {
  route: string;
  origin: string;
  destination: string;
  flights: number;
  customers: number;
  cancellationRate: number;
  averageDelay: number;
  averageFare: number;
  businessShare: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  share: number;
  value?: number;
}

export interface OverviewData {
  referenceDate: string;
  customers: number;
  highValue: number;
  highValueAttention: number;
  valueAtRisk: number;
  expectedReturn: number;
  operationalExposure: number;
  totalSpend: number;
  averageNps: number;
  averageHealth: number;
  averageValue: number;
  averageRisk: number;
  segments: BreakdownItem[];
  experiences: BreakdownItem[];
  tiers: BreakdownItem[];
  priorityCustomers: Customer360[];
  routes: RouteSummary[];
}

export type DatasetId =
  | "customers"
  | "customer-360"
  | "flights"
  | "interactions"
  | "dictionary";

export interface DatasetDefinition {
  id: DatasetId;
  label: string;
  file: string;
  description: string;
  grain: string;
}
