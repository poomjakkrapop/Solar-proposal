"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WordPreview } from "../../../../components/docx-preview";
import { getTemplate } from "../../../../lib/template-store";

export default function TemplateReviewPage() {
  const params = useParams<{ id: string }>();
  const [buffer, setBuffer] = useState<ArrayBuffer>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (params.id !== "approval" && params.id !== "quotation") {
      setError("ไม่พบประเภทเอกสาร");
      return;
    }
    getTemplate(params.id)
      .then((template) => {
        if (template) setBuffer(template.buffer);
        else setError("กรุณาแนบต้นแบบที่หน้าเทมเพลตก่อน");
      })
      .catch(() => setError("อ่านต้นแบบไม่สำเร็จ"));
  }, [params.id]);
  return (
    <main className="standalone-word-review">
      {error && <p role="alert">{error}</p>}
      {buffer && <WordPreview buffer={buffer} />}
    </main>
  );
}
