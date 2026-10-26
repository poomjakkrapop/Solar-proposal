/** Cooperating tabs on this origin must hold this lock throughout read/check/write. */
export async function withWorkspaceLock<T>(
  locks: Pick<LockManager, "request"> | undefined,
  name: string,
  write: () => T | Promise<T>,
): Promise<T> {
  if (!locks)
    throw new Error(
      "เบราว์เซอร์นี้ไม่รองรับการบันทึกอย่างปลอดภัย กรุณาใช้เบราว์เซอร์รุ่นปัจจุบันผ่าน HTTPS ยังสามารถอ่านและดาวน์โหลดสำรองได้",
    );
  try {
    return await locks.request(
      name,
      { mode: "exclusive", signal: AbortSignal.timeout(5000) },
      write,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name)
    )
      throw new Error(
        "อีกแท็บกำลังบันทึกข้อมูล กรุณาลองบันทึกอีกครั้ง ร่างนี้ยังอยู่",
      );
    throw error;
  }
}
