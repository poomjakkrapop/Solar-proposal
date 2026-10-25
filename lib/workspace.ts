import {
  isOfficialProfile,
  isSolarDetails,
  type OfficialProfile,
  type SolarDetails,
} from "./solar.ts";
import { isProcurement, type Procurement } from "./procurement.ts";

export const statuses = [
  "ร่าง",
  "ส่งแล้ว",
  "กำลังเจรจา",
  "ชนะงาน",
  "ไม่สำเร็จ",
] as const;
export type Status = (typeof statuses)[number];
export type Proposal = {
  id: string;
  customerId?: string;
  customer: string;
  contact: string;
  phone?: string;
  location: string;
  system: number;
  package: string;
  amount: number;
  status: Status;
  created: string;
  updated: string;
  notes?: string;
  validUntil?: string;
  documentNumber?: string;
  solar?: SolarDetails;
  procurement?: Procurement;
};
export type Customer = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  location: string;
  count: number;
  value: number;
};
export type Company = {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  official?: OfficialProfile;
};
export type Workspace = {
  proposals: Proposal[];
  customers: Customer[];
  company: Company;
};
export const defaultCompany: Company = {
  name: "Solar Energy Co.",
  address: "",
  phone: "",
  email: "",
  taxId: "",
};
export const WORKSPACE_KEY = "solardesk-workspace:v2";
export const catalog = [
  {
    name: "Residential Standard",
    label: "บ้านพักอาศัย",
    system: 5,
    price: 219000,
  },
  {
    name: "Residential Premium",
    label: "บ้านพักอาศัย",
    system: 10,
    price: 389000,
  },
  { name: "Business Pro", label: "ธุรกิจและอาคาร", system: 30, price: 945000 },
  {
    name: "Industrial Max",
    label: "โรงงานอุตสาหกรรม",
    system: 100,
    price: 2780000,
  },
] as const;
const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});
export const money = (value: number) => moneyFormatter.format(value);
export function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 10000;
const finite = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1e12;
function isProposal(value: unknown): value is Proposal {
  return (
    record(value) &&
    [
      "id",
      "customer",
      "contact",
      "location",
      "package",
      "created",
      "updated",
    ].every((key) => string(value[key])) &&
    finite(value.amount) &&
    finite(value.system) &&
    statuses.includes(value.status as Status) &&
    ["customerId", "phone", "notes", "validUntil"].every(
      (key) => value[key] === undefined || string(value[key]),
    ) &&
    (value.solar === undefined || isSolarDetails(value.solar)) &&
    (value.procurement === undefined || isProcurement(value.procurement)) &&
    (value.documentNumber === undefined ||
      (typeof value.documentNumber === "string" &&
        /^[A-Za-z0-9ก-๙_.-]{1,80}$/.test(value.documentNumber)))
  );
}
function isCustomer(value: unknown): value is Customer {
  return (
    record(value) &&
    ["id", "name", "contact", "phone", "email", "location"].every((key) =>
      string(value[key]),
    ) &&
    finite(value.count) &&
    finite(value.value)
  );
}
function isCompany(value: unknown): value is Company {
  return (
    record(value) &&
    ["name", "address", "phone", "email", "taxId"].every((key) =>
      string(value[key]),
    ) &&
    (value.official === undefined || isOfficialProfile(value.official))
  );
}
function checkUnique(items: { id: string }[]) {
  return (
    items.every((item) => item.id.trim().length > 0) &&
    new Set(items.map((item) => item.id)).size === items.length
  );
}
export function validateWorkspace(value: unknown): Workspace {
  if (
    !record(value) ||
    !Array.isArray(value.proposals) ||
    !value.proposals.every(isProposal) ||
    !Array.isArray(value.customers) ||
    !value.customers.every(isCustomer) ||
    !isCompany(value.company) ||
    !checkUnique(value.proposals) ||
    !checkUnique(value.customers)
  ) {
    throw new Error("รูปแบบข้อมูลไม่ถูกต้อง ข้อมูลที่บันทึกไว้ยังไม่ถูกแก้ไข");
  }
  const customers: Customer[] = value.customers;
  const documentNumbers = value.proposals
    .map((proposal) => proposal.documentNumber)
    .filter((number) => number !== undefined);
  if (new Set(documentNumbers).size !== documentNumbers.length)
    throw new Error("เลขใบเสนอราคาซ้ำ ข้อมูลเดิมยังไม่ถูกแก้ไข");
  const proposals: Proposal[] = value.proposals.map((proposal) => ({
    ...proposal,
    customerId:
      proposal.customerId ||
      customers.find(
        (customer) =>
          customer.name.trim().toLocaleLowerCase() ===
          proposal.customer.trim().toLocaleLowerCase(),
      )?.id,
  }));
  return { proposals, customers, company: value.company };
}
export function parseWorkspace(raw: string): Workspace {
  const envelope: unknown = JSON.parse(raw);
  if (!record(envelope) || envelope.schemaVersion !== 2)
    throw new Error(
      "เวอร์ชันไฟล์ข้อมูลไม่รองรับ กรุณาใช้ไฟล์สำรองจาก SolarDesk",
    );
  return validateWorkspace(envelope.data);
}
export function serializeWorkspace(workspace: Workspace) {
  return JSON.stringify(
    {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data: validateWorkspace(workspace),
    },
    null,
    2,
  );
}
export function loadWorkspace(
  storage: Pick<Storage, "getItem">,
  fallback: Workspace,
): Workspace {
  const raw = storage.getItem(WORKSPACE_KEY);
  if (raw !== null) return parseWorkspace(raw);
  const proposals = storage.getItem("solardesk-demo-proposals:v1");
  const customers = storage.getItem("solardesk-demo-customers:v1");
  return validateWorkspace({
    proposals: proposals ? JSON.parse(proposals) : fallback.proposals,
    customers: customers ? JSON.parse(customers) : fallback.customers,
    company: fallback.company,
  });
}
export function nextId(items: { id: string }[], prefix: string, minimum = 0) {
  const max = items.reduce((highest, item) => {
    const suffix = item.id.startsWith(prefix)
      ? item.id.slice(prefix.length)
      : "";
    return /^\d+$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
  }, minimum);
  return `${prefix}${String(max + 1).padStart(prefix.startsWith("SP-") ? 4 : 3, "0")}`;
}
export function customerStats(customer: Customer, proposals: Proposal[]) {
  const related = proposals.filter((proposal) =>
    proposal.customerId
      ? proposal.customerId === customer.id
      : proposal.customer.trim().toLocaleLowerCase() ===
        customer.name.trim().toLocaleLowerCase(),
  );
  return {
    count: related.length,
    value: related.reduce((sum, proposal) => sum + proposal.amount, 0),
  };
}
export function requiredText(
  value: FormDataEntryValue | null,
  label: string,
  max = 200,
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max)
    throw new Error(`กรุณาระบุ${label} ไม่เกิน ${max} ตัวอักษร`);
  return text;
}
export function positiveNumber(
  value: FormDataEntryValue | null,
  label: string,
) {
  const number =
    typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number) || number <= 0 || number > 1e12)
    throw new Error(`กรุณาระบุ${label}เป็นตัวเลขมากกว่า 0`);
  return number;
}
export function toCsv(proposals: Proposal[]) {
  const rows: (string | number)[][] = [
    [
      "เลขที่",
      "ลูกค้า",
      "กำลังติดตั้ง (kWp)",
      "แพ็กเกจ",
      "มูลค่า (บาท)",
      "สถานะ",
    ],
    ...proposals.map((p) => [
      p.id,
      p.customer,
      p.system,
      p.package,
      p.amount,
      p.status,
    ]),
  ];
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const text = String(cell);
            const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text)
              ? `'${text}`
              : text;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
