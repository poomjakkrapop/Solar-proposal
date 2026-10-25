import {
  templateMaps,
  type TemplateId,
  type TemplateSlot,
} from "./template-maps";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function parseXml(source: string) {
  if (/<!DOCTYPE/i.test(source))
    throw new Error("ต้นแบบมีชนิด XML ที่ไม่รองรับ");
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw new Error("โครงสร้าง XML ของต้นแบบไม่ถูกต้อง");
  return doc;
}
function ownTextNodes(paragraph: Element) {
  return Array.from(paragraph.getElementsByTagNameNS(W, "t")).filter((node) => {
    let parent = node.parentElement;
    while (parent && !(parent.namespaceURI === W && parent.localName === "p"))
      parent = parent.parentElement;
    return parent === paragraph;
  });
}
function replaceSpan(paragraph: Element, slot: TemplateSlot, value: string) {
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value))
    throw new Error("ข้อมูลมีอักขระควบคุมที่ Word ไม่รองรับ");
  const nodes = ownTextNodes(paragraph);
  const length = nodes.reduce(
    (total, node) => total + (node.textContent?.length || 0),
    0,
  );
  if (slot.start < 0 || slot.end > length || slot.start >= slot.end)
    throw new Error("ตำแหน่งข้อมูลในต้นแบบเปลี่ยนไป กรุณาตรวจไฟล์ต้นแบบ");
  let cursor = 0;
  let inserted = false;
  for (const node of nodes) {
    const text = node.textContent || "";
    const start = cursor;
    cursor += text.length;
    if (cursor <= slot.start || start >= slot.end) continue;
    const prefix = text.slice(0, Math.max(0, slot.start - start));
    const suffix = text.slice(Math.min(text.length, slot.end - start));
    node.textContent = prefix + (inserted ? "" : value) + suffix;
    node.setAttributeNS(
      "http://www.w3.org/XML/1998/namespace",
      "xml:space",
      "preserve",
    );
    inserted = true;
  }
}
export async function generateDocx(
  buffer: ArrayBuffer,
  id: TemplateId,
  values: Record<string, string>,
): Promise<ArrayBuffer> {
  const map = templateMaps.find((entry) => entry.id === id);
  if (!map) throw new Error("ไม่พบการตั้งค่าต้นแบบ");
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== map.sha256)
    throw new Error("ไฟล์ต้นแบบไม่ตรงกับเวอร์ชันที่ตรวจสอบไว้");
  const { default: PizZip } = await import("pizzip");
  const zip = new PizZip(buffer);
  for (const part of new Set(map.slots.map((slot) => slot.part))) {
    const entry = zip.file(part);
    if (!entry) throw new Error(`ไม่พบส่วนประกอบ ${part}`);
    const doc = parseXml(entry.asText());
    const paragraphs = Array.from(doc.getElementsByTagNameNS(W, "p"));
    const slots = map.slots
      .filter((slot) => slot.part === part)
      .sort((a, b) => a.paragraph - b.paragraph || b.start - a.start);
    for (const slot of slots) {
      if (!(slot.key in values)) throw new Error(`ยังไม่มีข้อมูล ${slot.key}`);
      const paragraph = paragraphs[slot.paragraph];
      if (!paragraph) throw new Error("ไม่พบย่อหน้าในต้นแบบ");
      replaceSpan(paragraph, slot, values[slot.key]);
    }
    zip.file(part, new XMLSerializer().serializeToString(doc));
  }
  const core = zip.file("docProps/core.xml");
  if (core) {
    const doc = parseXml(core.asText());
    for (const element of Array.from(doc.documentElement.children)) {
      if (
        [
          "creator",
          "lastModifiedBy",
          "title",
          "subject",
          "description",
          "keywords",
          "category",
        ].includes(element.localName)
      )
        element.textContent = "";
      if (["created", "modified"].includes(element.localName))
        element.textContent = new Date().toISOString();
    }
    zip.file("docProps/core.xml", new XMLSerializer().serializeToString(doc));
  }
  const app = zip.file("docProps/app.xml");
  if (app) {
    const doc = parseXml(app.asText());
    for (const element of Array.from(doc.documentElement.children))
      if (element.localName === "Company") element.textContent = "";
    zip.file("docProps/app.xml", new XMLSerializer().serializeToString(doc));
  }
  const settings = zip.file("word/settings.xml");
  if (settings) {
    const doc = parseXml(settings.asText());
    let flag = doc.getElementsByTagNameNS(W, "updateFields")[0];
    if (!flag) {
      flag = doc.createElementNS(W, "w:updateFields");
      doc.documentElement.appendChild(flag);
    }
    flag.setAttributeNS(W, "w:val", "true");
    zip.file("word/settings.xml", new XMLSerializer().serializeToString(doc));
  }
  return new Uint8Array(
    zip.generate({ type: "uint8array", compression: "DEFLATE" }),
  ).buffer;
}
