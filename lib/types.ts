export type Plan = "free" | "pro";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 2,
  pro: 25,
};

export type Site = {
  id: string;
  user_id: string;
  url: string;
  name: string | null;
  last_checked_at: string | null;
  is_up: boolean | null;
  status_code: number | null;
  response_ms: number | null;
  ssl_expires_at: string | null;
  domain_expires_at: string | null;
  last_error: string | null;
  created_at: string;
};

export type AlertType = "down" | "ssl_expiring" | "domain_expiring";
