# รายงานตรวจรับ Solar Proposal / SolarDesk

วันที่ตรวจ: 25 ตุลาคม 2026 (Asia/Bangkok) · ฐานอ้างอิง `eb0b863797dda91ae26835b327b69d7ec62179d2` · งานแก้ไขอยู่บน `fix/readiness-audit`

**อัปเดตหลังรายงานรอบแรก:** ผู้ใช้อนุมัติใช้โปรเจกต์ Supabase เดิมโดยแยกตาราง/สิทธิ์ SolarDesk และใช้บัญชีเดิมร่วมกัน เพิ่มโค้ด Auth/backend และ apply migrations ใหม่ 2 รายการแล้ว เปิด cloud mode เฉพาะ Preview branch ที่ตั้งค่า Secret ผู้ใช้รายงานว่าล็อกอินได้ และ metadata ฐานข้อมูลยืนยัน workspace ว่าง 1 แห่ง สมาชิก 1 คนและ audit การสร้าง 1 รายการ การบันทึก/โหลดข้อมูลธุรกิจและหลายบัญชี/หลายเครื่องยังต้องตรวจ รายละเอียดล่าสุดอยู่ใน [SHARED-WORKSPACE.md](SHARED-WORKSPACE.md) รายการที่ระบุว่า “ยังไม่มี Auth/DB” ด้านล่างเป็นสถานะรอบแรก ก่อนงานเพิ่มนี้; release decision ยังเป็น No-Go

## 1. คำตัดสินและขอบเขต

**No-Go สำหรับการแทนระบบ production และใช้งานข้อมูลร่วมจริง** รุ่นใหม่ยังเป็นพื้นที่ทำงานในเบราว์เซอร์ ไม่ได้มี Auth/ฐานข้อมูลร่วม การแก้ไขรอบนี้เหมาะสำหรับทดสอบผ่าน Preview ด้วยข้อมูลจำลอง

ไม่เปลี่ยนโดเมน ไม่ deploy production ไม่รัน migration ไม่อ่านหรือแก้แถวข้อมูลในฐานข้อมูลเดิม ไม่พัก/ลบ Supabase project เดิม ไม่อัปเกรดแผน และไม่เผยแพร่ต้นแบบ Word หรือ credentials ใน GitHub

หลักฐานในรายงานแยกการตรวจ source/metadata การทดสอบอัตโนมัติ และการใช้หน้าจอจริง การ build ผ่านไม่ใช่การรับรองความปลอดภัยหรือความครบถ้วนของระบบทั้งหมด

## 2. Architecture และ source ปัจจุบัน

| ส่วน          | รุ่นใหม่ใน GitHub                                                                                      | ระบบเดิมที่ตรวจพบ                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 15.5.28 App Router, React 19.1, TypeScript                                                     | Next.js 15.5.20, React 19.1 ตาม package metadata ของ deployment เดิม                                                                               |
| โครงสร้าง     | `app/`, `components/`, `lib/`, `tests/`, `docs/`; ไม่มี `src/`                                         | deployment มีต้นทางภายใต้ `src/`                                                                                                                   |
| หน้า UI       | Dashboard, ลูกค้า, ข้อเสนอ, แพ็กเกจ, ตั้งค่า, เทมเพลต, จัดจ้าง                                         | พบ routes dashboard/customers/proposals/templates/admin/ai-design/login/register/forgot-password; ยังไม่รับรองพฤติกรรมทุกหน้า                      |
| ข้อมูล        | localStorage snapshot แบบมี version; ต้นแบบส่วนตัวใน IndexedDB                                         | Prisma 6.19.3 / PostgreSQL ตาม schema ที่กู้คืนครบ                                                                                                 |
| Auth          | ยังไม่มี; UI ระบุโหมดในเครื่องอย่างชัดเจน                                                              | พบ password hash, role, active/resetRequested, login/register/reset/logout/requireSession/requireAdmin และ session cookie helpers                  |
| API / actions | ไม่มี business API หรือ server actions; `/templates/review/[id]` เป็นหน้าอ่าน IndexedDB หลัง hydration | พบ actions auth/admin/customers/proposals/templates และ API file, PDF, template generate/upload, upload; ยังตรวจ authorization ราย endpoint ไม่ครบ |
| เอกสาร        | PizZip 3.3.0 / docx-preview 0.4.1 โหลดเมื่อใช้งาน                                                      | พบ docxtemplater, PizZip และ pdf-lib ใน package metadata                                                                                           |

