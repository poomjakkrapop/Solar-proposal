"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadWorkspace,
  parseWorkspace,
  serializeWorkspace,
  WORKSPACE_KEY,
  type Workspace,
} from "./workspace";

export function useWorkspace(initial: Workspace) {
  const [workspace, setWorkspace] = useState(initial);
  const [storageError, setStorageError] = useState("");
  const [ready, setReady] = useState(false);
  const snapshot = useRef(initial);
  const raw = useRef<string | null>(null);
  const blocked = useRef(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    try {
      const loaded = loadWorkspace(localStorage, initialRef.current);
      snapshot.current = loaded;
      raw.current = localStorage.getItem(WORKSPACE_KEY);
      setWorkspace(loaded);
    } catch (error) {
      blocked.current = true;
      setStorageError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถอ่านข้อมูลที่บันทึกไว้ได้",
      );
    }
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.key !== WORKSPACE_KEY) return;
      try {
        if (event.newValue === null)
          throw new Error("ข้อมูลถูกล้างจากแท็บอื่น กรุณาโหลดหน้านี้ใหม่");
        const next = parseWorkspace(event.newValue);
        snapshot.current = next;
        raw.current = event.newValue;
        setWorkspace(next);
      } catch (error) {
        blocked.current = true;
        setStorageError(
          error instanceof Error
            ? error.message
            : "ข้อมูลจากแท็บอื่นไม่ถูกต้อง",
        );
      }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const commit = useCallback(
    (update: (current: Workspace) => Workspace): boolean => {
      if (blocked.current) return false;
      try {
        if (localStorage.getItem(WORKSPACE_KEY) !== raw.current)
          throw new Error(
            "ข้อมูลเปลี่ยนจากแท็บอื่น กรุณาโหลดหน้านี้ใหม่ก่อนบันทึก",
          );
        const next = update(snapshot.current);
        const serialized = serializeWorkspace(next);
        localStorage.setItem(WORKSPACE_KEY, serialized);
        raw.current = serialized;
        snapshot.current = next;
        setWorkspace(next);
        setStorageError("");
        return true;
      } catch (error) {
        setStorageError(
          error instanceof Error
            ? error.message
            : "บันทึกไม่สำเร็จ พื้นที่เก็บข้อมูลอาจเต็ม",
        );
        return false;
      }
    },
    [],
  );
  return { workspace, commit, ready, storageError };
}
