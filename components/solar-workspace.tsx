"use client";

import { assertUnchanged } from "../lib/edit-conflict";

import {
  ArrowRight,
  Bell,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FilePlus2,
  FileText,
  Filter,
  House,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CompanySettings,
  CustomerEditor,
  ProposalEditor,
} from "../components/workspace-forms";
import {
  PipelineChart,
  StageOverview,
  SummaryMetrics,
} from "../components/pipeline-chart";
import { ProposalPrint } from "../components/proposal-print";
import { ConfirmLeaveDialog } from "./confirm-leave-dialog";
import {
  dateLabel,
  defaultCompany,
  money,
  nextId,
  positiveNumber,
  requiredText,
  serializeWorkspace,
  statuses,
  toCsv,
  type Customer,
  type Proposal,
  type Status,
  type Workspace,
} from "../lib/workspace";
import { summarizeCustomers } from "../lib/customer-summaries";
import type { CloudBinding } from "../lib/use-cloud-workspace";
import { useWorkspace } from "../lib/use-workspace";
import { defaultCatalog } from "../lib/catalog";
import {
  calculateEstimate,
  isSolarDetails,
  quotationPrefix,
} from "../lib/solar";
import {
  EstimateSummary,
  OfficialProfileSettings,
} from "../components/solar-fields";
import { defaultProcurement } from "../lib/procurement";
const TemplateLibrary = dynamic(
  () =>
    import("../components/template-library").then(
      (module) => module.TemplateLibrary,
    ),
  { loading: () => <p role="status">กำลังเปิดฟอร์มเอกสาร…</p> },
);
const ProcurementWorkspace = dynamic(
  () =>
    import("../components/procurement-workspace").then(
      (module) => module.ProcurementWorkspace,
    ),
  { loading: () => <p role="status">กำลังเปิดชุดงานจัดจ้าง…</p> },
);
const CatalogManager = dynamic(
  () => import("./catalog-manager").then((module) => module.CatalogManager),
  { loading: () => <p role="status">กำลังเปิดแค็ตตาล็อก…</p> },
);

type View =
  | "ภาพรวม"
  | "ใบเสนอราคา"
  | "ลูกค้า"
  | "สินค้าและแพ็กเกจ"
  | "เทมเพลต"
  | "จัดจ้าง"
  | "ตั้งค่าบริษัท";
type Modal = "proposal" | "customer" | "detail" | "help" | null;

const seedProposals: Proposal[] = [
  {
    id: "SP-2026-0148",
    customer: "บ้านคุณธนา วัฒนกิจ",
    contact: "คุณธนา",
    location: "บางนา, กรุงเทพฯ",
    system: 10,
    package: "Residential Premium",
    amount: 389000,
    status: "ส่งแล้ว",
    created: "21 ต.ค. 2569",
    updated: "วันนี้",
  },
  {
    id: "SP-2026-0147",
    customer: "บริษัท กรีนลีฟ ฟู้ดส์ จำกัด",
    contact: "คุณพิมพ์ชนก",
    location: "บางปะอิน, อยุธยา",
    system: 30,
    package: "Business Pro",
    amount: 945000,
    status: "กำลังเจรจา",
    created: "20 ต.ค. 2569",
    updated: "เมื่อวาน",
  },
  {
    id: "SP-2026-0146",
    customer: "บ้านคุณนภัสสร",
    contact: "คุณนภัสสร",
    location: "เมือง, เชียงใหม่",
    system: 5,
    package: "Residential Standard",
    amount: 219000,
    status: "ชนะงาน",
    created: "18 ต.ค. 2569",
    updated: "18 ต.ค. 2569",
  },
  {
    id: "SP-2026-0145",
    customer: "โรงงาน เอสที เมทัลเวิร์ค",
    contact: "คุณอนุชา",
    location: "ศรีราชา, ชลบุรี",
    system: 100,
    package: "Industrial Max",
    amount: 2780000,
    status: "ร่าง",
    created: "17 ต.ค. 2569",
    updated: "17 ต.ค. 2569",
  },
  {
    id: "SP-2026-0144",
    customer: "คาเฟ่ ริมนา",
    contact: "คุณกานต์",
    location: "ปากเกร็ด, นนทบุรี",
    system: 15,
    package: "Business Pro",
    amount: 528000,
    status: "ไม่สำเร็จ",
    created: "15 ต.ค. 2569",
    updated: "19 ต.ค. 2569",
  },
];
const seedCustomers: Customer[] = [
  {
    id: "C-084",
    name: "บ้านคุณธนา วัฒนกิจ",
    contact: "คุณธนา",
    phone: "08X-XXX-4589",
    email: "thana@example.com",
    location: "บางนา, กรุงเทพฯ",
    count: 2,
    value: 689000,
  },
  {
    id: "C-083",
    name: "บริษัท กรีนลีฟ ฟู้ดส์ จำกัด",
    contact: "คุณพิมพ์ชนก",
    phone: "08X-XXX-8120",
    email: "pimchanok@example.com",
    location: "บางปะอิน, อยุธยา",
    count: 1,
    value: 945000,
  },
  {
    id: "C-082",
    name: "บ้านคุณนภัสสร",
    contact: "คุณนภัสสร",
    phone: "09X-XXX-3071",
    email: "napatsorn@example.com",
    location: "เมือง, เชียงใหม่",
    count: 1,
    value: 219000,
  },
  {
    id: "C-081",
    name: "โรงงาน เอสที เมทัลเวิร์ค",
    contact: "คุณอนุชา",
    phone: "08X-XXX-1266",
    email: "anucha@example.com",
    location: "ศรีราชา, ชลบุรี",
    count: 3,
    value: 3420000,
  },
];
const menu: { name: View; icon: typeof House }[] = [
  { name: "ภาพรวม", icon: LayoutDashboard },
  { name: "ใบเสนอราคา", icon: FileText },
  { name: "ลูกค้า", icon: Users },
  { name: "สินค้าและแพ็กเกจ", icon: Package },
  { name: "เทมเพลต", icon: BookOpen },
  { name: "จัดจ้าง", icon: ClipboardList },
];
const initialWorkspace = {
  proposals: seedProposals,
  customers: seedCustomers,
  company: defaultCompany,
};

