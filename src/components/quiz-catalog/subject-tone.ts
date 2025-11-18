export type SubjectTone = "en" | "math" | "sci" | "vi" | "default";

export function getSubjectTone(slug?: string | null): SubjectTone {
  const normalized = (slug ?? "").toLowerCase();
  if (normalized.includes("math")) return "math";
  if (normalized.includes("sci")) return "sci";
  if (normalized.includes("vi")) return "vi";
  if (normalized.includes("en")) return "en";
  return "default";
}

export function isMixedSubject(slug?: string | null) {
  return (slug ?? "").toLowerCase().includes("mixed");
}
