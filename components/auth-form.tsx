"use client";
import { useState } from "react";
export function AuthForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="auth-form"
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "signin",
              email: form.get("email"),
              password: form.get("password"),
            }),
            signal: AbortSignal.timeout(20000),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
          window.location.assign("/");
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "เชื่อมต่อไม่สำเร็จ",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>เข้าสู่ระบบ SolarDesk</h1>
      <p>
        ใช้บัญชีเดิมของ Supabase โปรเจกต์นี้ ข้อมูลและสิทธิ์ SolarDesk
        แยกจากแอปเดิม การสมัคร กู้คืน และเปลี่ยนรหัสผ่านจากที่นี่ปิดอยู่
      </p>
      <fieldset disabled={busy}>
        <label className="field">
          อีเมล
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="username"
          />
        </label>
        <label className="field">
          รหัสผ่าน
          <input
            type="password"
            name="password"
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="primary-button">
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </fieldset>
    </form>
  );
}
