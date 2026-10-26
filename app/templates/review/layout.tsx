import { redirect } from "next/navigation";
import { cloudEnabled, sessionClient } from "../../../lib/supabase/server";
export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (cloudEnabled()) {
    const session = await sessionClient();
    const { data, error } = await session.client.auth.getUser();
    if (error || !data.user) redirect("/login");
  }
  return children;
}
