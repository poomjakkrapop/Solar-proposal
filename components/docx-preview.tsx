"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { stagePreview } from "../lib/preview-task";

export function WordPreview({ buffer }: { buffer: ArrayBuffer }) {
  const target = useRef<HTMLDivElement>(null);
  const styles = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [pages, setPages] = useState(0);
  useEffect(() => {
    let active = true;
    async function render() {
      try {
        const { renderAsync } = await import("docx-preview");
        if (!active || !target.current || !styles.current) return;
        setPages(0);
        setError("");
        target.current.replaceChildren();
        styles.current.replaceChildren();
        const stagedBody = document.createElement("div");
        const stagedStyles = document.createElement("div");
        await stagePreview(
          async () => {
            await renderAsync(buffer.slice(0), stagedBody, stagedStyles, {
              className: "word-document",
              inWrapper: true,
              ignoreLastRenderedPageBreak: false,
              renderAltChunks: false,
              renderComments: false,
              renderChanges: false,
              useBase64URL: true,
              experimental: true,
            });
            return { body: stagedBody, styles: stagedStyles };
          },
          () => active,
          (result) => {
            if (!target.current || !styles.current) return;
            styles.current.replaceChildren(...result.styles.childNodes);
            target.current.replaceChildren(...result.body.childNodes);
            setPages(
              target.current.querySelectorAll("section.word-document").length,
            );
          },
        );
      } catch (error) {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "แสดงตัวอย่างเอกสารไม่สำเร็จ",
          );
      }
    }
    void render();
    return () => {
      active = false;
    };
  }, [buffer]);
  return (
    <>
      <div ref={styles} />
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : (
        <p className="word-preview-status" role="status">
          {pages
            ? `ตัวอย่างเนื้อหา ${pages} ส่วน · ไม่ใช่ภาพพร้อมพิมพ์ ตาราง กล่องข้อความ ฟอนต์ และการแบ่งหน้าอาจคลาดเคลื่อน กรุณาตรวจไฟล์ใน Microsoft Word`
            : "กำลังเปิดตัวอย่างเอกสาร…"}
        </p>
      )}
      <div
        className="word-preview-canvas"
        ref={target}
        data-preview-ready={pages > 0}
      />
    </>
  );
}
export function WordPreviewDialog({
  title,
  buffer,
  onClose,
}: {
  title: string;
  buffer: ArrayBuffer;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        container.current?.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      ref={container}
      tabIndex={-1}
      className="word-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="word-preview-toolbar">
        <strong>{title}</strong>
        <button
          className="icon-button"
          aria-label="ปิดตัวอย่างเอกสาร"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <WordPreview buffer={buffer} />
    </div>
  );
}
