// ─── Shared Dashboard Types ───────────────────────────────────────────────────

export type Restaurant = { id: string; name: string; plan: string; status: string; trial_ends_at: string; whatsapp: string | null; instagram: string | null; free_access?: boolean };
export type Unit = { id: string; name: string; slug: string; custom_domain: string | null; address: string; city: string | null; neighborhood: string | null; whatsapp: string | null; instagram: string | null; logo_url: string | null; cover_url: string | null; description: string | null; maps_url: string | null; delivery_link: string | null; is_published: boolean; comanda_close_permission: "garcom_e_caixa" | "somente_caixa"; daily_revenue_goal?: number | null; facebook_pixel_id?: string | null; ifood_url?: string | null; ifood_platform?: string | null };
export type StockStats = { low: number; out: number };
export type Category = { id: string; name: string; order_index: number | null; is_active?: boolean; section?: string; schedule_enabled?: boolean; available_days?: string[]; start_time?: string | null; end_time?: string | null };
export type Product = { id: string; category_id: string; name: string; description: string | null; price_type: string; base_price: number | null; thumbnail_url: string | null; video_url: string | null; order_index: number | null; is_active: boolean; stock?: number | null; stock_minimum?: number | null; unlimited?: boolean | null; sku?: string | null; allergens?: string[] | null; nutrition?: any; preparation_time?: number | null; is_age_restricted?: boolean | null; is_alcoholic?: boolean | null };
export type Profile = { first_name: string | null; last_name: string | null; phone: string | null; address: string | null; city: string | null; email: string | undefined };

export type DayData = { date: string; orders: number; revenue: number };
export type ReportProduct = { name: string; qty: number; revenue: number };
export type ReportPayments = { cash: number; card: number; pix: number };

export type ReportPeriodStats = {
  orders: number;
  completed: number;
  revenue: number;
  avgTicket: number;
  payments: ReportPayments;
  products: ReportProduct[];
};

export type ReportWeekly = ReportPeriodStats & { byDay: DayData[] };
export type ReportMonthly = ReportPeriodStats & {
  byDay: DayData[];
  growthOrders: number | null;
  growthRevenue: number | null;
};

export type ReportData = {
  today: ReportPeriodStats;
  weekly: ReportWeekly;
  monthly: ReportMonthly;
};
