import {
  dateLabel,
  money,
  type Company,
  type Proposal,
} from "../lib/workspace";

export function ProposalPrint({
  proposal,
  company,
}: {
  proposal: Proposal;
  company: Company;
}) {
  return (
    <section className="print-document" aria-label="เอกสารใบเสนอราคา">
      <header>
        <div>
          <h1>{company.name}</h1>
          {company.address && <p>{company.address}</p>}
          {company.phone && <p>โทร. {company.phone}</p>}
          {company.email && <p>{company.email}</p>}
          {company.taxId && <p>เลขประจำตัวผู้เสียภาษี {company.taxId}</p>}
        </div>
        <div className="print-title">
          <h2>ใบเสนอราคา</h2>
          <p>{proposal.id}</p>
          <p>วันที่ {dateLabel(proposal.created)}</p>
          {proposal.validUntil && (
            <p>ใช้ได้ถึง {dateLabel(proposal.validUntil)}</p>
          )}
        </div>
      </header>
      <div className="print-recipient">
        <strong>เสนอถึง {proposal.customer}</strong>
        <p>
          ผู้ติดต่อ {proposal.contact}
          {proposal.phone && ` · โทร. ${proposal.phone}`}
        </p>
        <p>พื้นที่ติดตั้ง {proposal.location}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>รายการ</th>
            <th>ขนาดระบบ</th>
            <th>มูลค่ารวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ระบบโซลาร์เซลล์ {proposal.package}</td>
            <td>{proposal.system} kWp</td>
            <td>{money(proposal.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={2}>ยอดรวมข้อเสนอ</th>
            <td>{money(proposal.amount)}</td>
          </tr>
        </tfoot>
      </table>
      {proposal.notes && (
        <div className="print-notes">
          <strong>หมายเหตุ / เงื่อนไข</strong>
          <p>{proposal.notes}</p>
        </div>
      )}
      <div className="print-signatures">
        <div>
          <span>ลงชื่อ ___________________________</span>
          <p>ผู้เสนอราคา</p>
        </div>
        <div>
          <span>ลงชื่อ ___________________________</span>
          <p>ผู้อนุมัติ / ลูกค้า</p>
        </div>
      </div>
      <footer>
        เอกสารตัวอย่างจาก SolarDesk · โปรดตรวจสอบข้อมูลก่อนนำไปใช้งาน
      </footer>
    </section>
  );
}
