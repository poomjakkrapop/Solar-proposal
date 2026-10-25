"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_CLOUD_BYTES,
  parseCloudWorkspace,
  type CloudRole,
} from "./cloud-contract";
import { validateWorkspace, type Workspace } from "./workspace";

export type CloudBinding = {
  id: string;
  revision: number;
  role: CloudRole;
  email: string;
};
export function useCloudWorkspace(initial: Workspace, cloud?: CloudBinding) {
  const [workspace, setWorkspace] = useState(initial);
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const snapshot = useRef(initial);
  const revision = useRef(cloud?.revision || 0);
  const canWrite = useRef(cloud?.role !== "viewer");
  const pending = useRef(false);
  const blocked = useRef(false);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!cloud) return;
      const response = await fetch(
        `/api/workspace?id=${encodeURIComponent(cloud.id)}`,
        {
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) blocked.current = true;
        throw new Error(
          "อ่านข้อมูลกลางไม่สำเร็จ หรือสิทธิ์เปลี่ยนไป ร่างที่กำลังแก้ยังอยู่ กรุณาเข้าสู่ระบบในอีกแท็บหรือติดต่อเจ้าของพื้นที่",
        );
      }
      const data = await response.json();
      const next = parseCloudWorkspace(data.current);
      if (next.id !== cloud.id)
        throw new Error("เซิร์ฟเวอร์ส่งพื้นที่ทำงานไม่ตรงกัน");
      canWrite.current = next.role !== "viewer";
      blocked.current = false;
      if (next.revision > revision.current) {
        revision.current = next.revision;
        snapshot.current = next.document;
        setWorkspace(next.document);
      }
    },
    [cloud],
  );
  useEffect(() => {
    if (!cloud) return;
    const controller = new AbortController();
    const sync = () => {
      if (document.hidden || pending.current) return;
      void refresh(controller.signal).catch((error) => {
        if (!controller.signal.aborted)
          setStorageError(
            error instanceof Error ? error.message : "อ่านข้อมูลกลางไม่สำเร็จ",
          );
      });
    };
    const timer = window.setInterval(sync, 15000);
    window.addEventListener("focus", sync);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [cloud, refresh]);
  const commit = useCallback(
    async (update: (current: Workspace) => Workspace) => {
      if (!cloud) return false;
      if (blocked.current || !canWrite.current || pending.current) {
        setStorageError(
          "ยังบันทึกไม่ได้ กรุณาตรวจสิทธิ์หรือรอการบันทึกครั้งก่อน ร่างที่กรอกยังอยู่",
        );
        return false;
      }
      pending.current = true;
      setSaving(true);
      let sent = false;
      try {
        const next = validateWorkspace(update(snapshot.current));
        const expectedRevision = revision.current;
        const body = JSON.stringify({
          id: cloud.id,
          revision: expectedRevision,
          document: next,
        });
        if (new TextEncoder().encode(body).byteLength > MAX_CLOUD_BYTES)
          throw new Error("ข้อมูลมีขนาดเกิน 4 MB กรุณาติดต่อผู้ดูแล");
        sent = true;
        const response = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(20000),
        });
        const result = await response.json();
        if (!response.ok) {
          if ([401, 403, 404].includes(response.status)) blocked.current = true;
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "เซิร์ฟเวอร์ไม่ยอมรับการบันทึก",
          );
        }
        if (
          !Number.isSafeInteger(result.revision) ||
          result.revision !== expectedRevision + 1
        )
          throw new Error("ไม่สามารถยืนยัน revision ที่บันทึกได้");
        if (result.revision >= revision.current) {
          revision.current = result.revision;
          snapshot.current = next;
          setWorkspace(next);
        }
        setStorageError("");
        return true;
      } catch (error) {
        if (sent) {
          try {
            await refresh();
          } catch {
            /* Preserve the snapshot and unsaved editor draft. */
          }
        }
        setStorageError(
          (error instanceof Error ? error.message : "บันทึกไม่สำเร็จ") +
            (sent
              ? " — หากการเชื่อมต่อขาด ผลบันทึกอาจยังไม่ยืนยัน กรุณาตรวจข้อมูลล่าสุดก่อนลองใหม่"
              : ""),
        );
        return false;
      } finally {
        pending.current = false;
        setSaving(false);
      }
    },
    [cloud, refresh],
  );
  return { workspace, commit, ready: true, saving, storageError };
}
