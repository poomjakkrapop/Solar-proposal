# SolarDesk: โหมดข้อมูลกลาง

อัปเดต 25 ตุลาคม 2026 — **ยังไม่อนุมัติ production cutover** โค้ดและตารางข้อมูลกลางเพิ่มแล้ว การทดสอบล็อกอินจริง/ข้ามเครื่องยังต้องทำหลังตั้งค่า Secret ใน Preview

อัปเดตการตั้งค่า: ผู้ใช้เพิ่ม server Secret แล้ว ตรวจเฉพาะ metadata ว่าเป็น Sensitive ใน Preview branch ที่อนุมัติ จากนั้นเปิด `SOLARDESK_CLOUD_ENABLED=true` เฉพาะ branch นี้เพื่อเริ่ม live verification ไม่มีการอ่านค่าลับกลับมา การมี configuration ครบยังไม่ใช่หลักฐานว่าการล็อกอินและเขียนฐานข้อมูลผ่านแล้ว

## ขอบเขตที่ผู้ใช้อนุมัติ

ใช้ Supabase project เดิมร่วมกัน แต่แยกข้อมูลและสิทธิ์ SolarDesk ไม่สร้าง project/branch แบบเสียเงิน ไม่แตะตารางการเงินหรือ KPI เดิม ใช้บัญชี Auth เดิมร่วมกัน และไม่เปิดสมัครบัญชี เปลี่ยนรหัสผ่าน หรือกู้รหัสผ่านจาก SolarDesk

พบ trigger `auth.users → handle_new_user` ของระบบเดิม จึงตัด API/UI สมัครและเปลี่ยนบัญชีออกจากรุ่นนี้โดยตรง ไม่อาศัยเพียงการซ่อนปุ่มหรือ environment flag การออกจากระบบใช้ `scope:local` เพื่อไม่ออกจากทุก session ของแอปอื่น

การแยกนี้เป็นตาราง/สิทธิ์ภายในโปรเจกต์เดียวกัน ใช้ compute, quota และ Auth service ร่วมกัน ไม่ใช่ Supabase project อิสระ และ server secret มีสิทธิ์ทั้งโปรเจกต์ ต้องเก็บเป็น Secret ฝั่งเซิร์ฟเวอร์และตรวจสิทธิ์ทุกคำขอ

## โครงสร้าง

- `app/page.tsx` เลือกโหมดจาก `SOLARDESK_CLOUD_ENABLED` ถ้าปิดจะใช้โหมดในเครื่องเดิม ถ้าเปิดแต่ config ไม่ครบจะแสดงสถานะตั้งค่าไม่ครบ โดยไม่สลับไปใช้ local/demo แทนข้อมูลกลาง
- `middleware.ts` refresh session และส่ง cookie/cache headers ตาม Supabase SSR; หน้าที่ป้องกันและ API ตรวจ `getUser()` ฝั่งเซิร์ฟเวอร์อีกครั้ง ไม่ใช้ cookie payload หรือ user metadata เป็นหลักฐานสิทธิ์
- `/login` และ `/api/auth` รับเฉพาะ signin/signout cookie เป็น HttpOnly/SameSite=Lax/Secure ใน production; ไม่มี registration/reset/update-user endpoint
- `/api/workspace` ตรวจ origin, JSON/content type, ขนาด body, ข้อมูลธุรกิจ/เลขซ้ำ, identity และ membership ทุกคำขอ Role มาจาก DB ไม่รับ actor/role จาก client เพื่อกำหนดสิทธิ์
- อ่านข้อมูลด้วย client ของผู้ใช้ภายใต้ RLS เขียนผ่าน server-only RPC โดย DB ตรวจ actor/membership/role และ revision ซ้ำภายใน transaction
- cloud hook ไม่อ่าน/เขียน localStorage; ต้นแบบ Word ยังคงอยู่ใน IndexedDB ของเครื่องนั้น ไม่มีการอัปโหลดต้นแบบส่วนตัว
- มี owner/editor/viewer, รหัสเชิญผูกอีเมลบัญชีที่ยืนยันแล้ว ใช้ครั้งเดียว ภายใน 7 วัน, การระงับ/เปลี่ยนสิทธิ์ และ audit events ที่ไม่เก็บเนื้อหาเอกสารเต็ม

