# แค็ตตาล็อกแพ็กเกจและอุปกรณ์

เพิ่ม 25 ตุลาคม 2026 — เป็นฟังก์ชันของ V2; ยังไม่ใช่การนำเข้าแค็ตตาล็อก/ข้อมูล production เดิม

## การใช้งาน

หน้า **สินค้าและแพ็กเกจ** มีสองแท็บ: แพ็กเกจและอุปกรณ์ เจ้าของพื้นที่เพิ่ม/แก้ชื่อ ราคา ขนาดระบบ กลุ่มลูกค้า รายละเอียด จำนวนแผง และอ้างอิงแผง/อินเวอร์เตอร์ได้ อุปกรณ์เก็บยี่ห้อ รุ่น สเปก และกำลังพิกัด แผงใช้ W; อินเวอร์เตอร์ใช้ kW เมื่อเปลี่ยนประเภทจะล้างกำลังเป็น 0 ให้ระบุใหม่ ไม่แปลงหน่วยโดยเดา

ปิดใช้งานแทนการลบ และเลือกดูรายการปิดใช้งานได้ รายการปิดใช้งานไม่เป็นตัวเลือกสำหรับข้อเสนอใหม่ แพ็กเกจที่อ้างอิงอุปกรณ์ปิดใช้งานจะหยุดใช้สร้างข้อเสนอจนตรวจ/แก้อ้างอิง เจ้าของยังเปิดดูและแก้รายการเหล่านั้นได้

เมื่อสร้างข้อเสนอจากแพ็กเกจ ระบบคัดลอกราคา ขนาด ชื่อแพ็กเกจในเอกสาร และสเปกที่ระบุไว้เข้าแบบร่าง ยี่ห้อ/รุ่นแผงเก็บเป็นข้อความเดียวใน field เดิมของเอกสาร อินเวอร์เตอร์เก็บ brand/model แยก ไม่มีการ infer ค่า rating จากข้อความสเปก การแก้/เปลี่ยนชื่อ/ราคา/ปิดแพ็กเกจภายหลังไม่แก้ snapshots ของข้อเสนอเดิม ข้อเสนอเก่ายังเก็บชื่อแพ็กเกจเดิมในตัวเลือกเมื่อเปิดแก้

หากพื้นที่ยังไม่เคยบันทึก catalog จะเห็น 4 presets เดิมพร้อมป้ายค่าเริ่มต้นตัวอย่าง ไม่เพิ่ม records ให้ฐานข้อมูลอัตโนมัติ แค็ตตาล็อกว่างที่ผู้ใช้ตั้งใจบันทึกจะคงว่าง ไม่เติม samples กลับ

## สิทธิ์และการเก็บข้อมูล

Catalog เป็น optional extension `catalog.version=1` ใน document ของ workspace เดิม ไม่สร้างตารางหรือ Auth ใหม่ ข้อมูลตรวจชนิด/ความยาว/ตัวเลข/ทศนิยม/ชื่อหรือรหัสซ้ำและ references ทั้ง client และ server ก่อนบันทึก รูปแบบใน DB และขนาด document 4 MiB ยังมี constraint เดิมอยู่

โหมด local ผู้ใช้จัดการได้ โหมดข้อมูลกลาง owner จัดการ catalog เท่านั้น editor ใช้ประกอบข้อเสนอและอ่านได้ viewer อ่านได้ ฐานข้อมูลตรวจ role อีกครั้งใน `sd_v2_save_workspace` เพื่อไม่พึ่งปุ่ม UI เพียงอย่างเดียว การแก้เอกสารธุรกิจของ editor โดยเก็บ catalog เดิมยังทำได้

Migration ที่ apply จริง: `20261025142650_solardesk_catalog_write_guard` ปรับเฉพาะ RPC SolarDesk ยังคง SECURITY INVOKER/search_path ว่าง, EXECUTE เฉพาะ service_role, membership/role, row lock, revision และ atomic audit เพิ่ม owner-only catalog และป้องกัน client เก่าที่ส่ง document โดยไม่มี catalog มาลบ extension ที่มีแล้ว การตรวจ shape และ 4 MiB เพิ่มใน RPC ซ้ำกับ constraint เดิม ไม่ลด validation เดิม หลัง apply ตรวจพบ workspace เดิม 1 แห่ง revision 2 ไม่มี catalog และไม่มีข้อมูลถูกเปลี่ยนจาก migration; Security Advisor ไม่พบรายการ sd_v2 ใหม่

