import { CloudError, parseCloudWorkspace } from "./cloud-contract.ts";

/** Discard cancelled or superseded reads, including late permission responses. */
export async function readCloudWorkspace(
  id: string,
  active: () => boolean,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const current = () => active() && !signal?.aborted;
  try {
    const response = await fetcher(
      `/api/workspace?id=${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      },
    );
    if (!current()) return null;
    if (!response.ok)
      throw new CloudError(
        response.status,
        "อ่านข้อมูลกลางไม่สำเร็จ หรือสิทธิ์เปลี่ยนไป ร่างที่กำลังแก้ยังอยู่ กรุณาเข้าสู่ระบบในอีกแท็บหรือติดต่อเจ้าของพื้นที่",
      );
    const next = parseCloudWorkspace((await response.json()).current);
    if (!current()) return null;
    if (next.id !== id)
      throw new Error("เซิร์ฟเวอร์ส่งพื้นที่ทำงานไม่ตรงกัน");
    return next;
  } catch (error) {
    if (!current()) return null;
    throw error;
  }
}