## ตารางและ migration

| ตารางใหม่          | หน้าที่                                           | Client access                                 |
| ------------------ | ------------------------------------------------- | --------------------------------------------- |
| `sd_v2_workspaces` | snapshot ธุรกิจ schema version 2, revision, owner | สมาชิก active อ่านภายใต้ RLS; เขียนตรงไม่ได้  |
| `sd_v2_members`    | owner/editor/viewer และ active                    | อ่าน membership ของตนเอง; เขียนตรงไม่ได้      |
| `sd_v2_audit`      | ผู้แก้ไข เหตุการณ์ revision และเวลา               | สมาชิกอ่าน; แก้/ลบตรงไม่ได้                   |
| `sd_v2_invites`    | hash ของรหัสเชิญ อีเมล สิทธิ์ และวันหมดอายุ       | ไม่มี client grants; explicit deny-all policy |

Migration ที่ใช้จริง: `20261025071520_solardesk_shared_workspace` และ `20261025073109_solardesk_invite_deny_policy` ชื่อไฟล์ใน repo ตรงกับ history ของ hosted project หลัง reconcile ไม่มี DROP/TRUNCATE หรือ ALTER ตารางเดิม

Directory นี้เก็บเฉพาะ migrations ของ SolarDesk โปรเจกต์ฐานข้อมูลร่วมมี migrations ของระบบอื่นอยู่ก่อนแล้ว **ห้าม `db reset`, `db push` หรือ repair migration history แบบเหมารวมจาก checkout นี้** ต้องตรวจ history และ apply เฉพาะ migration ที่อนุมัติของ SolarDesk

Fingerprint ของ columns/policies/triggers เดิมก่อนและหลัง migration แรกตรงกัน: `c4f47c52458a0ecb73a0ebe204c0570f` เป็นหลักฐานโครงสร้างในขอบเขต query ไม่ใช่ checksum ของทุกแถวข้อมูล หลังเพิ่ม deny policy Security Advisor ไม่พบรายการใหม่ที่เกี่ยวกับ `sd_v2_*`; รายการเดิมของระบบอื่นไม่ได้ถูกแก้ในงานนี้

Workspace รุ่นแรกเก็บข้อมูลเป็น JSON snapshot สูงสุด 4 MB เพื่อลดความเสี่ยงทำ field เดิมหาย มี row lock + expected revision ป้องกันการเขียนทับหลายเครื่อง ถ้าเป็นคนละ revision จะตอบ 409 และเก็บ draft ไว้ ถ้าขาดการเชื่อมต่อหลังส่งคำขอ ผลอาจยังไม่ยืนยัน ต้องอ่าน revision ล่าสุดก่อนลองใหม่ โครงสร้างนี้ยังไม่ใช่ migration ของ 8 models/ไฟล์ในระบบ Solar เดิม และยังต้องทดสอบขนาด/โหลดก่อนขยายทีม

## การตั้งค่า Preview

เก็บค่าใน Vercel Environment Variables เฉพาะ Preview และ branch `fix/readiness-audit`:

| ชื่อ                       | ค่า/วิธีตั้ง                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `SUPABASE_PROJECT_REF`     | Project ID ที่อนุมัติ                                                                                   |
| `SUPABASE_URL`             | HTTPS endpoint ของ Project ID เดียวกัน; โค้ดตรวจ hostname ให้ตรง                                        |
| `SUPABASE_PUBLISHABLE_KEY` | modern publishable key; เก็บผ่านช่องทาง config ส่วนตัว ไม่มีค่าใน Git                                   |
| `SUPABASE_SECRET_KEY`      | modern server secret ตั้งตรงใน Vercel เป็น Secret ไม่ผ่านแชต/command arguments; ห้าม NEXT_PUBLIC prefix |
| `SOLARDESK_APP_URL`        | HTTPS branch alias ของ Preview                                                                          |
| `SOLARDESK_CLOUD_ENABLED`  | คง `false` จนตั้งค่า Secret ครบและพร้อมทดสอบ แล้วเปลี่ยนเฉพาะ Preview เป็น `true` และ rebuild           |

