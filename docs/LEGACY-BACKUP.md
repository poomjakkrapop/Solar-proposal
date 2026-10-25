# สำรอง Solar เดิมก่อนย้ายระบบ

ผู้ใช้ยืนยันว่ายังไม่มี backup/export สำหรับทดสอบ เครื่องนี้ยังไม่พบ pg_dump/psql จึงยังไม่ได้สร้าง backup จริงหรือซ้อม restore ไม่มี credentials/ข้อมูล production ถูกอ่านโดยเครื่องมือนี้

## เครื่องมือที่เตรียมแล้ว

`docs/tools/backup-legacy.ps1` สำหรับ PowerShell 7 บน Windows เริ่มต้นเป็น plan-only ไม่เชื่อม DB และไม่สร้างไฟล์ ต้องเพิ่ม `-Execute` จึงจะทำงานจริง โดยใช้ PostgreSQL client tools ที่รุ่นรองรับ server เดิม

กำหนด libpq service ชื่อเฉพาะ Solar เดิมและ passfile ส่วนตัวนอก Git ผ่านช่องทางจัดการฐานข้อมูลของเจ้าของ ตรวจ host/database ให้ตรงกับ Solar Prisma เดิม ไม่ใช่ Supabase finance/KPI ที่ใช้ Auth ร่วมกับ V2 ไม่ส่ง connection string/password/key ผ่านแชตหรือ command arguments และไม่ลด TLS verification

ตัวอย่างตรวจแผน (ไม่มีค่าลับ):

```powershell
pwsh -File ./docs/tools/backup-legacy.ps1 -ServiceName solar_legacy_backup -DestinationDirectory C:/PrivateSolarBackups
```

ก่อนใช้ `-Execute` ต้องตั้ง libpq service/passfile และตรวจว่า destination เป็นดิสก์ส่วนตัวที่ไม่ sync/share; script ปฏิเสธ UNC และ directory ภายใน Git checkout สร้างโฟลเดอร์ใหม่พร้อม ACL เฉพาะผู้ใช้ปัจจุบันและ SYSTEM แล้วเก็บ stderr/TOC แบบส่วนตัว ไม่พิมพ์ native error หรือ records ออก console

Preflight ใช้ read-only query ต้องพบ 8 ตาราง User/Customer/Package/Equipment/CompanyInfo/Proposal/Template/FileBlob และไม่มีตารางผู้ใช้อื่นนอกจาก _prisma_migrations ถ้าพบฐานร่วม/extension tables จะหยุดให้ตรวจขอบเขต ไม่ dump รวมระบบอื่นโดยอัตโนมัติ หลังผ่านจึงทำ consistent custom-format archive ของฐาน Solar, ตรวจ pg_restore --list และ SHA-256 เก็บ manifest ที่ระบุ `RestoreVerified=false` ไม่มีคำสั่ง restore/delete/migrate ใน script

การใช้ full-database dump นี้รักษา schema/dependencies และ bytea ของ FileBlob; การกรองเฉพาะตารางบางส่วนอาจทำให้ dependencies ของ schema หาย หาก layout ต่างจาก preflight ให้ทบทวนแผนสำรองเป็นรายกรณี ไม่แก้ guard เพื่อให้ผ่านโดยเดา

## สิ่งที่ต้องยืนยันในการซ้อมกู้คืน

1. เลือกฐานทดสอบว่างที่ได้รับอนุญาตและยืนยันว่าแยกจาก production/finance/KPI ตรวจ role, version, extension และพื้นที่เก็บก่อน restore ไม่มีการซื้อหรือสร้างบริการเสียเงินอัตโนมัติ
2. ตรวจที่มาของ dump/TOC ก่อน restore เพราะ dump อาจมี SQL/functions ของระบบต้นทาง ใช้สิทธิ์จำกัดและไม่ใช้ `--clean` หรือ restore ทับฐานที่มีข้อมูล
3. หลัง restore ตรวจ counts/relations ของทั้ง 8 models, IDs/เลขเอกสาร, ราคา/ส่วนลด/VAT/สถานะเดิม และ hash/จำนวน bytes ของทุก FileBlob ตรวจว่าไฟล์อ่านได้และ template refs ไม่ขาด
4. ทดสอบ login/roles ของระบบเดิมบนสำเนาและออกเอกสารด้วยข้อมูล synthetic ไม่เรียก SMTP/AI/บริการภายนอกจริงโดยอัตโนมัติ ไม่ import password hashes ไปสร้าง Supabase Auth users
5. บันทึกหลักฐาน restore, mapping และ rollback แล้วจึงพิจารณา migration/cutover ตาม LEGACY-COMPATIBILITY.md การมีไฟล์ dump หรือ SHA-256 เพียงอย่างเดียวยังไม่ถือว่า restore ผ่าน

อ้างอิงทางการ: [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html), [libpq service file](https://www.postgresql.org/docs/17/libpq-pgservice.html), [password file](https://www.postgresql.org/docs/17/libpq-pgpass.html)
