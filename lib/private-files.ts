export type PrivateFile<T extends string = string> = {
  id: T;
  filename: string;
  buffer: ArrayBuffer;
  attachedAt: string;
};
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("solardesk-private-templates", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("templates", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("เปิดพื้นที่เก็บต้นแบบไม่สำเร็จ"));
    request.onblocked = () =>
      reject(
        new Error("พื้นที่เก็บต้นแบบถูกใช้งานอยู่ กรุณาปิดแท็บเก่าแล้วลองใหม่"),
      );
  });
}
export async function digestFile(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function readPrivateFile<T extends string>(
  id: T,
): Promise<PrivateFile<T> | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("templates", "readonly");
    const request = tx.objectStore("templates").get(id);
    let result: PrivateFile<T> | undefined;
    request.onsuccess = () => {
      result = request.result as PrivateFile<T> | undefined;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("อ่านต้นแบบไม่สำเร็จ"));
    };
  });
}
export async function savePrivateFile<T extends string>(
  id: T,
  filename: string,
  buffer: ArrayBuffer,
  expectedHash: string,
): Promise<PrivateFile<T>> {
  if (
    buffer.byteLength > 10 * 1024 * 1024 ||
    (await digestFile(buffer)) !== expectedHash
  )
    throw new Error("ไฟล์ไม่ตรงกับต้นแบบที่ตรวจไว้ หรือมีขนาดเกิน 10 MB");
  const file = { id, filename, buffer, attachedAt: new Date().toISOString() };
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("templates", "readwrite");
    tx.objectStore("templates").put(file);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("บันทึกต้นแบบไม่สำเร็จ พื้นที่เก็บข้อมูลอาจเต็ม"));
    };
  });
  return file;
}
