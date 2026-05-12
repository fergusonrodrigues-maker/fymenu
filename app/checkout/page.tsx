import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanCode } from "@/lib/plans";
import CheckoutClient from "./CheckoutClient";

function normalizePlan(value: string | string[] | undefined): PlanCode {
  const raw = Array.isArray(value) ? value[0] : value;
  const p = (raw ?? "").toLowerCase().trim();
  if (p === "business") return "business";
  if (p === "menupro" || p === "menu_pro" || p === "pro") return "menupro";
  return "menu";
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string; coupon?: string }>;
}) {
  const sp = await searchParams;
  const plan = normalizePlan(sp.plan);
  const initialCoupon = (sp.coupon ?? "").toString().trim().toUpperCase().slice(0, 32);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const couponParam = initialCoupon ? `&coupon=${encodeURIComponent(initialCoupon)}` : "";
    const back = encodeURIComponent(`/checkout?plan=${plan}${couponParam}`);
    redirect(`/entrar?modo=criar&redirect=${back}`);
  }

  return (
    <CheckoutClient
      plan={plan}
      planName={PLANS[plan].name}
      initialCoupon={initialCoupon}
    />
  );
}
