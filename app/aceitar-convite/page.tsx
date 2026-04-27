import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getInviteDetails } from "./actions";
import AceitarConviteClient from "./AceitarConviteClient";

export default async function AceitarConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  const [invite, supabase] = await Promise.all([
    getInviteDetails(token),
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <Suspense>
      <AceitarConviteClient
        token={token}
        invite={invite}
        userEmail={user?.email ?? null}
      />
    </Suspense>
  );
}
