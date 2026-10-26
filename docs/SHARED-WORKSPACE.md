# SolarDesk: โหมดข้อมูลกลาง

**อัปเดตต้นแบบส่วนตัว 26 ตุลาคม 2026:** เอกสารทั้ง 13 แบบโหลดอัตโนมัติผ่าน `/api/document-templates/[id]` หลังยืนยันบัญชี อีเมล และ active membership ของ SolarDesk (owner/editor/viewer) ใช้ตารางแยก `sd_v2_document_templates` ที่เปิด/บังคับ RLS และไม่มีสิทธิ์อ่านตรงสำหรับ anon/authenticated; server role อ่านได้อย่างเดียว ต้นแบบไม่อยู่ใน Git, public assets หรือ deployment ผู้ใช้ไม่ต้องแนบต้นฉบับซ้ำ และข้อมูล IndexedDB เดิมไม่ถูกแก้หรือลบ ดู [PRIVATE-TEMPLATES.md](PRIVATE-TEMPLATES.md) สำหรับวิธีใช้และขอบเขตตรวจรับ การใช้ต้นแบบส่วนตัวต้องมี backend ที่ตั้งค่าพร้อมและล็อกอิน ไม่เปิดให้ local/demo ที่ยังไม่ตั้งค่าใช้ไฟล์สาธารณะทดแทน

อัปเดต 25 ตุลาคม 2026 — **ยังไม่อนุมัติ production cutover** เปิดข้อมูลกลางเฉพาะ Preview แล้ว การล็อกอิน เพิ่มลูกค้าทดสอบและรีเฟรชผ่านโดยผู้ใช้ พร้อมหลักฐานจากฐานข้อมูลที่ revision 2 การทดสอบสิทธิ์หลายบัญชีบนระบบจริงยังค้าง เพราะขณะนี้มีบัญชีเดิมพร้อมทดสอบเพียงบัญชีเดียว

อัปเดตการตั้งค่า: ผู้ใช้เพิ่ม server Secret แล้ว ตรวจเฉพาะ metadata ว่าเป็น Sensitive ใน Preview branch ที่อนุมัติ จากนั้นเปิด `SOLARDESK_CLOUD_ENABLED=true` เฉพาะ branch นี้เพื่อเริ่ม live verification ไม่มีการอ่านค่าลับกลับมา การมี configuration ครบยังไม่ใช่หลักฐานว่าการล็อกอินและเขียนฐานข้อมูลผ่านแล้ว

## ขอบเขตที่ผู้ใช้อนุมัติ

Follow-up: เพิ่มแค็ตตาล็อก owner-only และ migration ที่สาม `20261025142650_solardesk_catalog_write_guard` แล้ว โดยคงสิทธิ์/validation เดิมและป้องกัน client เก่าเขียนทิ้ง catalog ข้อมูล workspace เดิมยัง revision 2 หลัง migration ดู [CATALOG.md](CATALOG.md) สำหรับข้อกำหนดของ backup envelope v3 และผล UI/SQL จำลอง

ใช้ Supabase project เดิมร่วมกัน แต่แยกข้อมูลและสิทธิ์ SolarDesk ไม่สร้าง project/branch แบบเสียเงิน ไม่แตะตารางการเงินหรือ KPI เดิม ใช้บัญชี Auth เดิมร่วมกัน และไม่เปิดสมัครบัญชี เปลี่ยนรหัสผ่าน หรือกู้รหัสผ่านจาก SolarDesk

พบ trigger `auth.users → handle_new_user` ของระบบเดิม จึงตัด API/UI สมัครและเปลี่ยนบัญชีออกจากรุ่นนี้โดยตรง ไม่อาศัยเพียงการซ่อนปุ่มหรือ environment flag การออกจากระบบใช้ `scope:local` เพื่อไม่ออกจากทุก session ของแอปอื่น

การแยกนี้เป็นตาราง/สิทธิ์ภายในโปรเจกต์เดียวกัน ใช้ compute, quota และ Auth service ร่วมกัน ไม่ใช่ Supabase project อิสระ และ server secret มีสิทธิ์ทั้งโปรเจกต์ ต้องเก็บเป็น Secret ฝั่งเซิร์ฟเวอร์และตรวจสิทธิ์ทุกคำขอ

