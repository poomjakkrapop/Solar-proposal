import { money, statuses, type Proposal } from "../lib/workspace";
import { Activity, BadgeCheck, FileText, Wallet } from "lucide-react";

export function SummaryMetrics({ proposals }: { proposals: Proposal[] }) {
  const pending = proposals.filter(
    (proposal) =>
      proposal.status === "ส่งแล้ว" || proposal.status === "กำลังเจรจา",
  );
  const won = proposals.filter((proposal) => proposal.status === "ชนะงาน");
  const metrics = [
    {
      title: "มูลค่า Pipeline",
      value: money(pending.reduce((sum, proposal) => sum + proposal.amount, 0)),
      detail: `${pending.length} ข้อเสนอที่ยังเปิดอยู่`,
      icon: Wallet,
      color: "blue",
    },
    {
      title: "ปิดการขายแล้ว",
      value: money(won.reduce((sum, proposal) => sum + proposal.amount, 0)),
      detail: `${won.length} โครงการที่ชนะงาน`,
      icon: BadgeCheck,
      color: "green",
    },
    {
      title: "ใบเสนอราคาทั้งหมด",
      value: `${proposals.length} รายการ`,
      detail: `${proposals.filter((proposal) => proposal.status === "ร่าง").length} รายการอยู่ระหว่างจัดทำ`,
      icon: FileText,
      color: "gold",
    },
    {
      title: "กำลังรอติดตาม",
      value: `${pending.length} รายการ`,
      detail: "ส่งแล้วและกำลังเจรจา",
      icon: Activity,
      color: "orange",
    },
  ];
  return (
    <div className="metric-grid">
      {metrics.map(({ title, value, detail, icon: Icon, color }) => (
        <article className="metric-card" key={title}>
          <div className="metric-top">
            <span>{title}</span>
            <span className={`metric-icon ${color}`}>
              <Icon size={18} />
            </span>
          </div>
          <strong>{value}</strong>
          <div className="metric-foot">
            <span>{detail}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PipelineChart({ proposals }: { proposals: Proposal[] }) {
  const columns = statuses.map((status) => ({
    status,
    count: proposals.filter((proposal) => proposal.status === status).length,
    amount: proposals
      .filter((proposal) => proposal.status === status)
      .reduce((sum, proposal) => sum + proposal.amount, 0),
  }));
  const largest = Math.max(1, ...columns.map((column) => column.amount));
  return (
    <section className="panel pipeline-panel">
      <div className="panel-head">
        <div>
          <h2>มูลค่าข้อเสนอตามสถานะ</h2>
          <p>คำนวณจากรายการปัจจุบันทั้งหมด</p>
        </div>
      </div>
      <div
        className="live-pipeline"
        role="img"
        aria-label={columns
          .map((column) => `${column.status} ${money(column.amount)}`)
          .join(", ")}
      >
        {columns.map((column, index) => (
          <div className="live-column" key={column.status}>
            <span>{money(column.amount)}</span>
            <div>
              <i
                className={`pipeline-bar bar-${index}`}
                style={{
                  height: `${Math.max(2, (column.amount / largest) * 100)}%`,
                }}
              />
            </div>
            <strong>{column.status}</strong>
            <small>{column.count} รายการ</small>
          </div>
        ))}
      </div>
    </section>
  );
}
export function StageOverview({ proposals }: { proposals: Proposal[] }) {
  const colors = ["#9bb7e9", "#f2bd59", "#4e7fe0", "#64bb99", "#d58d88"];
  const stages = statuses.map((status, index) => ({
    status,
    color: colors[index],
    count: proposals.filter((proposal) => proposal.status === status).length,
  }));
  let angle = 0;
  const stops = stages.map((stage) => {
    const start = angle;
    angle += proposals.length ? (stage.count / proposals.length) * 360 : 0;
    return `${stage.color} ${start}deg ${angle}deg`;
  });
  return (
    <section className="panel stages-panel">
      <div className="panel-head">
        <div>
          <h2>ขั้นตอนการขาย</h2>
          <p>จำนวนใบเสนอราคาแยกตามสถานะ</p>
        </div>
      </div>
      <div
        className="stage-ring"
        style={{
          background: proposals.length
            ? `conic-gradient(${stops.join(",")})`
            : "#e9edf1",
        }}
      >
        <div className="ring-center">
          <strong>{proposals.length}</strong>
          <span>ทั้งหมด</span>
        </div>
      </div>
      <div className="stage-list">
        {stages.map((stage) => (
          <div className="stage-row" key={stage.status}>
            <span className="stage-dot" style={{ background: stage.color }} />
            {stage.status}
            <strong>{stage.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