function StatusPill({ status }: { status: Status }) {
  const className: Record<Status, string> = {
    ร่าง: "draft",
    ส่งแล้ว: "sent",
    กำลังเจรจา: "negotiating",
    ชนะงาน: "won",
    ไม่สำเร็จ: "lost",
  };
  return (
    <span className={`status ${className[status]}`}>
      <i />
      {status}
    </span>
  );
}

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        container.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={container}
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
        className={`modal ${wide ? "modal-wide" : ""}`}
      >
        <div className="modal-top">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="ปิดหน้าต่าง"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function SolarWorkspace({
  initial = initialWorkspace,
  cloud,
}: {
  initial?: Workspace;
  cloud?: CloudBinding;
}) {
  const [view, setViewState] = useState<View>("ภาพรวม");
  const [requestedView, setRequestedView] = useState<View | null>(null);
  const pendingProcurement = useRef(false);
  const pendingCatalog = useRef(false);
  const pendingCompany = useRef(false);
  const pendingOfficial = useRef(false);
  const catalogDirty = useCallback((value: boolean) => {
    pendingCatalog.current = value;
  }, []);
  const companyDirty = useCallback((value: boolean) => {
    pendingCompany.current = value;
  }, []);
  const officialDirty = useCallback((value: boolean) => {
    pendingOfficial.current = value;
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!pendingCompany.current && !pendingOfficial.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function setView(next: View) {
    if (
      next !== view &&
      (pendingProcurement.current ||
        pendingCatalog.current ||
        pendingCompany.current ||
        pendingOfficial.current)
    ) {
      setRequestedView(next);
      return;
    }
    applyView(next);
  }
  function applyView(next: View) {
    if (next !== view) {
      pendingProcurement.current = false;
      pendingCatalog.current = false;
      pendingCompany.current = false;
      pendingOfficial.current = false;
    }
    setViewState(next);
  }
  const [modal, setModal] = useState<Modal>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [proposalEditorBase, setProposalEditorBase] = useState<Proposal | null>(
    null,
  );
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>();
  const { workspace, commit, ready, saving, storageError } = useWorkspace(
    initial,
    cloud,
  );
  const { proposals, customers, company } = workspace;
  const readOnly = !!cloud && cloud.role !== "owner" && cloud.role !== "editor";
  const activeProposal =
    proposals.find((proposal) => proposal.id === activeProposalId) || null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ทั้งหมด");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 780px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(""), 3000);
      return () => window.clearTimeout(timer);
    }
  }, [toast]);

  const normalizedQuery = query.toLowerCase();
  const visibleProposals = useMemo(
    () =>
      proposals.filter((p) => {
        const matchesQuery = `${p.id} ${p.customer} ${p.contact} ${p.location}`
          .toLowerCase()
          .includes(normalizedQuery);
        return matchesQuery && (filter === "ทั้งหมด" || p.status === filter);
      }),
    [proposals, normalizedQuery, filter],
  );
  const customerSummaries = useMemo(
    () => summarizeCustomers(customers, proposals),
    [customers, proposals],
  );
  const visibleCustomers = useMemo(
    () =>
      customerSummaries.filter((customer) =>
        `${customer.name} ${customer.contact} ${customer.phone} ${customer.location}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [customerSummaries, normalizedQuery],
  );
  const openProposal = (
    proposal: Proposal | null = null,
    packageName?: string,
  ) => {
    if (!proposal && readOnly) {
      setToast("บัญชีนี้มีสิทธิ์อ่านเท่านั้น");
      return;
    }
    setActiveProposalId(proposal?.id || null);
    setProposalEditorBase(null);
    setSelectedPackage(packageName);
    setModal(proposal ? "detail" : "proposal");
  };
  function openCustomer(customer: Customer | null = null) {
    if (readOnly) {
      setToast("บัญชีนี้มีสิทธิ์อ่านเท่านั้น");
      return;
    }
    setEditingCustomer(
      customers.find((item) => item.id === customer?.id) || customer,
    );
    setModal("customer");
  }
  function editProposal(proposal: Proposal) {
    if (readOnly) {
      setToast("บัญชีนี้มีสิทธิ์อ่านเท่านั้น");
      return;
    }
    setActiveProposalId(proposal.id);
    setProposalEditorBase(proposal);
    setModal("proposal");
  }
  async function createProposal(form: FormData) {
    const original = proposalEditorBase;
    if (original)
      assertUnchanged(
        proposals.find((item) => item.id === original.id),
        original,
        "ใบเสนอราคา",
        ["procurement", "updated"],
      );
    const now = new Date().toISOString();
    const year = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(new Date());
    const customerName = requiredText(form.get("customer"), "ชื่อลูกค้า");
    const contact = requiredText(form.get("contact"), "ชื่อผู้ติดต่อ");
    const location = requiredText(form.get("location"), "พื้นที่ติดตั้ง", 500);
    const solar: unknown = JSON.parse(String(form.get("solar") || "null"));
    if (!isSolarDetails(solar))
      throw new Error(
        "รายละเอียดระบบหรือวันที่ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      );
    if (solar.pricingMode === "turnkey" && solar.baseCost <= 0)
      throw new Error("กรุณาระบุต้นทุนจ้างเหมามากกว่า 0");
    const amount =
      solar.pricingMode === "turnkey"
        ? calculateEstimate(solar).total
        : positiveNumber(form.get("amount"), "ราคา");
    if (amount <= 0 || amount > 1e12)
      throw new Error("ยอดรวมต้องมากกว่า 0 และไม่เกิน 1 ล้านล้านบาท");
    const enteredNumber = String(form.get("documentNumber") || "").trim();
    if (enteredNumber && !/^[A-Za-z0-9ก-๙_.-]{1,80}$/.test(enteredNumber))
      throw new Error(
        "เลขใบเสนอราคาใช้ตัวอักษร ตัวเลข จุด ขีดกลาง หรือขีดล่างได้เท่านั้น",
      );
    if (
      enteredNumber &&
      proposals.some(
        (item) =>
          item.id !== original?.id && item.documentNumber === enteredNumber,
      )
    )
      throw new Error("เลขใบเสนอราคานี้มีในระบบแล้ว");
    const expiry = new Date(`${solar.issueDate}T00:00:00Z`);
    expiry.setUTCDate(expiry.getUTCDate() + solar.validDays);
    const system = positiveNumber(form.get("system"), "ขนาดระบบ");
    const saved = await commit((current) => {
      if (original)
        assertUnchanged(
          current.proposals.find((item) => item.id === original.id),
          original,
          "ใบเสนอราคา",
          ["procurement", "updated"],
        );
      let customer =
        current.customers.find((item) => item.id === form.get("customerId")) ||
        current.customers.find(
          (item) =>
            item.name.toLocaleLowerCase() === customerName.toLocaleLowerCase(),
        );
      let nextCustomers = current.customers;
      if (!customer) {
        customer = {
          id: nextId(current.customers, "C-"),
          name: customerName,
          contact,
          phone: String(form.get("phone") || "").trim(),
          email: "",
          location,
          count: 0,
          value: 0,
        };
        nextCustomers = [customer, ...current.customers];
      }
      const proposal: Proposal = {
        id: original?.id || nextId(current.proposals, `SP-${year}-`),
        customerId: customer.id,
        customer: customerName,
        contact,
        phone: String(form.get("phone") || "").trim(),
        location,
        system,
        package: requiredText(form.get("package"), "แพ็กเกจ"),
        amount,
        status: original?.status || "ร่าง",
        created: original?.created || now,
        updated: now,
        notes: String(form.get("notes") || "").trim(),
        validUntil: expiry.toISOString().slice(0, 10),
        solar,
        procurement: current.proposals.find((item) => item.id === original?.id)
          ?.procurement,
        documentNumber:
          enteredNumber ||
          original?.documentNumber ||
          nextId(
            current.proposals.map((item) => ({
              id: item.documentNumber || "",
            })),
            quotationPrefix(solar.issueDate),
          ),
      };
      return {
        ...current,
        customers: nextCustomers,
        proposals: original
          ? current.proposals.map((item) =>
              item.id === proposal.id ? proposal : item,
            )
          : [proposal, ...current.proposals],
      };
    });
    if (!saved)
      throw new Error(
        "บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อความสถานะการจัดเก็บข้อมูล",
      );
    setModal(null);
    setToast(
      original ? "บันทึกการแก้ไขใบเสนอราคาแล้ว" : "สร้างใบเสนอราคาแบบร่างแล้ว",
    );
  }
  async function createCustomer(form: FormData) {
    if (editingCustomer)
      assertUnchanged(
        customers.find((item) => item.id === editingCustomer.id),
        editingCustomer,
        "ข้อมูลลูกค้า",
      );
    const customer: Customer = {
      id: editingCustomer?.id || nextId(customers, "C-"),
      name: requiredText(form.get("name"), "ชื่อลูกค้า"),
      contact: requiredText(form.get("contact"), "ชื่อผู้ติดต่อ"),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      location: requiredText(form.get("location"), "พื้นที่ติดตั้ง", 500),
      count: 0,
      value: 0,
    };
    if (
      customers.some(
        (item) =>
          item.id !== customer.id &&
          item.name.toLocaleLowerCase() === customer.name.toLocaleLowerCase(),
      )
    )
      throw new Error("มีชื่อลูกค้านี้แล้ว กรุณาเลือกแก้ไขรายชื่อเดิม");
    if (
      !(await commit((current) => {
        if (editingCustomer)
          assertUnchanged(
            current.customers.find((item) => item.id === editingCustomer.id),
            editingCustomer,
            "ข้อมูลลูกค้า",
          );
        const next = {
          ...customer,
          id: editingCustomer?.id || nextId(current.customers, "C-"),
        };
        if (
          current.customers.some(
            (item) =>
              item.id !== next.id &&
              item.name.toLocaleLowerCase() === next.name.toLocaleLowerCase(),
          )
        )
          throw new Error("มีชื่อลูกค้านี้แล้ว กรุณาเลือกแก้ไขรายชื่อเดิม");
        return {
          ...current,
          customers: editingCustomer
            ? current.customers.map((item) =>
                item.id === next.id ? next : item,
              )
            : [next, ...current.customers],
        };
      }))
    )
      throw new Error("บันทึกข้อมูลลูกค้าไม่สำเร็จ");
    setModal(null);
    setToast(editingCustomer ? "บันทึกการแก้ไขลูกค้าแล้ว" : "เพิ่มลูกค้าแล้ว");
  }
  async function changeStatus(id: string, status: Status) {
    if (
      await commit((current) => ({
        ...current,
        proposals: current.proposals.map((p) =>
          p.id === id ? { ...p, status, updated: new Date().toISOString() } : p,
        ),
      }))
    )
      setToast("อัปเดตสถานะแล้ว");
  }
  function download(content: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv() {
    download(
      toCsv(visibleProposals),
      "solardesk-proposals.csv",
      "text/csv;charset=utf-8",
    );
    setToast("ดาวน์โหลดรายการ CSV แล้ว");
  }

  return (
    <main
      className="app-shell"
      aria-busy={!ready || saving}
      inert={!ready || saving ? true : undefined}
      onSubmitCapture={
        readOnly
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              setToast("บัญชีนี้มีสิทธิ์อ่านเท่านั้น");
            }
          : undefined
      }
    >
      <aside
        className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}
        inert={isMobile && !mobileMenu ? true : undefined}
      >
        <div className="brand">
          <div className="brand-mark">
            <Sun size={21} strokeWidth={2.4} />
          </div>
          <span>
            solar<span className="brand-light">desk</span>
            <small>PROPOSAL WORKSPACE</small>
          </span>
          <button
            className="mobile-close icon-button"
            aria-label="ปิดเมนู"
            onClick={() => setMobileMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <div className="workspace-avatar">S</div>
          <div>
            <strong>{company.name}</strong>
            <span>พื้นที่ทำงานของทีม</span>
          </div>
          <ChevronDown size={15} className="workspace-chevron" />
        </div>
        <div className="nav-label">เมนูหลัก</div>
        <nav className="main-nav" aria-label="เมนูหลัก">
          {menu.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${view === name ? "active" : ""}`}
              onClick={() => {
                setView(name);
                setMobileMenu(false);
                setQuery("");
              }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{name}</span>
              {name === "ใบเสนอราคา" && (
                <span className="nav-count">{proposals.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label nav-label-lower">จัดการ</div>
        <nav className="main-nav">
          <button
            className={
              view === "ตั้งค่าบริษัท" ? "nav-item active" : "nav-item"
            }
            onClick={() => {
              setView("ตั้งค่าบริษัท");
              setMobileMenu(false);
            }}
          >
            <Settings2 size={18} strokeWidth={1.8} />
            <span>ตั้งค่าบริษัท</span>
          </button>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={18} strokeWidth={1.8} />
            <span>ช่วยเหลือ</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Zap size={16} fill="currentColor" />
            </div>
            <strong>ปิดงานได้ง่ายขึ้น</strong>
            <p>
              จัดการทุกข้อเสนอไว้ในที่เดียว ตั้งแต่ลูกค้าใหม่จนถึงวันติดตั้ง
            </p>
            <button onClick={() => setModal("help")}>
              ดูวิธีใช้งาน <ArrowRight size={14} />
            </button>
          </div>
          <div
            className="profile"
            aria-label={
              cloud
                ? "บัญชีที่เข้าสู่ระบบ"
                : "โหมดในเครื่อง ยังไม่มีระบบบัญชีผู้ใช้"
            }
          >
            <div className="profile-avatar">
              {cloud ? cloud.email.slice(0, 1).toUpperCase() : "LS"}
            </div>
            <div className="profile-info">
              <strong>{cloud ? cloud.email : "โหมดในเครื่อง"}</strong>
              <span>
                {cloud
                  ? cloud.role || "ยังยืนยันสิทธิ์ไม่ได้"
                  : "ยังไม่ได้เข้าสู่ระบบ"}
              </span>
            </div>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="ปิดเมนู"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <section className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button icon-button"
            aria-label="เปิดเมนู"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <div className="demo-badge">
              <span /> {cloud ? "SHARED WORKSPACE" : "DEMO DATA"}
            </div>
            <button
              className="icon-button notification"
              aria-label="การแจ้งเตือน"
              disabled
              title="ยังไม่มีระบบแจ้งเตือนจากเซิร์ฟเวอร์"
            >
              <Bell size={18} />
            </button>
            <div className="topbar-divider" />
            <button
              className="top-avatar"
              aria-label="ข้อมูลโหมดการใช้งาน"
              onClick={() => setModal("help")}
            >
              {cloud ? cloud.email.slice(0, 1).toUpperCase() : "LS"}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="demo-notice">
            <ShieldCheck size={16} />
            <span>
              {cloud ? (
                <>
                  <strong>ข้อมูลกลาง</strong> — บันทึกผ่านเซิร์ฟเวอร์ · สิทธิ์{" "}
                  {cloud.role || "ยังยืนยันสิทธิ์ไม่ได้"} · ต้นแบบ Word
                  ยังเก็บในเครื่องนี้
                </>
              ) : (
                <>
                  <strong>โหมดตัวอย่าง</strong> —
                  ข้อมูลชุดนี้อยู่ในเบราว์เซอร์ของคุณเท่านั้น
                  ยังไม่เชื่อมฐานข้อมูลจริง
                </>
              )}
            </span>
            <button onClick={() => setView("ตั้งค่าบริษัท")}>
              สำรองข้อมูล
            </button>
          </div>
          {storageError && (
            <div className="storage-error" role="alert">
              <strong>บันทึกข้อมูลไม่สำเร็จ</strong>
              <span>{storageError}</span>
              <button
                className="secondary-button"
                onClick={() =>
                  download(
                    serializeWorkspace(workspace),
                    "solardesk-recovery.json",
                    "application/json",
                  )
                }
              >
                ดาวน์โหลดข้อมูลที่เปิดอยู่
              </button>
            </div>
          )}
          {view === "ภาพรวม" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SOLARDESK WORKSPACE</div>
                  <h1>
                    ภาพรวมของคุณ <span>☀️</span>
                  </h1>
                  <p>ติดตามโอกาสการขายและใบเสนอราคาทั้งหมดได้จากที่นี่</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => openProposal()}
                >
                  <Plus size={18} /> สร้างใบเสนอราคา
                </button>
              </div>
              <SummaryMetrics proposals={proposals} />
              <div className="dashboard-grid">
                <PipelineChart proposals={proposals} />
                <StageOverview proposals={proposals} />
              </div>
              <section className="panel table-panel">
                <div className="panel-head table-head">
                  <div>
                    <h2>ใบเสนอราคาล่าสุด</h2>
                    <p>รายการที่คุณสร้างหรือมีการอัปเดตล่าสุด</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setView("ใบเสนอราคา")}
                  >
                    ดูทั้งหมด <ArrowRight size={15} />
                  </button>
                </div>
                <ProposalTable
                  proposals={proposals.slice(0, 5)}
                  onOpen={openProposal}
                  onStatus={changeStatus}
                  readOnly={readOnly}
                  compact
                />
              </section>
              <div className="bottom-grid">
                <section className="panel quick-panel">
                  <div className="panel-head">
                    <div>
                      <h2>เริ่มต้นอย่างรวดเร็ว</h2>
                      <p>สิ่งที่คุณทำบ่อยที่สุด</p>
                    </div>
                  </div>
                  <div className="quick-actions">
                    <button onClick={() => openProposal()}>
                      <span className="quick-icon quick-blue">
                        <FilePlus2 size={19} />
                      </span>
                      <span>
                        <strong>สร้างใบเสนอราคา</strong>
                        <small>เริ่มต้นข้อเสนอใหม่</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                    <button onClick={() => openCustomer()}>
                      <span className="quick-icon quick-green">
                        <Users size={19} />
                      </span>
                      <span>
                        <strong>เพิ่มลูกค้าใหม่</strong>
                        <small>บันทึกข้อมูลผู้ติดต่อ</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                    <button onClick={() => setView("สินค้าและแพ็กเกจ")}>
                      <span className="quick-icon quick-gold">
                        <Package size={19} />
                      </span>
                      <span>
                        <strong>จัดการแพ็กเกจ</strong>
                        <small>ดูสินค้าและราคา</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <section className="tip-card">
                  <div className="tip-sun">
                    <Sun size={20} />
                  </div>
                  <div>
                    <div className="eyebrow">เคล็ดลับวันนี้</div>
                    <h3>ติดตามให้ทัน โอกาสปิดงานสูงขึ้น</h3>
                    <p>
                      อย่าลืมติดต่อลูกค้าที่ได้รับใบเสนอราคาแล้วภายใน 3 วัน
                      เพื่อเพิ่มโอกาสในการปิดการขาย
                    </p>
                    <button
                      onClick={() => {
                        setView("ใบเสนอราคา");
                        setFilter("ส่งแล้ว");
                      }}
                    >
                      ดูรายการที่ต้องติดตาม <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="tip-art">
                    <div className="sun-core" />
                    <div className="sun-ray" />
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "ใบเสนอราคา" && (
            <>
              <PageHeading
                title="ใบเสนอราคา"
                description="จัดการข้อเสนอ ติดตามสถานะ และปิดการขายในที่เดียว"
                action={
                  <button
                    className="primary-button"
                    onClick={() => openProposal()}
                  >
                    <Plus size={18} /> สร้างใบเสนอราคา
                  </button>
                }
              />
              <section className="panel list-panel">
                <div className="list-toolbar">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="ค้นหาใบเสนอราคา"
                      placeholder="ค้นหาชื่อลูกค้า หรือเลขที่ใบเสนอราคา..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <label className="filter-select">
                    <Filter size={16} />
                    <select
                      aria-label="กรองตามสถานะ"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option>ทั้งหมด</option>
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </label>
                  <button className="secondary-button" onClick={exportCsv}>
                    <Download size={16} /> ส่งออก
                  </button>
                </div>
                <ProposalTable
                  proposals={visibleProposals}
                  onOpen={openProposal}
                  onStatus={changeStatus}
                  readOnly={readOnly}
                />
              </section>
            </>
          )}

          {view === "ลูกค้า" && (
            <>
              <PageHeading
                title="ลูกค้า"
                description="ดูแลความสัมพันธ์และประวัติข้อเสนอของลูกค้าทั้งหมด"
                action={
                  <button
                    className="primary-button"
                    onClick={() => openCustomer()}
                  >
                    <Plus size={18} /> เพิ่มลูกค้า
                  </button>
                }
              />
              <section className="panel list-panel">
                <div className="list-toolbar">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="ค้นหาลูกค้า"
                      placeholder="ค้นหาชื่อ เบอร์โทร หรือพื้นที่..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <span className="result-count">
                    {visibleCustomers.length} รายชื่อ
                  </span>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ชื่อลูกค้า</th>
                        <th>ผู้ติดต่อ</th>
                        <th>เบอร์โทร</th>
                        <th>พื้นที่ติดตั้ง</th>
                        <th>ข้อเสนอ</th>
                        <th>มูลค่ารวม</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCustomers.map((c, i) => (
                        <tr key={c.id}>
                          <td>
                            <div className="customer-cell">
                              <div
                                className={`customer-avatar avatar-${i % 4}`}
                              >
                                {c.name.slice(0, 1)}
                              </div>
                              <div>
                                <strong>{c.name}</strong>
                                <small>{c.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>{c.contact}</td>
                          <td>{c.phone}</td>
                          <td>{c.location}</td>
                          <td>{c.count} รายการ</td>
                          <td className="amount-cell">{money(c.value)}</td>
                          <td>
                            <button
                              className="row-more"
                              aria-label={`แก้ไข ${c.name}`}
                              onClick={() => openCustomer(c)}
                            >
                              <MoreHorizontal size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleCustomers.length === 0 && (
                    <EmptyState label="ไม่พบรายชื่อลูกค้า" />
                  )}
                </div>
              </section>
            </>
          )}

          {view === "สินค้าและแพ็กเกจ" && (
            <>
              <PageHeading
                title="สินค้าและแพ็กเกจ"
                description="แพ็กเกจและอุปกรณ์ของพื้นที่ทำงาน เลือกใช้กับข้อเสนอใหม่ได้"
                action={<span />}
              />
              <CatalogManager
                workspace={workspace}
                canManage={!readOnly && (!cloud || cloud.role === "owner")}
                canCreate={!readOnly}
                commit={commit}
                dirty={catalogDirty}
                choose={(name) => {
                  setView("ใบเสนอราคา");
                  openProposal(null, name);
                }}
              />
            </>
          )}

          {view === "จัดจ้าง" && (
            <>
              <PageHeading
                title="ชุดเอกสารจัดจ้าง"
                description="ข้อมูลกลาง ผู้รับจ้าง และเอกสารตั้งแต่เตรียมงานจนถึงตรวจรับ"
                action={<span />}
              />
              <ProcurementWorkspace
                proposals={proposals}
                company={company}
                onDirtyChange={(dirty) => {
                  pendingProcurement.current = dirty;
                }}
                onSave={(id, procurement, expected) =>
                  commit((current) => {
                    const item = current.proposals.find(
                      (entry) => entry.id === id,
                    );
                    if (
                      !item ||
                      JSON.stringify(
                        item.procurement || defaultProcurement(),
                      ) !== expected
                    )
                      throw new Error(
                        "ข้อมูลจัดจ้างเปลี่ยนไปแล้ว กรุณาโหลดใหม่ก่อนบันทึก",
                      );
                    return {
                      ...current,
                      proposals: current.proposals.map((entry) =>
                        entry.id === id
                          ? {
                              ...entry,
                              procurement,
                              updated: new Date().toISOString(),
                            }
                          : entry,
                      ),
                    };
                  })
                }
              />
            </>
          )}
          {view === "เทมเพลต" && (
            <>
              <PageHeading
                title="สร้างเอกสารตามฟอร์ม กฟภ."
                description="ใช้ข้อมูลข้อเสนอชุดเดียวสร้างเอกสารจากต้นแบบของคุณ"
                action={<span />}
              />
              <TemplateLibrary
                proposals={proposals}
                company={company}
                initialProposalId={activeProposalId}
                onEdit={editProposal}
                onSettings={() => setView("ตั้งค่าบริษัท")}
              />
            </>
          )}
          {view === "ตั้งค่าบริษัท" && (
            <>
              <PageHeading
                title="ตั้งค่าบริษัท"
                description="จัดการข้อมูลบริษัทและสำรองงานของคุณ"
                action={<span />}
              />
              <CompanySettings
                workspace={workspace}
                shared={!!cloud}
                readOnly={readOnly}
                onDirtyChange={companyDirty}
                onSave={(next, baseline) =>
                  commit((current) => {
                    assertUnchanged(current.company, baseline, "ข้อมูลบริษัท", [
                      "official",
                    ]);
                    return {
                      ...current,
                      company: { ...next, official: current.company.official },
                    };
                  })
                }
                onBackup={() =>
                  download(
                    serializeWorkspace(workspace),
                    "solardesk-backup.json",
                    "application/json",
                  )
                }
                onImport={(next, baseline) =>
                  commit((current) => {
                    assertUnchanged(
                      current,
                      baseline,
                      "พื้นที่ทำงานก่อนนำเข้า",
                    );
                    return next;
                  })
                }
              />
            </>
          )}
          {view === "ตั้งค่าบริษัท" && (
            <OfficialProfileSettings
              value={company.official}
              readOnly={readOnly}
              onDirtyChange={officialDirty}
              onSave={(official, baseline) =>
                commit((current) => {
                  assertUnchanged(
                    { official: current.company.official },
                    { official: baseline },
                    "ข้อมูลหน่วยงาน",
                  );
                  return {
                    ...current,
                    company: { ...current.company, official },
                  };
                })
              }
            />
          )}
          <footer className="app-footer">
            <span>
              SolarDesk <i>•</i> Workspace preview
            </span>
            <span>ออกแบบเพื่อให้ทำข้อเสนอได้ง่ายและเร็วขึ้น</span>
          </footer>
        </div>
      </section>

      {modal === "help" && (
        <ModalShell title="วิธีใช้งาน SolarDesk" onClose={() => setModal(null)}>
          <div className="help-content">
            <p>
              {cloud
                ? "ข้อมูลธุรกิจบันทึกในพื้นที่ทำงานกลางที่ตรวจสิทธิ์ทุกคำขอ ต้นแบบ Word ยังอยู่เฉพาะในเครื่องนี้ ควรสำรองข้อมูลและเก็บต้นฉบับแยกไว้"
                : "รุ่นนี้เก็บข้อมูลในเบราว์เซอร์นี้ ยังไม่มีระบบบัญชีผู้ใช้หรือฐานข้อมูลร่วม ไม่ควรใช้เก็บข้อมูลสำคัญเพียงสำเนาเดียว"}
            </p>
            <ol>
              <li>
                เพิ่มลูกค้าและสร้างใบเสนอราคา ตรวจข้อมูล ราคา
                และวันที่ก่อนบันทึก
              </li>
              <li>
                ตั้งค่าบริษัทและผู้ลงนามด้วยข้อมูลของงานจริง
                ไม่ใช้ข้อมูลในเอกสารตัวอย่างแทน
              </li>
              <li>
                แนบต้นแบบส่วนตัวในเมนูเทมเพลตหรือจัดจ้าง
                ไฟล์ไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์
              </li>
              <li>
                Word ที่สร้างเป็น draft ต้องตรวจทุกหน้าใน Microsoft Word
                ก่อนออกเอกสาร ส่วนเอกสารจัดจ้าง 11 แบบยังเป็นแบบอ้างอิง
              </li>
              <li>
                ดาวน์โหลดไฟล์สำรองจากตั้งค่าบริษัท และเก็บต้นแบบ Word แยกไว้
                JSON ไม่รวมไฟล์ต้นแบบ
              </li>
              <li>
                เมื่อย้าย URL หรือเครื่อง ต้องนำเข้า backup และแนบต้นแบบใหม่
                การล้างข้อมูลเว็บไซต์อาจทำให้ข้อมูลในเครื่องหาย
              </li>
            </ol>
            <p>
              ถ้าพบข้อความว่าข้อมูลเปลี่ยนจากแท็บอื่น
              ให้เก็บข้อความที่กำลังกรอกไว้แล้วเปิดฟอร์มใหม่
              ระบบจะไม่เขียนทับข้อมูลล่าสุด
            </p>
          </div>
        </ModalShell>
      )}
      {modal === "proposal" && (
        <ModalShell
          title={activeProposal ? "แก้ไขใบเสนอราคา" : "สร้างใบเสนอราคาใหม่"}
          eyebrow="รายละเอียดข้อเสนอ"
          onClose={() => setModal(null)}
          wide
        >
          <ProposalEditor
            catalogData={workspace.catalog || defaultCatalog}
            readOnly={readOnly}
            proposal={proposalEditorBase}
            customers={customers}
            selectedPackage={selectedPackage}
            onSave={createProposal}
            onCancel={() => setModal(null)}
          />
        </ModalShell>
      )}
      {modal === "customer" && (
        <ModalShell
          title={editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
          eyebrow="รายชื่อลูกค้า"
          onClose={() => setModal(null)}
        >
          <CustomerEditor
            readOnly={readOnly}
            customer={editingCustomer}
            onSave={createCustomer}
            onCancel={() => setModal(null)}
          />
        </ModalShell>
      )}
      {modal === "detail" && activeProposal && (
        <ModalShell
          title={activeProposal.id}
          eyebrow="รายละเอียดใบเสนอราคา"
          onClose={() => setModal(null)}
          wide
        >
          <div className="detail-body">
            <div className="detail-customer">
              <div className="customer-avatar avatar-0">
                {activeProposal.customer.slice(0, 1)}
              </div>
              <div>
                <strong>{activeProposal.customer}</strong>
                <span>
                  {activeProposal.contact} · {activeProposal.location}
                </span>
              </div>
              <StatusPill status={activeProposal.status} />
            </div>
            <div className="detail-metrics">
              <div>
                <span>ขนาดระบบ</span>
                <strong>
                  {activeProposal.system} <small>kWp</small>
                </strong>
              </div>
              <div>
                <span>แพ็กเกจ</span>
                <strong className="detail-package">
                  {activeProposal.package}
                </strong>
              </div>
              <div>
                <span>มูลค่ารวม</span>
                <strong>{money(activeProposal.amount)}</strong>
              </div>
            </div>
            {activeProposal.solar && (
              <EstimateSummary
                details={activeProposal.solar}
                total={activeProposal.amount}
              />
            )}
            <div className="detail-note">
              <div className="eyebrow">สถานะการติดตาม</div>
              <label className="field">
                อัปเดตสถานะ
                <select
                  value={activeProposal.status}
                  disabled={readOnly}
                  onChange={(e) =>
                    changeStatus(activeProposal.id, e.target.value as Status)
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <p>
                <CalendarDays size={15} /> สร้างเมื่อ{" "}
                {dateLabel(activeProposal.created)} <span>·</span> อัปเดตล่าสุด{" "}
                {dateLabel(activeProposal.updated)}
              </p>
            </div>
            <button
              className="primary-button document-action"
              onClick={() => {
                setModal(null);
                setView("เทมเพลต");
              }}
            >
              สร้างเอกสารตามฟอร์ม กฟภ. <FileText size={16} />
            </button>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => window.print()}
              >
                <Download size={16} /> พิมพ์ / บันทึก PDF
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  editProposal(activeProposal);
                }}
              >
                แก้ไขข้อเสนอ <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </ModalShell>
      )}
      {modal === "detail" && activeProposal && (
        <ProposalPrint proposal={activeProposal} company={company} />
      )}
      {toast && (
        <div role="status" className="toast">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button aria-label="ปิดข้อความ" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {requestedView && (
        <ConfirmLeaveDialog
          onStay={() => setRequestedView(null)}
          onLeave={() => {
            applyView(requestedView);
            setRequestedView(null);
          }}
        />
      )}
    </main>
  );
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">SOLARDESK WORKSPACE</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function EmptyState({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <div>
        <Search size={20} />
      </div>
      <strong>{label}</strong>
      <span>ลองปรับคำค้นหาแล้วค้นหาอีกครั้ง</span>
    </div>
  );
}
function ProposalTable({
  proposals,
  onOpen,
  onStatus,
  readOnly = false,
  compact = false,
}: {
  proposals: Proposal[];
  onOpen: (proposal: Proposal) => void;
  onStatus: (id: string, status: Status) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>เลขที่ / ลูกค้า</th>
            <th>ขนาดระบบ</th>
            <th>มูลค่า</th>
            <th>สถานะ</th>
            <th>อัปเดตล่าสุด</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {proposals.map((p, i) => (
            <tr key={p.id} onClick={() => onOpen(p)} className="clickable-row">
              <td>
                <div className="proposal-cell">
                  <div className={`proposal-icon icon-${i % 4}`}>
                    <FileText size={17} />
                  </div>
                  <div>
                    <button
                      className="table-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(p);
                      }}
                    >
                      {p.customer}
                    </button>
                    <small>
                      {p.id} <i>·</i> {p.package}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <strong className="system-size">{p.system} kWp</strong>
              </td>
              <td className="amount-cell">{money(p.amount)}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <select
                  className="status-select"
                  aria-label={`เปลี่ยนสถานะ ${p.id}`}
                  value={p.status}
                  disabled={readOnly}
                  onChange={(e) => onStatus(p.id, e.target.value as Status)}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td className="updated-cell">{dateLabel(p.updated)}</td>
              <td>
                <button
                  className="row-more"
                  aria-label={`ดู ${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(p);
                  }}
                >
                  <MoreHorizontal size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {proposals.length === 0 && <EmptyState label="ไม่พบใบเสนอราคา" />}
      {!compact && proposals.length > 0 && (
        <div className="table-pagination">
          <span>แสดง {proposals.length} รายการ</span>
          <div>
            <button
              className="pagination-button"
              aria-label="หน้าก่อนหน้า"
              disabled
            >
              <ChevronLeft size={16} />
            </button>
            <button className="page-number active-page">1</button>
            <button
              className="pagination-button"
              aria-label="หน้าถัดไป"
              disabled
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