## Backup และ client เก่า

ไฟล์/สแนปช็อต local ที่มี catalog ใช้ envelope `schemaVersion=3` เพื่อให้โปรแกรมเก่าที่รู้จักเพียง v2 หยุดเขียนแทนการ strip catalog ทิ้ง รุ่นใหม่นี้อ่าน v2 เดิมได้และไม่เติม catalog อัตโนมัติ เอกสารกลางใน DB ยังคง schema_version=2 พร้อม extension version=1; เป็นคนละชั้นกับ envelope ไฟล์ backup

เมื่อมี catalog แล้ว UI จะไม่ยอมแทนข้อมูลด้วย backup เก่าที่ไม่มี catalog การยืนยัน import แสดงจำนวนแพ็กเกจ/อุปกรณ์ด้วย ฝั่ง DB ป้องกัน raw cloud writes จาก client/deployment เก่าซ้ำ หากบันทึกจากแท็บเก่าไม่ผ่านให้คัดลอกร่างแล้วโหลด Preview รุ่นล่าสุด ไม่ rollback DB guard หรือปลดสิทธิ์เพื่อให้เขียนข้อมูลที่หาย field ได้

Catalog editor เก็บ baseline ตอนเปิด ถ้ามี catalog เปลี่ยนก่อน save จะปฏิเสธและเก็บร่างไว้ หากเป็นข้อเสนอ/ลูกค้าที่เปลี่ยนโดยไม่แก้ catalog จะ merge จาก workspace ล่าสุดแทนการย้อนข้อมูลส่วนอื่น การออกจากหน้าระหว่างเปิด editor มีคำเตือน

## หลักฐานทดสอบ

- Unit: v2 backups เดิมยังอ่านได้, v3 round-trip catalog/archived refs/empty catalog, malformed versions/duplicate IDs/ชื่อ/หน่วย/ราคา/refs ถูกปฏิเสธ, คัดลอกสเปกไม่ผูกกับการแก้ catalog ภายหลัง และ stale catalog baseline
- Postgres ในหน่วยความจำ: editor เปลี่ยน catalog ไม่ได้; owner เพิ่มได้; editor บันทึกธุรกิจโดยคง catalog ได้; client เก่าลบ catalog ไม่ได้; null/shape/เกิน 4 MiB ถูกปฏิเสธโดย revision/audit ไม่เพิ่ม
- UI กับ API จำลองส่วนตัวใน loopback: เพิ่มแผง 600 W และอินเวอร์เตอร์ 10 kW, ผูกแพ็กเกจ 9.6 kWp ราคา 250,000, สร้างข้อเสนอ, เปลี่ยนราคาแพ็กเกจเป็น 300,000 และปิดใช้งาน, reload แล้วยืนยันข้อเสนอเดิมยัง 250,000/ชื่อเดิมและเปิดแก้ได้; editor/viewer ไม่มีปุ่มจัดการที่ใช้งานได้
- ผลจำลองไม่ทดแทน hosted owner/multi-account acceptance ข้อมูลทดสอบและ harness อยู่นอก repository ไม่มี Auth key/production database connection

ผล automated รอบนี้: unit/Postgres 58 รายการ + optimized HTTP 6 รายการ รวม 64 รายการ; lint/build ผ่าน ตรวจเพิ่มว่าการเปิดข้อเสนอเก่าที่ไม่มี solar metadata ไม่เติมสเปกจากแค็ตตาล็อกปัจจุบัน และ package ที่ไม่ระบุจำนวนแผงคงค่า 0 เพื่อให้ผู้ใช้ตรวจ ไม่เดาจำนวนให้เอง

เครื่องมือสำรองฐาน Solar เดิมและข้อจำกัดอยู่ใน [LEGACY-BACKUP.md](LEGACY-BACKUP.md) ยังไม่มี backup/restore จริง ณรอบนี้ ต้องปิด [compatibility gates](LEGACY-COMPATIBILITY.md) ก่อน production cutover
