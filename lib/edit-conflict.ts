function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  return value;
}

/** Compare the record the editor actually opened, not a later React prop. */
export function assertUnchanged<T extends object>(
  current: T | undefined,
  baseline: T,
  label: string,
  ignored: readonly (keyof T)[] = [],
) {
  const fingerprint = (value: T) =>
    JSON.stringify(
      canonical(
        Object.fromEntries(
          Object.entries(value).filter(
            ([key]) => !ignored.includes(key as keyof T),
          ),
        ),
      ),
    );
  if (!current || fingerprint(current) !== fingerprint(baseline))
    throw new Error(
      `${label}เปลี่ยนหลังจากเปิดฟอร์ม ข้อมูลล่าสุดยังไม่ถูกแก้ไข กรุณาสำรองข้อความที่กรอกแล้วเปิดฟอร์มใหม่`,
    );
}
