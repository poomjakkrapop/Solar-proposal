"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Pencil, Plus, Sun } from "lucide-react";
import { assertUnchanged } from "../lib/edit-conflict";
import {
  defaultCatalog,
  validateCatalog,
  type Catalog,
  type CatalogEquipment,
  type CatalogPackage,
} from "../lib/catalog";
import { money, type Workspace } from "../lib/workspace";

type Editor = {
  kind: "package" | "equipment";
  id: string;
  baseline: Catalog;
  item?: CatalogPackage | CatalogEquipment;
};
export function CatalogManager({
  workspace,
  canManage,
  canCreate,
  commit,
  choose,
  dirty,
}: {
  workspace: Workspace;
  canManage: boolean;
  canCreate: boolean;
  commit: (update: (current: Workspace) => Workspace) => Promise<boolean>;
  choose: (name: string) => void;
  dirty: (value: boolean) => void;
}) {
  const data = workspace.catalog || defaultCatalog;
  const [view, setView] = useState<"package" | "equipment">("package");
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<Editor>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    dirty(!!editor);
    if (!editor) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      dirty(false);
      window.removeEventListener("beforeunload", warn);
    };
  }, [editor, dirty]);
  function edit(kind: Editor["kind"], item?: Editor["item"]) {
    setError("");
    setMessage("");
    setEditor({
      kind,
      id: item?.id || crypto.randomUUID(),
      baseline: structuredClone(data),
      item: item ? structuredClone(item) : undefined,
    });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !canManage || busy) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const numeric = (name: string) => (value(name) ? Number(value(name)) : NaN);
    setBusy(true);
    setError("");
    try {
      const item =
        editor.kind === "package"
          ? {
              id: editor.id,
              name: value("name"),
              label: value("label"),
              description: value("description"),
              system: numeric("system"),
              price: numeric("price"),
              panelCount: numeric("panelCount"),
              panelId: value("panelId"),
              inverterId: value("inverterId"),
              active: form.has("active"),
            }
          : {
              id: editor.id,
              type: value("type") as CatalogEquipment["type"],
              brand: value("brand"),
              model: value("model"),
              spec: value("spec"),
              rating: numeric("rating"),
              active: form.has("active"),
            };
      const ok = await commit((current) => {
        const live = current.catalog || defaultCatalog;
        assertUnchanged(
          { catalog: live },
          { catalog: editor.baseline },
          "แค็ตตาล็อก",
        );
        const next = structuredClone(live);
        if (editor.kind === "package") {
          next.packages = editor.item
            ? next.packages.map((p) =>
                p.id === editor.id ? (item as CatalogPackage) : p,
              )
            : [...next.packages, item as CatalogPackage];
        } else {
          next.equipment = editor.item
            ? next.equipment.map((e) =>
                e.id === editor.id ? (item as CatalogEquipment) : e,
              )
            : [...next.equipment, item as CatalogEquipment];
        }
        return { ...current, catalog: validateCatalog(next) };
      });
      if (!ok)
        throw new Error(
          "ยังบันทึกไม่ได้ ร่างยังอยู่ กรุณาตรวจข้อความด้านบนก่อนลองใหม่",
        );
      setEditor(undefined);
      setMessage(
        "บันทึกแค็ตตาล็อกแล้ว ข้อเสนอเดิมยังใช้ราคาและสเปกที่บันทึกไว้",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ ร่างยังอยู่",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="catalog-tools">
        <div
          className="catalog-tabs"
          role="group"
          aria-label="ประเภทแค็ตตาล็อก"
        >
          <button
            className="secondary-button"
            aria-pressed={view === "package"}
            onClick={() => setView("package")}
          >
            แพ็กเกจ
          </button>
          <button
            className="secondary-button"
            aria-pressed={view === "equipment"}
            onClick={() => setView("equipment")}
          >
            อุปกรณ์
          </button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />{" "}
          แสดงรายการปิดใช้งาน
        </label>
        <button
          className="primary-button"
          disabled={!canManage || !!editor}
          onClick={() => edit(view)}
        >
          <Plus size={16} />
          {view === "package" ? "เพิ่มแพ็กเกจ" : "เพิ่มอุปกรณ์"}
        </button>
      </div>
      <p className="catalog-notice">
        {!workspace.catalog
          ? "แสดงค่าเริ่มต้นตัวอย่าง ยังไม่ได้ตั้งค่าแค็ตตาล็อกของพื้นที่นี้ · "
          : ""}
        {canManage
          ? "ปิดใช้งานแทนการลบ เพื่อรักษาการอ้างอิงเดิม"
          : "เจ้าของพื้นที่เป็นผู้จัดการแค็ตตาล็อก"}{" "}
        · เปลี่ยนแค็ตตาล็อกแล้วข้อเสนอเดิมไม่เปลี่ยนตาม
      </p>
      {message && (
        <p role="status" className="catalog-notice">
          {message}
        </p>
      )}
      {editor && (
        <section
          className="settings-card catalog-editor"
          aria-label={
            editor.kind === "package" ? "แก้ไขแพ็กเกจ" : "แก้ไขอุปกรณ์"
          }
        >
          <h2>
            {editor.item ? "แก้ไข" : "เพิ่ม"}
            {editor.kind === "package" ? "แพ็กเกจ" : "อุปกรณ์"}
          </h2>
          <form key={`${editor.kind}:${editor.id}`} onSubmit={save}>
            <div className="form-grid">
              {editor.kind === "package" ? (
                <PackageFields
                  item={editor.item as CatalogPackage | undefined}
                  data={data}
                />
              ) : (
                <EquipmentFields
                  item={editor.item as CatalogEquipment | undefined}
                />
              )}
              <label className="catalog-active">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editor.item?.active ?? true}
                />{" "}
                เปิดใช้งานสำหรับข้อเสนอใหม่
              </label>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {!canManage && (
              <p role="status" className="form-error">
                สิทธิ์จัดการเปลี่ยนไป ร่างยังอยู่และคัดลอกไว้ได้
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  setEditor(undefined);
                  setError("");
                }}
              >
                ยกเลิกและทิ้งร่าง
              </button>
              <button className="primary-button" disabled={busy || !canManage}>
                {busy ? "กำลังบันทึก…" : "บันทึกแค็ตตาล็อก"}
              </button>
            </div>
          </form>
        </section>
      )}
      {view === "package" ? (
        <div className="catalog-grid">
          {data.packages
            .filter((p) => archived || p.active)
            .map((p, i) => (
              <article className="catalog-card" key={p.id}>
                <div
                  className={`catalog-art ${["blue", "green", "gold", "purple"][i % 4]}`}
                >
                  <div className="panel-illustration">
                    {Array.from({ length: 12 }, (_, n) => (
                      <i key={n} />
                    ))}
                  </div>
                  <span className="kw-badge">
                    <Sun size={13} />
                    {p.system} kWp
                  </span>
                </div>
                <div className="catalog-content">
                  <div className="catalog-label">
                    {p.label || "แพ็กเกจ"}
                    {!p.active && " · ปิดใช้งาน"}
                  </div>
                  <h2>{p.name}</h2>
                  <p className="catalog-description">{p.description}</p>
                  <div className="catalog-spec">
                    {[p.panelId, p.inverterId].filter(Boolean).map((id) => {
                      const e = data.equipment.find((e) => e.id === id)!;
                      return (
                        <span key={id}>
                          <Check size={14} />
                          {e.brand} {e.model}
                          {!e.active && " (ปิดใช้งาน)"}
                        </span>
                      );
                    })}
                  </div>
                  <div className="catalog-price">
                    <span>ราคาเริ่มต้น</span>
                    <strong>{money(p.price)}</strong>
                  </div>
                  <button
                    className="catalog-button"
                    disabled={
                      !canCreate ||
                      !!editor ||
                      !p.active ||
                      [p.panelId, p.inverterId].some(
                        (id) =>
                          id &&
                          !data.equipment.find((e) => e.id === id)?.active,
                      )
                    }
                    onClick={() => choose(p.name)}
                  >
                    สร้างข้อเสนอจากแพ็กเกจ <ArrowRight size={15} />
                  </button>
                  <button
                    className="secondary-button catalog-edit"
                    disabled={!canManage || !!editor}
                    onClick={() => edit("package", p)}
                  >
                    <Pencil size={14} />
                    แก้ไข {p.name}
                  </button>
                </div>
              </article>
            ))}
          {!data.packages.some((p) => archived || p.active) && (
            <p>ยังไม่มีแพ็กเกจที่เปิดใช้งาน</p>
          )}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ประเภท</th>
                <th>ยี่ห้อ / รุ่น</th>
                <th>กำลังพิกัด</th>
                <th>รายละเอียด</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.equipment
                .filter((e) => archived || e.active)
                .map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.type === "PANEL" ? "แผงโซลาร์" : "อินเวอร์เตอร์"}
                    </td>
                    <td>
                      {e.brand} {e.model}
                    </td>
                    <td>
                      {e.rating || "ยังไม่ระบุ"}{" "}
                      {e.rating ? (e.type === "PANEL" ? "W" : "kW") : ""}
                    </td>
                    <td>{e.spec}</td>
                    <td>{e.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</td>
                    <td>
                      <button
                        className="secondary-button"
                        disabled={!canManage || !!editor}
                        onClick={() => edit("equipment", e)}
                      >
                        แก้ไข {e.brand} {e.model}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!data.equipment.some((e) => archived || e.active) && (
            <p className="catalog-notice">
              ยังไม่มีอุปกรณ์ เพิ่มยี่ห้อและรุ่นก่อนผูกกับแพ็กเกจ
            </p>
          )}
        </div>
      )}
    </>
  );
}
function PackageFields({
  item,
  data,
}: {
  item?: CatalogPackage;
  data: Catalog;
}) {
  return (
    <>
      <label className="field">
        ชื่อแพ็กเกจ
        <input name="name" required maxLength={200} defaultValue={item?.name} />
      </label>
      <label className="field">
        กลุ่มลูกค้า
        <input name="label" maxLength={120} defaultValue={item?.label} />
      </label>
      <label className="field">
        ขนาดระบบ (kWp)
        <input
          name="system"
          type="number"
          min="0.1"
          max="1000000"
          step="0.01"
          required
          defaultValue={item?.system ?? 10}
        />
      </label>
      <label className="field">
        ราคาเริ่มต้น (บาท)
        <input
          name="price"
          type="number"
          min="0"
          max="1000000000000"
          step="0.01"
          required
          defaultValue={item?.price ?? 0}
        />
      </label>
      <label className="field">
        จำนวนแผง (0 = ยังไม่ระบุ)
        <input
          name="panelCount"
          type="number"
          min="0"
          max="1000000"
          step="1"
          required
          defaultValue={item?.panelCount ?? 0}
        />
      </label>
      {(
        [
          ["panelId", "PANEL", "แผงโซลาร์"],
          ["inverterId", "INVERTER", "อินเวอร์เตอร์"],
        ] as const
      ).map(([field, type, label]) => (
        <label className="field" key={field}>
          {label}
          <select name={field} defaultValue={item?.[field] || ""}>
            <option value="">ระบุสเปกเองในข้อเสนอ</option>
            {data.equipment
              .filter(
                (e) => e.type === type && (e.active || e.id === item?.[field]),
              )
              .map((e) => (
                <option value={e.id} key={e.id}>
                  {e.brand} {e.model}
                  {!e.active && " (ปิดใช้งาน)"}
                </option>
              ))}
          </select>
        </label>
      ))}
      <label className="field field-full">
        รายละเอียด / ขอบเขต
        <input
          name="description"
          maxLength={2000}
          defaultValue={item?.description}
        />
      </label>
    </>
  );
}
function EquipmentFields({ item }: { item?: CatalogEquipment }) {
  const [type, setType] = useState(item?.type || "PANEL");
  const [rating, setRating] = useState(String(item?.rating ?? 0));
  return (
    <>
      <label className="field">
        ประเภทอุปกรณ์
        <select
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as CatalogEquipment["type"]);
            setRating("0");
          }}
        >
          <option value="PANEL">แผงโซลาร์</option>
          <option value="INVERTER">อินเวอร์เตอร์</option>
        </select>
      </label>
      <label className="field">
        ยี่ห้อ
        <input
          name="brand"
          required
          maxLength={200}
          defaultValue={item?.brand}
        />
      </label>
      <label className="field">
        รุ่น
        <input
          name="model"
          required
          maxLength={200}
          defaultValue={item?.model}
        />
      </label>
      <label className="field">
        กำลังพิกัด ({type === "PANEL" ? "W" : "kW"}; 0 = ยังไม่ระบุ)
        <input
          name="rating"
          type="number"
          min="0"
          max="1000000"
          step={type === "PANEL" ? "1" : "0.01"}
          required
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />
      </label>
      <label className="field field-full">
        รายละเอียดสเปก
        <textarea name="spec" maxLength={2000} defaultValue={item?.spec} />
      </label>
    </>
  );
}
