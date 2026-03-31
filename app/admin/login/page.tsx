import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminLoginClient from "./AdminLoginClient";

export const metadata = {
  title: "Admin Login — FyMenu",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && user.email === process.env.ADMIN_EMAIL) {
    redirect("/admin");
  }

  return <AdminLoginClient />;
}
