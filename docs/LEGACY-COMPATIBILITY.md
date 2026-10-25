# ความเข้ากันได้กับ Solar เดิม

ตรวจ 25 ตุลาคม 2026 — **production cutover: NO-GO**

## Source ที่ยืนยันแล้ว

กู้ source ข้อความของ deployment เดิมครบ 96 ไฟล์ / 981,770 bytes และตรวจ SHA-1 ตรงกับ Vercel ทุกไฟล์ เก็บส่วนตัวภายนอก repository ไม่อ่าน .env หรือข้อมูลฐานข้อมูล ส่วน source binary favicon 1 ไฟล์เก็บเพียง metadata ไม่ได้ดาวน์โหลด ชุด source ที่กู้ก่อนหน้านี้ไม่ครบ/ไม่ตรง hash จึงไม่ใช้เป็นฐานสำหรับรับรอง deployment

อ่าน Auth/actions/API/storage/validation และโครงสร้างแล้ว แต่การกู้ครบไม่ได้เท่ากับ runtime/security/full document acceptance ครบ ไม่มีการนำ legacy source, credential, binary template หรือข้อมูลเดิมขึ้น GitHub และไม่มี production database operation

## Architecture เดิม

Next.js 15.5.20 App Router, React 19.1, Prisma 6.19.3/PostgreSQL, bcrypt และ HMAC session cookie ของตนเอง ไม่มีหลักฐานว่า User ของ Solar เดิมเป็น Supabase Auth ที่ใช้ใน V2 Environment names: DATABASE_URL, DIRECT_URL, SESSION_SECRET, NODE_ENV; ยังไม่อ่านค่าหรือยืนยันผู้ให้บริการ PostgreSQL จาก connection string

ฟังก์ชันที่ source เดิมมี: customer/proposal CRUD, approval statuses, admin สำหรับ users/packages/equipment/company, logo/signature/stamp ผ่าน FileBlob, Word templates แบบ placeholder (รวม service package), และ PDF 8 แบบที่รวมเป็นไฟล์เดียวได้ หน้า ai-design พบใน source แต่ยังไม่ได้ยืนยันว่าเรียก AI/backend จริงครบวงจร

## Matrix ก่อนย้ายข้อมูล/ระบบ

| ส่วนเดิม | V2 ตอนนี้ | สิ่งที่ต้องปิดก่อน cutover |
| --- | --- | --- |
| User: ADMIN/SALES, bcrypt, active/resetRequested | บัญชี Supabase เดิมร่วม + owner/editor/viewer แยก workspace | identity/role mapping ที่ยืนยันแล้ว ห้าม import password hash หรือสร้าง Auth users อัตโนมัติ |
| Customer: ที่อยู่ ภาษี GPS ผู้ติดต่อ | ชื่อ ผู้ติดต่อ โทร อีเมล พื้นที่ติดตั้ง | เก็บทุก field/ID/relations เดิม ไม่มีการทิ้งที่อยู่/ภาษี/GPS เงียบ ๆ |
| Proposal: ราคา ส่วนลด VAT ผู้ขาย ฟิลด์เทคนิค/PEA/service | pricing/solar/procurement ใหม่และ sales pipeline | field-by-field mapping และตรวจ rounding/status/document terms ด้วย fixtures ที่ได้รับอนุญาต |
| DRAFT/PENDING/APPROVED/REJECTED/EXPIRED | ร่าง/ส่งแล้ว/กำลังเจรจา/ชนะงาน/ไม่สำเร็จ | เป็นคนละความหมาย ห้ามแปลง APPROVED เป็นชนะงานอัตโนมัติ ต้องเก็บ approval state เดิม |
| Package/Equipment: admin CRUD, active | presets/catalog และการกรอกสเปก | editable catalog/equipment พร้อมสิทธิ์และรักษา references ของข้อเสนอเก่า |
| CompanyInfo: ข้อมูลบริษัท/ผู้ลงนาม/บัญชี/ภาพ | company + official profile | ตรวจทุก field; ภาพ/ลายเซ็น/ตราไม่ถูกนำเข้าหรือใช้กับงานใหม่อัตโนมัติ |
| Template: DOCX placeholder ที่เก็บใน DB, 9 ประเภท | exact-hash ต้นแบบส่วนตัว 2 แบบใน IndexedDB | migration metadata+binary/checksum, รองรับต้นแบบที่อนุมัติและตรวจ mapping/render ทุกแบบ |
| PDF builders: quotation, approval, cover, techspec, scope, payment, warranty, schedule | browser print/draft DOCX | คืนความสามารถ PDF ทั้ง 8 แบบและรวมเอกสาร พร้อม native visual acceptance |
| FileBlob: logo/signature/stamp/template | ต้นแบบส่วนตัว origin-local | backup/restore bytes+MIME+refs แบบตรวจ hash และ migration ที่ไม่ลบของเดิม |
| procurement อ้างอิง 11 แบบที่ผู้ใช้ส่งภายหลัง | ติดตามข้อมูล/แนบ/preview DOCX 10 แบบ; DOC เก่า 1 แบบ | ยังไม่เปิด generation; ต้องยืนยัน mapping/ตัวเลือกเอกสารและตรวจ Word/PDF |

