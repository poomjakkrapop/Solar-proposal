import { redirect } from "next/navigation";
import SolarWorkspace from "../components/solar-workspace";
import { CloudShell } from "../components/cloud-shell";
import {
  cloudEnabled,
  cloudConfig,
  sessionClient,
} from "../lib/supabase/server";

export default async function Home() {
  if (!cloudEnabled()) return <SolarWorkspace />;
  try {
    cloudConfig();
  } catch {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>ระบบข้อมูลกลางยังตั้งค่าไม่ครบ</h1>
          <p>
            กรุณาติดต่อผู้ดูแล
            ไม่มีการใช้ข้อมูลในเครื่องแทนข้อมูลกลางโดยอัตโนมัติ
          </p>
        </section>
      </main>
    );
  }
  const session = await sessionClient();
  const { data, error } = await session.client.auth.getUser();
  if (error || !data.user) redirect("/login");
  return <CloudShell email={data.user.email || ""} />;
}
