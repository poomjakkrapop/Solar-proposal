import { CloudError, record } from "./cloud-contract.ts";
/** Shared project: never expose registration, recovery or password mutations. */
export function authInput(
  value: unknown,
):
  | { action: "signout" }
  | { action: "signin"; email: string; password: string } {
  if (!record(value)) throw new CloudError(400, "ข้อมูลไม่ถูกต้อง");
  if (value.action === "signout") return { action: "signout" };
  if (value.action !== "signin")
    throw new CloudError(
      403,
      "การสมัคร กู้คืน และเปลี่ยนรหัสผ่านจาก SolarDesk ปิดอยู่ เพื่อไม่กระทบบัญชีเดิม",
    );
  const email = typeof value.email === "string" ? value.email.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 1 ||
    password.length > 128
  )
    throw new CloudError(422, "กรุณาตรวจอีเมลและรหัสผ่าน");
  return { action: "signin", email, password };
}
