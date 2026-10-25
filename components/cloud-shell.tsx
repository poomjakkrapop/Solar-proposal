"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SolarWorkspace from "./solar-workspace";
import {
  parseCloudWorkspace,
  type CloudWorkspace,
} from "../lib/cloud-contract";

type Audit = {
  id: number;
  event: string;
  actor_id: string;
  revision: number;
  created_at: string;
};
type Member = { user_id: string; role: string; active: boolean };
export function CloudShell({ email }: { email: string }) {
  const [data, setData] = useState<{
    current: CloudWorkspace | null;
    workspaces: { id: string; name: string }[];
    audit: Audit[];
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [token, setToken] = useState("");
  const loadTicket = useRef(0);
  const load = useCallback(async (id?: string) => {
    const ticket = ++loadTicket.current;
    const response = await fetch(
      `/api/workspace${id ? `?id=${encodeURIComponent(id)}` : ""}`,
      { cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "อ่านพื้นที่ทำงานไม่สำเร็จ");
    if (ticket !== loadTicket.current) return;
    setData({
      current: result.current ? parseCloudWorkspace(result.current) : null,
      workspaces: result.workspaces,
      audit: result.audit || [],
    });
  }, []);
  useEffect(() => {
    let active = true;
    void load().catch((error) => {
      if (active)
        setError(
          error instanceof Error ? error.message : "อ่านข้อมูลไม่สำเร็จ",
        );
    });
    return () => {
      active = false;
      loadTicket.current += 1;
    };
  }, [load]);
  const current = data?.current;
  const cloud = useMemo(
    () =>
      current
        ? {
            id: current.id,
            revision: current.revision,
            role: current.role,
            email,
          }
        : undefined,
    [current, email],
  );
  async function action(body: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ทำรายการไม่สำเร็จ");
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : "เชื่อมต่อไม่สำเร็จ");
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  async function showTeam() {
    if (!cloud) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/workspace?id=${encodeURIComponent(cloud.id)}&team=true`,
        { cache: "no-store", signal: AbortSignal.timeout(20000) },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อ่านสมาชิกไม่สำเร็จ");
      setMembers(result.members);
      setTeam(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "อ่านสมาชิกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="cloud-toolbar" aria-busy={busy}>
        <strong>SolarDesk · {email}</strong>
        {data && data.workspaces.length > 0 && (
          <label>
            พื้นที่ทำงาน
            <select
              aria-label="สลับพื้นที่ทำงาน"
              disabled={busy}
              value={data.current?.id || ""}
              onChange={(event) => {
                const id = event.target.value;
                if (
                  !window.confirm(
                    "เปลี่ยนพื้นที่ทำงานหรือไม่? กรุณาบันทึกหรือคัดลอกร่างที่กำลังแก้ไว้ก่อน",
                  )
                )
                  return;
                setTeam(false);
                setToken("");
                void load(id).catch((error) =>
                  setError(
                    error instanceof Error
                      ? error.message
                      : "อ่านข้อมูลไม่สำเร็จ",
                  ),
                );
              }}
            >
              {data.workspaces.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {cloud?.role === "owner" && (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void showTeam()}
          >
            จัดการสมาชิก
          </button>
        )}
        <button
          className="secondary-button"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(
                "ออกจากระบบหรือไม่? กรุณาบันทึกหรือคัดลอกร่างไว้ก่อน",
              )
            )
              return;
            setBusy(true);
            try {
              const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "signout" }),
              });
              if (!response.ok) throw new Error("ออกจากระบบไม่สำเร็จ");
              window.location.assign("/login");
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "เชื่อมต่อไม่สำเร็จ",
              );
              setBusy(false);
            }
          }}
        >
          ออกจากระบบ SolarDesk
        </button>
      </div>
      {error && (
        <div role="alert" className="cloud-error">
          {error}{" "}
          <button
            className="secondary-button"
            onClick={() => {
              setError("");
              void load(data?.current?.id).catch((error) =>
                setError(
                  error instanceof Error
                    ? error.message
                    : "อ่านข้อมูลไม่สำเร็จ",
                ),
              );
            }}
          >
            ลองอ่านข้อมูลใหม่
          </button>
        </div>
      )}
      {!data && !error && (
        <p role="status" className="cloud-error">
          กำลังอ่านพื้นที่ทำงาน…
        </p>
      )}
      {data && !data.current && (
        <main className="auth-page">
          <section className="auth-card">
            <h1>เริ่มพื้นที่ทำงาน SolarDesk</h1>
            <p>
              สร้างพื้นที่ว่าง หรือรับรหัสเชิญจากเจ้าของพื้นที่
              จะไม่นำข้อมูลตัวอย่างหรือข้อมูลในเครื่องขึ้นเซิร์ฟเวอร์อัตโนมัติ
            </p>
            <form
              className="auth-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await action({
                  action: "create",
                  name: form.get("name"),
                });
                if (result)
                  await load(result.id).catch(() =>
                    setError("สร้างแล้ว แต่อ่านกลับไม่สำเร็จ กรุณาลองอ่านใหม่"),
                  );
              }}
            >
              <label className="field">
                ชื่อพื้นที่ทำงาน
                <input name="name" required maxLength={200} />
              </label>
              <button className="primary-button" disabled={busy}>
                สร้างพื้นที่ว่าง
              </button>
            </form>
            <JoinForm
              busy={busy}
              join={async (code) => {
                const result = await action({ action: "accept", token: code });
                if (result)
                  await load(result.id).catch(() =>
                    setError(
                      "รับเชิญแล้ว แต่อ่านกลับไม่สำเร็จ กรุณาลองอ่านใหม่",
                    ),
                  );
              }}
            />
          </section>
        </main>
      )}
      {cloud && data?.current && (
        <>
          {cloud.role === "viewer" && (
            <p className="cloud-error">
              สิทธิ์อ่านเท่านั้น — บันทึกหรือเปลี่ยนสถานะไม่ได้
            </p>
          )}
          {team && (
            <section className="cloud-team">
              <h2>สมาชิกและประวัติพื้นที่ทำงาน</h2>
              <p>
                รหัสผู้ใช้ของคุณ:{" "}
                {members.find((entry) => entry.role === "owner")?.user_id} ·
                รหัสเชิญผูกกับอีเมล ใช้ครั้งเดียว ภายใน 7 วัน
                ส่งให้ผู้รับผ่านช่องทางส่วนตัวด้วยตนเอง
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  setTeam(false);
                  setToken("");
                }}
              >
                ปิดหน้าสมาชิก
              </button>
              <form
                className="auth-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const result = await action({
                    action: "invite",
                    id: cloud.id,
                    email: form.get("email"),
                    role: form.get("role"),
                  });
                  if (result) setToken(result.token);
                }}
              >
                <label className="field">
                  อีเมลบัญชีเดิมของผู้รับ
                  <input type="email" name="email" required maxLength={254} />
                </label>
                <label className="field">
                  สิทธิ์
                  <select name="role">
                    <option value="viewer">อ่านอย่างเดียว</option>
                    <option value="editor">แก้ไขข้อมูล</option>
                  </select>
                </label>
                <button className="primary-button" disabled={busy}>
                  สร้างรหัสเชิญ
                </button>
              </form>
              {token && (
                <label className="field">
                  รหัสเชิญส่วนตัว (ไม่ใช่ API key)
                  <input readOnly value={token} />
                </label>
              )}
              {members.map((member) => (
                <div className="cloud-member" key={member.user_id}>
                  <code>{member.user_id}</code>
                  <span>
                    {member.role} · {member.active ? "ใช้งาน" : "ระงับ"}
                  </span>
                  {member.role !== "owner" && (
                    <>
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            await action({
                              action: "role",
                              id: cloud.id,
                              user: member.user_id,
                              role:
                                member.role === "editor" ? "viewer" : "editor",
                              active: member.active,
                            })
                          )
                            await showTeam();
                        }}
                      >
                        สลับสิทธิ์อ่าน/แก้ไข
                      </button>
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            await action({
                              action: "role",
                              id: cloud.id,
                              user: member.user_id,
                              role: member.role,
                              active: !member.active,
                            })
                          )
                            await showTeam();
                        }}
                      >
                        {member.active ? "ระงับสิทธิ์" : "คืนสิทธิ์"}
                      </button>
                    </>
                  )}
                </div>
              ))}
              <h3>ประวัติล่าสุด</h3>
              <ul>
                {data.audit.map((entry) => (
                  <li key={entry.id}>
                    {new Intl.DateTimeFormat("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Asia/Bangkok",
                    }).format(new Date(entry.created_at))}{" "}
                    · {entry.event} · revision {entry.revision} ·{" "}
                    {entry.actor_id}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <SolarWorkspace
            key={cloud.id}
            initial={data.current.document}
            cloud={cloud}
          />
          <section className="cloud-join">
            <JoinForm
              busy={busy}
              join={async (code) => {
                const result = await action({ action: "accept", token: code });
                if (
                  result &&
                  window.confirm(
                    "รับเชิญแล้ว ต้องการเปิดพื้นที่ใหม่นี้หรือไม่? เก็บร่างที่กำลังแก้ก่อนเปลี่ยนพื้นที่",
                  )
                )
                  await load(result.id).catch(() =>
                    setError("อ่านพื้นที่ใหม่ไม่สำเร็จ"),
                  );
              }}
            />
          </section>
        </>
      )}
    </>
  );
}
function JoinForm({
  busy,
  join,
}: {
  busy: boolean;
  join: (code: string) => Promise<void>;
}) {
  return (
    <form
      className="auth-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await join(String(form.get("token") || "").trim());
      }}
    >
      <label className="field">
        รหัสเชิญส่วนตัว
        <input
          name="token"
          required
          minLength={43}
          maxLength={43}
          autoComplete="off"
        />
      </label>
      <button className="secondary-button" disabled={busy}>
        เข้าร่วมพื้นที่ทำงาน
      </button>
    </form>
  );
}
