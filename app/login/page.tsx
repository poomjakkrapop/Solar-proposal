import { AuthForm } from "../../components/auth-form";
import Link from "next/link";
import { cloudConfig } from "../../lib/supabase/server";
export const dynamic = "force-dynamic";
export default function Login() {
  try {
    cloudConfig();
  } catch {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>ระบบข้อมูลกลางยังไม่เปิดใช้งาน</h1>
          <p>รอการตั้งค่าและทดสอบโดยผู้ดูแล ข้อมูลเดิมในเครื่องยังอยู่</p>
          <Link href="/">กลับพื้นที่ทำงาน</Link>
        </section>
      </main>
    );
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AuthForm />
      </section>
    </main>
  );
}
