export type SolarDetails = {
  pricingMode: "turnkey" | "fixed";
  issueDate: string;
  requestNumber: string;
  memoReference: string;
  letterReference: string;
  siteName: string;
  phase: 1 | 3;
  packageLabel: string;
  baseCost: number;
  operationsRate: number;
  profitRate: number;
  vatRate: number;
  validDays: number;
  panelWatt: number;
  panelCount: number;
  panelBrand: string;
  panelWarrantyYears: number;
  panelPerformanceYears: number;
  inverterBrand: string;
  inverterModel: string;
  inverterKw: number;
  inverterCount: number;
  inverterWarrantyYears: number;
  batteryReady: boolean;
  monitoringDescription: string;
  optimizerBrand: string;
  optimizerModel: string;
  optimizerCount: number;
  templateQuantity4?: number;
  templateQuantity5?: number;
  maintenanceYears: number;
  maintenanceVisits: number;
  downPaymentPercent: number;
  firstPaymentDays: number;
  finalPaymentDays: number;
  lateInterestRate: number;
};
export type OfficialProfile = {
  branchName: string;
  branchShort: string;
  addressLine1: string;
  addressLine2: string;
  department: string;
  preparerRole: string;
  preparerName: string;
  managerRole: string;
  reviewerRole: string;
  approvalLimit: number;
  contactDepartment: string;
  contactPhone: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankAccountName: string;
  chequePayee: string;
};
export const defaultOfficialProfile: OfficialProfile = {
  branchName: "",
  branchShort: "",
  addressLine1: "",
  addressLine2: "",
  department: "",
  preparerRole: "",
  preparerName: "",
  managerRole: "",
  reviewerRole: "",
  approvalLimit: 1000000,
  contactDepartment: "",
  contactPhone: "",
  bankName: "",
  bankBranch: "",
  bankAccountNumber: "",
  bankAccountName: "",
  chequePayee: "",
};
export function defaultSolarDetails(system = 10): SolarDetails {
  return {
    pricingMode: "fixed",
    issueDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    requestNumber: "",
    memoReference: "",
    letterReference: "",
    siteName: "",
    phase: 1,
    packageLabel: "พรีเมียม",
    baseCost: 0,
    operationsRate: 5,
    profitRate: 12.5,
    vatRate: 7,
    validDays: 30,
    panelWatt: 650,
    panelCount: Math.ceil((system * 1000) / 650),
    panelBrand: "",
    panelWarrantyYears: 12,
    panelPerformanceYears: 25,
    inverterBrand: "",
    inverterModel: "",
    inverterKw: system,
    inverterCount: 1,
    inverterWarrantyYears: 10,
    batteryReady: false,
    monitoringDescription: "ระบบบริหารจัดการ ติดตามผลการใช้ไฟฟ้า",
    optimizerBrand: "",
    optimizerModel: "",
    optimizerCount: 0,
    templateQuantity4: 1,
    templateQuantity5: Math.ceil((system * 1000) / 650),
    maintenanceYears: 2,
    maintenanceVisits: 1,
    downPaymentPercent: 50,
    firstPaymentDays: 15,
    finalPaymentDays: 45,
    lateInterestRate: 15,
  };
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const bounded = (value: unknown, max = 1e12): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= max;
export function isOfficialProfile(value: unknown): value is OfficialProfile {
  return (
    record(value) &&
    Object.keys(defaultOfficialProfile).every((key) =>
      key === "approvalLimit"
        ? bounded(value[key])
        : typeof value[key] === "string" &&
          (value[key] as string).length <= 1000,
    )
  );
}
export function isSolarDetails(value: unknown): value is SolarDetails {
  if (
    !record(value) ||
    !["fixed", "turnkey"].includes(String(value.pricingMode)) ||
    (value.phase !== 1 && value.phase !== 3) ||
    typeof value.batteryReady !== "boolean"
  )
    return false;
  for (const [key, example] of Object.entries(defaultSolarDetails())) {
    if (["pricingMode", "phase", "batteryReady"].includes(key)) continue;
    if (
      ["templateQuantity4", "templateQuantity5"].includes(key) &&
      value[key] === undefined
    )
      continue;
    if (
      typeof example === "string" &&
      (typeof value[key] !== "string" || (value[key] as string).length > 2000)
    )
      return false;
    if (typeof example === "number") {
      const max =
        key.endsWith("Rate") || key.endsWith("Percent")
          ? 100
          : key === "baseCost"
            ? 1e12
            : key.endsWith("Days")
              ? 365
              : 1000000;
      if (!bounded(value[key], max)) return false;
      if (
        ![
          "baseCost",
          "inverterKw",
          "operationsRate",
          "profitRate",
          "vatRate",
          "downPaymentPercent",
          "lateInterestRate",
        ].includes(key) &&
        !Number.isInteger(value[key])
      )
        return false;
    }
  }
  const date = new Date(`${value.issueDate}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(String(value.issueDate)) &&
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value.issueDate
  );
}
function satang(amount: number): bigint {
  if (!bounded(amount))
    throw new Error("มูลค่าไม่ถูกต้องหรือเกินขอบเขตที่รองรับ");
  const scaled = amount * 100;
  return BigInt(Math.round(scaled + Number.EPSILON * Math.max(1, scaled)));
}
function divideRounded(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / 2n) / denominator;
}
function basisPoints(rate: number) {
  if (!bounded(rate, 100))
    throw new Error("อัตราร้อยละต้องอยู่ระหว่าง 0 ถึง 100");
  return BigInt(Math.round(rate * 100));
}
export function calculateEstimate(
  details: Pick<
    SolarDetails,
    "pricingMode" | "baseCost" | "operationsRate" | "profitRate" | "vatRate"
  >,
  fixedTotal = 0,
) {
  const vatRate = basisPoints(details.vatRate);
  const base = satang(details.baseCost);
  const operations = divideRounded(
    base * basisPoints(details.operationsRate),
    10000n,
  );
  const profit = divideRounded(
    (base + operations) * basisPoints(details.profitRate),
    10000n,
  );
  const gross = satang(fixedTotal);
  const subtotal =
    details.pricingMode === "turnkey"
      ? base + operations + profit
      : divideRounded(gross * 10000n, 10000n + vatRate);
  const vat =
    details.pricingMode === "turnkey"
      ? divideRounded(subtotal * vatRate, 10000n)
      : gross - subtotal;
  return {
    baseCost: Number(base) / 100,
    operations: Number(operations) / 100,
    profit: Number(profit) / 100,
    subtotal: Number(subtotal) / 100,
    vat: Number(vat) / 100,
    total: Number(subtotal + vat) / 100,
  };
}
const digits = [
  "",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
];
function thaiInteger(value: number, higher = false): string {
  if (value >= 1000000) {
    const top = Math.floor(value / 1000000);
    const rest = value % 1000000;
    return thaiInteger(top) + "ล้าน" + (rest ? thaiInteger(rest, true) : "");
  }
  const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const text = String(value);
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const digit = Number(text[i]);
    const position = text.length - i - 1;
    if (!digit) continue;
    if (position === 1 && digit === 1) result += "สิบ";
    else if (position === 1 && digit === 2) result += "ยี่สิบ";
    else if (position === 0 && digit === 1 && (value > 1 || higher))
      result += "เอ็ด";
    else result += digits[digit] + places[position];
  }
  return result;
}
export function bahtText(amount: number) {
  const cents = satang(amount);
  const whole = Number(cents / 100n);
  const rest = Number(cents % 100n);
  return (
    (whole ? thaiInteger(whole) : "ศูนย์") +
    "บาท" +
    (rest ? thaiInteger(rest) + "สตางค์" : "ถ้วน")
  );
}
export const amountText = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
export function thaiLongDate(iso: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}
export function quotationPrefix(iso: string) {
  const [year, month] = iso.split("-");
  return `QT-${Number(year) + 543}${month}-`;
}
