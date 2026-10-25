"use client";
import { useEffect, useRef } from "react";
export function ConfirmLeaveDialog({
  onStay,
  onLeave,
}: {
  onStay: () => void;
  onLeave: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-leave-dialog"
      aria-labelledby="confirm-leave-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <h2 id="confirm-leave-title">มีข้อมูลที่ยังไม่ได้บันทึก</h2>
      <p>
        กลับไปบันทึกก่อน หรือออกจากหน้านี้และทิ้งเฉพาะข้อความที่ยังไม่ได้บันทึก
        ข้อมูลที่บันทึกไว้แล้วจะยังอยู่
      </p>
      <div className="template-download-actions">
        <button type="button" className="primary-button" onClick={onStay}>
          กลับไปแก้ไข
        </button>
        <button type="button" className="secondary-button" onClick={onLeave}>
          ออกโดยไม่บันทึก
        </button>
      </div>
    </dialog>
  );
}
