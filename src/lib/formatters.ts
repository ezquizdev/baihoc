export function formatNumberVi(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDateVi(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("vi-VN");
}