`.env.example` มีเพียงชื่อและค่าว่าง ไม่มี key จริง การตั้งค่าตัวแปรอื่นของ Preview เตรียมแล้ว ส่วน server Secret และการยืนยันบัญชีจริงยังต้องดำเนินการในช่องทางที่ปลอดภัย ไม่มี Production env ถูกแก้

## ขั้นตอนทดสอบจริงที่ยังต้องปิด

1. เข้า Preview ด้วยบัญชีเดิมที่ผู้ใช้อนุญาต อย่านำรหัสผ่านเข้าแชต/สคริปต์/fixtures ไม่สมัคร test account เพราะอาจกระตุ้น trigger ของระบบเดิม
2. สร้างพื้นที่ว่าง ไม่มี demo/local records ถูกส่งอัตโนมัติ สร้างข้อมูลที่ระบุชัดว่า synthetic ในตารางใหม่เท่านั้น
3. ทดสอบ browser → API → identity → membership → transaction → audit → UI และ reload จากอีกเครื่อง/เบราว์เซอร์
4. เชิญบัญชีเดิมที่สองเป็น viewer ยืนยันว่าอ่านได้แต่เขียนไม่ได้ จากนั้นเปลี่ยนเป็น editor และทดสอบ revision conflict/การระงับสิทธิ์ทันที
5. ทดสอบ JSON backup/restore โดยยืนยันการส่ง/แทนข้อมูลกลางอย่างชัดเจน ห้ามนำเข้าฐานข้อมูลจริงหรือต้นแบบส่วนตัวเพื่อทดสอบโดยอัตโนมัติ
6. ตรวจ logs เฉพาะ metadata และ recheck schema fingerprint/advisors ไม่บันทึก key/token/password/raw headers

Automated tests ใช้ Postgres/WASM (PGlite) จริงในหน่วยความจำ: RLS isolation, deny direct writes/RPC, stale/null revisions, transaction rollback, invite binding/single-use, viewer denial และการเปลี่ยน/ระงับสมาชิก ผลนี้ไม่ทดแทน hosted Auth และ end-to-end หลายเครื่อง

ผลรอบล่าสุด: `npm test` ผ่าน 47 รายการ และ `npm run test:http` ผ่าน 6 รายการบน optimized Next server แยกใน loopback CI รัน HTTP checks หลัง build ด้วย พบและแก้ origin check ที่เคยใช้ hostname ภายในของ Next แทนปลายทางของ browser; regression ครอบ HTTPS proxy และยังปฏิเสธ origin/protocol ที่ต่างกัน ตรวจ live Supabase ด้วย publishable key พบ anonymous SELECT และ mutation RPC ถูกปฏิเสธทั้งคู่ (401/42501) โดยไม่สร้างผู้ใช้หรือแก้ข้อมูลเดิม Full npm audit ได้ 0 advisories

## Rollback และข้อจำกัด

ย้อนกลับได้โดยปิด flag เฉพาะ Preview แล้ว redeploy รุ่นก่อนหน้า เก็บตารางใหม่ไว้ ไม่ลบ snapshot, audit, memberships หรือ invitations เพื่อ rollback โค้ด ข้อมูล localStorage/IndexedDB เดิมยังอยู่ และไม่มีการแทนข้อมูลกลางด้วย local snapshot อัตโนมัติ

Main deployment hold ยังอยู่ Production Solar เดิมยังไม่เปลี่ยน Full legacy parity/restore, native Word/PDF QA, document generation 11 แบบ, mobile/accessibility/load testing และ credential/configuration review ยังเป็น release blockers ตามรายงาน readiness หลัก