## ผล dependency/security review

Legacy lockfile production dependency graph มี advisory package entries 25 รายการ (critical 2, high 18, moderate 5) ณวันที่ตรวจ แตกต่างจาก V2 ซึ่งผล audit ล่าสุดเป็น 0 ไม่ถือว่าทุก advisory มี runtime reachability บน deployment นี้ ต้องแยก framework/runtime กับ CLI/tooling และทดสอบ patch บน Preview

รายละเอียด Auth/session/storage findings เก็บในรายงานส่วนตัวให้เจ้าของตรวจ ไม่เผยแพร่ค่า secret หรือรายละเอียดโจมตีใน repository นี้ ยังไม่มี patch/deploy ให้ production เดิม การใช้ V2 Preview ไม่ทำให้ความเสี่ยงของ production เดิมหมดไป

## ลำดับงานที่ต้องทำให้จบ

1. จัดทำ hotfix ของระบบเดิมในพื้นที่แยก: dependencies/session revocation/upload/storage transactions พร้อม baseline tests และ Preview ที่ไม่เขียน DB จริงก่อนให้ผู้ใช้ตรวจ
2. เตรียม read-only export และ backup/restore ของทั้ง 8 models และ FileBlob บนสำเนาที่อนุญาต เก็บ private และตรวจ counts/checksums/relations ห้ามใช้ credentials หรือ binary ใน Git
3. ทำ compatibility mapping ตามตาราง โดยเก็บ unknown fields/status codes และ migration ledger ไม่มีการแทนข้อมูลเดิมหรือ auto-map บัญชี/สถานะ
4. เติม editable catalog, เอกสาร/PDF/remote template ที่ยังขาด แล้วทดสอบข้อมูลเดิมครบชุดใน Preview
5. ทดสอบ hosted roles/invitation/revoke ด้วยบัญชีเดิมที่สองเมื่อพร้อม; ขณะนี้ผู้ใช้มีบัญชีพร้อมทดสอบเดียว ผล simulated UI/SQL ไม่ทดแทน hosted multi-account acceptance
6. ปิด native Word/PDF, accessibility/mobile/load, credential/config review และ restore/rollback rehearsal ก่อนปลด main deployment hold และกำหนด cutover

GitHub เป็น source of truth สำหรับ V2 ที่เผยแพร่แล้ว ไม่ใช่การรับรองว่า source/data/function ของ production เดิมย้ายครบ การเปลี่ยน production ต้องระบุ release version, backup ที่ตรวจ restore ได้ และเงื่อนไข rollback ที่ไม่ลบข้อมูล