## โครงสร้าง

- `app/page.tsx` เลือกโหมดจาก `SOLARDESK_CLOUD_ENABLED` ถ้าปิดจะใช้โหมดในเครื่องเดิม ถ้าเปิดแต่ config ไม่ครบจะแสดงสถานะตั้งค่าไม่ครบ โดยไม่สลับไปใช้ local/demo แทนข้อมูลกลาง
- `middleware.ts` refresh session และส่ง cookie/cache headers ตาม Supabase SSR; หน้าที่ป้องกันและ API ตรวจ `getUser()` ฝั่งเซิร์ฟเวอร์อีกครั้ง ไม่ใช้ cookie payload หรือ user metadata เป็นหลักฐานสิทธิ์
- `/login` และ `/api/auth` รับเฉพาะ signin/signout cookie เป็น HttpOnly/SameSite=Lax/Secure ใน production; ไม่มี registration/reset/update-user endpoint
- `/api/workspace` ตรวจ origin, JSON/content type, ขนาด body, ข้อมูลธุรกิจ/เลขซ้ำ, identity และ membership ทุกคำขอ Role มาจาก DB ไม่รับ actor/role จาก client เพื่อกำหนดสิทธิ์
- อ่านข้อมูลด้วย client ของผู้ใช้ภายใต้ RLS เขียนผ่าน server-only RPC โดย DB ตรวจ actor/membership/role และ revision ซ้ำภายใน transaction
- cloud hook ไม่อ่าน/เขียน localStorage; ต้นแบบส่วนตัวโหลดจาก endpoint ที่ตรวจ identity/membership และส่ง private/no-store ต้นฉบับ IndexedDB เดิมยังอยู่ แต่ default loader ไม่อ่านหรือเขียนทับ
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

`.env.example` มีเพียงชื่อและค่าว่าง ไม่มี key จริง Preview ตั้งค่าครบและเปิด cloud mode แล้ว ผู้ใช้เพิ่มตัวแปร Secret ชื่อเดียวกันใน Production ด้วย ไม่ได้อ่านค่า/เปลี่ยน/ลบรายการนั้น งานของ agent ตั้งค่าเฉพาะ Preview และไม่ได้เปลี่ยน production alias หรือ main deployment hold

## หลักฐาน hosted Preview ล่าสุด