หน้าแรก statically rendered แล้ว hydrate workspace ฝั่ง client; build ที่ตรวจรอบนี้แสดง First Load JS ประมาณ 137 kB ไม่ใช่ค่า latency หรือผล load test Sarabun อยู่ในแอป ไม่เรียก Google Fonts ระหว่างเปิดหน้า

GitHub `poomjakkrapop/Solar-proposal` มี source รุ่นใหม่บน `main` แล้ว Vercel project `emolaza/solar-proposal` เชื่อม repo นี้และใช้ production branch `main` แต่ไฟล์ `vercel.json` ยังคง `git.deploymentEnabled.main=false`

หน้า [v0 project](https://v0.app/emolaza/solar-proposal) แสดง production deployment เดิม `dpl_GFATKwyGNRXNYaSSn2HQF5VhH7WT` และข้อความว่า deployment ไม่ได้เริ่มจาก commit ไม่มี recent chats แสดงในหน้าที่ตรวจ จึงไม่มีหลักฐานว่า legacy source ทั้งหมดถูกส่งเข้า GitHub แล้ว GitHub เป็น source of truth ของ V2 เท่านั้น

## 3. Database / Auth และความเข้ากันได้

กู้คืน schema เดิมขนาด 8,224 bytes ได้ครบจาก deployment โดยเก็บไฟล์ไว้ในพื้นที่ส่วนตัวนอก repository พบ 8 models:

| Model เดิม  | สิ่งที่ต้องรักษา / ช่องว่างใน V2                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| User        | บัญชี, password hash, role, active/reset status, ผู้สร้างข้อเสนอ — V2 ยังไม่มีบัญชีหรือสิทธิ์                                                     |
| Customer    | ที่อยู่, tax ID, install location, GPS, ผู้ติดต่อ — V2 มีเพียงข้อมูลลูกค้าบางส่วน                                                                 |
| Package     | active/description/ราคา/จำนวนแผง — V2 เป็น preset ใน source ยังไม่มี CRUD ส่วนกลาง                                                                |
| Equipment   | type/brand/model/spec/active — ยังไม่มีทะเบียนส่วนกลาง                                                                                            |
| CompanyInfo | ข้อมูลบริษัท, logo/signature/stamp, ธนาคาร — V2 มี local profile บางส่วน ไม่มีคลังไฟล์ส่วนกลาง                                                    |
| Proposal    | อุปกรณ์, ส่วนลด, VAT, cost/profit, ผู้สร้าง, สถานะ, หมายเลขคำขอ/บริการ, วันและเงื่อนไข — มีบางส่วน แต่ไม่มี migration ที่พิสูจน์ว่ารักษาทุก field |
| Template    | ชื่อ, docType, filePath — V2 ใช้เฉพาะต้นแบบที่ตรวจ hash แล้วในเครื่อง                                                                             |
| FileBlob    | kind/filename/mime/binary — ไม่มีการย้ายคลังไฟล์เดิม                                                                                              |

ชื่อ environment ที่ตรวจพบใน schema/session เดิม: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `NODE_ENV` ไม่มีการอ่านหรือเผยแพร่ค่าของตัวแปรเหล่านี้ `.env.example` มีเฉพาะชื่อกับค่าว่าง รุ่นใหม่ไม่มีการเชื่อม DB/Auth จึงยังไม่ต้องกำหนด connection strings เพื่อใช้โหมดในเครื่อง

ยังยืนยันไม่ได้ว่า PostgreSQL เดิมเป็น Supabase, Neon หรือผู้ให้บริการใด ห้ามเลือก connection จากชื่อโปรเจกต์หรือชี้ V2 ไปฐานข้อมูลเดิมโดยเดา

ผู้ใช้อนุมัติ Supabase ทดสอบแยกโดยไม่มีค่าใช้จ่ายใน organization ที่เลือกแล้ว ตรวจราคาได้ $0/month แต่สร้าง `solardesk-staging` ไม่สำเร็จเพราะโควตา free active projects เต็ม 2 โปรเจกต์ ไม่มีทรัพยากรใหม่ถูกสร้าง ผู้ใช้เลือกจัดเตรียมพื้นที่/โปรเจกต์ทดสอบเอง งาน Auth + shared DB และการทดสอบ RLS/IDOR จึงยังรอพื้นที่นั้น ห้ามใช้หรือพักโปรเจกต์ที่มีอยู่แทนโดยอัตโนมัติ

แผน backend: Supabase Auth + server-side verified session, organization membership/roles, RLS ทุกตารางและ storage policy, server validation, transactional writes พร้อม revision check และ audit log ใช้ UUID/revision ฝั่ง DB แทนเลขลำดับที่คำนวณจาก browser ทดสอบ cross-user/cross-org access และ rollback ก่อนย้ายข้อมูลจริง แผนนี้ยังไม่ได้ provision หรือรับรองว่าทำงานแล้ว

## 4. ฟังก์ชันที่มีและสถานะเอกสาร

- สร้าง/แก้ไขลูกค้าและข้อเสนอ เลือกลูกค้าเดิม เลือก preset ระบบ/ราคา ค้นหา กรอง เปลี่ยนสถานะ และคำนวณ dashboard จากข้อมูลที่บันทึก
- คำนวณต้นทุน/ค่าดำเนินการ/กำไร/VAT ด้วยหน่วยสตางค์ ข้อความจำนวนเงินไทย เลขเอกสาร พ.ศ./เดือน วันที่ อุปกรณ์ การรับประกัน และเงื่อนไขชำระ
- profile บริษัท/หน่วยงาน/ผู้ลงนามในเครื่อง ตรวจข้อมูลขาดและวงเงินอนุมัติที่กำหนดก่อนสร้าง draft
- CSV ป้องกัน formula injection; JSON backup/import มี validation และยืนยันก่อนแทนข้อมูล เก็บ procurement ไว้ด้วย แต่ JSON ไม่รวมต้นแบบ Word
- ข้อมูลจัดจ้างแยกผู้รับจ้างและต้นทุนออกจากลูกค้า/ยอดขาย มี WO/PO/งบ/วัน/กรรมการและสถานะตรวจทานเอกสารภายใน ไม่มีการลงนาม/อนุมัติ/ตรวจรับแทนผู้มีอำนาจ

| ต้นแบบ 13 รายการ                 | สถานะจริง                                                                   |
| -------------------------------- | --------------------------------------------------------------------------- |
| อนุมัติประมาณการ Solar           | แนบ exact-hash, mapping และส่งออก Word draft; native pagination ยังไม่ผ่าน  |
| แจ้งค่าใช้จ่ายและใบเสนอราคา กฟภ. | แนบ exact-hash, mapping และส่งออก Word draft; native pagination ยังไม่ผ่าน  |
| 2 แจ้งเสนอราคา                   | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 5 ขออนุมัติให้บริการ             | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 7 สัญญาให้บริการ                 | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 11 รายงานขอจ้างเจาะจง            | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 15 รายงานผลการจัดจ้าง            | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 18 รายละเอียดแนบท้ายใบสั่งจ้าง   | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 19 แจ้งลงนามในสัญญา              | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 20 เอกสารแนบการลงนาม             | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 22 สัญญาจ้างทำของ                | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |
| 23 รายงานควบคุมงาน               | legacy DOC เก็บเป็นอ้างอิง; ไม่ render/ไม่สร้าง จนได้ DOCX ที่ตรวจเทียบแล้ว |
| 24 รายงานตรวจรับ                 | DOCX อ้างอิง/ติดตาม; ยังไม่สร้างอัตโนมัติ                                   |

รวม 12 DOCX + 1 DOC ต้นฉบับไม่ถูกแก้ไข เอกสารอ้างอิงที่แนบอยู่ใน IndexedDB ของ origin นั้นเท่านั้น Browser preview ไม่ใช่ผลตรวจ Word/PDF รูปแบบพร้อมออกเอกสาร

ทดสอบ canonical renderer รอบนี้ไม่สำเร็จเพราะ bundled runtime ไม่มี LibreOffice `soffice.exe` จึงยังไม่มี PNG/PDF canonical ใหม่ที่ตรวจผ่าน ปัญหาคอลัมน์จำนวนอุปกรณ์ที่รวมหลายรายการในแถวเดียว, VML, fonts, header/footer, field/page breaks และ boilerplate ต้องตรวจใน native renderer ต่อ ไม่อนุมานอำนาจอนุมัติหรือกฎหมายปัจจุบันจากเอกสารตัวอย่าง

## 5. ข้อผิดพลาดและสิ่งที่แก้

| ระดับ       | วิธีทำซ้ำ / ผลกระทบ                                                                                         | การแก้และหลักฐาน                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 แก้แล้ว  | เปิดแก้ข้อเสนอใน A, เปลี่ยนสถานะใน B แล้วบันทึก A: baseline ที่เปลี่ยนตาม props อาจทำให้ draft ทับสถานะใหม่ | frozen editor baseline + canonical conflict check ทั้งก่อนและใน commit; browser ปฏิเสธ A และเก็บร่าง                                                                             |
| P1 แก้แล้ว  | สองแท็บกดบันทึกพร้อมกัน: localStorage get/check/set ไม่ใช่ transaction ระหว่างแท็บ                          | exclusive Web Lock ครอบ read/check/write; timeout 5 วินาที; browser ที่ไม่รองรับหยุดเขียนแต่ยังอ่าน/สำรองได้; ทดสอบสองแท็บกดพร้อมกันพบหนึ่งสำเร็จ อีกแท็บถูกปฏิเสธและยังเก็บร่าง |
| P1 แก้แล้ว  | บริษัท/ผู้ลงนามที่กำลังพิมพ์ถูกรีเซ็ตเมื่อ workspace เปลี่ยน หรือบันทึกทับอีกแท็บ                           | จับ baseline เมื่อเริ่มแก้; draft อยู่ต่อ; ตรวจ conflict เฉพาะส่วนที่แก้และรักษาส่วนอื่นล่าสุด; browser ตรวจชื่อบริษัทข้ามแท็บแล้ว                                               |
| P1 แก้แล้ว  | เลือก backup ไว้แล้วอีกแท็บเพิ่มข้อมูล ก่อนกดยืนยัน import                                                  | snapshot ณ เลือกไฟล์และตรวจ workspace ทั้งก้อนก่อนแทน; async file reads เก่าถูกละทิ้ง; regression test ยืนยันไม่ทับรายการเพิ่ม                                                   |
| P2 แก้แล้ว  | render Word เก่าจบทีหลังและแก้ DOM preview ใหม่                                                             | render ใน detached nodes แล้ว publish เฉพาะงานที่ยัง active; route review ป้องกัน async result จาก id เก่า; tests ครอบลำดับสลับ/ล้มเหลว                                          |
| P2 แก้แล้ว  | cached template เสียหายหรือเปลี่ยนหลังแนบแล้วถูกอ่านต่อโดยไม่ตรวจซ้ำ                                        | ตรวจ shape/size/date/id และ SHA-256 ทุกครั้งที่อ่านก่อน preview; ไม่ลบไฟล์เดิม; tests ครอบ hash ผิด/record ผิด                                                                   |
| P2 แก้แล้ว  | เปิด IndexedDB ถูก blocked แล้วภายหลังเปิดสำเร็จแต่ connection ค้าง                                         | ปิด connection ที่มาหลัง reject และปิดเมื่อ versionchange                                                                                                                        |
| P2 ปรับแล้ว | min-content ของฟอร์มจัดจ้าง/ชื่อยาวทำให้ grid กว้างเกินพื้นที่                                              | minmax(0,1fr), min-width:0, wrapping และ control bounds; DOM วัด viewport/page 1,265/1,265 px ไม่มี overflow ใน containers ที่ตรวจ ยังไม่แทน mobile device QA                    |
| P2 แก้แล้ว  | รูป profile อาจทำให้เข้าใจว่าล็อกอินจริง, ปุ่มช่วยเหลือไม่ให้ขั้นตอนใช้งานจริง                              | ระบุโหมดในเครื่อง/ยังไม่มีบัญชี, คู่มือจริง, ปิดปุ่มแจ้งเตือนที่ยังไม่มี backend                                                                                                 |

Web Locks ทำงานเฉพาะแท็บที่ใช้โค้ดและ lock เดียวกันบน secure origin เดียวกัน ไม่ครอบคลุมหลายเครื่อง ผู้ใช้คนละคน หรือแท็บเวอร์ชันเก่าที่ไม่ใช้ lock ควรสำรองและโหลดทุกแท็บเป็นเวอร์ชันเดียวก่อนทดสอบ ดู [W3C Web Locks](https://www.w3.org/TR/web-locks/) ไม่มีการอ้างว่านี่คือ server transaction

## 6. ความเสี่ยงที่ยังเปิดอยู่

| ระดับ                               | สถานะและเกณฑ์ปิด                                                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 release blocker                  | Auth, authorization, shared persistence, RLS/tenant isolation, server validation, audit trail ยังไม่มี ต้องผ่าน isolated staging E2E รวม denied cross-user access                                                                       |
| P1 release blocker                  | legacy feature/data parity และ migration/restore ยังไม่ครบ ต้องรักษา 8 models/relations/files และเทียบจำนวน/ค่า checksum โดยไม่คัด private exports เข้า git                                                                             |
| P1 review pending                   | legacy session metadata พบ secret fallback expression; ไม่ได้ตรวจ literal หรือค่าที่ตั้งจริง จึงยังไม่ยืนยันว่า fallback ถูกใช้หรือเป็น exploit ต้องตรวจ config แบบไม่เผยค่าและยกเลิก fallback/หมุน session หากจำเป็นในขอบเขตที่อนุมัติ |
| P1 release blocker สำหรับเอกสารจริง | native Word/PDF QA, quantity mapping, การทวน legal/template revision/ผู้มีอำนาจ และ generation 11 แบบยังไม่เสร็จ                                                                                                                        |
| P2                                  | localStorage/IndexedDB ไม่เข้ารหัสโดยแอป ไม่ใช่ระบบหลายผู้ใช้หรือที่สำรองหลัก; ล้าง site data/เปลี่ยน URL ทำให้มองไม่เห็นข้อมูล ต้อง export/reattach ด้วยตนเอง                                                                          |
| P2                                  | mobile/tablet, screen-reader/contrast และ keyboard flows ทั้งหมด ยังไม่ได้ตรวจครบ; ไม่มี load/reliability test ของ backend เพราะยังไม่มี backend                                                                                        |
| P2                                  | ยังไม่มี monitoring/alerts/branch protection ที่ยืนยันแล้ว และยังไม่ซ้อม DB backup/restore จริง                                                                                                                                         |

ตรวจ static source รุ่นใหม่ไม่พบ custom `dangerouslySetInnerHTML`, `eval` หรือ business network mutations ข้อมูลฟอร์ม render ผ่าน React text; XML generation ปฏิเสธ DOCTYPE และใช้ textContent; exact-hash guard ทำงานก่อนเปิด ZIP และเมื่ออ่าน cache ข้อสังเกตนี้ไม่ใช่ผล penetration test XSS/CSRF/SQL injection ของระบบเดิม ส่วน IDOR/CSRF ของ backend ใหม่ยังไม่สามารถถือว่าผ่านเพราะยังไม่มี endpoint/Auth ให้ทดสอบ

ตรวจ `npm audit --json` วันที่ 2026-10-25 ได้ 0 advisories ทั้ง production และ development จาก lockfile ปัจจุบัน ไม่แก้ dependencies แบบ force ข้อมูล advisory อาจเปลี่ยน ต้องรันใหม่ใน CI ก่อนปล่อยรุ่น

legacy deployment มีรายการรวม 141 files โดย 97 อยู่ใต้ `src/`; กู้ schema ได้ครบ แต่การดึง source ทั้งชุดถูก automatic approval review ปฏิเสธเพราะคำสั่งจะส่ง full base64 ก่อน secret scan จึงเปลี่ยนเป็นประมวลผลเฉพาะ metadata ที่ปลอดภัยในหน่วยความจำ (paths, bytes, integrity, exports, env names, dependency versions, boolean signals) ไม่ถือว่าตรวจ legacy source ครบ ต้องมี private export ที่ตรวจ secrets โดยไม่ปล่อย raw output ก่อนทำ full review

## 7. การทดสอบและหลักฐาน

- Automated tests 36 รายการผ่าน: 26 เดิม + 10 ใหม่ ครอบคลุม pricing/rounding/VAT/Thai baht/date/เลขซ้ำ/CSV/backup/procurement/conflicts/lock/render order/cache integrity
- ESLint, TypeScript และ optimized Next build ผ่านในรอบแก้ไข; build ไม่มี business DB connection การโหลด `.env.local` โดย Next ไม่ใช่การเชื่อมฐานข้อมูล
- Browser `127.0.0.1:3002` ด้วยข้อมูลจำลอง: บันทึกชื่อบริษัทแล้ว reload กลับได้, status ข้ามแท็บ, ปฏิเสธ stale proposal โดยเก็บ draft, dirty company draft ไม่หาย, simultaneous company saves หนึ่งสำเร็จ/อีกแท็บแจ้ง conflict, บันทึกชุดจัดจ้าง, เปิด Help จริง, ตรวจ desktop overflow และไม่มี captured warning/error ในการอ่าน log ที่ทำรอบนี้
- คืนชื่อบริษัท สถานะ และ Work Order จำลองที่เปลี่ยนเพื่อทดสอบแล้ว ไม่แก้ origin `localhost:3000` หรือ production browser data
- Native document render, backend/Auth/RLS tests, production data migration, mobile/contrast และ full legacy security review ยังไม่ผ่าน/ยังไม่ได้ทำ ห้ามรวมเป็นผลผ่าน

หลักฐาน screenshot ที่มีแต่ข้อมูลจำลองเก็บใน workspace ส่วนตัวนอก git รายการ commit/PR/CI และ Git-triggered Preview จะอ้างอิงจาก GitHub/Vercel หลัง push ไม่ยึด Preview เก่าที่ไม่มี commit เป็นหลักฐานของโค้ดรอบนี้

## 8. GitHub / Vercel และ backup / rollback

GitHub branch metadata รอบนี้ระบุ `main` เป็น `protected:false` จึงยังไม่ได้บังคับ PR/required checks ในระดับ repository ควรตั้งก่อน cutover; CI ที่มีอยู่ไม่ใช่ branch protection

Workflow: feature branch → draft PR → passing GitHub CI → Git-triggered Vercel Preview → ทดสอบ staging/UAT → ปิด release blockers → review/merge → พิจารณาปลด production hold ในงาน cutover แยก ไม่มี Vercel token ใน CI; Actions ถูก pin และ permissions เป็น contents:read

คง `git.deploymentEnabled.main=false` ไว้เสมอในรอบนี้ ตรวจ production alias ก่อนและหลัง branch publication ต้องอยู่ที่ `dpl_GFATKwyGNRXNYaSSn2HQF5VhH7WT` อย่าใช้ `--prod --skip-domain` เพื่อทดลอง เพราะเคยเปลี่ยน alias โดยไม่ตั้งใจตาม incident ที่บันทึกใน implementation status

ก่อนเปลี่ยน origin/เวอร์ชัน ให้ดาวน์โหลด JSON backup จาก UI เก็บเป็นความลับและเก็บต้นฉบับ Word ทั้ง 13 แยกไว้ ทดสอบ restore บน origin ทดสอบ: แนบ JSON → ตรวจจำนวน/วันที่/ยอด/links/procurement/company → ยืนยัน → reload → เทียบข้อมูล → แนบ Word exact-hash อีกครั้ง ถ้า import เกิด conflict ให้เก็บ draft และเลือก backup ใหม่ ไม่ reset storage เพื่อแก้ปัญหา

Rollback โค้ด Preview ใช้ deployment ก่อนหน้าหรือ revert ผ่าน PR โดยคง snapshot version ให้ backward compatible; snapshot เดิมและ template store ไม่ถูกลบอัตโนมัติ รอบนี้ไม่มี schema migration จึงไม่มี DB rollback ที่อ้างว่าซ้อมแล้ว ก่อน cutover จริงต้องจัดทำ DB/file backup ภายใต้สิทธิ์ที่อนุมัติ ทดสอบ restore แยก เทียบข้อมูล และบันทึก deployment/alias/env names โดยไม่เก็บ secret values ในรายงาน

ห้าม commit `.env`, auth config, tokens, connection strings, private recovery source/DB exports, original/generated Word/PDF หรือ JSON records การตรวจ staged files ก่อนเผยแพร่เป็น pattern scan + path allowlist ไม่ใช่คำรับรองว่า scanner ตรวจ secrets ได้ทุกชนิด

## 9. Roadmap ตามลำดับรับงาน

1. รับ project ทดสอบ/พื้นที่ฟรีที่ผู้ใช้จัดเตรียม ตรวจชื่อ/ID/organization/ต้นทุนและความแยกจาก production ก่อนใช้ ไม่ขอให้ส่ง secret ในแชต
2. ทำ Auth + organization/role policies + shared validated CRUD + revision/transaction/audit log ใน staging ทดสอบสร้าง/แก้/อ่านหลัง reload อีกเครื่องและปฏิเสธสิทธิ์ข้ามผู้ใช้/องค์กร
3. ทำ legacy feature matrix จาก private source ที่ครบและปลอดภัย ออกแบบ migration ที่เก็บ extra legacy fields/files ได้ครบ ซ้อม import/rollback กับ disposable copy และตรวจ counts/checksums
4. จัดหา canonical renderer ใน bundled environment, ตรวจ DOCX/PDF 2 แบบทุกหน้า แก้ quantity/header/footer/shape/field mappings; แปลง DOC โดยตรวจเทียบต้นฉบับและทวน template revision ก่อนทำ generation 11 แบบ
5. ปิด mobile/accessibility/end-to-end gaps เพิ่ม staging backup/restore/monitoring/CI checks และ UAT บน Preview commit ที่ระบุได้
6. เมื่อ blockers ผ่านทั้งหมดจึงเสนอ cutover ที่ตรวจรับได้ พร้อม production backup, deployment/alias IDs และ rollback plan คง production เดิมจนถึงขั้นนั้น
