"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WordPreview } from "../../../../components/docx-preview";
import { getTemplate } from "../../../../lib/template-store";

export default function TemplateReviewPage() {
  const params = useParams<{ id: string }>();
  const [result, setResult] = useState<{
    id: string;
    buffer?: ArrayBuffer;
    error?: string;
  }>();
  const valid = params.id === "approval" || params.id === "quotation";
  const current = result?.id === params.id ? result : undefined;
  const error = valid ? current?.error : "ไม่พบประเภทเอกสาร";
  useEffect(() => {
    let active = true;
    if (params.id !== "approval" && params.id !== "quotation") return;
    getTemplate(params.id)
      .then((template) => {
        if (active)
          setResult({
            id: params.id,
            buffer: template?.buffer,
            error: template ? undefined : "กรุณาแนบต้นแบบที่หน้าเทมเพลตก่อน",
          });
      })
      .catch(() => {
        if (active) setResult({ id: params.id, error: "อ่านต้นแบบไม่สำเร็จ" });
      });
    return () => {
      active = false;
    };
  }, [params.id]);
  return (
    <main className="standalone-word-review">
      {error && <p role="alert">{error}</p>}
      {valid && !current && <p role="status">กำลังอ่านต้นแบบ…</p>}
      {current?.buffer && <WordPreview buffer={current.buffer} />}
    </main>
  );
}