- Git commit `e309b1a0250f211b19bcb2f509e5c32524004136`: [CI ผ่าน](https://github.com/poomjakkrapop/Solar-proposal/actions/runs/40177906638), Preview `dpl_9zJTA9FxvK6Jx1F8ufupLDaG8tjH` READY; [ลิงก์รุ่นนั้น](https://solar-proposal-etz10s790-emolaza.vercel.app) และ [branch alias สำหรับทดสอบ](https://solar-proposal-git-fix-readiness-audit-emolaza.vercel.app)
- Hosted HTTP checks 8 รายการผ่าน: root redirect, login พร้อม private/no-store, anonymous workspace 401, signup 403, cross-origin mutation 403, JSONP 415, JSON เสีย 400 และ auth body เกินขนาด 413 ไม่มีการสร้าง Auth users
- ผู้ใช้ยืนยันว่าล็อกอินสำเร็จ/เห็นหน้าเริ่มพื้นที่ทำงาน ตรวจฐานข้อมูลแบบอ่านเฉพาะ metadata พบ workspace 1 แห่ง, member 1 คน, revision 1, audit 1 รายการ, customer/proposal 0 รายการ ตรงกับการเริ่มพื้นที่ว่างโดยไม่อัปโหลด demo/local records
- ผู้ใช้เพิ่มลูกค้าชื่อ synthetic ที่ตกลงกัน บันทึกและรีเฟรชแล้วยืนยันว่าชื่อยังอยู่ Query แบบอ่านเฉพาะ count/revision พบชื่อนั้น 1 รายการ, workspace revision 2, audit 2 รายการและ latest audit revision 2 เป็นผลผ่านแบบ owner-assisted พร้อม database corroboration ไม่ใช่การดู UI ที่ล็อกอินโดย agent
- Commit `609b2e3e26af5022c48887b06ab1576ff2943456` ผ่าน [CI](https://github.com/poomjakkrapop/Solar-proposal/actions/runs/40178951335); [Preview](https://solar-proposal-86yneevmt-emolaza.vercel.app) `dpl_D2a7emxdT47PZPBza9HKV37VuV9n` READY, ตรวจ functions อยู่ `hnd1` และ hosted checks 8 รายการผ่าน โดเมน production ยังคงชี้ `dpl_GFATKwyGNRXNYaSSn2HQF5VhH7WT`
- Browser session ที่ agent ควบคุมยัง redirect ไป login ไม่อ่าน credentials หรือ impersonate ผู้ใช้ ผู้ใช้ยืนยันว่ามีเพียงบัญชีเดียว จึงยังตรวจ viewer/editor/invitation/revocation จริงหลายบัญชีไม่ได้ และไม่ได้สร้าง Auth user เพิ่มใน shared project เพื่อทดสอบ

## แก้การแสดงสิทธิ์และคำตอบเครือข่ายล่าช้า

พบว่าฐานข้อมูล/เซิร์ฟเวอร์ตรวจ role ที่เปลี่ยนแล้ว แต่ปุ่มและป้าย role ในหน้าเปิดค้างอ้างค่าตอนเปิดหน้า แก้ให้ background/focus refresh แจ้ง role กลับถึง UI แม้ document revision ไม่เพิ่ม และล็อกการบันทึกเมื่อยืนยันสิทธิ์ไม่ได้ โดยไม่ remount workspace หรือทิ้งร่างที่กรอก

คำขออ่านที่ล้าสมัย/ยกเลิกจะไม่เปลี่ยน role/snapshot หรือแสดง network error ทับผลใหม่ การเริ่ม save ทำให้ read เก่าหมดสิทธิ์อัปเดต state และเมื่อ refresh สำเร็จจะล้างเฉพาะ read error แยกจาก save/conflict error Regression 4 กรณีครอบ late editor หลัง viewer ที่ revision เท่ากัน, late read/error หลัง save, การปฏิเสธสิทธิ์/ยกเลิก และ response จาก workspace ผิดชุด ยังต้องทำ hosted multi-account UI acceptance เมื่อมีบัญชีเดิมที่สอง

ทดสอบ UI เพิ่มใน loopback harness ส่วนตัวที่ใช้ components/hooks จริงของ branch นี้ กับ API และข้อมูล synthetic ในหน่วยความจำ ไม่มี Auth users/keys หรือการเชื่อมฐานข้อมูลจริง: editor → viewer ทำให้ role เปลี่ยนแม้ revision เท่าเดิม ปุ่ม save ในฟอร์มลูกค้าปิดพร้อมข้อความให้คัดลอกร่าง โดยชื่อ/ผู้ติดต่อ/พื้นที่ที่กรอกไม่หาย; revoked ทำให้ UI ระบุว่ายืนยันสิทธิ์ไม่ได้; กลับเป็น editor แล้วปุ่มเปิดและ read error หาย บันทึกร่างเดิมและ reload พบข้อมูลที่บันทึก จากนั้นเปิดฟอร์มลูกค้าเดียวกันสองแท็บ แท็บแรกบันทึกได้ แท็บเก่าถูกปฏิเสธพร้อมร่างเดิมและข้อมูลล่าสุดยังเป็นของแท็บแรก ผลนี้ตรวจ React/UI กับ contract จำลอง ไม่แทน hosted Supabase multi-account หรือ cross-device acceptance ตัว harness/ภาพหลักฐานอยู่ภายนอก repository และไม่ถูก deploy

## การลดเวลารอ

ตั้ง `regions:["hnd1"]` ใน `vercel.json` ให้รุ่นใหม่ประมวลผลที่โตเกียวใกล้ฐานข้อมูล `ap-northeast-1` แทนค่าเดิมของ Preview ที่ `iad1` และอ่าน membership/workspace list พร้อมกัน จากนั้นอ่าน snapshot/audit พร้อมกันภายใต้ RLS เดิม การยืนยัน identity/membership และ transaction เขียนยังตามลำดับเดิม ไม่มี shared cache ของข้อมูลผู้ใช้ ยืนยัน region ของ deployment `609b2e3` แล้ว; ยังไม่มี benchmark ของ authenticated flow

อ้างอิง: [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region), [region codes](https://vercel.com/docs/regions)

## ขั้นตอนทดสอบจริงที่ยังต้องปิด

1. เข้า Preview ด้วยบัญชีเดิมที่ผู้ใช้อนุญาต อย่านำรหัสผ่านเข้าแชต/สคริปต์/fixtures ไม่สมัคร test account เพราะอาจกระตุ้น trigger ของระบบเดิม
2. สร้างพื้นที่ว่าง ไม่มี demo/local records ถูกส่งอัตโนมัติ สร้างข้อมูลที่ระบุชัดว่า synthetic ในตารางใหม่เท่านั้น
3. ทดสอบ browser → API → identity → membership → transaction → audit → UI และ reload จากอีกเครื่อง/เบราว์เซอร์
4. เชิญบัญชีเดิมที่สองเป็น viewer ยืนยันว่าอ่านได้แต่เขียนไม่ได้ จากนั้นเปลี่ยนเป็น editor และทดสอบ revision conflict/การระงับสิทธิ์ทันที
5. ทดสอบ JSON backup/restore โดยยืนยันการส่ง/แทนข้อมูลกลางอย่างชัดเจน ห้ามนำเข้าฐานข้อมูลจริงหรือต้นแบบส่วนตัวเพื่อทดสอบโดยอัตโนมัติ
6. ตรวจ logs เฉพาะ metadata และ recheck schema fingerprint/advisors ไม่บันทึก key/token/password/raw headers

Automated tests ใช้ Postgres/WASM (PGlite) จริงในหน่วยความจำ: RLS isolation, deny direct writes/RPC, stale/null revisions, transaction rollback, invite binding/single-use, viewer denial และการเปลี่ยน/ระงับสมาชิก ผลนี้ไม่ทดแทน hosted Auth และ end-to-end หลายเครื่อง

ผลรอบล่าสุด: `npm test` ผ่าน 51 รายการ รวม regression การอ่านล่าช้า 4 รายการ และ `npm run test:http` ผ่าน 6 รายการบน optimized Next server รุ่นสุดท้ายแยกใน loopback รวม 57 รายการ; lint และ build ผ่าน CI รัน HTTP checks หลัง build ด้วย พบและแก้ origin check ที่เคยใช้ hostname ภายในของ Next แทนปลายทางของ browser; regression ครอบ HTTPS proxy และยังปฏิเสธ origin/protocol ที่ต่างกัน ตรวจ live Supabase ด้วย publishable key พบ anonymous SELECT และ mutation RPC ถูกปฏิเสธทั้งคู่ (401/42501) โดยไม่สร้างผู้ใช้หรือแก้ข้อมูลเดิม Full npm audit รอบล่าสุดได้ 0 advisories

## Rollback และข้อจำกัด

ย้อนกลับได้โดยปิด flag เฉพาะ Preview แล้ว redeploy รุ่นก่อนหน้า เก็บตารางใหม่ไว้ ไม่ลบ snapshot, audit, memberships หรือ invitations เพื่อ rollback โค้ด ข้อมูล localStorage/IndexedDB เดิมยังอยู่ และไม่มีการแทนข้อมูลกลางด้วย local snapshot อัตโนมัติ

Main deployment hold ยังอยู่ Production Solar เดิมยังไม่เปลี่ยน Full legacy parity/restore, native Word/PDF QA, document generation 11 แบบ, mobile/accessibility/load testing และ credential/configuration review ยังเป็น release blockers ตามรายงาน readiness หลัก
